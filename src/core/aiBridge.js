/**
 * MangaAIBridge - Bridge for Generative AI Image-to-Video Pipelines
 * Exports structured prompt descriptors, camera motion matrices, and ComfyUI/Runway/Kling presets.
 */
export class MangaAIBridge {
  /**
   * Generate motion prompt descriptor for a specific panel
   */
  static generatePanelAIPrompt(panel, globalStyle = 'high octane anime action') {
    const cam = panel.camera || {};
    const vfx = panel.vfx || {};

    let cameraDesc = [];
    if (cam.zoomEnd > cam.zoomStart) cameraDesc.push('dynamic punch-in zoom');
    if (cam.zoomEnd < cam.zoomStart) cameraDesc.push('fast pull-back reveal');
    if (cam.panEndX !== cam.panStartX) cameraDesc.push('kinetic horizontal camera tracking');
    if (cam.rotationEnd !== cam.rotationStart) cameraDesc.push('dynamic Dutch angle camera tilt');

    let vfxDesc = [];
    if (vfx.speedLines) vfxDesc.push('intense manga speed lines, wind streaks');
    if (vfx.focusLines) vfxDesc.push('radial focus lines, high tension');
    if (vfx.slashArc) vfxDesc.push('glowing electric crescent sword slash, particle sparks');
    if (vfx.screenFlash) vfxDesc.push('impact flash, explosive shockwave');

    const prompt = [
      panel.caption || 'action scene',
      globalStyle,
      cameraDesc.join(', '),
      vfxDesc.join(', '),
      'sakuga animation, 60fps, studio quality, crisp lineart, cinematic lighting'
    ].filter(Boolean).join(', ');

    return {
      panelId: panel.id,
      prompt,
      motionBucket: Math.round((vfx.shakeIntensity || 5) * 12),
      cameraMotion: {
        zoom: Number((cam.zoomEnd - cam.zoomStart).toFixed(2)),
        panX: Number((cam.panEndX - cam.panStartX).toFixed(2)),
        panY: Number((cam.panEndY - cam.panStartY).toFixed(2)),
        roll: Number((cam.rotationEnd - cam.rotationStart).toFixed(2))
      }
    };
  }

  /**
   * Export Kling 1.5 / Runway Gen-3 JSON payload
   */
  static exportRunwayPayload(panels) {
    return {
      version: 'runway-gen3-alpha',
      project: 'Manga-To-Action-Video',
      totalDuration: panels.reduce((s, p) => s + p.duration, 0),
      shots: panels.map((p, i) => {
        const ai = MangaAIBridge.generatePanelAIPrompt(p);
        return {
          shotIndex: i + 1,
          durationSeconds: p.duration,
          promptText: ai.prompt,
          motionParameters: ai.cameraMotion,
          impactFrameTime: p.audio?.impactAt || 0.5
        };
      })
    };
  }

  /**
   * Export ComfyUI AnimateDiff Workflow JSON template
   */
  static exportComfyUIWorkflow(panels) {
    return {
      workflowName: 'AnimateDiff_Manga_Motion_Pipeline',
      timestamp: new Date().toISOString(),
      nodes: [
        {
          id: 1,
          type: 'LoadImage',
          title: 'Manga Panel Input'
        },
        {
          id: 2,
          type: 'ADE_AnimateDiffLoaderGen1',
          title: 'AnimateDiff Motion Module (v3/sd15)'
        },
        {
          id: 3,
          type: 'CameraControl_Advanced',
          properties: panels.map((p) => MangaAIBridge.generatePanelAIPrompt(p).cameraMotion)
        },
        {
          id: 4,
          type: 'CLIPTextEncode',
          prompt: panels.map((p) => MangaAIBridge.generatePanelAIPrompt(p).prompt).join(' | ')
        },
        {
          id: 5,
          type: 'VideoCombine_Pro',
          format: 'video/h264-mp4',
          fps: 60
        }
      ]
    };
  }
}
