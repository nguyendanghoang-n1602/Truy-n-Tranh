/**
 * MangaVideoExporter - Senior-Grade 60FPS Video Rendering & Export Engine
 * Synthesizes 60FPS Canvas action VFX + Synchronized Spoken Audio/SFX directly into WebM/MP4.
 * Features:
 * - Proper resource & memory lifecycle management (URL.revokeObjectURL, track cleanup)
 * - Support for both action panels and multi-page chapter sequences with dialogue voiceover
 * - Robust error handling with try/finally
 */
export class MangaVideoExporter {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.isExporting = false;
    this.lastVideoUrl = null;
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
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return '';
  }

  /**
   * Cleanup previous object URL to prevent memory leaks
   */
  cleanupLastUrl() {
    if (this.lastVideoUrl) {
      try {
        URL.revokeObjectURL(this.lastVideoUrl);
      } catch (e) {}
      this.lastVideoUrl = null;
    }
  }

  /**
   * Render and export chapter sequence with multiple pages, OCR segments, and transitions
   */
  async exportChapterSequence({
    scenes, // Array of { page, bounds, duration, text, audioBuffer, transitionType }
    cameraEngine,
    vfxEngine,
    resolution = { width: 1920, height: 1080 },
    fps = 60,
    bitrate = 12000000,
    onProgress = () => {}
  }) {
    if (this.isExporting) throw new Error('Quá trình xuất video khác đang diễn ra.');
    this.isExporting = true;
    this.cleanupLastUrl();

    let combinedStream = null;
    let videoStream = null;

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = resolution.width;
      exportCanvas.height = resolution.height;
      const ctx = exportCanvas.getContext('2d');

      const mimeType = MangaVideoExporter.getSupportedMimeType();
      if (!mimeType) {
        throw new Error('Trình duyệt không hỗ trợ MediaRecorder cho định dạng video này.');
      }

      this.audioEngine.ensureContext();
      videoStream = exportCanvas.captureStream(fps);
      const audioStream = this.audioEngine.getAudioStream();

      const tracks = [...videoStream.getVideoTracks()];
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        if (audioTracks.length > 0) {
          tracks.push(audioTracks[0]);
        }
      }

      combinedStream = new MediaStream(tracks);
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

      const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
      const dt = 1 / fps;
      let globalTime = 0;

      vfxEngine.reset();

      // Setup scene triggers
      const sceneTriggers = scenes.map((scene, idx) => {
        const startT = scenes.slice(0, idx).reduce((acc, s) => acc + s.duration, 0);
        return {
          scene,
          index: idx,
          startTime: startT,
          endTime: startT + scene.duration,
          audioFired: false
        };
      });

      await new Promise((resolve, reject) => {
        const renderFrame = () => {
          if (globalTime >= totalDuration) {
            setTimeout(() => {
              try {
                recorder.stop();
              } catch (e) {
                resolve();
              }
            }, 300);
            return;
          }

          // Active scene
          const activeIndex = sceneTriggers.findIndex(
            (t) => globalTime >= t.startTime && globalTime < t.endTime
          );
          const currentTrigger = activeIndex !== -1 ? sceneTriggers[activeIndex] : sceneTriggers[sceneTriggers.length - 1];
          const curr = currentTrigger.scene;
          const sceneLocalTime = globalTime - currentTrigger.startTime;
          const progress = Math.min(1, Math.max(0, sceneLocalTime / curr.duration));

          // Trigger spoken audio buffer if attached
          if (!currentTrigger.audioFired && curr.audioBuffer) {
            currentTrigger.audioFired = true;
            try {
              const audioCtx = this.audioEngine.ctx;
              const srcNode = audioCtx.createBufferSource();
              srcNode.buffer = curr.audioBuffer;
              srcNode.connect(this.audioEngine.masterGain);
              if (this.audioEngine.destNode) {
                srcNode.connect(this.audioEngine.destNode);
              }
              srcNode.start(0);
            } catch (err) {
              console.warn('Lỗi phát âm thanh voiceover trong video export:', err);
            }
          }

          cameraEngine.update(dt);
          vfxEngine.update(dt);

          // Clear
          ctx.fillStyle = '#05070e';
          ctx.fillRect(0, 0, resolution.width, resolution.height);

          // Check for transition at boundary (last 0.4s of scene)
          const transitionDuration = 0.45;
          const timeUntilEnd = curr.duration - sceneLocalTime;
          const nextIndex = currentTrigger.index + 1;

          if (timeUntilEnd <= transitionDuration && nextIndex < scenes.length) {
            const transProgress = 1 - timeUntilEnd / transitionDuration;
            const nextScene = scenes[nextIndex];
            cameraEngine.drawTransition(
              ctx,
              { image: curr.page.image, bounds: curr.bounds },
              { image: nextScene.page.image, bounds: nextScene.bounds },
              transProgress,
              curr.transitionType || 'cross-dissolve',
              resolution.width,
              resolution.height
            );
          } else {
            cameraEngine.drawFramedRegion(
              ctx,
              curr.page.image,
              curr.bounds,
              progress,
              resolution.width,
              resolution.height,
              { zoomStart: 1.0, zoomEnd: 1.07 }
            );
          }

          globalTime += dt;
          const percent = Math.min(100, Math.round((globalTime / totalDuration) * 100));
          onProgress(percent, globalTime, totalDuration);

          requestAnimationFrame(renderFrame);
        };

        recorder.onstop = () => resolve();
        recorder.onerror = (e) => reject(e);

        renderFrame();
      });

      const blob = new Blob(recordedChunks, { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const filename = `mangamotion_chapter_video_${Date.now()}.${ext}`;
      const url = URL.createObjectURL(blob);
      this.lastVideoUrl = url;

      return {
        blob,
        url,
        filename,
        sizeBytes: blob.size,
        totalDuration
      };
    } finally {
      this.isExporting = false;
      // Stop media tracks
      if (combinedStream) {
        combinedStream.getTracks().forEach((track) => track.stop());
      }
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    }
  }

  /**
   * Render and export single page action panels (backward compatible with samples)
   */
  async exportSequence({
    panels,
    image,
    cameraEngine,
    vfxEngine,
    resolution = { width: 1920, height: 1080 },
    fps = 60,
    bitrate = 10000000,
    onProgress = () => {}
  }) {
    if (this.isExporting) throw new Error('Quá trình xuất video khác đang diễn ra.');
    this.isExporting = true;
    this.cleanupLastUrl();

    let combinedStream = null;
    let videoStream = null;

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = resolution.width;
      exportCanvas.height = resolution.height;
      const ctx = exportCanvas.getContext('2d');

      const mimeType = MangaVideoExporter.getSupportedMimeType();
      if (!mimeType) {
        throw new Error('Trình duyệt không hỗ trợ MediaRecorder cho định dạng video này.');
      }

      this.audioEngine.ensureContext();
      videoStream = exportCanvas.captureStream(fps);
      const audioStream = this.audioEngine.getAudioStream();

      const tracks = [...videoStream.getVideoTracks()];
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        if (audioTracks.length > 0) {
          tracks.push(audioTracks[0]);
        }
      }

      combinedStream = new MediaStream(tracks);
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

      vfxEngine.reset();

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

      await new Promise((resolve, reject) => {
        const renderFrame = () => {
          if (globalTime >= totalDuration) {
            setTimeout(() => {
              try {
                recorder.stop();
              } catch (e) {
                resolve();
              }
            }, 300);
            return;
          }

          const currentTrigger =
            panelTriggers.find((t) => globalTime >= t.startTime && globalTime < t.endTime) ||
            panelTriggers[panelTriggers.length - 1];

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

          cameraEngine.update(dt);
          vfxEngine.update(dt);

          ctx.fillStyle = '#05070f';
          ctx.fillRect(0, 0, resolution.width, resolution.height);

          cameraEngine.drawPanel(ctx, image, panel, progress, resolution.width, resolution.height);
          vfxEngine.render(ctx, resolution.width, resolution.height, panel.vfx);

          globalTime += dt;
          const percent = Math.min(100, Math.round((globalTime / totalDuration) * 100));
          onProgress(percent, globalTime, totalDuration);

          requestAnimationFrame(renderFrame);
        };

        recorder.onstop = () => resolve();
        recorder.onerror = (e) => reject(e);

        renderFrame();
      });

      const blob = new Blob(recordedChunks, { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const filename = `manga_action_video_${Date.now()}.${ext}`;
      const url = URL.createObjectURL(blob);
      this.lastVideoUrl = url;

      return {
        blob,
        url,
        filename,
        sizeBytes: blob.size,
        totalDuration
      };
    } finally {
      this.isExporting = false;
      if (combinedStream) {
        combinedStream.getTracks().forEach((track) => track.stop());
      }
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    }
  }
}
