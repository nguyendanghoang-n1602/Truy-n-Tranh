// Predefined sample comic pages with senior choreography
export const SAMPLES = [
  {
    id: 'samurai-slash',
    title: 'Hơi Thở Kiếm Sĩ - Bạch Nhận Trảm Quỷ',
    category: 'Manga Shonen (B&W)',
    image: '/samples/sample1_samurai.jpg',
    readDirection: 'rtl', // Right to left
    panels: [
      {
        id: 'p1',
        title: 'Panel 1: Rút Kiếm Sát Khí',
        // Bounding boxes in relative percentages [x, y, width, height]
        bounds: { x: 0.03, y: 0.03, w: 0.63, h: 0.33 },
        duration: 2.2, // seconds
        camera: {
          zoomStart: 1.0,
          zoomEnd: 1.25,
          panStartX: 0.05,
          panStartY: 0.05,
          panEndX: -0.05,
          panEndY: -0.02,
          rotationStart: 0,
          rotationEnd: -2
        },
        vfx: {
          focusLines: true,
          focusIntensity: 0.7,
          focusCenterX: 0.45,
          focusCenterY: 0.35,
          speedLines: false,
          shakeIntensity: 2,
          shakeTriggerTime: 1.6, // Unsheading blade shudder
          slashArc: false,
          screenFlash: true,
          flashColor: '#ffffff',
          flashTime: 1.5,
          sparks: true,
          sparkCount: 15
        },
        audio: {
          sound: 'charge', // energy hum / blade draw
          impactAt: 1.5,
          impactSound: 'blade'
        },
        caption: 'NOW...! (Chuẩn bị xuất chiêu)'
      },
      {
        id: 'p2',
        title: 'Panel 2: Ánh Mắt Quyết Tử',
        bounds: { x: 0.66, y: 0.03, w: 0.31, h: 0.28 },
        duration: 1.8,
        camera: {
          zoomStart: 1.05,
          zoomEnd: 1.45,
          panStartX: 0,
          panStartY: 0.05,
          panEndX: -0.02,
          panEndY: -0.05,
          rotationStart: -1,
          rotationEnd: 2
        },
        vfx: {
          focusLines: true,
          focusIntensity: 0.95,
          focusCenterX: 0.5,
          focusCenterY: 0.4,
          speedLines: false,
          shakeIntensity: 4,
          shakeTriggerTime: 0.1,
          slashArc: false,
          screenFlash: false,
          sparks: false
        },
        audio: {
          sound: 'whoosh',
          impactAt: 0.2,
          impactSound: 'boom'
        },
        caption: 'GAAAAAH! ...DIE! (Sát niệm bùng nổ)'
      },
      {
        id: 'p3',
        title: 'Panel 3: Lướt Kiếm Thần Tốc (Zash!)',
        bounds: { x: 0.03, y: 0.35, w: 0.63, h: 0.31 },
        duration: 2.0,
        camera: {
          zoomStart: 1.0,
          zoomEnd: 1.2,
          panStartX: -0.15,
          panStartY: 0.05,
          panEndX: 0.15,
          panEndY: -0.05,
          rotationStart: -2,
          rotationEnd: 3
        },
        vfx: {
          focusLines: false,
          speedLines: true,
          speedAngle: -15, // horizontal dash
          speedIntensity: 1.0,
          shakeIntensity: 8,
          shakeTriggerTime: 0.8,
          slashArc: true,
          slashColor: '#00ffff',
          screenFlash: true,
          flashColor: '#ffffff',
          flashTime: 0.8,
          sparks: true,
          sparkCount: 30
        },
        audio: {
          sound: 'dash',
          impactAt: 0.8,
          impactSound: 'slash'
        },
        caption: 'SHWAAAA!! ZASH!!! (Nhất trảm đoạt mệnh)'
      },
      {
        id: 'p4',
        title: 'Panel 4: Bộc Phá Vỡ Khiên (Crash!!)',
        bounds: { x: 0.60, y: 0.32, w: 0.37, h: 0.34 },
        duration: 1.9,
        camera: {
          zoomStart: 1.3,
          zoomEnd: 1.0,
          panStartX: 0,
          panStartY: 0,
          panEndX: 0.05,
          panEndY: 0.05,
          rotationStart: 3,
          rotationEnd: 0
        },
        vfx: {
          focusLines: true,
          focusIntensity: 0.8,
          focusCenterX: 0.3,
          focusCenterY: 0.5,
          speedLines: false,
          shakeIntensity: 14, // Massive impact
          shakeTriggerTime: 0.05,
          slashArc: false,
          screenFlash: true,
          flashColor: '#ffeedd',
          flashTime: 0.1,
          sparks: true,
          sparkCount: 40
        },
        audio: {
          sound: 'heavy_impact',
          impactAt: 0.1,
          impactSound: 'boom'
        },
        caption: 'CRASH!! BOOM!! (Khiên sắt vỡ vụn)'
      },
      {
        id: 'p5',
        title: 'Panel 5: Đại Công Cáo Thành (Victory)',
        bounds: { x: 0.03, y: 0.66, w: 0.94, h: 0.32 },
        duration: 2.8,
        camera: {
          zoomStart: 1.15,
          zoomEnd: 1.0,
          panStartX: 0,
          panStartY: -0.05,
          panEndX: 0,
          panEndY: 0.02,
          rotationStart: 0,
          rotationEnd: 0
        },
        vfx: {
          focusLines: false,
          speedLines: false,
          shakeIntensity: 2,
          shakeTriggerTime: 0.2,
          slashArc: false,
          screenFlash: false,
          sparks: true,
          sparkCount: 10
        },
        audio: {
          sound: 'resolve',
          impactAt: 0.2,
          impactSound: 'resolve'
        },
        caption: 'He did it...! (Hạ gục quái vật)'
      }
    ]
  },
  {
    id: 'shadow-hunter',
    title: 'Thợ Săn Hắc Ám - Lôi Đình Trảm',
    category: 'Manhwa Webtoon (Full Color)',
    image: '/samples/sample2_hunter.jpg',
    readDirection: 'ltr',
    panels: [
      {
        id: 'p1',
        title: 'Panel 1: Đồng Tử Lôi Quang (Awakening)',
        bounds: { x: 0.02, y: 0.01, w: 0.96, h: 0.27 },
        duration: 2.2,
        camera: {
          zoomStart: 1.0,
          zoomEnd: 1.35,
          panStartX: 0,
          panStartY: 0.05,
          panEndX: 0,
          panEndY: -0.05,
          rotationStart: 0,
          rotationEnd: 0
        },
        vfx: {
          focusLines: true,
          focusIntensity: 0.7,
          focusCenterX: 0.5,
          focusCenterY: 0.45,
          speedLines: false,
          shakeIntensity: 3,
          shakeTriggerTime: 1.0,
          slashArc: false,
          screenFlash: true,
          flashColor: '#00e5ff',
          flashTime: 1.2,
          sparks: true,
          sparkCount: 25
        },
        audio: {
          sound: 'charge',
          impactAt: 1.2,
          impactSound: 'lightning'
        },
        caption: 'KRRR! ZAP! (Năng lượng sấm sét thức tỉnh)'
      },
      {
        id: 'p2',
        title: 'Panel 2: Tốc Biến Xé Gió (Sonic Dash)',
        bounds: { x: 0.02, y: 0.28, w: 0.96, h: 0.27 },
        duration: 2.0,
        camera: {
          zoomStart: 1.1,
          zoomEnd: 1.25,
          panStartX: 0.2,
          panStartY: 0,
          panEndX: -0.2,
          panEndY: 0,
          rotationStart: -1,
          rotationEnd: 2
        },
        vfx: {
          focusLines: false,
          speedLines: true,
          speedAngle: -10,
          speedIntensity: 1.2,
          shakeIntensity: 6,
          shakeTriggerTime: 0.5,
          slashArc: true,
          slashColor: '#8a2be2',
          screenFlash: true,
          flashColor: '#c084fc',
          flashTime: 0.5,
          sparks: true,
          sparkCount: 35
        },
        audio: {
          sound: 'dash',
          impactAt: 0.5,
          impactSound: 'slash'
        },
        caption: 'WHOOSH! SHHAA! (Tốc độ vượt âm thanh)'
      },
      {
        id: 'p3',
        title: 'Panel 3: Trảm Kích Lôi Đình (Colossal Crescent)',
        bounds: { x: 0.02, y: 0.55, w: 0.96, h: 0.44 },
        duration: 2.6,
        camera: {
          zoomStart: 1.35,
          zoomEnd: 1.02,
          panStartX: -0.1,
          panStartY: -0.1,
          panEndX: 0.05,
          panEndY: 0.05,
          rotationStart: 4,
          rotationEnd: -1
        },
        vfx: {
          focusLines: true,
          focusIntensity: 0.9,
          focusCenterX: 0.4,
          focusCenterY: 0.5,
          speedLines: false,
          shakeIntensity: 15,
          shakeTriggerTime: 0.15,
          slashArc: true,
          slashColor: '#38bdf8',
          screenFlash: true,
          flashColor: '#ffffff',
          flashTime: 0.15,
          sparks: true,
          sparkCount: 60
        },
        audio: {
          sound: 'heavy_impact',
          impactAt: 0.15,
          impactSound: 'boom'
        },
        caption: 'CRASH! SLICE! (Đoạt mạng thú dữ)'
      }
    ]
  }
];
