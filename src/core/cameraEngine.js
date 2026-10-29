/**
 * MangaCameraEngine - Cinematic 2.5D Action Camera
 * Interpolates zooms, pans, Dutch angles, whip-snaps, and decaying impact shakes.
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
      rot: (osc1 * this.shakeAmplitude * 0.002)
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

  /**
   * Compute transformed viewport for current panel & progress [0..1]
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
   * Draw panel image onto canvas with camera transform
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

    // Move to viewport center
    ctx.translate(viewportWidth / 2 + transform.panX, viewportHeight / 2 + transform.panY);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.zoom, transform.zoom);

    // Calculate fit-to-viewport dimensions (cover or contain with bleed)
    const scale = Math.max(viewportWidth / sw, viewportHeight / sh);
    const dw = sw * scale;
    const dh = sh * scale;

    ctx.drawImage(image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);

    ctx.restore();
  }
}
