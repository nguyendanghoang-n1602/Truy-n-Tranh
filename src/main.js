import { SAMPLES } from './data/samples.js';
import { MangaAudioEngine } from './core/audioSynthesizer.js';
import { MangaVFXEngine } from './core/vfxEngine.js';
import { MangaCameraEngine } from './core/cameraEngine.js';
import { MangaPanelDetector } from './core/panelDetector.js';
import { MangaVideoExporter } from './core/videoExporter.js';
import { MangaAIBridge } from './core/aiBridge.js';

// Application State
const state = {
  currentSampleId: 'samurai-slash',
  image: null,
  panels: [],
  selectedPanelIndex: 0,
  isPlaying: false,
  currentTime: 0,
  totalDuration: 0,
  isLooping: true,
  aspectRatio: '16:9',
  playbackSpeed: 1.0,
  lastFrameTime: performance.now(),
  lastPanelIndexForTriggers: -1,
  firedTriggers: new Set()
};

// Instantiate Core Engines
const audioEngine = new MangaAudioEngine();
const cameraEngine = new MangaCameraEngine();
const vfxEngine = new MangaVFXEngine();
const videoExporter = new MangaVideoExporter(audioEngine);

// DOM Elements
const renderCanvas = document.getElementById('renderCanvas');
const renderCtx = renderCanvas.getContext('2d');
const canvasContainer = document.getElementById('canvasContainer');

const boundsCanvas = document.getElementById('boundsCanvas');
const boundsCtx = boundsCanvas.getContext('2d');

const hudPanelTitle = document.getElementById('hudPanelTitle');
const hudTimecode = document.getElementById('hudTimecode');
const hudFps = document.getElementById('hudFps');

const btnPlayPause = document.getElementById('btnPlayPause');
const btnStepPrev = document.getElementById('btnStepPrev');
const btnStepNext = document.getElementById('btnStepNext');
const btnLoopToggle = document.getElementById('btnLoopToggle');
const timelineTrack = document.getElementById('timelineTrack');
const timelineFill = document.getElementById('timelineFill');
const timelineMarkers = document.getElementById('timelineMarkers');
const timelineCurrentTime = document.getElementById('timelineCurrentTime');
const timelinePanelIndicator = document.getElementById('timelinePanelIndicator');
const timelineTotalDuration = document.getElementById('timelineTotalDuration');

const panelListContainer = document.getElementById('panelListContainer');
const panelCountTag = document.getElementById('panelCountTag');
const currentPanelBadge = document.getElementById('currentPanelBadge');

// Sliders and Toggles
const inputZoomEnd = document.getElementById('inputZoomEnd');
const valZoomEnd = document.getElementById('valZoomEnd');
const inputRotation = document.getElementById('inputRotation');
const valRotation = document.getElementById('valRotation');
const inputShake = document.getElementById('inputShake');
const valShake = document.getElementById('valShake');
const inputDuration = document.getElementById('inputDuration');
const valDuration = document.getElementById('valDuration');

const chkFocusLines = document.getElementById('chkFocusLines');
const inputFocusIntensity = document.getElementById('inputFocusIntensity');
const valFocusIntensity = document.getElementById('valFocusIntensity');
const chkSpeedLines = document.getElementById('chkSpeedLines');
const chkSlashArc = document.getElementById('chkSlashArc');
const chkFlash = document.getElementById('chkFlash');
const chkSparks = document.getElementById('chkSparks');
const selectSound = document.getElementById('selectSound');

// Fullpage bounds editor elements
const fullPageOverlay = document.getElementById('fullPageOverlay');
const btnToggleFullPage = document.getElementById('btnToggleFullPage');
const btnCloseFullPage = document.getElementById('btnCloseFullPage');
const btnAddPanelManual = document.getElementById('btnAddPanelManual');

// Header elements
const samplePicker = document.getElementById('samplePicker');
const fileUpload = document.getElementById('fileUpload');
const btnAudioToggle = document.getElementById('btnAudioToggle');
const audioIcon = document.getElementById('audioIcon');
const audioLabel = document.getElementById('audioLabel');

// Export Modal Elements
const exportModal = document.getElementById('exportModal');
const btnOpenExport = document.getElementById('btnOpenExport');
const btnCloseExport = document.getElementById('btnCloseExport');
const btnCancelExport = document.getElementById('btnCancelExport');
const btnStartExport = document.getElementById('btnStartExport');
const exportResolutionSelect = document.getElementById('exportResolutionSelect');
const exportStatusArea = document.getElementById('exportStatusArea');
const exportProgressBar = document.getElementById('exportProgressBar');
const exportPercentText = document.getElementById('exportPercentText');
const exportResultArea = document.getElementById('exportResultArea');
const exportVideoPreview = document.getElementById('exportVideoPreview');
const btnDownloadVideo = document.getElementById('btnDownloadVideo');
const exportModalFooter = document.getElementById('exportModalFooter');

// AI Bridge Modal Elements
const aiBridgeModal = document.getElementById('aiBridgeModal');
const btnOpenAIBridge = document.getElementById('btnOpenAIBridge');
const btnCloseAIBridge = document.getElementById('btnCloseAIBridge');
const tabRunway = document.getElementById('tabRunway');
const tabComfyUI = document.getElementById('tabComfyUI');
const aiPayloadBox = document.getElementById('aiPayloadBox');
const btnCopyAIPayload = document.getElementById('btnCopyAIPayload');
const btnDownloadAIJson = document.getElementById('btnDownloadAIJson');
const aiCopyNotice = document.getElementById('aiCopyNotice');
let currentAITab = 'runway';

/**
 * Load comic sample by ID
 */
async function loadSample(sampleId) {
  const sample = SAMPLES.find((s) => s.id === sampleId) || SAMPLES[0];
  state.currentSampleId = sample.id;

  // Deep clone panels
  state.panels = JSON.parse(JSON.stringify(sample.panels));
  calculateTotalDuration();

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = sample.image;

  await new Promise((res) => {
    img.onload = () => {
      state.image = img;
      res();
    };
  });

  state.currentTime = 0;
  state.selectedPanelIndex = 0;
  state.firedTriggers.clear();

  updateUI();
  updatePanelList();
  renderTimelineMarkers();
  syncInspector();
}

/**
 * Compute total duration
 */
function calculateTotalDuration() {
  state.totalDuration = state.panels.reduce((sum, p) => sum + p.duration, 0);
  timelineTotalDuration.textContent = `${state.totalDuration.toFixed(2)}s`;
}

/**
 * Update UI state
 */
function updateUI() {
  panelCountTag.textContent = `${state.panels.length} Cảnh`;
  updateTimelineScrubber();
}

/**
 * Render Timeline Markers for panels
 */
function renderTimelineMarkers() {
  timelineMarkers.innerHTML = '';
  let accum = 0;
  for (let i = 0; i < state.panels.length - 1; i++) {
    accum += state.panels[i].duration;
    const pct = (accum / state.totalDuration) * 100;
    const marker = document.createElement('div');
    marker.className = 'timeline-marker';
    marker.style.left = `${pct}%`;
    timelineMarkers.appendChild(marker);
  }
}

/**
 * Update Timeline Scrubber
 */
function updateTimelineScrubber() {
  const pct = state.totalDuration > 0 ? (state.currentTime / state.totalDuration) * 100 : 0;
  timelineFill.style.width = `${pct}%`;
  timelineCurrentTime.textContent = `${state.currentTime.toFixed(2)}s`;
  hudTimecode.textContent = `${formatTime(state.currentTime)} / ${formatTime(state.totalDuration)}`;
  timelinePanelIndicator.textContent = `Phân cảnh ${state.selectedPanelIndex + 1} / ${state.panels.length}`;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toFixed(2).padStart(5, '0');
  return `${m}:${s}`;
}

/**
 * Re-render sidebar panel cards
 */
function updatePanelList() {
  panelListContainer.innerHTML = '';

  state.panels.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = `panel-card ${idx === state.selectedPanelIndex ? 'active' : ''}`;
    card.onclick = () => {
      seekToPanel(idx);
    };

    // Thumbnail preview
    const thumbBox = document.createElement('div');
    thumbBox.className = 'panel-thumb-box';
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 100;
    thumbCanvas.height = 80;
    thumbCanvas.className = 'panel-thumb-img';
    const tCtx = thumbCanvas.getContext('2d');

    if (state.image) {
      const b = p.bounds;
      const sx = b.x * state.image.naturalWidth;
      const sy = b.y * state.image.naturalHeight;
      const sw = b.w * state.image.naturalWidth;
      const sh = b.h * state.image.naturalHeight;
      tCtx.drawImage(state.image, sx, sy, sw, sh, 0, 0, 100, 80);
    }
    thumbBox.appendChild(thumbCanvas);

    // Meta details
    const meta = document.createElement('div');
    meta.className = 'panel-meta';
    meta.innerHTML = `
      <div class="panel-name">${p.title}</div>
      <div class="panel-tags">
        <span class="tag">${p.duration.toFixed(1)}s</span>
        ${p.vfx?.focusLines ? '<span class="tag tag-vfx">Focus</span>' : ''}
        ${p.vfx?.speedLines ? '<span class="tag tag-vfx">Speed</span>' : ''}
        ${p.vfx?.slashArc ? '<span class="tag tag-vfx">Slash</span>' : ''}
        ${p.vfx?.shakeIntensity > 0 ? `<span class="tag tag-vfx">Shake ${p.vfx.shakeIntensity}</span>` : ''}
        <span class="tag tag-audio">${p.audio?.sound || 'SFX'}</span>
      </div>
    `;

    card.appendChild(thumbBox);
    card.appendChild(meta);
    panelListContainer.appendChild(card);
  });
}

/**
 * Sync right-side Director FX Inspector with currently selected panel
 */
function syncInspector() {
  const panel = state.panels[state.selectedPanelIndex];
  if (!panel) return;

  currentPanelBadge.textContent = `P${state.selectedPanelIndex + 1}`;
  hudPanelTitle.textContent = panel.title;

  // Camera
  inputZoomEnd.value = panel.camera.zoomEnd;
  valZoomEnd.textContent = `${panel.camera.zoomEnd.toFixed(2)}x`;

  inputRotation.value = panel.camera.rotationEnd;
  valRotation.textContent = `${panel.camera.rotationEnd}°`;

  inputShake.value = panel.vfx.shakeIntensity || 0;
  valShake.textContent = `${panel.vfx.shakeIntensity || 0}px`;

  inputDuration.value = panel.duration;
  valDuration.textContent = `${panel.duration.toFixed(1)}s`;

  // VFX
  chkFocusLines.checked = !!panel.vfx.focusLines;
  inputFocusIntensity.value = panel.vfx.focusIntensity || 0.8;
  valFocusIntensity.textContent = (panel.vfx.focusIntensity || 0.8).toFixed(2);

  chkSpeedLines.checked = !!panel.vfx.speedLines;
  chkSlashArc.checked = !!panel.vfx.slashArc;
  chkFlash.checked = !!panel.vfx.screenFlash;
  chkSparks.checked = !!panel.vfx.sparks;

  // Audio
  selectSound.value = panel.audio?.sound || 'slash';
}

/**
 * Seek playback to start of specific panel
 */
function seekToPanel(panelIndex) {
  state.selectedPanelIndex = panelIndex;
  let accum = 0;
  for (let i = 0; i < panelIndex; i++) {
    accum += state.panels[i].duration;
  }
  state.currentTime = accum;
  state.firedTriggers.clear();
  vfxEngine.reset();
  updateUI();
  updatePanelList();
  syncInspector();
}

/**
 * Set Aspect Ratio and resize canvas
 */
function setAspectRatio(ratio) {
  state.aspectRatio = ratio;
  document.querySelectorAll('.ratio-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.ratio === ratio);
  });

  if (ratio === '16:9') {
    renderCanvas.width = 1280;
    renderCanvas.height = 720;
    canvasContainer.style.aspectRatio = '16 / 9';
    canvasContainer.style.height = '85%';
    canvasContainer.style.width = 'auto';
  } else if (ratio === '9:16') {
    renderCanvas.width = 720;
    renderCanvas.height = 1280;
    canvasContainer.style.aspectRatio = '9 / 16';
    canvasContainer.style.height = '90%';
    canvasContainer.style.width = 'auto';
  } else if (ratio === '1:1') {
    renderCanvas.width = 1000;
    renderCanvas.height = 1000;
    canvasContainer.style.aspectRatio = '1 / 1';
    canvasContainer.style.height = '85%';
    canvasContainer.style.width = 'auto';
  }
}

/**
 * Action Choreography Presets
 */
function applyPreset(presetName) {
  const panel = state.panels[state.selectedPanelIndex];
  if (!panel) return;

  switch (presetName) {
    case 'slash':
      panel.camera.zoomStart = 1.0;
      panel.camera.zoomEnd = 1.35;
      panel.camera.rotationEnd = -3;
      panel.vfx.focusLines = false;
      panel.vfx.speedLines = true;
      panel.vfx.speedAngle = -20;
      panel.vfx.slashArc = true;
      panel.vfx.slashColor = '#00f0ff';
      panel.vfx.screenFlash = true;
      panel.vfx.shakeIntensity = 10;
      panel.vfx.sparks = true;
      panel.audio.sound = 'slash';
      break;

    case 'impact':
      panel.camera.zoomStart = 1.3;
      panel.camera.zoomEnd = 1.0;
      panel.camera.rotationEnd = 2;
      panel.vfx.focusLines = true;
      panel.vfx.focusIntensity = 1.0;
      panel.vfx.speedLines = false;
      panel.vfx.slashArc = false;
      panel.vfx.screenFlash = true;
      panel.vfx.shakeIntensity = 16;
      panel.vfx.sparks = true;
      panel.audio.sound = 'heavy_impact';
      break;

    case 'dash':
      panel.camera.zoomStart = 1.05;
      panel.camera.zoomEnd = 1.25;
      panel.camera.panStartX = 0.2;
      panel.camera.panEndX = -0.2;
      panel.vfx.speedLines = true;
      panel.vfx.speedIntensity = 1.3;
      panel.vfx.focusLines = false;
      panel.vfx.shakeIntensity = 5;
      panel.audio.sound = 'dash';
      break;

    case 'charge':
      panel.camera.zoomStart = 1.0;
      panel.camera.zoomEnd = 1.4;
      panel.camera.rotationEnd = 0;
      panel.vfx.focusLines = true;
      panel.vfx.focusIntensity = 0.85;
      panel.vfx.speedLines = false;
      panel.vfx.slashArc = false;
      panel.vfx.shakeIntensity = 3;
      panel.vfx.sparks = true;
      panel.audio.sound = 'charge';
      break;

    case 'zoom':
      panel.camera.zoomStart = 1.0;
      panel.camera.zoomEnd = 1.5;
      panel.vfx.focusLines = true;
      panel.vfx.focusIntensity = 0.6;
      panel.vfx.speedLines = false;
      panel.vfx.shakeIntensity = 2;
      panel.audio.sound = 'whoosh';
      break;

    case 'victory':
      panel.camera.zoomStart = 1.15;
      panel.camera.zoomEnd = 1.0;
      panel.camera.rotationEnd = 0;
      panel.vfx.focusLines = false;
      panel.vfx.speedLines = false;
      panel.vfx.slashArc = false;
      panel.vfx.shakeIntensity = 1;
      panel.audio.sound = 'whoosh';
      break;
  }

  syncInspector();
  updatePanelList();

  // Trigger test preview
  audioEngine.trigger(panel.audio.sound);
  cameraEngine.triggerShake(panel.vfx.shakeIntensity);
  if (panel.vfx.slashArc) {
    vfxEngine.triggerSlash(renderCanvas.width / 2, renderCanvas.height / 2);
  }
  if (panel.vfx.sparks) {
    vfxEngine.spawnSparks(renderCanvas.width / 2, renderCanvas.height / 2);
  }
}

/**
 * Master 60FPS Game/Animation Loop
 */
function animationLoop(timestamp) {
  const dt = Math.min((timestamp - state.lastFrameTime) / 1000, 0.1);
  state.lastFrameTime = timestamp;

  // Calculate FPS
  const fps = Math.round(1 / dt);
  hudFps.textContent = `${fps} FPS`;

  if (state.isPlaying && state.totalDuration > 0) {
    state.currentTime += dt * state.playbackSpeed;

    if (state.currentTime >= state.totalDuration) {
      if (state.isLooping) {
        state.currentTime = 0;
        state.firedTriggers.clear();
        vfxEngine.reset();
      } else {
        state.currentTime = state.totalDuration;
        state.isPlaying = false;
        btnPlayPause.textContent = '▶️';
      }
    }
    updateTimelineScrubber();
  }

  // Find currently active panel based on currentTime
  let accumulatedTime = 0;
  let activeIndex = 0;
  let panelLocalTime = 0;

  for (let i = 0; i < state.panels.length; i++) {
    const dur = state.panels[i].duration;
    if (state.currentTime >= accumulatedTime && state.currentTime < accumulatedTime + dur) {
      activeIndex = i;
      panelLocalTime = state.currentTime - accumulatedTime;
      break;
    }
    accumulatedTime += dur;
    if (i === state.panels.length - 1) {
      activeIndex = state.panels.length - 1;
      panelLocalTime = state.panels[activeIndex].duration;
    }
  }

  // Handle panel transition
  if (activeIndex !== state.selectedPanelIndex) {
    state.selectedPanelIndex = activeIndex;
    updatePanelList();
    syncInspector();
  }

  const currentPanel = state.panels[activeIndex];
  if (currentPanel) {
    const progress = Math.min(1, Math.max(0, panelLocalTime / currentPanel.duration));

    // Handle Timed Audio SFX Trigger
    const audioKey = `${currentPanel.id}-audio`;
    if (state.isPlaying && !state.firedTriggers.has(audioKey) && currentPanel.audio) {
      const impactT = currentPanel.audio.impactAt ?? 0.1;
      if (panelLocalTime >= impactT) {
        state.firedTriggers.add(audioKey);
        audioEngine.trigger(currentPanel.audio.sound);
        if (currentPanel.audio.impactSound) {
          audioEngine.trigger(currentPanel.audio.impactSound, 1.2);
        }
      }
    }

    // Handle Timed Shake & Flash Triggers
    const shakeKey = `${currentPanel.id}-shake`;
    if (state.isPlaying && !state.firedTriggers.has(shakeKey) && currentPanel.vfx?.shakeIntensity > 0) {
      const shakeT = currentPanel.vfx.shakeTriggerTime ?? 0.1;
      if (panelLocalTime >= shakeT) {
        state.firedTriggers.add(shakeKey);
        cameraEngine.triggerShake(currentPanel.vfx.shakeIntensity);
      }
    }

    const flashKey = `${currentPanel.id}-flash`;
    if (state.isPlaying && !state.firedTriggers.has(flashKey) && currentPanel.vfx?.screenFlash) {
      const flashT = currentPanel.vfx.flashTime ?? 0.1;
      if (panelLocalTime >= flashT) {
        state.firedTriggers.add(flashKey);
        vfxEngine.triggerFlash(currentPanel.vfx.flashColor || '#ffffff', 0.2);
        if (currentPanel.vfx.slashArc) {
          vfxEngine.triggerSlash(
            renderCanvas.width / 2,
            renderCanvas.height / 2,
            -25,
            currentPanel.vfx.slashColor || '#38bdf8',
            renderCanvas.width * 0.35
          );
        }
        if (currentPanel.vfx.sparks) {
          vfxEngine.spawnSparks(renderCanvas.width / 2, renderCanvas.height / 2, currentPanel.vfx.sparkCount || 25);
        }
      }
    }

    // Physics update
    cameraEngine.update(dt);
    vfxEngine.update(dt);

    // Clear Screen
    renderCtx.fillStyle = '#05070e';
    renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

    // Render Transformed Comic Panel
    cameraEngine.drawPanel(
      renderCtx,
      state.image,
      currentPanel,
      progress,
      renderCanvas.width,
      renderCanvas.height
    );

    // Render Procedural VFX Overlays
    vfxEngine.render(renderCtx, renderCanvas.width, renderCanvas.height, currentPanel.vfx);
  }

  requestAnimationFrame(animationLoop);
}

/**
 * Full Page Bounding Box Editor
 */
function renderFullPageBounds() {
  if (!state.image) return;

  const maxW = fullPageOverlay.clientWidth - 40;
  const maxH = fullPageOverlay.clientHeight - 100;
  const imgRatio = state.image.naturalWidth / state.image.naturalHeight;

  let dw = maxW;
  let dh = maxW / imgRatio;
  if (dh > maxH) {
    dh = maxH;
    dw = maxH * imgRatio;
  }

  boundsCanvas.width = dw;
  boundsCanvas.height = dh;

  boundsCtx.clearRect(0, 0, dw, dh);
  boundsCtx.drawImage(state.image, 0, 0, dw, dh);

  // Draw bounding boxes for each panel
  state.panels.forEach((p, i) => {
    const isSelected = i === state.selectedPanelIndex;
    const bx = p.bounds.x * dw;
    const by = p.bounds.y * dh;
    const bw = p.bounds.w * dw;
    const bh = p.bounds.h * dh;

    boundsCtx.strokeStyle = isSelected ? '#00f0ff' : 'rgba(255, 42, 95, 0.7)';
    boundsCtx.lineWidth = isSelected ? 3 : 2;
    boundsCtx.strokeRect(bx, by, bw, bh);

    // Semi-transparent fill
    boundsCtx.fillStyle = isSelected ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 42, 95, 0.08)';
    boundsCtx.fillRect(bx, by, bw, bh);

    // Label tag
    boundsCtx.fillStyle = isSelected ? '#00f0ff' : '#ff2a5f';
    boundsCtx.fillRect(bx, by, 75, 20);
    boundsCtx.fillStyle = '#000000';
    boundsCtx.font = 'bold 11px Outfit, sans-serif';
    boundsCtx.fillText(`Panel ${i + 1}`, bx + 6, by + 14);
  });
}

/**
 * Setup Event Listeners
 */
function setupEvents() {
  // Transport Controls
  btnPlayPause.onclick = () => {
    state.isPlaying = !state.isPlaying;
    btnPlayPause.textContent = state.isPlaying ? '⏸️' : '▶️';
    if (state.isPlaying) {
      audioEngine.ensureContext();
      if (state.currentTime >= state.totalDuration) {
        state.currentTime = 0;
        state.firedTriggers.clear();
      }
    }
  };

  btnStepPrev.onclick = () => {
    const prev = Math.max(0, state.selectedPanelIndex - 1);
    seekToPanel(prev);
  };

  btnStepNext.onclick = () => {
    const next = Math.min(state.panels.length - 1, state.selectedPanelIndex + 1);
    seekToPanel(next);
  };

  btnLoopToggle.onclick = () => {
    state.isLooping = !state.isLooping;
    btnLoopToggle.style.color = state.isLooping ? 'var(--accent-cyan)' : 'var(--text-muted)';
  };

  // Timeline Scrubbing
  timelineTrack.onclick = (e) => {
    const rect = timelineTrack.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    state.currentTime = ratio * state.totalDuration;
    state.firedTriggers.clear();
    vfxEngine.reset();
    updateTimelineScrubber();
  };

  // Sample Pickers
  document.querySelectorAll('.sample-btn[data-sample]').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('.sample-btn[data-sample]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      loadSample(btn.dataset.sample);
    };
  });

  // Aspect Ratio buttons
  document.querySelectorAll('.ratio-btn').forEach((btn) => {
    btn.onclick = () => setAspectRatio(btn.dataset.ratio);
  });

  // File Upload
  fileUpload.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = new Image();
      img.onload = async () => {
        state.image = img;
        // Auto-detect panels for uploaded image!
        const detected = await MangaPanelDetector.detectPanels(img);
        state.panels = detected;
        calculateTotalDuration();
        seekToPanel(0);
        renderTimelineMarkers();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Auto Detect Button
  document.getElementById('btnAutoDetect').onclick = async () => {
    if (!state.image) return;
    const origText = document.getElementById('btnAutoDetect').textContent;
    document.getElementById('btnAutoDetect').textContent = '⏳ Đang quét cấu trúc manga...';

    const detected = await MangaPanelDetector.detectPanels(state.image);
    state.panels = detected;
    calculateTotalDuration();
    seekToPanel(0);
    renderTimelineMarkers();

    document.getElementById('btnAutoDetect').textContent = '✅ Đã phát hiện ' + detected.length + ' Panels';
    setTimeout(() => {
      document.getElementById('btnAutoDetect').textContent = origText;
    }, 2000);
  };

  // Presets
  document.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.onclick = () => applyPreset(chip.dataset.preset);
  });

  // Audio Toggle
  btnAudioToggle.onclick = () => {
    const muted = audioEngine.toggleMute();
    audioIcon.textContent = muted ? '🔇' : '🔊';
    audioLabel.textContent = muted ? 'Âm thanh: Tắt' : 'Âm thanh: Bật';
  };

  // Test Audio
  document.getElementById('btnTestAudio').onclick = () => {
    audioEngine.trigger(selectSound.value, 1.2);
  };

  // Live Slider Inputs
  inputZoomEnd.oninput = (e) => {
    const val = parseFloat(e.target.value);
    valZoomEnd.textContent = `${val.toFixed(2)}x`;
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].camera.zoomEnd = val;
    }
  };

  inputRotation.oninput = (e) => {
    const val = parseInt(e.target.value, 10);
    valRotation.textContent = `${val}°`;
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].camera.rotationEnd = val;
    }
  };

  inputShake.oninput = (e) => {
    const val = parseInt(e.target.value, 10);
    valShake.textContent = `${val}px`;
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].vfx.shakeIntensity = val;
    }
  };

  inputDuration.oninput = (e) => {
    const val = parseFloat(e.target.value);
    valDuration.textContent = `${val.toFixed(1)}s`;
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].duration = val;
      calculateTotalDuration();
      renderTimelineMarkers();
      updatePanelList();
    }
  };

  chkFocusLines.onchange = (e) => {
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].vfx.focusLines = e.target.checked;
      updatePanelList();
    }
  };

  inputFocusIntensity.oninput = (e) => {
    const val = parseFloat(e.target.value);
    valFocusIntensity.textContent = val.toFixed(2);
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].vfx.focusIntensity = val;
    }
  };

  chkSpeedLines.onchange = (e) => {
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].vfx.speedLines = e.target.checked;
      updatePanelList();
    }
  };

  chkSlashArc.onchange = (e) => {
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].vfx.slashArc = e.target.checked;
      updatePanelList();
    }
  };

  chkFlash.onchange = (e) => {
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].vfx.screenFlash = e.target.checked;
    }
  };

  chkSparks.onchange = (e) => {
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].vfx.sparks = e.target.checked;
    }
  };

  selectSound.onchange = (e) => {
    if (state.panels[state.selectedPanelIndex]) {
      state.panels[state.selectedPanelIndex].audio.sound = e.target.value;
      updatePanelList();
    }
  };

  // Full-page Modal
  btnToggleFullPage.onclick = () => {
    fullPageOverlay.classList.add('active');
    renderFullPageBounds();
  };

  btnCloseFullPage.onclick = () => {
    fullPageOverlay.classList.remove('active');
    updatePanelList();
  };

  btnAddPanelManual.onclick = () => {
    const newPanel = MangaPanelDetector.createDefaultPanelConfig(state.panels.length + 1, {
      x: 0.1,
      y: 0.1,
      w: 0.8,
      h: 0.4
    });
    state.panels.push(newPanel);
    calculateTotalDuration();
    renderTimelineMarkers();
    renderFullPageBounds();
    updatePanelList();
  };

  // Fullpage canvas click to select panel
  boundsCanvas.onclick = (e) => {
    const rect = boundsCanvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / boundsCanvas.width;
    const cy = (e.clientY - rect.top) / boundsCanvas.height;

    for (let i = 0; i < state.panels.length; i++) {
      const b = state.panels[i].bounds;
      if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
        state.selectedPanelIndex = i;
        renderFullPageBounds();
        syncInspector();
        break;
      }
    }
  };

  // Export Modal Open/Close
  btnOpenExport.onclick = () => {
    exportModal.classList.add('active');
    exportStatusArea.style.display = 'none';
    exportResultArea.style.display = 'none';
    exportModalFooter.style.display = 'flex';
  };

  btnCloseExport.onclick = () => {
    exportModal.classList.remove('active');
  };

  btnCancelExport.onclick = () => {
    exportModal.classList.remove('active');
  };

  // Run Real Video Export
  btnStartExport.onclick = async () => {
    const resValue = exportResolutionSelect.value.split('x');
    const width = parseInt(resValue[0], 10);
    const height = parseInt(resValue[1], 10);

    exportModalFooter.style.display = 'none';
    exportStatusArea.style.display = 'block';
    exportResultArea.style.display = 'none';
    exportProgressBar.style.width = '0%';
    exportPercentText.textContent = '0%';

    try {
      const result = await videoExporter.exportSequence({
        panels: state.panels,
        image: state.image,
        cameraEngine,
        vfxEngine,
        resolution: { width, height },
        fps: 60,
        bitrate: 10000000,
        onProgress: (percent, curr, total) => {
          exportProgressBar.style.width = `${percent}%`;
          exportPercentText.textContent = `${percent}% (${curr.toFixed(1)}s / ${total.toFixed(1)}s)`;
        }
      });

      exportStatusArea.style.display = 'none';
      exportResultArea.style.display = 'flex';
      exportVideoPreview.src = result.url;
      btnDownloadVideo.href = result.url;
      btnDownloadVideo.download = result.filename;
    } catch (err) {
      alert('Lỗi xuất video: ' + err.message);
      exportModalFooter.style.display = 'flex';
      exportStatusArea.style.display = 'none';
    }
  };

  // AI Bridge Modal
  btnOpenAIBridge.onclick = () => {
    aiBridgeModal.classList.add('active');
    renderAIPayload();
  };

  btnCloseAIBridge.onclick = () => {
    aiBridgeModal.classList.remove('active');
  };

  tabRunway.onclick = () => {
    currentAITab = 'runway';
    tabRunway.classList.add('active');
    tabComfyUI.classList.remove('active');
    renderAIPayload();
  };

  tabComfyUI.onclick = () => {
    currentAITab = 'comfyui';
    tabComfyUI.classList.add('active');
    tabRunway.classList.remove('active');
    renderAIPayload();
  };

  btnCopyAIPayload.onclick = () => {
    navigator.clipboard.writeText(aiPayloadBox.textContent);
    aiCopyNotice.textContent = '✅ Đã sao chép vào bộ nhớ tạm!';
    setTimeout(() => {
      aiCopyNotice.textContent = '';
    }, 2500);
  };

  btnDownloadAIJson.onclick = () => {
    const data = aiPayloadBox.textContent;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentAITab}_manga_motion_workflow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
}

function renderAIPayload() {
  if (currentAITab === 'runway') {
    const payload = MangaAIBridge.exportRunwayPayload(state.panels);
    aiPayloadBox.textContent = JSON.stringify(payload, null, 2);
  } else {
    const workflow = MangaAIBridge.exportComfyUIWorkflow(state.panels);
    aiPayloadBox.textContent = JSON.stringify(workflow, null, 2);
  }
}

// Initial Boot
async function init() {
  setupEvents();
  setAspectRatio('16:9');
  await loadSample('samurai-slash');
  requestAnimationFrame(animationLoop);
}

window.addEventListener('DOMContentLoaded', init);
