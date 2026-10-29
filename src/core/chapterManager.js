import JSZip from 'jszip';

/**
 * MangaChapterManager - Senior-grade Chapter Ingestion, Decompression & Page Pipeline
 * Enforces strict 20 MiB input safety limits, natural sorting, and local browser processing.
 */
export class MangaChapterManager {
  static MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 MiB strictly
  static MAX_DECOMPRESSED_BYTES = 60 * 1024 * 1024; // 60 MiB safety cap (Zip bomb protection)
  static MAX_PAGES = 80;
  static VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

  constructor() {
    this.chapterName = 'Chapter 01';
    this.pages = [];
    this.totalInputBytes = 0;
    this.activePageIndex = 0;
  }

  /**
   * Natural alphanumeric comparator (e.g., '1.jpg', '2.jpg', '10.jpg')
   */
  static naturalSort(a, b) {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return collator.compare(a, b);
  }

  /**
   * Format bytes to MiB string
   */
  static formatBytes(bytes) {
    const mib = bytes / (1024 * 1024);
    return `${mib.toFixed(1)} MiB`;
  }

  /**
   * Status summary string (e.g., 'Chapter 01 | 18.4 / 20.0 MiB | 42 pages')
   */
  getStatusSummary() {
    const used = (this.totalInputBytes / (1024 * 1024)).toFixed(1);
    const max = (MangaChapterManager.MAX_INPUT_BYTES / (1024 * 1024)).toFixed(1);
    return `${this.chapterName} | ${used} / ${max} MiB | ${this.pages.length} trang`;
  }

  /**
   * Check if file is a valid image extension
   */
  static isValidImageFilename(filename) {
    const lower = filename.toLowerCase();
    // Exclude system files and hidden files
    if (
      lower.includes('__macosx') ||
      lower.includes('thumbs.db') ||
      lower.includes('.ds_store') ||
      lower.startsWith('.')
    ) {
      return false;
    }
    return MangaChapterManager.VALID_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  }

  /**
   * Process incoming files (Array of Files or a single ZIP file)
   */
  async ingestFiles(fileList, options = { append: false }) {
    const files = Array.from(fileList);
    if (!files.length) return { success: false, message: 'Không có tệp nào được chọn.' };

    let incomingBytes = files.reduce((acc, f) => acc + f.size, 0);
    const currentBytes = options.append ? this.totalInputBytes : 0;

    if (currentBytes + incomingBytes > MangaChapterManager.MAX_INPUT_BYTES) {
      const allowedMiB = (MangaChapterManager.MAX_INPUT_BYTES / (1024 * 1024)).toFixed(1);
      const attemptedMiB = ((currentBytes + incomingBytes) / (1024 * 1024)).toFixed(1);
      return {
        success: false,
        message: `Vượt quá giới hạn dung lượng: ${attemptedMiB} MiB / ${allowedMiB} MiB tối đa cho mỗi chapter.`
      };
    }

    // Check if input is a ZIP file
    const zipFile = files.find(
      (f) => f.name.toLowerCase().endsWith('.zip') || f.type === 'application/zip' || f.type === 'application/x-zip-compressed'
    );

    if (zipFile) {
      return await this.extractZipChapter(zipFile, options);
    }

    // Normal image files
    return await this.processImageFiles(files, options);
  }

  /**
   * Extract ZIP archive in-memory using JSZip
   */
  async extractZipChapter(zipFile, options = {}) {
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(zipFile);

      const validEntries = [];
      let totalUncompressedSize = 0;

      contents.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && MangaChapterManager.isValidImageFilename(relativePath)) {
          validEntries.push({ path: relativePath, entry: zipEntry });
        }
      });

      if (!validEntries.length) {
        return {
          success: false,
          message: 'Tệp ZIP không chứa bất kỳ ảnh hợp lệ nào (JPG, PNG, WEBP).'
        };
      }

      // Sort entries naturally by path
      validEntries.sort((a, b) => MangaChapterManager.naturalSort(a.path, b.path));

      if (validEntries.length > MangaChapterManager.MAX_PAGES) {
        return {
          success: false,
          message: `Chapter chứa ${validEntries.length} trang, vượt quá giới hạn an toàn ${MangaChapterManager.MAX_PAGES} trang/chapter.`
        };
      }

      const extractedPages = [];
      for (let i = 0; i < validEntries.length; i++) {
        const item = validEntries[i];
        const blob = await item.entry.async('blob');
        totalUncompressedSize += blob.size;

        if (totalUncompressedSize > MangaChapterManager.MAX_DECOMPRESSED_BYTES) {
          return {
            success: false,
            message: 'Tệp ZIP giải nén vượt quá 60 MiB. Đã hủy để đảm bảo an toàn bộ nhớ.'
          };
        }

        const dataUrl = await this.readBlobAsDataURL(blob);
        const image = await this.loadImageElement(dataUrl);

        extractedPages.push({
          id: `page-${Date.now()}-${i + 1}`,
          index: i,
          name: item.path.split('/').pop(),
          size: blob.size,
          type: blob.type || 'image/jpeg',
          dataUrl,
          image,
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
          ocrStatus: 'idle',
          textSegments: [],
          panels: []
        });
      }

      const chapterBaseName = zipFile.name.replace(/\.[^/.]+$/, '');
      this.chapterName = chapterBaseName || 'Chapter Mới';

      if (options.append) {
        this.pages.push(...extractedPages);
        this.totalInputBytes += zipFile.size;
      } else {
        this.pages = extractedPages;
        this.totalInputBytes = zipFile.size;
        this.activePageIndex = 0;
      }

      this.reindexPages();
      return {
        success: true,
        message: `Đã giải nén và nhập thành công ${extractedPages.length} trang từ ${zipFile.name}.`,
        pagesCount: this.pages.length
      };
    } catch (err) {
      return {
        success: false,
        message: `Lỗi đọc tệp ZIP: ${err.message}`
      };
    }
  }

  /**
   * Process list of image files
   */
  async processImageFiles(files, options = {}) {
    const validFiles = files.filter((f) => MangaChapterManager.isValidImageFilename(f.name));

    if (!validFiles.length) {
      return {
        success: false,
        message: 'Không có ảnh hợp lệ nào. Vui lòng chọn ảnh định dạng JPG, PNG hoặc WEBP.'
      };
    }

    // Natural sort
    validFiles.sort((a, b) => MangaChapterManager.naturalSort(a.name, b.name));

    const loadedPages = [];
    let addedBytes = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const dataUrl = await this.readBlobAsDataURL(file);
        const image = await this.loadImageElement(dataUrl);
        addedBytes += file.size;

        loadedPages.push({
          id: `page-${Date.now()}-${i + 1}`,
          index: i,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          image,
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
          ocrStatus: 'idle',
          textSegments: [],
          panels: []
        });
      } catch (e) {
        console.warn(`Không thể giải mã ảnh: ${file.name}`, e);
      }
    }

    if (!loadedPages.length) {
      return { success: false, message: 'Tất cả các tệp ảnh đều không thể giải mã được.' };
    }

    if (options.append) {
      this.pages.push(...loadedPages);
      this.totalInputBytes += addedBytes;
    } else {
      this.pages = loadedPages;
      this.totalInputBytes = addedBytes;
      this.activePageIndex = 0;
    }

    this.reindexPages();
    return {
      success: true,
      message: `Đã nạp thành công ${loadedPages.length} trang truyện.`,
      pagesCount: this.pages.length
    };
  }

  /**
   * Helper: Read Blob/File as Data URL
   */
  readBlobAsDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Helper: Load HTMLImageElement with onload promise
   */
  loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Lỗi giải mã ảnh'));
      img.src = src;
    });
  }

  /**
   * Reindex pages array
   */
  reindexPages() {
    this.pages.forEach((p, idx) => {
      p.index = idx;
    });
  }

  /**
   * Delete a page by ID
   */
  deletePage(pageId) {
    const idx = this.pages.findIndex((p) => p.id === pageId);
    if (idx !== -1) {
      const removed = this.pages.splice(idx, 1)[0];
      this.totalInputBytes = Math.max(0, this.totalInputBytes - removed.size);
      this.reindexPages();
      if (this.activePageIndex >= this.pages.length) {
        this.activePageIndex = Math.max(0, this.pages.length - 1);
      }
      return true;
    }
    return false;
  }

  /**
   * Move page order (Up/Down or arbitrary reorder)
   */
  movePage(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.pages.length || toIndex < 0 || toIndex >= this.pages.length) {
      return false;
    }
    const [moved] = this.pages.splice(fromIndex, 1);
    this.pages.splice(toIndex, 0, moved);
    this.reindexPages();
    this.activePageIndex = toIndex;
    return true;
  }

  /**
   * Clear all pages
   */
  clearChapter() {
    this.pages = [];
    this.totalInputBytes = 0;
    this.activePageIndex = 0;
  }

  /**
   * Get currently active page
   */
  getActivePage() {
    return this.pages[this.activePageIndex] || null;
  }
}
