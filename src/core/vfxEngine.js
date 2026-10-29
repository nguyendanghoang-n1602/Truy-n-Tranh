/**
 * MangaVFXEngine - 60 FPS Procedural Action Visual Effects
 * Focus lines, speed lines, slash arcs, impact shockwaves, screen flashes, and particles.
 */
export class MangaVFXEngine {
  constructor() {
    this.particles = [];
    this.slashArcs = [];
    this.shockwaves = [];
    this.flashState = { active: false, color: '#fff', alpha: 0 };
  }

  reset() {
    this.particles = [];
    this.slashArcs = [];
    this.shockwaves = [];
    this.flashState = { active: false, color: '#fff', alpha: 0 };
  }

  triggerFlash(color = '#ffffff', duration = 0.2) {
    this.flashState = {
      active: true,
      color,
      alpha: 1.0,
      decay: 1.0 / duration
    };
  }

  triggerSlash(x, y, angle = -25, color = '#38bdf8', size = 350) {
    this.slashArcs.push({
      x,
      y,
      angle: (angle * Math.PI) / 180,
      color,
      size,
      progress: 0,
      life: 0.35,
      maxLife: 0.35
    });
  }

  triggerShockwave(x, y, maxRadius = 300, color = 'rgba(255,255,255,0.8)') {
    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius,
      color,
      progress: 0,
      duration: 0.4
    });
  }

  spawnSparks(x, y, count = 25, color = '#f59e0b') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 180 + Math.random() * 450;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.4 ? color : '#ffffff',
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        gravity: 400
      });
    }
  }

  update(dt) {
    // Update flash
    if (this.flashState.active) {
      this.flashState.alpha -= this.flashState.decay * dt;
      if (this.flashState.alpha <= 0) {
        this.flashState.active = false;
        this.flashState.alpha = 0;
      }
    }

    // Update slash arcs
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const arc = this.slashArcs[i];
      arc.life -= dt;
      arc.progress = 1 - arc.life / arc.maxLife;
      if (arc.life <= 0) {
        this.slashArcs.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.progress += dt / sw.duration;
      sw.radius = sw.maxRadius * Math.sin((sw.progress * Math.PI) / 2);
      if (sw.progress >= 1) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render procedural Manga Focus Lines (Đường tập trung hướng tâm)
   */
  renderFocusLines(ctx, width, height, centerX, centerY, intensity = 0.8) {
    const rayCount = Math.floor(65 * intensity);
    const maxRadius = Math.hypot(width, height) * 0.75;
    const innerRadius = Math.min(width, height) * 0.16;

    ctx.save();
    ctx.translate(centerX, centerY);

    const angleStep = (Math.PI * 2) / rayCount;
    ctx.fillStyle = '#05070c';

    for (let i = 0; i < rayCount; i++) {
      // Dynamic jitter per frame
      const jitter = (Math.random() - 0.5) * angleStep * 0.7;
      const angle = i * angleStep + jitter;
      const thickness = (0.012 + Math.random() * 0.025) * intensity;

      const inner = innerRadius + (Math.random() - 0.5) * 40;
      const outer = maxRadius;

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle - thickness) * outer, Math.sin(angle - thickness) * outer);
      ctx.lineTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle + thickness) * outer, Math.sin(angle + thickness) * outer);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Render directional Speed Lines (Đường tốc độ ngang/chéo)
   */
  renderSpeedLines(ctx, width, height, angleDeg = 0, intensity = 1.0) {
    const lineCount = Math.floor(45 * intensity);
    const rad = (angleDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rad);

    const bound = Math.hypot(width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineCap = 'round';

    for (let i = 0; i < lineCount; i++) {
      const y = (Math.random() - 0.5) * bound;
      const length = bound * (0.3 + Math.random() * 0.5);
      const x = (Math.random() - 0.5) * bound;
      const widthLine = 1 + Math.random() * 3.5;

      ctx.lineWidth = widthLine;
      ctx.beginPath();
      ctx.moveTo(x - length / 2, y);
      ctx.lineTo(x + length / 2, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render Slash Arcs (Vệt chém hình trăng lưỡi liềm phát sáng)
   */
  renderSlashArcs(ctx) {
    ctx.save();
    for (const arc of this.slashArcs) {
      const alpha = Math.sin(arc.progress * Math.PI);
      ctx.save();
      ctx.translate(arc.x, arc.y);
      ctx.rotate(arc.angle);

      // Outer glow
      ctx.shadowColor = arc.color;
      ctx.shadowBlur = 25;

      ctx.beginPath();
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 12 * alpha;
      ctx.lineCap = 'round';

      // Curved crescent
      const r = arc.size;
      ctx.arc(0, 0, r, -0.6 * Math.PI, 0.4 * Math.PI, false);
      ctx.stroke();

      // Sharp white core
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 * alpha;
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Render Shockwaves
   */
  renderShockwaves(ctx) {
    ctx.save();
    for (const sw of this.shockwaves) {
      const alpha = 1 - sw.progress;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 6 * alpha;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Render Sparks / Particles
   */
  renderParticles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Render Fullscreen Flash
   */
  renderFlash(ctx, width, height) {
    if (this.flashState.active && this.flashState.alpha > 0) {
      ctx.save();
      ctx.fillStyle = this.flashState.color;
      ctx.globalAlpha = Math.min(1, this.flashState.alpha);
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  /**
   * Master render method
   */
  render(ctx, width, height, currentVFX = {}) {
    // 1. Focus Lines
    if (currentVFX.focusLines) {
      const cx = (currentVFX.focusCenterX ?? 0.5) * width;
      const cy = (currentVFX.focusCenterY ?? 0.5) * height;
      this.renderFocusLines(ctx, width, height, cx, cy, currentVFX.focusIntensity ?? 0.8);
    }

    // 2. Speed Lines
    if (currentVFX.speedLines) {
      this.renderSpeedLines(ctx, width, height, currentVFX.speedAngle ?? 0, currentVFX.speedIntensity ?? 1.0);
    }

    // 3. Slash Arcs
    this.renderSlashArcs(ctx);

    // 4. Shockwaves
    this.renderShockwaves(ctx);

    // 5. Particles
    this.renderParticles(ctx);

    // 6. Flash overlay
    this.renderFlash(ctx, width, height);
  }
}
