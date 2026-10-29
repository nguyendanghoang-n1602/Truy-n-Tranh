/**
 * MangaCameraEngine - Cinematic 2.5D Action Camera & Non-Linear Transition System
 * Features:
 * - Ken Burns pan/zoom with non-linear easing curves (easeInOutCubic, easeInOutSine, easeOutExpo)
 * - Decaying sinusoidal impact shakes (A * exp(-lambda*t) * cos(omega*t))
 * - Dynamic dialogue bubble & panel bounding box framing with safe margins
 * - Seamless cinematic transitions: Cross-dissolve, Zoom-through, Directional Pan-glide, Anime Shutter-wipe
 * - Eliminates static page-flip effects
 */
export class MangaCameraEngine {
  constructor() {
    this.shakeAmplitude = 0;
    this.shakeDecay = 8.0;
    this.shakeFrequency = 35.0;
    this.shakeTime = 0;
  }

  triggerShake(intensity = 10) {
    this.shakeAmplitude = intensity;
    this.shakeTime = 0;
  }

  update(dt) {
    if (this.shakeAmplitude > 0.05) {
      this.shakeTime += dt;
      this.shakeAmplitude = this.shakeAmplitude * Math.exp(-this.shakeDecay * dt);
    } else {
      this.shakeAmplitude = 0;
    }
  }

  getShakeOffset() {
    if (this.shakeAmplitude <= 0.05) return { x: 0, y: 0, rot: 0 };
    const t = this.shakeTime;
    const osc1 = Math.sin(t * this.shakeFrequency);
    const osc2 = Math.cos(t * this.shakeFrequency * 1.3);
    return {
      x: osc1 * this.shakeAmplitude,
      y: osc2 * this.shakeAmplitude * 0.8,
      rot: osc1 * this.shakeAmplitude * 0.002
    };
  }

  /**
   * Easing Functions
   */
  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  static easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  static easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  static easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  /**
   * Compute transformed viewport for a panel & progress [0..1]
   */
  computeTransform(panel, progress, viewportWidth, viewportHeight) {
    const cam = panel.camera || {
      zoomStart: 1.0,
      zoomEnd: 1.15,
      panStartX: 0,
      panStartY: 0,
      panEndX: 0,
      panEndY: 0,
      rotationStart: 0,
      rotationEnd: 0
    };

    // Smooth eased interpolation
    const easeT = MangaCameraEngine.easeInOutCubic(progress);

    const zoom = cam.zoomStart + (cam.zoomEnd - cam.zoomStart) * easeT;
    const panX = cam.panStartX + (cam.panEndX - cam.panStartX) * easeT;
    const panY = cam.panStartY + (cam.panEndY - cam.panStartY) * easeT;
    const rot = cam.rotationStart + (cam.rotationEnd - cam.rotationStart) * easeT;

    // Apply impact camera shake
    const shake = this.getShakeOffset();

    return {
      zoom,
      panX: panX * viewportWidth + shake.x,
      panY: panY * viewportHeight + shake.y,
      rotation: (rot * Math.PI) / 180 + shake.rot
    };
  }

  /**
   * Draw standard panel with camera transform (backward compatible)
   */
  drawPanel(ctx, image, panel, progress, viewportWidth, viewportHeight) {
    if (!image || !panel || !panel.bounds) return;

    const b = panel.bounds;
    const sx = b.x * image.naturalWidth;
    const sy = b.y * image.naturalHeight;
    const sw = b.w * image.naturalWidth;
    const sh = b.h * image.naturalHeight;

    const transform = this.computeTransform(panel, progress, viewportWidth, viewportHeight);

    ctx.save();
    ctx.translate(viewportWidth / 2 + transform.panX, viewportHeight / 2 + transform.panY);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.zoom, transform.zoom);

    const scale = Math.max(viewportWidth / sw, viewportHeight / sh);
    const dw = sw * scale;
    const dh = sh * scale;

    ctx.drawImage(image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  /**
   * Draw a framed region (panel or dialogue bubble) with continuous subtle Ken Burns drift
   */
  drawFramedRegion(ctx, image, bounds, progress, viewportWidth, viewportHeight, options = {}) {
    if (!image || !bounds) return;

    const easeT = MangaCameraEngine.easeInOutSine(progress);

    // Default gentle drift during dialogue so frame is alive
    const zoomStart = options.zoomStart || 1.0;
    const zoomEnd = options.zoomEnd || 1.08;
    const zoom = zoomStart + (zoomEnd - zoomStart) * easeT;

    const panShiftX = (options.panShiftX || 0.02) * (easeT - 0.5) * viewportWidth;
    const panShiftY = (options.panShiftY || 0.02) * (easeT - 0.5) * viewportHeight;

    const shake = this.getShakeOffset();

    const imgW = image.naturalWidth || image.width;
    const imgH = image.naturalHeight || image.height;

    // Source bounds on image
    const sx = Math.max(0, bounds.x * imgW);
    const sy = Math.max(0, bounds.y * imgH);
    const sw = Math.min(imgW - sx, bounds.w * imgW);
    const sh = Math.min(imgH - sy, bounds.h * imgH);

    // Viewport scale to cover comfortably
    const scale = Math.max(viewportWidth / sw, viewportHeight / sh);
    const dw = sw * scale;
    const dh = sh * scale;

    ctx.save();
    ctx.translate(viewportWidth / 2 + panShiftX + shake.x, viewportHeight / 2 + panShiftY + shake.y);
    ctx.rotate(shake.rot);
    ctx.scale(zoom, zoom);

    ctx.drawImage(image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  /**
   * Render cinematic transition between previous scene and next scene
   * No page-flips! Uses cross-dissolve, zoom-through, pan-glide, or anime shutter-wipe
   */
  drawTransition(
    ctx,
    prevScene,
    nextScene,
    transitionProgress,
    transitionType = 'cross-dissolve',
    viewportWidth = 1280,
    viewportHeight = 720
  ) {
    const t = Math.max(0, Math.min(1, transitionProgress));

    switch (transitionType) {
      case 'zoom-through': {
        // Prev scene zooms in deeper and fades out
        const zoomPrev = 1.0 + t * 0.45;
        const alphaPrev = 1 - MangaCameraEngine.easeInOutCubic(t);

        // Next scene enters slightly zoomed and settles
        const zoomNext = 1.25 - (1 - t) * 0.15;
        const alphaNext = MangaCameraEngine.easeInOutCubic(t);

        ctx.save();
        ctx.globalAlpha = alphaPrev;
        this.drawFramedRegion(ctx, prevScene.image, prevScene.bounds, 1.0, viewportWidth, viewportHeight, {
          zoomStart: zoomPrev,
          zoomEnd: zoomPrev
        });
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = alphaNext;
        this.drawFramedRegion(ctx, nextScene.image, nextScene.bounds, 0.0, viewportWidth, viewportHeight, {
          zoomStart: zoomNext,
          zoomEnd: zoomNext
        });
        ctx.restore();
        break;
      }

      case 'pan-glide': {
        // Glide smoothly in reading direction (e.g., bottom to top when jumping pages)
        const easeT = MangaCameraEngine.easeInOutCubic(t);
        const shiftY = easeT * viewportHeight;

        ctx.save();
        ctx.translate(0, -shiftY);
        this.drawFramedRegion(ctx, prevScene.image, prevScene.bounds, 1.0, viewportWidth, viewportHeight);
        ctx.restore();

        ctx.save();
        ctx.translate(0, viewportHeight - shiftY);
        this.drawFramedRegion(ctx, nextScene.image, nextScene.bounds, 0.0, viewportWidth, viewportHeight);
        ctx.restore();
        break;
      }

      case 'shutter-wipe': {
        // Anime-style diagonal slash wipe
        const easeT = MangaCameraEngine.easeInOutCubic(t);
        const wipePos = easeT * (viewportWidth + viewportHeight);

        // Draw prev scene full
        this.drawFramedRegion(ctx, prevScene.image, prevScene.bounds, 1.0, viewportWidth, viewportHeight);

        // Mask next scene behind diagonal wipe
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(wipePos - viewportHeight, 0);
        ctx.lineTo(viewportWidth, 0);
        ctx.lineTo(viewportWidth, viewportHeight);
        ctx.lineTo(wipePos, viewportHeight);
        ctx.closePath();
        ctx.clip();

        this.drawFramedRegion(ctx, nextScene.image, nextScene.bounds, 0.0, viewportWidth, viewportHeight);

        // Draw glowing edge line
        ctx.beginPath();
        ctx.moveTo(wipePos - viewportHeight, 0);
        ctx.lineTo(wipePos, viewportHeight);
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.restore();
        break;
      }

      case 'cross-dissolve':
      default: {
        // Smooth opacity dissolve
        const easeT = MangaCameraEngine.easeInOutQuad(t);

        ctx.save();
        ctx.globalAlpha = 1 - easeT;
        this.drawFramedRegion(ctx, prevScene.image, prevScene.bounds, 1.0, viewportWidth, viewportHeight);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = easeT;
        this.drawFramedRegion(ctx, nextScene.image, nextScene.bounds, 0.0, viewportWidth, viewportHeight);
        ctx.restore();
        break;
      }
    }
  }
}
