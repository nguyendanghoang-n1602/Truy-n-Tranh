/**
 * MangaVideoExporter - Senior-Grade 60FPS Video Rendering & Export Engine
 * Synthesizes 60FPS Canvas action VFX + Audio directly into WebM/MP4 with progress callbacks.
 */
export class MangaVideoExporter {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.isExporting = false;
  }

  /**
   * Determine best supported video MIME type
   */
  static getSupportedMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,aac',
      'video/mp4'
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return '';
  }

  /**
   * Render and export the comic action sequence
   */
  async exportSequence({
    panels,
    image,
    cameraEngine,
    vfxEngine,
    resolution = { width: 1920, height: 1080 }, // 16:9 1080p by default
    fps = 60,
    bitrate = 10000000, // 10 Mbps
    onProgress = () => {}
  }) {
    if (this.isExporting) throw new Error('Export already in progress');
    this.isExporting = true;

    // Create high-res export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = resolution.width;
    exportCanvas.height = resolution.height;
    const ctx = exportCanvas.getContext('2d');

    const mimeType = MangaVideoExporter.getSupportedMimeType();
    if (!mimeType) {
      this.isExporting = false;
      throw new Error('Trình duyệt không hỗ trợ MediaRecorder cho định dạng video này.');
    }

    // Capture visual stream at 60 fps
    const videoStream = exportCanvas.captureStream(fps);
    const audioStream = this.audioEngine.getAudioStream();

    const tracks = [...videoStream.getVideoTracks()];
    if (audioStream) {
      const audioTracks = audioStream.getAudioTracks();
      if (audioTracks.length > 0) {
        tracks.push(audioTracks[0]);
      }
    }

    const combinedStream = new MediaStream(tracks);
    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: bitrate
    });

    const recordedChunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    recorder.start(100);

    const totalDuration = panels.reduce((sum, p) => sum + p.duration, 0);
    const dt = 1 / fps;
    let globalTime = 0;

    // Reset VFX & Camera
    vfxEngine.reset();

    // Trigger state trackers for audio and VFX per panel
    const panelTriggers = panels.map((panel, idx) => {
      const startT = panels.slice(0, idx).reduce((acc, p) => acc + p.duration, 0);
      return {
        panel,
        startTime: startT,
        endTime: startT + panel.duration,
        audioFired: false,
        shakeFired: false,
        flashFired: false
      };
    });

    // Real-time rendering loop
    await new Promise((resolve) => {
      const renderFrame = () => {
        if (globalTime >= totalDuration) {
          setTimeout(() => {
            recorder.stop();
          }, 300);
          return;
        }

        // Find current active panel
        const currentTrigger = panelTriggers.find(
          (t) => globalTime >= t.startTime && globalTime < t.endTime
        ) || panelTriggers[panelTriggers.length - 1];

        const panel = currentTrigger.panel;
        const panelLocalTime = globalTime - currentTrigger.startTime;
        const progress = Math.min(1, Math.max(0, panelLocalTime / panel.duration));

        // Trigger Audio SFX
        if (!currentTrigger.audioFired && panel.audio) {
          if (panelLocalTime >= (panel.audio.impactAt || 0.1)) {
            currentTrigger.audioFired = true;
            this.audioEngine.trigger(panel.audio.sound);
            if (panel.audio.impactSound) {
              this.audioEngine.trigger(panel.audio.impactSound, 1.2);
            }
          }
        }

        // Trigger Screen Shake & Flash
        if (!currentTrigger.shakeFired && panel.vfx && panel.vfx.shakeIntensity > 0) {
          if (panelLocalTime >= (panel.vfx.shakeTriggerTime || 0.1)) {
            currentTrigger.shakeFired = true;
            cameraEngine.triggerShake(panel.vfx.shakeIntensity * (resolution.height / 720));
          }
        }

        if (!currentTrigger.flashFired && panel.vfx && panel.vfx.screenFlash) {
          if (panelLocalTime >= (panel.vfx.flashTime || 0.1)) {
            currentTrigger.flashFired = true;
            vfxEngine.triggerFlash(panel.vfx.flashColor || '#ffffff', 0.2);
            if (panel.vfx.slashArc) {
              vfxEngine.triggerSlash(
                resolution.width * 0.5,
                resolution.height * 0.5,
                -25,
                panel.vfx.slashColor || '#38bdf8',
                resolution.width * 0.35
              );
            }
            if (panel.vfx.sparks) {
              vfxEngine.spawnSparks(
                resolution.width * 0.5,
                resolution.height * 0.5,
                panel.vfx.sparkCount || 30
              );
            }
          }
        }

        // Update physics
        cameraEngine.update(dt);
        vfxEngine.update(dt);

        // Clear canvas
        ctx.fillStyle = '#05070f';
        ctx.fillRect(0, 0, resolution.width, resolution.height);

        // Draw camera-transformed panel
        cameraEngine.drawPanel(ctx, image, panel, progress, resolution.width, resolution.height);

        // Draw VFX overlay
        vfxEngine.render(ctx, resolution.width, resolution.height, panel.vfx);

        // Advance time
        globalTime += dt;
        const percent = Math.min(100, Math.round((globalTime / totalDuration) * 100));
        onProgress(percent, globalTime, totalDuration);

        requestAnimationFrame(renderFrame);
      };

      recorder.onstop = () => {
        resolve();
      };

      renderFrame();
    });

    this.isExporting = false;

    // Package into downloadable Blob
    const blob = new Blob(recordedChunks, { type: mimeType });
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const filename = `manga_action_video_${Date.now()}.${ext}`;

    return {
      blob,
      url: URL.createObjectURL(blob),
      filename,
      sizeBytes: blob.size,
      totalDuration
    };
  }
}
