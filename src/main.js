import { SAMPLES } from './data/samples.js';
import { MangaAudioEngine } from './core/audioSynthesizer.js';
import { MangaVFXEngine } from './core/vfxEngine.js';
import { MangaCameraEngine } from './core/cameraEngine.js';
import { MangaPanelDetector } from './core/panelDetector.js';
import { MangaVideoExporter } from './core/videoExporter.js';
import { MangaAIBridge } from './core/aiBridge.js';
import { MangaChapterManager } from './core/chapterManager.js';
import { MangaOCREngine } from './core/ocrEngine.js';
import { MangaTTSEngine } from './core/ttsEngine.js';

// Application State
const state = {
  appMode: 'action', // 'action' | 'chapter'
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
  firedTriggers: new Set(),

  // Chapter Reader & TTS State
  selectedTransition: 'cross-dissolve',
  cameraFocusMode: 'dialogue', // 'dialogue' | 'panel'
  activeReadingSegment: null,
  activeReadingPageIndex: 0,
  activeReadingSegmentIndex: 0,
  isReadingChapter: false,
  readingSegmentProgress: 0,
  readingSegmentDuration: 2.5
};

// Instantiate Core Engines
const audioEngine = new MangaAudioEngine();
const cameraEngine = new MangaCameraEngine();
const vfxEngine = new MangaVFXEngine();
const videoExporter = new MangaVideoExporter(audioEngine);
const chapterManager = new MangaChapterManager();
const ocrEngine = new MangaOCREngine();
const ttsEngine = new MangaTTSEngine(audioEngine);

// DOM Elements - Viewport & Timeline
const renderCanvas = document.getElementById('renderCanvas');
const renderCtx = renderCanvas.getContext('2d');
const canvasContainer = document.getElementById('canvasContainer');

const boundsCanvas = document.getElementById('boundsCanvas');
const boundsCtx = boundsCanvas.getContext('2d');

const hudPanelTitle = document.getElementById('hudPanelTitle');
const hudTimecode = document.getElementById('hudTimecode');
const hudFps = document.getElementById('hudFps');
const hudReadingIndicator = document.getElementById('hudReadingIndicator');
const hudReadingText = document.getElementById('hudReadingText');

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

// Sidebar Tabs & Lists
const tabActionScenes = document.getElementById('tabActionScenes');
const tabChapterPages = document.getElementById('tabChapterPages');
const actionScenesSection = document.getElementById('actionScenesSection');
const chapterPagesSection = document.getElementById('chapterPagesSection');
const panelListContainer = document.getElementById('panelListContainer');
const chapterPagesSidebarContainer = document.getElementById('chapterPagesSidebarContainer');
const panelCountTag = document.getElementById('panelCountTag');
const currentPanelBadge = document.getElementById('currentPanelBadge');
const chapterSidebarTitle = document.getElementById('chapterSidebarTitle');
const chapterPageCountTag = document.getElementById('chapterPageCountTag');

// Inspector Controls
const inputZoomEnd = document.getElementById('inputZoomEnd');
const valZoomEnd = document.getElementById('valZoomEnd');
const inputRotation = document.getElementById('inputRotation');
const valRotation = document.getElementById('valRotation');
const inputShake = document.getElementById('inputShake');
const valShake = document.getElementById('valShake');
const inputDuration = document.getElementById('inputDuration');
const valDuration = document.getElementById('valDuration');
const selectTransition = document.getElementById('selectTransition');
const selectCameraFocusMode = document.getElementById('selectCameraFocusMode');

const chkFocusLines = document.getElementById('chkFocusLines');
const inputFocusIntensity = document.getElementById('inputFocusIntensity');
const valFocusIntensity = document.getElementById('valFocusIntensity');
const chkSpeedLines = document.getElementById('chkSpeedLines');
const chkSlashArc = document.getElementById('chkSlashArc');
const chkFlash = document.getElementById('chkFlash');
const chkSparks = document.getElementById('chkSparks');
const selectSound = document.getElementById('selectSound');

// Header & Full-page Bounding Box
const fullPageOverlay = document.getElementById('fullPageOverlay');
const btnToggleFullPage = document.getElementById('btnToggleFullPage');
const btnCloseFullPage = document.getElementById('btnCloseFullPage');
const btnAddPanelManual = document.getElementById('btnAddPanelManual');
const btnAudioToggle = document.getElementById('btnAudioToggle');
const audioIcon = document.getElementById('audioIcon');

// Chapter Management Modal
const chapterModal = document.getElementById('chapterModal');
const btnOpenChapter = document.getElementById('btnOpenChapter');
const btnCloseChapterModal = document.getElementById('btnCloseChapterModal');
const btnApplyChapterModal = document.getElementById('btnApplyChapterModal');
const btnClearChapterModal = document.getElementById('btnClearChapterModal');
const btnOCRAllFromModal = document.getElementById('btnOCRAllFromModal');
const chapterDropZone = document.getElementById('chapterDropZone');
const chapterFileInput = document.getElementById('chapterFileInput');
const btnBrowseFiles = document.getElementById('btnBrowseFiles');
const chapterStatusSummary = document.getElementById('chapterStatusSummary');
const chapterCapacityPercent = document.getElementById('chapterCapacityPercent');
const chapterCapacityFill = document.getElementById('chapterCapacityFill');
const chapterModalPageGrid = document.getElementById('chapterModalPageGrid');
const btnQuickUpload = document.getElementById('btnQuickUpload');
const btnQuickOCR = document.getElementById('btnQuickOCR');

// OCR Text Editor Modal
const ocrModal = document.getElementById('ocrModal');
const btnOpenOCR = document.getElementById('btnOpenOCR');
const btnCloseOCRModal = document.getElementById('btnCloseOCRModal');
const ocrLanguageSelect = document.getElementById('ocrLanguageSelect');
const ocrDirectionSelect = document.getElementById('ocrDirectionSelect');
const btnStartOCR = document.getElementById('btnStartOCR');
const btnCancelOCR = document.getElementById('btnCancelOCR');
const ocrProgressBox = document.getElementById('ocrProgressBox');
const ocrStatusMsg = document.getElementById('ocrStatusMsg');
const ocrPercentMsg = document.getElementById('ocrPercentMsg');
const ocrProgressBarFill = document.getElementById('ocrProgressBarFill');
const ocrPageSelector = document.getElementById('ocrPageSelector');
const ocrSegmentCountLabel = document.getElementById('ocrSegmentCountLabel');
const ocrSegmentsContainer = document.getElementById('ocrSegmentsContainer');
const btnPreviewCurrentPageTTS = document.getElementById('btnPreviewCurrentPageTTS');
const btnSaveOCREdits = document.getElementById('btnSaveOCREdits');

// TTS & Voice Settings Modal
const ttsModal = document.getElementById('ttsModal');
const btnOpenTTS = document.getElementById('btnOpenTTS');
const btnCloseTTSModal = document.getElementById('btnCloseTTSModal');
const tabProviderGoogle = document.getElementById('tabProviderGoogle');
const tabProviderBrowser = document.getElementById('tabProviderBrowser');
const googleTTSSettingsArea = document.getElementById('googleTTSSettingsArea');
const browserTTSSettingsArea = document.getElementById('browserTTSSettingsArea');
const ttsApiKeyInput = document.getElementById('ttsApiKeyInput');
const toggleKeyVisibility = document.getElementById('toggleKeyVisibility');
const ttsGoogleVoiceSelect = document.getElementById('ttsGoogleVoiceSelect');
const ttsBrowserVoiceSelect = document.getElementById('ttsBrowserVoiceSelect');
const ttsRateInput = document.getElementById('ttsRateInput');
const ttsRateVal = document.getElementById('ttsRateVal');
const ttsPitchInput = document.getElementById('ttsPitchInput');
const ttsPitchVal = document.getElementById('ttsPitchVal');
const ttsVolumeInput = document.getElementById('ttsVolumeInput');
const ttsVolumeVal = document.getElementById('ttsVolumeVal');
const btnTestTTSVoice = document.getElementById('btnTestTTSVoice');
const btnSaveTTSSettings = document.getElementById('btnSaveTTSSettings');
const btnReadChapter = document.getElementById('btnReadChapter');
const btnReadChapterText = document.getElementById('btnReadChapterText');

// Video Export Modal
const exportModal = document.getElementById('exportModal');
const btnOpenExport = document.getElementById('btnOpenExport');
const btnCloseExport = document.getElementById('btnCloseExport');
const btnCancelExport = document.getElementById('btnCancelExport');
const btnStartExport = document.getElementById('btnStartExport');
const exportResolutionSelect = document.getElementById('exportResolutionSelect');
const exportStatusArea = document.getElementById('exportStatusArea');
const exportProgressBar = document.getElementById('exportProgressBar');
const exportPercentText = document.getElementById('exportPercentText');
const exportStatusText = document.getElementById('exportStatusText');
const exportResultArea = document.getElementById('exportResultArea');
const exportVideoPreview = document.getElementById('exportVideoPreview');
const btnDownloadVideo = document.getElementById('btnDownloadVideo');
const exportModalFooter = document.getElementById('exportModalFooter');
const radioExportChapter = document.getElementById('radioExportChapter');
const radioExportAction = document.getElementById('radioExportAction');

// AI Bridge Modal
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

// ==========================================
// 1. SAMPLE & ACTION SCENES INITIALIZATION
// ==========================================

async function loadSample(sampleId) {
  state.appMode = 'action';
  tabActionScenes.classList.add('active');
  tabChapterPages.classList.remove('active');
  actionScenesSection.style.display = 'flex';
  chapterPagesSection.style.display = 'none';

  const sample = SAMPLES.find((s) => s.id === sampleId) || SAMPLES[0];
  state.currentSampleId = sample.id;
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

function calculateTotalDuration() {
  state.totalDuration = state.panels.reduce((sum, p) => sum + p.duration, 0);
  timelineTotalDuration.textContent = `${state.totalDuration.toFixed(2)}s`;
}

function updateUI() {
  panelCountTag.textContent = `${state.panels.length} Cảnh`;
  updateTimelineScrubber();
}

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

function updatePanelList() {
  panelListContainer.innerHTML = '';
  state.panels.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = `panel-card ${idx === state.selectedPanelIndex ? 'active' : ''}`;
    card.onclick = () => seekToPanel(idx);

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

    const meta = document.createElement('div');
    meta.className = 'panel-meta';
    meta.innerHTML = `
      <div class="panel-name">${p.title}</div>
      <div class="panel-tags">
        <span class="tag">${p.duration.toFixed(1)}s</span>
        ${p.vfx?.focusLines ? '<span class="tag tag-vfx">Focus</span>' : ''}
        ${p.vfx?.speedLines ? '<span class="tag tag-vfx">Speed</span>' : ''}
        ${p.vfx?.slashArc ? '<span class="tag tag-vfx">Slash</span>' : ''}
        ${p.vfx?.shakeIntensity > 0 ? `<span class="tag tag-vfx">Shake</span>` : ''}
        <span class="tag tag-audio">${p.audio?.sound || 'SFX'}</span>
      </div>
    `;

    card.appendChild(thumbBox);
    card.appendChild(meta);
    panelListContainer.appendChild(card);
  });
}

function syncInspector() {
  const panel = state.panels[state.selectedPanelIndex];
  if (!panel) return;

  currentPanelBadge.textContent = `P${state.selectedPanelIndex + 1}`;
  hudPanelTitle.textContent = panel.title;

  inputZoomEnd.value = panel.camera.zoomEnd;
  valZoomEnd.textContent = `${panel.camera.zoomEnd.toFixed(2)}x`;

  inputRotation.value = panel.camera.rotationEnd;
  valRotation.textContent = `${panel.camera.rotationEnd}°`;

  inputShake.value = panel.vfx.shakeIntensity || 0;
  valShake.textContent = `${panel.vfx.shakeIntensity || 0}px`;

  inputDuration.value = panel.duration;
  valDuration.textContent = `${panel.duration.toFixed(1)}s`;

  chkFocusLines.checked = !!panel.vfx.focusLines;
  inputFocusIntensity.value = panel.vfx.focusIntensity || 0.8;
  valFocusIntensity.textContent = (panel.vfx.focusIntensity || 0.8).toFixed(2);

  chkSpeedLines.checked = !!panel.vfx.speedLines;
  chkSlashArc.checked = !!panel.vfx.slashArc;
  chkFlash.checked = !!panel.vfx.screenFlash;
  chkSparks.checked = !!panel.vfx.sparks;

  selectSound.value = panel.audio?.sound || 'slash';
}

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

// ==========================================
// 2. CHAPTER INGESTION & MANAGEMENT
// ==========================================

function updateChapterCapacityUI() {
  const summary = chapterManager.getStatusSummary();
  chapterStatusSummary.textContent = summary;
  chapterSidebarTitle.textContent = chapterManager.chapterName;
  chapterPageCountTag.textContent = `${chapterManager.pages.length} Trang`;

  const pct = Math.min(100, Math.round((chapterManager.totalInputBytes / MangaChapterManager.MAX_INPUT_BYTES) * 100));
  chapterCapacityPercent.textContent = `${pct}%`;
  chapterCapacityFill.style.width = `${pct}%`;

  chapterCapacityFill.className = 'capacity-fill';
  if (pct > 90) {
    chapterCapacityFill.classList.add('danger');
  } else if (pct > 70) {
    chapterCapacityFill.classList.add('warning');
  }
}

function renderChapterModalPageGrid() {
  chapterModalPageGrid.innerHTML = '';
  if (!chapterManager.pages.length) {
    chapterModalPageGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 30px;">
        Chưa có trang truyện nào. Kéo thả file ảnh hoặc file ZIP vào vùng trên để bắt đầu!
      </div>
    `;
    return;
  }

  chapterManager.pages.forEach((page, idx) => {
    const card = document.createElement('div');
    card.className = `page-thumb-card ${idx === chapterManager.activePageIndex ? 'active' : ''}`;
    card.onclick = (e) => {
      if (e.target.closest('.page-action-btn')) return;
      selectChapterPage(idx);
    };

    const imgWrap = document.createElement('div');
    imgWrap.className = 'page-thumb-img-wrapper';
    const img = document.createElement('img');
    img.src = page.dataUrl;
    imgWrap.appendChild(img);

    const info = document.createElement('div');
    info.className = 'page-thumb-info';
    info.innerHTML = `
      <div class="page-thumb-header">
        <span>#${idx + 1} (${page.name.slice(0, 10)})</span>
        <span class="ocr-badge ${page.ocrStatus}">${page.ocrStatus === 'completed' ? 'OCR Xong' : page.ocrStatus}</span>
      </div>
      <div style="font-size: 10px; color: var(--text-muted);">
        ${page.textSegments?.length || 0} hội thoại | ${(page.size / 1024).toFixed(0)} KB
      </div>
      <div class="page-thumb-actions">
        <button class="page-action-btn" title="Di chuyển lên" data-action="up" data-idx="${idx}">◀</button>
        <button class="page-action-btn" title="Di chuyển xuống" data-action="down" data-idx="${idx}">▶</button>
        <button class="page-action-btn delete" title="Xóa trang" data-action="del" data-id="${page.id}">✕</button>
      </div>
    `;

    card.appendChild(imgWrap);
    card.appendChild(info);
    chapterModalPageGrid.appendChild(card);
  });
}

function renderChapterSidebarPages() {
  chapterPagesSidebarContainer.innerHTML = '';
  chapterManager.pages.forEach((page, idx) => {
    const card = document.createElement('div');
    card.className = `panel-card ${idx === chapterManager.activePageIndex ? 'active' : ''}`;
    card.onclick = () => selectChapterPage(idx);

    const thumbBox = document.createElement('div');
    thumbBox.className = 'panel-thumb-box';
    const img = document.createElement('img');
    img.src = page.dataUrl;
    img.style.width = '100px';
    img.style.height = '80px';
    img.style.objectFit = 'cover';
    thumbBox.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'panel-meta';
    meta.innerHTML = `
      <div class="panel-name">Trang #${idx + 1} - ${page.name}</div>
      <div class="panel-tags">
        <span class="tag tag-audio">${page.textSegments?.length || 0} Lời thoại</span>
        <span class="ocr-badge ${page.ocrStatus}">${page.ocrStatus}</span>
      </div>
    `;

    card.appendChild(thumbBox);
    card.appendChild(meta);
    chapterPagesSidebarContainer.appendChild(card);
  });
}

function selectChapterPage(idx) {
  if (idx < 0 || idx >= chapterManager.pages.length) return;
  chapterManager.activePageIndex = idx;
  const page = chapterManager.getActivePage();
  if (page) {
    state.image = page.image;
    hudPanelTitle.textContent = `Trang #${idx + 1}: ${page.name}`;
    renderChapterModalPageGrid();
    renderChapterSidebarPages();
  }
}

async function handleFilesUpload(files, isAppend = false) {
  const result = await chapterManager.ingestFiles(files, { append: isAppend });
  if (!result.success) {
    alert(result.message);
    return;
  }

  updateChapterCapacityUI();
  renderChapterModalPageGrid();
  renderChapterSidebarPages();
  selectChapterPage(0);

  // Switch to Chapter Mode
  switchToChapterMode();
}

function switchToChapterMode() {
  state.appMode = 'chapter';
  tabChapterPages.classList.add('active');
  tabActionScenes.classList.remove('active');
  chapterPagesSection.style.display = 'flex';
  actionScenesSection.style.display = 'none';
  document.querySelectorAll('.sample-btn').forEach((b) => b.classList.remove('active'));
}

// ==========================================
// 3. OCR TEXT EXTRACTION & EDITOR
// ==========================================

function updateOCRPageSelector() {
  ocrPageSelector.innerHTML = '';
  chapterManager.pages.forEach((p, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `Trang #${idx + 1} - ${p.name} (${p.textSegments?.length || 0} đoạn)`;
    ocrPageSelector.appendChild(opt);
  });
  ocrPageSelector.value = chapterManager.activePageIndex;
  renderOCRSegmentsForPage(chapterManager.activePageIndex);
}

function renderOCRSegmentsForPage(pageIndex) {
  const page = chapterManager.pages[pageIndex];
  ocrSegmentsContainer.innerHTML = '';

  if (!page || !page.textSegments || !page.textSegments.length) {
    ocrSegmentsContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 30px;">
        Trang này chưa có dữ liệu OCR. Hãy nhấn "Bắt Đầu Quét OCR" ở trên để trích xuất chữ.
      </div>
    `;
    ocrSegmentCountLabel.textContent = '0 đoạn hội thoại';
    return;
  }

  ocrSegmentCountLabel.textContent = `${page.textSegments.length} đoạn hội thoại`;

  page.textSegments.forEach((seg, sIdx) => {
    const card = document.createElement('div');
    card.className = 'ocr-segment-card';

    const header = document.createElement('div');
    header.className = 'ocr-segment-header';
    header.innerHTML = `
      <span style="font-weight: 700; color: var(--accent-cyan);">Đoạn #${sIdx + 1}</span>
      <span style="color: var(--text-muted);">Độ tin cậy: ${seg.confidence}% | Box [${seg.bounds.x}, ${seg.bounds.y}, ${seg.bounds.w}, ${seg.bounds.h}]</span>
    `;

    const textarea = document.createElement('textarea');
    textarea.className = 'ocr-segment-textarea';
    textarea.value = seg.text;
    textarea.onchange = (e) => {
      seg.text = e.target.value.trim();
    };

    const footer = document.createElement('div');
    footer.className = 'ocr-segment-footer';
    footer.innerHTML = `
      <button class="btn-secondary" data-action="preview-tts" data-page="${pageIndex}" data-seg="${sIdx}" style="padding: 3px 8px; font-size: 11px;">
        🔊 Nghe Thử Đoạn Này
      </button>
      <div style="display: flex; gap: 4px;">
        <button class="page-action-btn" data-action="merge" data-page="${pageIndex}" data-seg="${sIdx}" title="Gộp với đoạn kế tiếp">➕ Gộp</button>
        <button class="page-action-btn delete" data-action="del-seg" data-page="${pageIndex}" data-seg="${sIdx}" title="Xóa đoạn này">🗑️ Xóa</button>
      </div>
    `;

    card.appendChild(header);
    card.appendChild(textarea);
    card.appendChild(footer);
    ocrSegmentsContainer.appendChild(card);
  });
}

async function runChapterOCR() {
  if (!chapterManager.pages.length) {
    alert('Vui lòng tải chapter truyện (ảnh hoặc ZIP) trước khi quét OCR.');
    return;
  }

  btnStartOCR.style.display = 'none';
  btnCancelOCR.style.display = 'inline-block';
  ocrProgressBox.style.display = 'block';

  const lang = ocrLanguageSelect.value;
  const direction = ocrDirectionSelect.value;

  try {
    await ocrEngine.processChapter(chapterManager.pages, {
      language: lang,
      readDirection: direction,
      onProgress: (prog) => {
        ocrStatusMsg.textContent = prog.status;
        ocrPercentMsg.textContent = `${prog.percent}%`;
        ocrProgressBarFill.style.width = `${prog.percent}%`;
        renderChapterModalPageGrid();
        renderChapterSidebarPages();
      }
    });

    updateOCRPageSelector();
  } catch (err) {
    alert(`Lỗi OCR: ${err.message}`);
  } finally {
    btnStartOCR.style.display = 'inline-block';
    btnCancelOCR.style.display = 'none';
  }
}

// ==========================================
// 4. GOOGLE TTS & AUDIO CONTROLS
// ==========================================

function initTTSUI() {
  ttsApiKeyInput.value = ttsEngine.apiKey;

  // Populate Google voices
  ttsGoogleVoiceSelect.innerHTML = '';
  MangaTTSEngine.GOOGLE_VOICES.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.name} (${v.lang})`;
    ttsGoogleVoiceSelect.appendChild(opt);
  });

  // Populate Browser voices
  populateBrowserVoices();
  ttsEngine.onVoicesChanged = () => populateBrowserVoices();

  ttsEngine.onSegmentStart = (item, pIdx, sIdx) => {
    state.activeReadingSegment = item.segment;
    state.activeReadingPageIndex = pIdx;
    state.activeReadingSegmentIndex = sIdx;
    hudReadingIndicator.style.display = 'inline-flex';
    hudReadingText.textContent = item.segment.text;

    // Switch image to active reading page
    if (chapterManager.pages[pIdx]) {
      selectChapterPage(pIdx);
    }
  };

  ttsEngine.onSegmentEnd = () => {
    state.activeReadingSegment = null;
    hudReadingIndicator.style.display = 'none';
  };

  ttsEngine.onQueueComplete = () => {
    state.isReadingChapter = false;
    btnReadChapterText.textContent = 'Đọc Chapter (TTS)';
    hudReadingIndicator.style.display = 'none';
  };
}

function populateBrowserVoices() {
  const voices = ttsEngine.getAvailableVoices();
  ttsBrowserVoiceSelect.innerHTML = '';
  voices.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.name;
    ttsBrowserVoiceSelect.appendChild(opt);
  });
}

async function toggleReadChapter() {
  if (state.isReadingChapter) {
    ttsEngine.stop();
    state.isReadingChapter = false;
    btnReadChapterText.textContent = 'Đọc Chapter (TTS)';
    hudReadingIndicator.style.display = 'none';
    return;
  }

  if (!chapterManager.pages.length) {
    alert('Vui lòng nạp chapter truyện tranh trước khi đọc.');
    return;
  }

  // Flatten all segments across pages
  const allSegments = [];
  chapterManager.pages.forEach((page, pIdx) => {
    if (page.textSegments && page.textSegments.length) {
      page.textSegments.forEach((seg, sIdx) => {
        allSegments.push({
          page,
          pageIndex: pIdx,
          segmentIndex: sIdx,
          segment: seg
        });
      });
    }
  });

  if (!allSegments.length) {
    const runNow = confirm('Chapter chưa được quét OCR để trích xuất lời thoại. Bạn có muốn mở OCR ngay bây giờ không?');
    if (runNow) {
      ocrModal.classList.add('active');
      updateOCRPageSelector();
    }
    return;
  }

  switchToChapterMode();
  state.isReadingChapter = true;
  btnReadChapterText.textContent = '⏹ Dừng Đọc';

  const langCode = ocrLanguageSelect.value === 'vie' ? 'vi-VN' : 'en-US';
  await ttsEngine.startQueue(allSegments, 0, langCode);
}

// ==========================================
// 5. MASTER 60FPS GAME & ANIMATION LOOP
// ==========================================

function animationLoop(timestamp) {
  const dt = Math.min((timestamp - state.lastFrameTime) / 1000, 0.1);
  state.lastFrameTime = timestamp;

  // FPS HUD
  const fps = Math.round(1 / dt);
  hudFps.textContent = `${fps} FPS`;

  // MODE A: Action Panels Playing (Ken Burns, Shake, VFX)
  if (state.appMode === 'action') {
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

    if (activeIndex !== state.selectedPanelIndex) {
      state.selectedPanelIndex = activeIndex;
      updatePanelList();
      syncInspector();
    }

    const currentPanel = state.panels[activeIndex];
    if (currentPanel && state.image) {
      const progress = Math.min(1, Math.max(0, panelLocalTime / currentPanel.duration));

      // Timed SFX Triggers
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

      // Screen Shake & Flash
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

      cameraEngine.update(dt);
      vfxEngine.update(dt);

      renderCtx.fillStyle = '#05070e';
      renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

      cameraEngine.drawPanel(renderCtx, state.image, currentPanel, progress, renderCanvas.width, renderCanvas.height);
      vfxEngine.render(renderCtx, renderCanvas.width, renderCanvas.height, currentPanel.vfx);
    }
  }

  // MODE B: Chapter Reader (Continuous Cinematic Camera & Dialogue Framing)
  else if (state.appMode === 'chapter') {
    cameraEngine.update(dt);
    vfxEngine.update(dt);

    renderCtx.fillStyle = '#05070e';
    renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

    const activePage = chapterManager.getActivePage();
    if (activePage && activePage.image) {
      if (state.activeReadingSegment && selectCameraFocusMode.value === 'dialogue') {
        // Dynamic Dialogue Bounding Box Framing with Ken Burns drift
        cameraEngine.drawFramedRegion(
          renderCtx,
          activePage.image,
          state.activeReadingSegment.bounds,
          (timestamp % 3000) / 3000,
          renderCanvas.width,
          renderCanvas.height,
          { zoomStart: 1.05, zoomEnd: 1.15 }
        );

        // Draw glowing neon highlight on dialogue bubble
        renderReadingHighlight(renderCtx, state.activeReadingSegment.bounds);
      } else {
        // Full Page Framing with slow cinema float
        const fullBounds = { x: 0, y: 0, w: 1, h: 1 };
        cameraEngine.drawFramedRegion(
          renderCtx,
          activePage.image,
          fullBounds,
          (timestamp % 8000) / 8000,
          renderCanvas.width,
          renderCanvas.height,
          { zoomStart: 1.0, zoomEnd: 1.04 }
        );
      }
    }
  }

  requestAnimationFrame(animationLoop);
}

function renderReadingHighlight(ctx, bounds) {
  ctx.save();
  ctx.strokeStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 3;
  ctx.strokeRect(
    renderCanvas.width * 0.2,
    renderCanvas.height * 0.2,
    renderCanvas.width * 0.6,
    renderCanvas.height * 0.6
  );
  ctx.restore();
}

// ==========================================
// 6. SETUP EVENT LISTENERS
// ==========================================

function setupEvents() {
  // Sidebar Mode Tabs
  tabActionScenes.onclick = () => {
    state.appMode = 'action';
    tabActionScenes.classList.add('active');
    tabChapterPages.classList.remove('active');
    actionScenesSection.style.display = 'flex';
    chapterPagesSection.style.display = 'none';
  };

  tabChapterPages.onclick = () => {
    switchToChapterMode();
    renderChapterSidebarPages();
  };

  // Sample Pickers
  document.querySelectorAll('.sample-btn[data-sample]').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('.sample-btn[data-sample]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      loadSample(btn.dataset.sample);
    };
  });

  // Transport Controls
  btnPlayPause.onclick = () => {
    if (state.appMode === 'chapter') {
      toggleReadChapter();
      return;
    }

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
    if (state.appMode === 'chapter') {
      selectChapterPage(chapterManager.activePageIndex - 1);
    } else {
      seekToPanel(Math.max(0, state.selectedPanelIndex - 1));
    }
  };

  btnStepNext.onclick = () => {
    if (state.appMode === 'chapter') {
      selectChapterPage(chapterManager.activePageIndex + 1);
    } else {
      seekToPanel(Math.min(state.panels.length - 1, state.selectedPanelIndex + 1));
    }
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

  // Aspect Ratios
  document.querySelectorAll('.ratio-btn').forEach((btn) => {
    btn.onclick = () => setAspectRatio(btn.dataset.ratio);
  });

  // Chapter Ingestion & Drag Drop
  btnOpenChapter.onclick = () => {
    chapterModal.classList.add('active');
    updateChapterCapacityUI();
    renderChapterModalPageGrid();
  };

  btnQuickUpload.onclick = () => {
    chapterModal.classList.add('active');
    updateChapterCapacityUI();
    renderChapterModalPageGrid();
  };

  btnCloseChapterModal.onclick = () => chapterModal.classList.remove('active');
  btnApplyChapterModal.onclick = () => chapterModal.classList.remove('active');

  btnBrowseFiles.onclick = () => chapterFileInput.click();
  chapterDropZone.onclick = (e) => {
    if (e.target !== btnBrowseFiles) chapterFileInput.click();
  };

  chapterFileInput.onchange = (e) => {
    if (e.target.files?.length) {
      handleFilesUpload(e.target.files, true);
    }
  };

  // Drag and Drop Zone
  chapterDropZone.ondragover = (e) => {
    e.preventDefault();
    chapterDropZone.classList.add('dragover');
  };
  chapterDropZone.ondragleave = () => chapterDropZone.classList.remove('dragover');
  chapterDropZone.ondrop = (e) => {
    e.preventDefault();
    chapterDropZone.classList.remove('dragover');
    if (e.dataTransfer.files?.length) {
      handleFilesUpload(e.dataTransfer.files, true);
    }
  };

  // Page Grid Actions (Move, Delete)
  chapterModalPageGrid.onclick = (e) => {
    const btn = e.target.closest('.page-action-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'up') {
      const idx = parseInt(btn.dataset.idx, 10);
      chapterManager.movePage(idx, idx - 1);
      renderChapterModalPageGrid();
      renderChapterSidebarPages();
    } else if (action === 'down') {
      const idx = parseInt(btn.dataset.idx, 10);
      chapterManager.movePage(idx, idx + 1);
      renderChapterModalPageGrid();
      renderChapterSidebarPages();
    } else if (action === 'del') {
      const id = btn.dataset.id;
      if (confirm('Bạn có chắc chắn muốn xóa trang này khỏi chapter?')) {
        chapterManager.deletePage(id);
        updateChapterCapacityUI();
        renderChapterModalPageGrid();
        renderChapterSidebarPages();
        selectChapterPage(chapterManager.activePageIndex);
      }
    }
  };

  btnClearChapterModal.onclick = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ chapter hiện tại?')) {
      chapterManager.clearChapter();
      updateChapterCapacityUI();
      renderChapterModalPageGrid();
      renderChapterSidebarPages();
    }
  };

  btnOCRAllFromModal.onclick = () => {
    chapterModal.classList.remove('active');
    ocrModal.classList.add('active');
    updateOCRPageSelector();
    runChapterOCR();
  };

  // OCR Modal
  btnOpenOCR.onclick = () => {
    ocrModal.classList.add('active');
    updateOCRPageSelector();
  };

  btnQuickOCR.onclick = () => {
    ocrModal.classList.add('active');
    updateOCRPageSelector();
  };

  btnCloseOCRModal.onclick = () => ocrModal.classList.remove('active');
  btnSaveOCREdits.onclick = () => ocrModal.classList.remove('active');

  btnStartOCR.onclick = runChapterOCR;
  btnCancelOCR.onclick = () => ocrEngine.cancel();

  ocrPageSelector.onchange = (e) => {
    const idx = parseInt(e.target.value, 10);
    renderOCRSegmentsForPage(idx);
  };

  // OCR Segments Card Actions
  ocrSegmentsContainer.onclick = async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const pIdx = parseInt(btn.dataset.page, 10);
    const sIdx = parseInt(btn.dataset.seg, 10);
    const page = chapterManager.pages[pIdx];
    if (!page || !page.textSegments) return;

    if (action === 'preview-tts') {
      const seg = page.textSegments[sIdx];
      const lang = ocrLanguageSelect.value === 'vie' ? 'vi-VN' : 'en-US';
      await ttsEngine.speakSegment(seg, lang);
    } else if (action === 'merge' && sIdx < page.textSegments.length - 1) {
      const curr = page.textSegments[sIdx];
      const next = page.textSegments[sIdx + 1];
      curr.text = `${curr.text} ${next.text}`;
      page.textSegments.splice(sIdx + 1, 1);
      renderOCRSegmentsForPage(pIdx);
    } else if (action === 'del-seg') {
      page.textSegments.splice(sIdx, 1);
      renderOCRSegmentsForPage(pIdx);
    }
  };

  btnPreviewCurrentPageTTS.onclick = async () => {
    const pIdx = parseInt(ocrPageSelector.value, 10);
    const page = chapterManager.pages[pIdx];
    if (!page || !page.textSegments?.length) return;

    const queue = page.textSegments.map((seg, sIdx) => ({
      page,
      pageIndex: pIdx,
      segmentIndex: sIdx,
      segment: seg
    }));

    const lang = ocrLanguageSelect.value === 'vie' ? 'vi-VN' : 'en-US';
    await ttsEngine.startQueue(queue, 0, lang);
  };

  // TTS Modal
  btnOpenTTS.onclick = () => ttsModal.classList.add('active');
  btnCloseTTSModal.onclick = () => ttsModal.classList.remove('active');
  btnSaveTTSSettings.onclick = () => {
    ttsEngine.setApiKey(ttsApiKeyInput.value);
    ttsEngine.rate = parseFloat(ttsRateInput.value);
    ttsEngine.pitch = parseFloat(ttsPitchInput.value);
    ttsEngine.volume = parseFloat(ttsVolumeInput.value);
    ttsEngine.selectedVoiceId =
      ttsEngine.providerType === 'google' ? ttsGoogleVoiceSelect.value : ttsBrowserVoiceSelect.value;
    ttsModal.classList.remove('active');
  };

  tabProviderGoogle.onclick = () => {
    ttsEngine.setProvider('google');
    tabProviderGoogle.classList.add('active');
    tabProviderBrowser.classList.remove('active');
    googleTTSSettingsArea.style.display = 'block';
    browserTTSSettingsArea.style.display = 'none';
  };

  tabProviderBrowser.onclick = () => {
    ttsEngine.setProvider('browser');
    tabProviderBrowser.classList.add('active');
    tabProviderGoogle.classList.remove('active');
    browserTTSSettingsArea.style.display = 'block';
    googleTTSSettingsArea.style.display = 'none';
  };

  toggleKeyVisibility.onclick = () => {
    ttsApiKeyInput.type = ttsApiKeyInput.type === 'password' ? 'text' : 'password';
  };

  ttsRateInput.oninput = (e) => {
    ttsRateVal.textContent = `${parseFloat(e.target.value).toFixed(2)}x`;
  };
  ttsPitchInput.oninput = (e) => {
    ttsPitchVal.textContent = parseFloat(e.target.value).toFixed(2);
  };
  ttsVolumeInput.oninput = (e) => {
    ttsVolumeVal.textContent = parseFloat(e.target.value).toFixed(2);
  };

  btnTestTTSVoice.onclick = async () => {
    const testText = 'Xin chào, đây là giọng đọc thử nghiệm của MangaMotion AI Studio Pro!';
    const testSeg = { text: testText };
    await ttsEngine.speakSegment(testSeg, 'vi-VN');
  };

  // Master Read Chapter Button
  btnReadChapter.onclick = toggleReadChapter;

  // Audio Toggle
  btnAudioToggle.onclick = () => {
    const muted = audioEngine.toggleMute();
    audioIcon.textContent = muted ? '🔇' : '🔊';
  };

  // Video Export Modal
  btnOpenExport.onclick = () => {
    exportModal.classList.add('active');
    exportStatusArea.style.display = 'none';
    exportResultArea.style.display = 'none';
    exportModalFooter.style.display = 'flex';
  };

  btnCloseExport.onclick = () => exportModal.classList.remove('active');
  btnCancelExport.onclick = () => exportModal.classList.remove('active');

  btnStartExport.onclick = async () => {
    const resValue = exportResolutionSelect.value.split('x');
    const width = parseInt(resValue[0], 10);
    const height = parseInt(resValue[1], 10);
    const isChapterMode = radioExportChapter.checked;

    exportModalFooter.style.display = 'none';
    exportStatusArea.style.display = 'block';
    exportResultArea.style.display = 'none';
    exportProgressBar.style.width = '0%';
    exportPercentText.textContent = '0%';

    try {
      let result = null;

      if (isChapterMode && chapterManager.pages.length) {
        exportStatusText.textContent = 'Đang render video Chapter điện ảnh có giọng đọc & chuyển cảnh...';

        // Build scenes from chapter pages and dialogue
        const scenes = [];
        chapterManager.pages.forEach((page) => {
          if (page.textSegments && page.textSegments.length) {
            page.textSegments.forEach((seg) => {
              const dur = seg.duration || MangaTTSEngine.estimateSpeechDuration(seg.text, ttsEngine.rate);
              scenes.push({
                page,
                bounds: seg.bounds,
                duration: dur + 0.3,
                text: seg.text,
                audioBuffer: seg.audioBuffer || null,
                transitionType: selectTransition.value
              });
            });
          } else {
            // Whole page scene if no OCR
            scenes.push({
              page,
              bounds: { x: 0, y: 0, w: 1, h: 1 },
              duration: 3.0,
              text: '',
              audioBuffer: null,
              transitionType: selectTransition.value
            });
          }
        });

        result = await videoExporter.exportChapterSequence({
          scenes,
          cameraEngine,
          vfxEngine,
          resolution: { width, height },
          fps: 60,
          bitrate: 12000000,
          onProgress: (percent, curr, total) => {
            exportProgressBar.style.width = `${percent}%`;
            exportPercentText.textContent = `${percent}% (${curr.toFixed(1)}s / ${total.toFixed(1)}s)`;
          }
        });
      } else {
        // Fallback to action panels
        exportStatusText.textContent = 'Đang render chuỗi hành động 60 FPS...';
        result = await videoExporter.exportSequence({
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
      }

      exportStatusArea.style.display = 'none';
      exportResultArea.style.display = 'flex';
      exportVideoPreview.src = result.url;
      btnDownloadVideo.href = result.url;
      btnDownloadVideo.download = result.filename;
    } catch (err) {
      alert(`Lỗi xuất video: ${err.message}`);
      exportModalFooter.style.display = 'flex';
      exportStatusArea.style.display = 'none';
    }
  };

  // AI Bridge
  btnOpenAIBridge.onclick = () => {
    aiBridgeModal.classList.add('active');
    renderAIPayload();
  };
  btnCloseAIBridge.onclick = () => aiBridgeModal.classList.remove('active');

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
  initTTSUI();
  setAspectRatio('16:9');
  await loadSample('samurai-slash');
  requestAnimationFrame(animationLoop);
}

window.addEventListener('DOMContentLoaded', init);
