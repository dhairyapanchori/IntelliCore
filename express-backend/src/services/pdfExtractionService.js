const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { OCR_CONFIG, NodeCanvasFactory, ocrPdfPage } = require('./pdfOcrService');

const MIN_NATIVE_CHARS = Math.max(10, parseInt(process.env.OCR_MIN_NATIVE_CHARS, 10) || 30);
const MAX_PDF_PAGES = Math.max(1, parseInt(process.env.MAX_PDF_PAGES, 10) || 500);

let pdfjsPromise = null;
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsPromise;
}

/**
 * Reconstruct readable lines and paragraphs from pdfjs textContent items,
 * preserving headings, lists, line breaks, and table row boundaries.
 */
function reconstructPageText(textContent) {
  const items = (textContent?.items || []).filter((item) => typeof item.str === 'string');
  if (items.length === 0) return '';

  const lines = [];
  let currentLine = [];
  let lastY = null;
  let lastXEnd = null;
  let lastHeight = 12;

  for (const item of items) {
    const str = item.str;
    const transform = item.transform || [1, 0, 0, 1, 0, 0];
    const x = transform[4] || 0;
    const y = transform[5] || 0;
    const height = Math.abs(item.height || transform[3] || 12) || 12;
    const width = item.width || 0;

    if (lastY !== null && Math.abs(y - lastY) > Math.max(3, lastHeight * 0.45)) {
      const lineStr = currentLine.join('').replace(/[ \t]+$/g, '');
      const yGap = Math.abs(lastY - y);
      lines.push({ text: lineStr, yGap, lineHeight: lastHeight });
      currentLine = [];
      lastXEnd = null;
    }

    if (lastXEnd !== null && str.length > 0) {
      const xGap = x - lastXEnd;
      if (xGap > height * 0.25 && !currentLine[currentLine.length - 1]?.endsWith(' ') && !str.startsWith(' ')) {
        currentLine.push(xGap > height * 1.8 ? '  ' : ' ');
      }
    }

    currentLine.push(str);
    if (item.hasEOL) {
      const lineStr = currentLine.join('').replace(/[ \t]+$/g, '');
      lines.push({ text: lineStr, yGap: lastHeight * 1.2, lineHeight: lastHeight });
      currentLine = [];
      lastXEnd = null;
    } else {
      lastXEnd = x + width;
    }

    lastY = y;
    lastHeight = height;
  }

  if (currentLine.length > 0) {
    const lineStr = currentLine.join('').replace(/[ \t]+$/g, '');
    lines.push({ text: lineStr, yGap: lastHeight * 1.2, lineHeight: lastHeight });
  }

  const output = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i > 0 && line.yGap > line.lineHeight * 1.75) {
      output.push('');
    }
    output.push(line.text);
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Inspect pdfjs operator list to determine whether a page contains
 * raster images or vector/form drawings (i.e. non-blank visual content).
 */
async function pageHasVisualContent(pdfPage, OPS) {
  try {
    const opList = await pdfPage.getOperatorList();
    const imageOps = new Set([
      OPS.paintImageXObject,
      OPS.paintInlineImageXObject,
      OPS.paintImageMaskXObject,
      OPS.paintImageXObjectRepeat,
      OPS.paintImageMaskXObjectRepeat,
      OPS.paintFormXObjectBegin,
    ]);
    for (const fn of opList.fnArray) {
      if (imageOps.has(fn)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Extract pages from a PDF file with automatic per-page OCR fallback.
 *
 * Scenarios handled:
 * - Normal PDF: native text extracted per page, OCR skipped.
 * - Scanned PDF: pages with insufficient native text & visual content are OCR'd.
 * - Mixed PDF: native pages keep native text, scanned pages use OCR, order preserved.
 * - Blank PDF: empty pages produce empty text without inventing content.
 */
async function extractPdfPages(filePath, options = {}) {
  const dataBuffer = fs.readFileSync(filePath);
  if (!dataBuffer || dataBuffer.length === 0) {
    throw new Error('PDF file is empty.');
  }

  const pdfjs = await getPdfjs();
  const standardFontDataUrl =
    pathToFileURL(path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts')).href + '/';

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(dataBuffer),
    CanvasFactory: NodeCanvasFactory,
    standardFontDataUrl,
    useSystemFonts: true,
    verbosity: 0,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const maxPdfPages = options.maxPdfPages || MAX_PDF_PAGES;
  if (numPages > maxPdfPages) {
    await pdfDoc.destroy();
    throw new Error(`PDF exceeds maximum allowed page limit (${numPages} > ${maxPdfPages}).`);
  }

  const ocrEnabled = options.ocrEnabled !== undefined ? options.ocrEnabled : OCR_CONFIG.enabled;
  const maxOcrPages = options.ocrMaxPages || OCR_CONFIG.maxPages;
  const minNativeChars = options.minNativeChars || MIN_NATIVE_CHARS;

  const pages = [];
  let nativePages = 0;
  let ocrPages = 0;
  let blankPages = 0;
  let ocrBudgetUsed = 0;

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const pdfPage = await pdfDoc.getPage(pageNum);
      try {
        const textContent = await pdfPage.getTextContent();
        const nativeText = reconstructPageText(textContent);
        const nonWhitespaceLen = nativeText.replace(/\s+/g, '').length;

        if (nonWhitespaceLen >= minNativeChars) {
          nativePages++;
          pages.push({
            pageNumber: pageNum,
            text: nativeText,
            extractionMethod: 'native',
            ocrConfidence: null,
            isBlank: false,
          });
          continue;
        }

        const hasVisuals = await pageHasVisualContent(pdfPage, pdfjs.OPS);

        // Genuinely blank page (no native text and no image/form operators)
        if (nonWhitespaceLen === 0 && !hasVisuals) {
          blankPages++;
          pages.push({
            pageNumber: pageNum,
            text: '',
            extractionMethod: 'native',
            ocrConfidence: null,
            isBlank: true,
          });
          continue;
        }

        // Small amount of valid native text without any scanned image content
        if (nonWhitespaceLen > 0 && !hasVisuals) {
          nativePages++;
          pages.push({
            pageNumber: pageNum,
            text: nativeText,
            extractionMethod: 'native',
            ocrConfidence: null,
            isBlank: false,
          });
          continue;
        }

        // Page has visual/image content and insufficient native text -> OCR fallback
        if (ocrEnabled && ocrBudgetUsed < maxOcrPages) {
          ocrBudgetUsed++;
          try {
            const ocrResult = await ocrPdfPage(pdfPage, options);
            const ocrText = (ocrResult.text || '').trim();
            const ocrNonWs = ocrText.replace(/\s+/g, '').length;

            if (ocrNonWs === 0 && nonWhitespaceLen === 0) {
              blankPages++;
              pages.push({
                pageNumber: pageNum,
                text: '',
                extractionMethod: 'ocr',
                ocrConfidence: ocrResult.confidence,
                isBlank: true,
              });
            } else if (ocrNonWs >= nonWhitespaceLen) {
              ocrPages++;
              pages.push({
                pageNumber: pageNum,
                text: ocrText,
                extractionMethod: 'ocr',
                ocrConfidence: ocrResult.confidence,
                isBlank: false,
              });
            } else {
              nativePages++;
              pages.push({
                pageNumber: pageNum,
                text: nativeText,
                extractionMethod: 'native',
                ocrConfidence: null,
                isBlank: false,
              });
            }
          } catch (ocrErr) {
            console.warn(`⚠️ [OCR] Failed on page ${pageNum} of ${path.basename(filePath)}: ${ocrErr.message}`);
            if (nonWhitespaceLen > 0) {
              nativePages++;
              pages.push({
                pageNumber: pageNum,
                text: nativeText,
                extractionMethod: 'native',
                ocrConfidence: null,
                isBlank: false,
              });
            } else {
              blankPages++;
              pages.push({
                pageNumber: pageNum,
                text: '',
                extractionMethod: 'ocr',
                ocrConfidence: null,
                isBlank: true,
              });
            }
          }
        } else {
          if (ocrEnabled && ocrBudgetUsed >= maxOcrPages) {
            console.warn(`⚠️ [OCR] Reached OCR_MAX_PAGES (${maxOcrPages}) limit; skipping OCR on page ${pageNum}.`);
          }
          if (nonWhitespaceLen > 0) {
            nativePages++;
            pages.push({
              pageNumber: pageNum,
              text: nativeText,
              extractionMethod: 'native',
              ocrConfidence: null,
              isBlank: false,
            });
          } else {
            blankPages++;
            pages.push({
              pageNumber: pageNum,
              text: '',
              extractionMethod: 'native',
              ocrConfidence: null,
              isBlank: true,
            });
          }
        }
      } finally {
        if (typeof pdfPage.cleanup === 'function') {
          pdfPage.cleanup();
        }
      }
    }
  } finally {
    await pdfDoc.destroy();
  }

  return {
    numPages,
    pages,
    stats: {
      totalPages: numPages,
      nativePages,
      ocrPages,
      blankPages,
    },
  };
}

module.exports = {
  extractPdfPages,
  reconstructPageText,
  MIN_NATIVE_CHARS,
  MAX_PDF_PAGES,
};
