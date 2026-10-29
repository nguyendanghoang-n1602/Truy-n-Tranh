/**
 * MangaPanelDetector - Automated Panel Segmentation & Heuristic Layout Extraction
 * Slices comic pages into structured panel bounds using gutter analysis.
 */
export class MangaPanelDetector {
  /**
   * Automatically detect panels from an HTMLImageElement
   */
  static detectPanels(image, options = { readDirection: 'rtl', minPanelArea: 0.03 }) {
    return new Promise((resolve) => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;

      // Downsample for fast computer vision processing
      const canvas = document.createElement('canvas');
      const targetW = 400;
      const scale = targetW / width;
      const targetH = Math.round(height * scale);

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const data = imgData.data;

      // 1. Calculate luminance map and horizontal projection of white/black borders
      const isGutterRow = new Uint8Array(targetH);
      const rowVariance = new Float32Array(targetH);

      for (let y = 0; y < targetH; y++) {
        let whiteCount = 0;
        let blackCount = 0;
        for (let x = 0; x < targetW; x++) {
          const idx = (y * targetW + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum > 235) whiteCount++;
          if (lum < 20) blackCount++;
        }
        // If row is mostly white (>85%) or mostly black (>80%), it's a gutter separator
        if (whiteCount / targetW > 0.82 || blackCount / targetW > 0.80) {
          isGutterRow[y] = 1;
        }
      }

      // 2. Identify horizontal panel strips
      const strips = [];
      let inStrip = false;
      let startY = 0;

      for (let y = 0; y < targetH; y++) {
        if (!isGutterRow[y] && !inStrip) {
          inStrip = true;
          startY = y;
        } else if (isGutterRow[y] && inStrip) {
          inStrip = false;
          if (y - startY > targetH * 0.08) {
            strips.push({ y1: startY, y2: y });
          }
        }
      }
      if (inStrip && targetH - startY > targetH * 0.08) {
        strips.push({ y1: startY, y2: targetH });
      }

      // 3. For each strip, detect vertical splits
      const detectedPanels = [];
      let panelIndex = 1;

      for (const strip of strips) {
        const stripH = strip.y2 - strip.y1;
        const isGutterCol = new Uint8Array(targetW);

        for (let x = 0; x < targetW; x++) {
          let whiteCount = 0;
          let blackCount = 0;
          for (let y = strip.y1; y < strip.y2; y++) {
            const idx = (y * targetW + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (lum > 235) whiteCount++;
            if (lum < 20) blackCount++;
          }
          if (whiteCount / stripH > 0.80 || blackCount / stripH > 0.80) {
            isGutterCol[x] = 1;
          }
        }

        let inCol = false;
        let startX = 0;
        const subBoxes = [];

        for (let x = 0; x < targetW; x++) {
          if (!isGutterCol[x] && !inCol) {
            inCol = true;
            startX = x;
          } else if (isGutterCol[x] && inCol) {
            inCol = false;
            if (x - startX > targetW * 0.12) {
              subBoxes.push({ x1: startX, x2: x });
            }
          }
        }
        if (inCol && targetW - startX > targetW * 0.12) {
          subBoxes.push({ x1: startX, x2: targetW });
        }

        // If no vertical split was found, treat entire strip as one panel
        if (subBoxes.length === 0) {
          subBoxes.push({ x1: 0, x2: targetW });
        }

        // Sort subBoxes based on reading direction
        if (options.readDirection === 'rtl') {
          subBoxes.sort((a, b) => b.x1 - a.x1); // Right to Left
        } else {
          subBoxes.sort((a, b) => a.x1 - b.x1); // Left to Right
        }

        for (const box of subBoxes) {
          // Normalize to [0..1]
          const bx = Math.max(0.01, box.x1 / targetW);
          const by = Math.max(0.01, strip.y1 / targetH);
          const bw = Math.min(0.98, (box.x2 - box.x1) / targetW);
          const bh = Math.min(0.98, stripH / targetH);

          if (bw * bh >= options.minPanelArea) {
            detectedPanels.push(
              MangaPanelDetector.createDefaultPanelConfig(panelIndex++, {
                x: Number(bx.toFixed(3)),
                y: Number(by.toFixed(3)),
                w: Number(bw.toFixed(3)),
                h: Number(bh.toFixed(3))
              })
            );
          }
        }
      }

      // If detection yielded fewer than 2 panels (e.g. continuous manhwa), provide smart fallback splits
      if (detectedPanels.length < 2) {
        resolve(MangaPanelDetector.getFallbackLayout(3));
      } else {
        resolve(detectedPanels);
      }
    });
  }

  /**
   * Generate default action configuration for a newly created or detected panel
   */
  static createDefaultPanelConfig(index, bounds) {
    const actionTypes = ['charge', 'dash', 'slash', 'impact', 'resolve'];
    const selectedAction = actionTypes[(index - 1) % actionTypes.length];

    let camera = {
      zoomStart: 1.0,
      zoomEnd: 1.25,
      panStartX: 0,
      panStartY: 0.05,
      panEndX: 0,
      panEndY: -0.05,
      rotationStart: 0,
      rotationEnd: (index % 2 === 0 ? 2 : -2)
    };

    let vfx = {
      focusLines: index % 2 === 1,
      focusIntensity: 0.8,
      focusCenterX: 0.5,
      focusCenterY: 0.5,
      speedLines: index % 2 === 0,
      speedAngle: index % 2 === 0 ? -15 : 0,
      speedIntensity: 1.0,
      shakeIntensity: 6 + (index * 2),
      shakeTriggerTime: 0.5,
      slashArc: index % 2 === 0,
      slashColor: '#38bdf8',
      screenFlash: true,
      flashColor: '#ffffff',
      flashTime: 0.5,
      sparks: true,
      sparkCount: 30
    };

    return {
      id: `panel-${Date.now()}-${index}`,
      title: `Panel ${index} (Hành động)`,
      bounds,
      duration: 2.2,
      camera,
      vfx,
      audio: {
        sound: selectedAction,
        impactAt: 0.5,
        impactSound: selectedAction === 'slash' ? 'slash' : 'boom'
      },
      caption: `Cảnh hành động ${index}`
    };
  }

  /**
   * Fallback Layout generator (2, 3, or 4 panels evenly distributed)
   */
  static getFallbackLayout(panelCount = 3) {
    const panels = [];
    const heightPerPanel = 0.94 / panelCount;
    for (let i = 0; i < panelCount; i++) {
      panels.push(
        MangaPanelDetector.createDefaultPanelConfig(i + 1, {
          x: 0.03,
          y: Number((0.03 + i * heightPerPanel).toFixed(3)),
          w: 0.94,
          h: Number((heightPerPanel - 0.02).toFixed(3))
        })
      );
    }
    return panels;
  }
}
