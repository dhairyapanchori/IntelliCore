const path = require('path');
const fs = require('fs');
const { createCanvas } = require('canvas');
const Tesseract = require('tesseract.js');

const OCR_CONFIG = {
  enabled: process.env.OCR_ENABLED !== 'false',
  langs: process.env.OCR_LANGS || 'eng',
  renderScale: Math.min(3, Math.max(1, parseFloat(process.env.OCR_RENDER_SCALE) || 2)),
  maxPages: Math.max(1, parseInt(process.env.OCR_MAX_PAGES, 10) || 100),
  concurrency: Math.min(4, Math.max(1, parseInt(process.env.OCR_CONCURRENCY, 10) || 1)),
  pageTimeoutMs: Math.max(5000, parseInt(process.env.OCR_PAGE_TIMEOUT_MS, 10) || 30000),
  maxImageDim: Math.max(512, parseInt(process.env.OCR_MAX_IMAGE_DIM, 10) || 4096),
  cacheDir: process.env.OCR_CACHE_DIR || path.join(process.cwd(), '.tessdata'),
};

/**
 * NodeCanvasFactory for pdfjs-dist v4 using node-canvas.
 */
class NodeCanvasFactory {
  create(width, height) {
    const w = Math.max(1, Math.ceil(width));
    const h = Math.max(1, Math.ceil(height));
    const canvas = createCanvas(w, h);
    return {
      canvas,
      context: canvas.getContext('2d'),
    };
  }

  reset(canvasAndContext, width, height) {
    if (!canvasAndContext || !canvasAndContext.canvas) return;
    canvasAndContext.canvas.width = Math.max(1, Math.ceil(width));
    canvasAndContext.canvas.height = Math.max(1, Math.ceil(height));
  }

  destroy(canvasAndContext) {
    if (!canvasAndContext) return;
    if (canvasAndContext.canvas) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
    }
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

/**
 * Bounded pool of reusable Tesseract.js workers.
 */
class OcrWorkerPool {
  constructor(maxSize, langs, cacheDir) {
    this.maxSize = maxSize;
    this.langs = langs;
    this.cacheDir = cacheDir;
    this.idle = [];
    this.activeCount = 0;
    this.waitQueue = [];
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async createNewWorker() {
    this.ensureCacheDir();
    const worker = await Tesseract.createWorker(this.langs, 1, {
      cachePath: this.cacheDir,
      logger: () => {},
    });
    return worker;
  }

  async acquire() {
    if (this.idle.length > 0) {
      const worker = this.idle.pop();
      this.activeCount++;
      return worker;
    }
    if (this.activeCount + this.idle.length < this.maxSize) {
      this.activeCount++;
      try {
        return await this.createNewWorker();
      } catch (err) {
        this.activeCount--;
        this.drainWaiters();
        throw err;
      }
    }
    return new Promise((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
    });
  }

  release(worker, broken = false) {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (broken) {
      if (worker) {
        worker.terminate().catch(() => {});
      }
    } else if (worker) {
      if (this.waitQueue.length > 0) {
        const next = this.waitQueue.shift();
        this.activeCount++;
        next.resolve(worker);
        return;
      }
      this.idle.push(worker);
    }
    this.drainWaiters();
  }

  drainWaiters() {
    while (this.waitQueue.length > 0 && (this.idle.length > 0 || this.activeCount + this.idle.length < this.maxSize)) {
      const next = this.waitQueue.shift();
      if (this.idle.length > 0) {
        const worker = this.idle.pop();
        this.activeCount++;
        next.resolve(worker);
      } else {
        this.activeCount++;
        this.createNewWorker()
          .then((w) => next.resolve(w))
          .catch((err) => {
            this.activeCount--;
            next.reject(err);
          });
      }
    }
  }

  async terminateAll() {
    const workers = [...this.idle];
    this.idle = [];
    await Promise.all(workers.map((w) => w.terminate().catch(() => {})));
  }
}

let sharedPool = null;
function getWorkerPool() {
  if (!sharedPool) {
    sharedPool = new OcrWorkerPool(OCR_CONFIG.concurrency, OCR_CONFIG.langs, OCR_CONFIG.cacheDir);
  }
  return sharedPool;
}

/**
 * Render a pdfjs-dist page to a PNG buffer with bounded dimensions.
 */
async function renderPdfPageToPng(pdfPage, options = {}) {
  const requestedScale = options.renderScale || OCR_CONFIG.renderScale;
  const maxDim = options.maxImageDim || OCR_CONFIG.maxImageDim;

  const baseViewport = pdfPage.getViewport({ scale: 1 });
  const maxBaseDim = Math.max(baseViewport.width, baseViewport.height, 1);
  let effectiveScale = requestedScale;
  if (maxBaseDim * effectiveScale > maxDim) {
    effectiveScale = Math.max(0.5, maxDim / maxBaseDim);
  }

  const viewport = pdfPage.getViewport({ scale: effectiveScale });
  const canvasFactory = new NodeCanvasFactory();
  const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

  try {
    // Fill white background so transparent PDFs render cleanly for OCR
    canvasAndContext.context.fillStyle = '#ffffff';
    canvasAndContext.context.fillRect(0, 0, canvasAndContext.canvas.width, canvasAndContext.canvas.height);

    await pdfPage.render({
      canvasContext: canvasAndContext.context,
      viewport,
    }).promise;

    return canvasAndContext.canvas.toBuffer('image/png');
  } finally {
    canvasFactory.destroy(canvasAndContext);
  }
}

/**
 * Run OCR on a PNG buffer using a pooled Tesseract.js worker with timeout.
 */
async function recognizeImageBuffer(pngBuffer, options = {}) {
  const timeoutMs = options.pageTimeoutMs || OCR_CONFIG.pageTimeoutMs;
  const pool = getWorkerPool();
  const worker = await pool.acquire();
  let broken = false;

  try {
    let timerId;
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        broken = true;
        reject(new Error(`OCR timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const recognizePromise = worker.recognize(pngBuffer).finally(() => clearTimeout(timerId));
    const result = await Promise.race([recognizePromise, timeoutPromise]);

    const rawText = result?.data?.text || '';
    const confidence = typeof result?.data?.confidence === 'number'
      ? Number(result.data.confidence.toFixed(1))
      : null;

    return {
      text: rawText.replace(/\r\n/g, '\n').trim(),
      confidence,
    };
  } catch (err) {
    broken = true;
    throw err;
  } finally {
    pool.release(worker, broken);
  }
}

/**
 * Render a pdfjs-dist page and run OCR on it.
 */
async function ocrPdfPage(pdfPage, options = {}) {
  const pngBuffer = await renderPdfPageToPng(pdfPage, options);
  return recognizeImageBuffer(pngBuffer, options);
}

/**
 * Terminate all cached Tesseract.js workers (useful for graceful shutdown and tests).
 */
async function terminateOcrWorkers() {
  if (sharedPool) {
    await sharedPool.terminateAll();
    sharedPool = null;
  }
}

module.exports = {
  OCR_CONFIG,
  NodeCanvasFactory,
  renderPdfPageToPng,
  recognizeImageBuffer,
  ocrPdfPage,
  terminateOcrWorkers,
};
