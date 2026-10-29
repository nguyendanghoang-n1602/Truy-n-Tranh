/**
 * MangaAudioEngine - Real-time procedural audio synthesis for Manga action sound effects
 * Built with Web Audio API. Zero external asset dependencies.
 */
export class MangaAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.destNode = null; // Stream destination for video recorder
    this.isMuted = false;
    this.volume = 0.8;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Create stream destination for MediaRecorder integration
    try {
      this.destNode = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.destNode);
    } catch (e) {
      console.warn('Audio stream destination not supported', e);
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getAudioStream() {
    this.ensureContext();
    return this.destNode ? this.destNode.stream : null;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    return this.isMuted;
  }

  /**
   * Sword / Motion Whoosh
   */
  playWhoosh(intensity = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = 0.35;

    // Buffer noise
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter swept quickly
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.5;
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(1800 * intensity, t + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(200, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.7 * intensity, t + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + duration);
  }

  /**
   * Metallic Katana / Blade Slash
   */
  playBladeSlash(intensity = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = 0.5;

    // High resonant metallic tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + duration * 0.6);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 12.0; // High metallic ringing

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);

    // Layer with a fast crisp whoosh
    this.playWhoosh(intensity * 1.2);
  }

  /**
   * Heavy Impact / Explosion / Shield Break
   */
  playHeavyImpact(intensity = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = 0.9;

    // Sub-bass pitch drop (150Hz -> 35Hz)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(32, t + 0.35);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(1.0 * intensity, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(t);
    subOsc.stop(t + duration);

    // Impact burst noise
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(800, t);
    lowpass.frequency.exponentialRampToValueAtTime(120, t + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9 * intensity, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.4);
  }

  /**
   * High-voltage Lightning / Electric Shock
   */
  playLightning(intensity = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = 0.6;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.setValueAtTime(420, t + 0.05);
    osc.frequency.setValueAtTime(90, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(30, t + duration);

    // Waveshaper distortion
    const distortion = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; ++i) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((3 + 20) * x * 20 * (Math.PI / 180)) / (Math.PI + 20 * Math.abs(x));
    }
    distortion.curve = curve;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  /**
   * Energy Charge / Power-up Aura
   */
  playCharge(duration = 1.2, intensity = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.5 * intensity, t + duration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  /**
   * Dispatch sound by trigger name
   */
  trigger(soundName, intensity = 1.0) {
    switch (soundName) {
      case 'blade':
      case 'slash':
        this.playBladeSlash(intensity);
        break;
      case 'heavy_impact':
      case 'boom':
        this.playHeavyImpact(intensity);
        break;
      case 'dash':
      case 'whoosh':
        this.playWhoosh(intensity);
        break;
      case 'lightning':
      case 'zap':
        this.playLightning(intensity);
        break;
      case 'charge':
        this.playCharge(1.2, intensity);
        break;
      case 'resolve':
        this.playWhoosh(0.5);
        break;
      default:
        this.playWhoosh(intensity);
        break;
    }
  }
}
