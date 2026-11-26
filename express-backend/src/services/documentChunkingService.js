const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const CHUNK_CONFIG = {
  // Primary unit is tokens when embedding tokenizer is available (target ~350 tokens, overlap ~50 tokens).
  chunkSizeTokens: Math.max(50, parseInt(process.env.CHUNK_SIZE, 10) || 350),
  chunkOverlapTokens: Math.max(0, parseInt(process.env.CHUNK_OVERLAP, 10) || 50),
  // Safe ceiling below Xenova/all-MiniLM-L6-v2 model_max_length (512 tokens).
  maxChunkTokens: Math.min(500, Math.max(100, parseInt(process.env.MAX_CHUNK_TOKENS, 10) || 450)),
  // Conservative character fallback when tokenizer is not supplied.
  fallbackChunkSizeChars: Math.max(200, parseInt(process.env.CHUNK_SIZE_CHARS, 10) || 1100),
  fallbackChunkOverlapChars: Math.max(0, parseInt(process.env.CHUNK_OVERLAP_CHARS, 10) || 150),
};

/**
 * Count total model input tokens (including [CLS]/[SEP]) using the embedding tokenizer.
 */
function countTokens(text, tokenizer) {
  if (!text) return 0;
  if (typeof tokenizer !== 'function') {
    // Conservative estimate if no tokenizer is provided
    return Math.ceil(text.length / 3.5);
  }
  const encoded = tokenizer(text);
  return encoded?.input_ids?.size ?? Math.ceil(text.length / 3.5);
}

/**
 * Ensure a chunk never exceeds maxTokens under the actual embedding tokenizer.
 * Splits oversized chunks along word/character boundaries without silent truncation.
 */
function enforceTokenLimit(text, tokenizer, maxTokens) {
  if (!text || typeof tokenizer !== 'function') {
    return [text];
  }
  if (countTokens(text, tokenizer) <= maxTokens) {
    return [text];
  }

  const results = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (countTokens(remaining, tokenizer) <= maxTokens) {
      results.push(remaining);
      break;
    }

    // Binary search for largest prefix that fits within maxTokens
    let low = 1;
    let high = remaining.length;
    let best = 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = remaining.slice(0, mid);
      if (countTokens(candidate, tokenizer) <= maxTokens) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Prefer breaking at a newline or space if reasonably close to best
    let splitAt = best;
    if (best < remaining.length) {
      const slice = remaining.slice(0, best);
      const lastNewline = slice.lastIndexOf('\n');
      const lastSpace = slice.lastIndexOf(' ');
      if (lastNewline > best * 0.6) {
        splitAt = lastNewline;
      } else if (lastSpace > best * 0.6) {
        splitAt = lastSpace;
      }
    }

    const piece = remaining.slice(0, splitAt).trim();
    if (piece.length > 0) {
      results.push(piece);
    }
    remaining = remaining.slice(splitAt).trim();
  }

  return results;
}

/**
 * Build a RecursiveCharacterTextSplitter configured for semantic preservation.
 */
function createSplitter(options = {}) {
  const tokenizer = options.tokenizer || null;

  if (typeof tokenizer === 'function') {
    const chunkSize = options.chunkSize || CHUNK_CONFIG.chunkSizeTokens;
    const chunkOverlap = Math.min(
      options.chunkOverlap !== undefined ? options.chunkOverlap : CHUNK_CONFIG.chunkOverlapTokens,
      Math.max(0, chunkSize - 1)
    );

    return new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ['\n\n', '\n', ' ', ''],
      lengthFunction: (text) => {
        if (!text) return 0;
        const total = countTokens(text, tokenizer);
        return Math.max(0, total - 2);
      },
    });
  }

  const chunkSize = options.chunkSizeChars || CHUNK_CONFIG.fallbackChunkSizeChars;
  const chunkOverlap = Math.min(
    options.chunkOverlapChars !== undefined ? options.chunkOverlapChars : CHUNK_CONFIG.fallbackChunkOverlapChars,
    Math.max(0, chunkSize - 1)
  );

  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', ' ', ''],
  });
}

/**
 * Chunk page-level extracted PDF documents while preserving exact page numbers.
 * Never merges separate pages before splitting.
 */
async function chunkPdfPages(pages, options = {}) {
  if (!Array.isArray(pages) || pages.length === 0) {
    return [];
  }

  const tokenizer = options.tokenizer || null;
  const maxTokens = options.maxChunkTokens || CHUNK_CONFIG.maxChunkTokens;
  const splitter = createSplitter(options);

  const finalChunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const normalized = (page.text || '').replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      continue;
    }

    const docs = await splitter.createDocuments(
      [normalized],
      [
        {
          pageNumber: page.pageNumber,
          extractionMethod: page.extractionMethod || 'native',
          ocrConfidence: page.ocrConfidence ?? null,
        },
      ]
    );

    for (const doc of docs) {
      const piece = (doc.pageContent || '').trim();
      if (!piece) continue;

      const safePieces = enforceTokenLimit(piece, tokenizer, maxTokens);
      for (const safeText of safePieces) {
        if (!safeText) continue;
        finalChunks.push({
          chunkIndex: chunkIndex++,
          textContent: safeText,
          pageNumber: doc.metadata.pageNumber,
          extractionMethod: doc.metadata.extractionMethod,
          ocrConfidence: doc.metadata.ocrConfidence,
          tokenCount: tokenizer ? countTokens(safeText, tokenizer) : null,
        });
      }
    }
  }

  return finalChunks;
}

/**
 * Chunk plain text documents (e.g. TXT) using RecursiveCharacterTextSplitter.
 * Uses null for pageNumber since TXT files do not have PDF pages.
 */
async function chunkPlainText(text, options = {}) {
  const normalized = (text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const tokenizer = options.tokenizer || null;
  const maxTokens = options.maxChunkTokens || CHUNK_CONFIG.maxChunkTokens;
  const splitter = createSplitter(options);

  const docs = await splitter.createDocuments([normalized], [{ pageNumber: null, extractionMethod: 'text' }]);
  const finalChunks = [];
  let chunkIndex = 0;

  for (const doc of docs) {
    const piece = (doc.pageContent || '').trim();
    if (!piece) continue;

    const safePieces = enforceTokenLimit(piece, tokenizer, maxTokens);
    for (const safeText of safePieces) {
      if (!safeText) continue;
      finalChunks.push({
        chunkIndex: chunkIndex++,
        textContent: safeText,
        pageNumber: null,
        extractionMethod: 'text',
        ocrConfidence: null,
        tokenCount: tokenizer ? countTokens(safeText, tokenizer) : null,
      });
    }
  }

  return finalChunks;
}

module.exports = {
  CHUNK_CONFIG,
  countTokens,
  enforceTokenLimit,
  createSplitter,
  chunkPdfPages,
  chunkPlainText,
};
