/**
 * MangaTTSEngine - Unified Text-To-Speech Controller with Dual Providers
 * 1. Google Cloud Text-to-Speech (Neural/WaveNet with AudioBuffer decoding for Video Export)
 * 2. Browser SpeechSynthesis (Native OS/Browser speech fallback)
 */
export class MangaTTSEngine {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.providerType = 'browser'; // 'google' | 'browser'
    this.apiKey = localStorage.getItem('mangamotion_google_tts_key') || import.meta.env.VITE_GOOGLE_TTS_API_KEY || '';
    this.proxyUrl = localStorage.getItem('mangamotion_google_tts_proxy') || import.meta.env.VITE_GOOGLE_TTS_PROXY_URL || '';

    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.selectedVoiceId = null;

    // State
    this.isPlaying = false;
    this.isPaused = false;
    this.currentQueue = [];
    this.currentQueueIndex = 0;
    this.activeSourceNode = null; // For Google Cloud AudioBuffer playback
    this.browserUtterance = null; // For Browser SpeechSynthesis

    // Callbacks
    this.onSegmentStart = () => {};
    this.onSegmentEnd = () => {};
    this.onQueueComplete = () => {};
    this.onError = () => {};
    this.onVoicesChanged = () => {};

    // Available voices cache
    this.browserVoices = [];
    this.initBrowserVoices();
  }

  /**
   * Initialize browser voices list
   */
  initBrowserVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const load = () => {
      this.browserVoices = window.speechSynthesis.getVoices();
      this.onVoicesChanged(this.getAvailableVoices());
    };

    load();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  /**
   * Set TTS Provider ('google' or 'browser')
   */
  setProvider(type) {
    this.stop();
    this.providerType = type;
  }

  /**
   * Set Google Cloud API Key
   */
  setApiKey(key) {
    this.apiKey = key.trim();
    if (this.apiKey) {
      localStorage.setItem('mangamotion_google_tts_key', this.apiKey);
    } else {
      localStorage.removeItem('mangamotion_google_tts_key');
    }
  }

  /**
   * Preset Google Cloud Voices
   */
  static GOOGLE_VOICES = [
    { id: 'vi-VN-Neural2-A', name: 'Tiếng Việt - Neural2 (Nữ)', lang: 'vi-VN', gender: 'FEMALE' },
    { id: 'vi-VN-Wavenet-A', name: 'Tiếng Việt - WaveNet (Nữ)', lang: 'vi-VN', gender: 'FEMALE' },
    { id: 'vi-VN-Wavenet-B', name: 'Tiếng Việt - WaveNet (Nam)', lang: 'vi-VN', gender: 'MALE' },
    { id: 'en-US-Neural2-F', name: 'English (US) - Neural2 (Nữ)', lang: 'en-US', gender: 'FEMALE' },
    { id: 'en-US-Neural2-D', name: 'English (US) - Neural2 (Nam)', lang: 'en-US', gender: 'MALE' },
    { id: 'ja-JP-Neural2-B', name: 'Japanese - Neural2 (Nữ)', lang: 'ja-JP', gender: 'FEMALE' },
    { id: 'ja-JP-Neural2-C', name: 'Japanese - Neural2 (Nam)', lang: 'ja-JP', gender: 'MALE' },
    { id: 'ko-KR-Neural2-A', name: 'Korean - Neural2 (Nữ)', lang: 'ko-KR', gender: 'FEMALE' },
    { id: 'cmn-CN-Wavenet-A', name: 'Chinese - WaveNet (Nữ)', lang: 'cmn-CN', gender: 'FEMALE' }
  ];

  /**
   * Get list of voices for current provider
   */
  getAvailableVoices() {
    if (this.providerType === 'google') {
      return MangaTTSEngine.GOOGLE_VOICES;
    }

    // Filter and enhance browser voices
    return this.browserVoices.map((v) => {
      const isGoogle = v.name.toLowerCase().includes('google');
      return {
        id: v.name,
        name: `${v.name} (${v.lang})${isGoogle ? ' [Google]' : ''}`,
        lang: v.lang,
        rawVoice: v
      };
    });
  }

  /**
   * Synthesize audio from Google Cloud Text-to-Speech API
   * Returns decoded AudioBuffer and caches it
   */
  async synthesizeGoogleAudio(text, langCode = 'vi-VN', voiceName = null) {
    if (!this.apiKey && !this.proxyUrl) {
      throw new Error('Chưa cấu hình Google Cloud TTS API Key hoặc Proxy URL.');
    }

    this.audioEngine.ensureContext();
    const ctx = this.audioEngine.ctx;

    const endpoint = this.proxyUrl || `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;
    const selectedVoice = voiceName || this.selectedVoiceId || 'vi-VN-Neural2-A';

    const payload = {
      input: { text },
      voice: {
        languageCode: langCode || 'vi-VN',
        name: selectedVoice
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: this.rate,
        pitch: (this.pitch - 1.0) * 10.0, // Scale to [-20.0, 20.0]
        volumeGainDb: 0.0
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Google Cloud TTS API Error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    if (!data.audioContent) {
      throw new Error('Google Cloud TTS không trả về dữ liệu âm thanh.');
    }

    // Convert base64 to ArrayBuffer
    const binary = window.atob(data.audioContent);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Decode AudioBuffer via Web Audio API
    const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
    return audioBuffer;
  }

  /**
   * Estimate audio duration for browser speech synthesis based on text length and rate
   */
  static estimateSpeechDuration(text, rate = 1.0) {
    const words = text.trim().split(/\s+/).length;
    // Average 2.8 words per second at rate 1.0
    const sec = Math.max(1.2, (words / (2.8 * rate)) + 0.4);
    return Number(sec.toFixed(2));
  }

  /**
   * Speak a single segment
   */
  async speakSegment(segment, langCode = 'vi-VN') {
    this.stopCurrentAudio();

    if (this.providerType === 'google') {
      try {
        let buffer = segment.audioBuffer;
        if (!buffer) {
          buffer = await this.synthesizeGoogleAudio(segment.text, langCode, this.selectedVoiceId);
          segment.audioBuffer = buffer;
          segment.duration = Number(buffer.duration.toFixed(2));
        }

        return new Promise((resolve) => {
          this.audioEngine.ensureContext();
          const ctx = this.audioEngine.ctx;

          const source = ctx.createBufferSource();
          source.buffer = buffer;

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(this.volume, ctx.currentTime);

          source.connect(gain);
          gain.connect(this.audioEngine.masterGain);
          if (this.audioEngine.destNode) {
            gain.connect(this.audioEngine.destNode);
          }

          this.activeSourceNode = source;

          source.onended = () => {
            this.activeSourceNode = null;
            resolve();
          };

          source.start(0);
        });
      } catch (err) {
        console.warn('Lỗi Google TTS, tự động chuyển sang Browser SpeechSynthesis:', err);
        // Fallback to browser
        return this.speakSegmentBrowser(segment, langCode);
      }
    } else {
      return this.speakSegmentBrowser(segment, langCode);
    }
  }

  /**
   * Browser SpeechSynthesis implementation
   */
  speakSegmentBrowser(segment, langCode = 'vi-VN') {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        this.onError('Trình duyệt không hỗ trợ Web SpeechSynthesis API.');
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;

      // Select matching voice
      if (this.selectedVoiceId) {
        const found = this.browserVoices.find((v) => v.name === this.selectedVoiceId);
        if (found) utterance.voice = found;
      } else {
        // Find best match for langCode
        const match = this.browserVoices.find((v) => v.lang.startsWith(langCode.slice(0, 2)));
        if (match) utterance.voice = match;
      }

      utterance.onend = () => {
        this.browserUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        this.browserUtterance = null;
        resolve();
      };

      this.browserUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Start reading a queue of segments
   */
  async startQueue(segments, startIndex = 0, langCode = 'vi-VN') {
    this.stop();
    if (!segments || !segments.length) return;

    this.currentQueue = segments;
    this.currentQueueIndex = startIndex;
    this.isPlaying = true;
    this.isPaused = false;

    while (this.isPlaying && this.currentQueueIndex < this.currentQueue.length) {
      if (this.isPaused) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      const item = this.currentQueue[this.currentQueueIndex];
      this.onSegmentStart(item, item.pageIndex, this.currentQueueIndex);

      await this.speakSegment(item.segment, langCode);

      this.onSegmentEnd(item, item.pageIndex, this.currentQueueIndex);

      if (!this.isPlaying) break;

      this.currentQueueIndex++;
      // Brief breath pause between dialogue bubbles
      await new Promise((r) => setTimeout(r, 350));
    }

    if (this.isPlaying) {
      this.isPlaying = false;
      this.onQueueComplete();
    }
  }

  /**
   * Stop current audio output
   */
  stopCurrentAudio() {
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch (e) {}
      this.activeSourceNode = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.browserUtterance = null;
    }
  }

  /**
   * Pause playback
   */
  pause() {
    this.isPaused = true;
    if (this.providerType === 'browser' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    if (this.activeSourceNode && this.audioEngine.ctx) {
      this.audioEngine.ctx.suspend();
    }
  }

  /**
   * Resume playback
   */
  resume() {
    this.isPaused = false;
    if (this.providerType === 'browser' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    if (this.activeSourceNode && this.audioEngine.ctx) {
      this.audioEngine.ctx.resume();
    }
  }

  /**
   * Stop playback completely
   */
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.stopCurrentAudio();
    this.currentQueue = [];
    this.currentQueueIndex = 0;
  }

  /**
   * Skip to next segment in queue
   */
  skipNext() {
    if (!this.isPlaying) return;
    this.stopCurrentAudio();
    this.currentQueueIndex = Math.min(this.currentQueue.length - 1, this.currentQueueIndex + 1);
  }

  /**
   * Skip to previous segment in queue
   */
  skipPrev() {
    if (!this.isPlaying) return;
    this.stopCurrentAudio();
    this.currentQueueIndex = Math.max(0, this.currentQueueIndex - 1);
  }

  /**
   * Replay current segment
   */
  replayCurrent() {
    if (!this.isPlaying) return;
    this.stopCurrentAudio();
  }
}
