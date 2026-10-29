import { createWorker } from 'tesseract.js';

/**
 * MangaOCREngine - In-browser Comic OCR, Bounding Box Extraction & Reading Order Sorting
 * Uses Tesseract.js with lazy language loading, multi-language support, and cancellation.
 */
export class MangaOCREngine {
  static SUPPORTED_LANGUAGES = [
    { code: 'vie', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'eng', name: 'Tiếng Anh (English)', flag: '🇺🇸' },
    { code: 'jpn', name: 'Tiếng Nhật (日本語)', flag: '🇯🇵' },
    { code: 'kor', name: 'Tiếng Hàn (한국어)', flag: '🇰🇷' },
    { code: 'chi_sim', name: 'Tiếng Trung (简体中文)', flag: '🇨🇳' }
  ];

  constructor() {
    this.currentLanguage = 'vie';
    this.worker = null;
    this.workerLanguage = null;
    this.isProcessing = false;
    this.isCancelled = false;
  }

  /**
   * Get or initialize Tesseract worker lazily
   */
  async getWorker(lang, onProgress = () => {}) {
    if (this.worker && this.workerLanguage === lang) {
      return this.worker;
    }

    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch (e) {
        console.warn('Error terminating previous OCR worker:', e);
      }
      this.worker = null;
      this.workerLanguage = null;
    }

    onProgress({
      percent: 10,
      status: `Đang tải mô hình ngôn ngữ [${lang}] từ CDN...`
    });

    const worker = await createWorker(lang, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress({
            percent: Math.round(m.progress * 100),
            status: `Đang nhận diện chữ (${Math.round(m.progress * 100)}%)...`
          });
        }
      }
    });

    this.worker = worker;
    this.workerLanguage = lang;
    return this.worker;
  }

  /**
   * Sort detected text lines according to reading direction
   */
  static sortReadingOrder(lines, direction = 'rtl', imgWidth = 1000, imgHeight = 1500) {
    if (!lines || !lines.length) return [];

    // Group into horizontal or vertical bands
    const bandTolerance = imgHeight * 0.08; // 8% vertical band grouping

    const sorted = [...lines];

    if (direction === 'rtl') {
      // Manga reading order: Top-to-Bottom, Right-to-Left
      sorted.sort((a, b) => {
        const yDiff = a.bbox.y0 - b.bbox.y0;
        if (Math.abs(yDiff) > bandTolerance) {
          return yDiff; // Higher band first
        }
        // Within same band: Rightmost first
        return b.bbox.x1 - a.bbox.x1;
      });
    } else if (direction === 'vertical') {
      // Traditional Japanese vertical text: Right-to-Left columns, Top-to-Bottom
      const colTolerance = imgWidth * 0.08;
      sorted.sort((a, b) => {
        const xDiff = b.bbox.x1 - a.bbox.x1;
        if (Math.abs(xDiff) > colTolerance) {
          return xDiff;
        }
        return a.bbox.y0 - b.bbox.y0;
      });
    } else {
      // Standard LTR (Left to right, top to bottom)
      sorted.sort((a, b) => {
        const yDiff = a.bbox.y0 - b.bbox.y0;
        if (Math.abs(yDiff) > bandTolerance) {
          return yDiff;
        }
        return a.bbox.x0 - b.bbox.x0;
      });
    }

    return sorted;
  }

  /**
   * Recognize text in a single image page
   */
  async recognizePage(page, options = {}) {
    const lang = options.language || this.currentLanguage;
    const direction = options.readDirection || 'rtl';
    const onProgress = options.onProgress || (() => {});

    const worker = await this.getWorker(lang, onProgress);

    const targetSrc = page.dataUrl || page.image.src;
    const ret = await worker.recognize(targetSrc);

    const imgWidth = page.width || page.image.naturalWidth || 1000;
    const imgHeight = page.height || page.image.naturalHeight || 1500;

    const rawLines = [];
    if (ret.data && ret.data.lines) {
      for (const line of ret.data.lines) {
        const cleanText = line.text.trim();
        // Ignore single non-alphanumeric noise or very low confidence
        if (cleanText.length > 1 && line.confidence > 25) {
          rawLines.push({
            id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            text: cleanText,
            confidence: Math.round(line.confidence),
            bbox: line.bbox,
            // Normalized bounds [0..1]
            bounds: {
              x: Number((Math.max(0, line.bbox.x0) / imgWidth).toFixed(4)),
              y: Number((Math.max(0, line.bbox.y0) / imgHeight).toFixed(4)),
              w: Number((Math.min(imgWidth, line.bbox.x1 - line.bbox.x0) / imgWidth).toFixed(4)),
              h: Number((Math.min(imgHeight, line.bbox.y1 - line.bbox.y0) / imgHeight).toFixed(4))
            }
          });
        }
      }
    }

    // Sort according to reading order
    const orderedSegments = MangaOCREngine.sortReadingOrder(rawLines, direction, imgWidth, imgHeight);

    return {
      text: ret.data.text,
      segments: orderedSegments,
      confidence: Math.round(ret.data.confidence || 0)
    };
  }

  /**
   * Process an entire chapter (array of pages) sequentially with progress
   */
  async processChapter(pages, options = {}) {
    if (this.isProcessing) throw new Error('OCR đang được thực thi.');
    this.isProcessing = true;
    this.isCancelled = false;

    const lang = options.language || this.currentLanguage;
    const direction = options.readDirection || 'rtl';
    const onProgress = options.onProgress || (() => {});

    const totalPages = pages.length;
    let completedCount = 0;
    const results = [];

    try {
      for (let i = 0; i < totalPages; i++) {
        if (this.isCancelled) {
          onProgress({
            current: i + 1,
            total: totalPages,
            percent: Math.round((i / totalPages) * 100),
            status: 'Đã hủy quá trình OCR theo yêu cầu của người dùng.'
          });
          break;
        }

        const page = pages[i];
        page.ocrStatus = 'processing';

        onProgress({
          current: i + 1,
          total: totalPages,
          percent: Math.round((i / totalPages) * 100),
          status: `Đang quét OCR trang ${i + 1}/${totalPages} (${page.name})...`
        });

        try {
          const res = await this.recognizePage(page, {
            language: lang,
            readDirection: direction,
            onProgress: (sub) => {
              const basePct = (i / totalPages) * 100;
              const stepPct = (1 / totalPages) * (sub.percent || 0);
              onProgress({
                current: i + 1,
                total: totalPages,
                percent: Math.round(basePct + stepPct),
                status: `Trang ${i + 1}/${totalPages}: ${sub.status}`
              });
            }
          });

          page.textSegments = res.segments;
          page.ocrStatus = 'completed';
          page.rawOCRText = res.text;
          completedCount++;
          results.push({ pageIndex: i, success: true, segmentsCount: res.segments.length });
        } catch (pageErr) {
          console.error(`Lỗi OCR trang ${i + 1}:`, pageErr);
          page.ocrStatus = 'error';
          results.push({ pageIndex: i, success: false, error: pageErr.message });
        }
      }

      onProgress({
        current: totalPages,
        total: totalPages,
        percent: 100,
        status: `Hoàn tất OCR! Đã quét thành công ${completedCount}/${totalPages} trang.`
      });

      return {
        success: true,
        completedCount,
        totalPages,
        results
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Cancel ongoing OCR
   */
  cancel() {
    this.isCancelled = true;
  }

  /**
   * Terminate worker to free memory
   */
  async terminate() {
    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch (e) {
        console.warn('Error terminating OCR worker:', e);
      }
      this.worker = null;
      this.workerLanguage = null;
    }
    this.isProcessing = false;
  }
}
