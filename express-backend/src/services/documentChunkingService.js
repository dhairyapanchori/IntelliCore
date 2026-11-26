const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const MODEL_MAX_SEQ_LENGTH = 256; // sentence-transformers/all-MiniLM-L6-v2 max_seq_length

const CHUNK_CONFIG = {
  // Target content tokens per chunk (excluding [CLS] and [SEP])
  chunkSizeTokens: Math.min(220, Math.max(32, parseInt(process.env.CHUNK_SIZE, 10) || 200)),
  // Overlap in content tokens
  chunkOverlapTokens: Math.max(0, parseInt(process.env.CHUNK_OVERLAP, 10) || 30),
  // Hard safety ceiling INCLUDING special tokens ([CLS], [SEP]), safely below 256
  maxChunkTotalTokens: Math.min(MODEL_MAX_SEQ_LENGTH, Math.max(64, parseInt(process.env.MAX_CHUNK_TOKENS, 10) || 240)),
  // Explicit conservative character fallback (only used when explicitly enabled)
  allowCharFallback: process.env.ALLOW_CHAR_CHUNKING_FALLBACK === 'true',
  fallbackChunkSizeChars: Math.min(700, Math.max(150, parseInt(process.env.CHUNK_SIZE_CHARS, 10) || 550)),
  fallbackChunkOverlapChars: Math.max(0, parseInt(process.env.CHUNK_OVERLAP_CHARS, 10) || 80),
};

/**
 * Resolve and validate the embedding tokenizer.
 * Fails with a controlled error if unavailable and fallback is not explicitly allowed.
 */
function resolveTokenizer(options = {}) {
  const tokenizer = options.tokenizer || null;
  if (typeof tokenizer === 'function') {
    return tokenizer;
  }
  const allowFallback =
    options.allowCharFallback !== undefined ? options.allowCharFallback : CHUNK_CONFIG.allowCharFallback;
  if (!allowFallback) {
    throw new Error(
      'Embedding tokenizer is required for token-safe chunking (all-MiniLM-L6-v2 max_seq_length=256). ' +
      'Provide pipeline.tokenizer or explicitly enable allowCharFallback.'
    );
  }
  return null;
}

/**
 * Count TOTAL model input tokens INCLUDING special tokens ([CLS] and [SEP])
 * using the exact embedding pipeline tokenizer.
 */
function countTotalTokens(text, tokenizer) {
  if (!text) return 0;
  if (typeof tokenizer !== 'function') {
    throw new Error('Tokenizer function is required to count exact model tokens.');
  }
  const encoded = tokenizer(text);
  if (!encoded || !encoded.input_ids || typeof encoded.input_ids.size !== 'number') {
    throw new Error('Invalid tokenizer output: missing input_ids.size.');
  }
  return encoded.input_ids.size;
}

/**
 * Count content tokens (excluding [CLS] and [SEP]) for RecursiveCharacterTextSplitter.
 */
function countContentTokens(text, tokenizer) {
  if (!text) return 0;
  const total = countTotalTokens(text, tokenizer);
  return Math.max(0, total - 2);
}

/**
 * Ensure every final chunk stays <= maxTotalTokens INCLUDING special tokens ([CLS], [SEP]).
 * Splits oversized chunks along newline/word/character boundaries before embedding so
 * the embedding model never silently truncates content.
 */
function enforceTokenLimit(text, tokenizer, maxTotalTokens = CHUNK_CONFIG.maxChunkTotalTokens) {
  if (!text) return [];
  if (typeof tokenizer !== 'function') {
    return [text];
  }
  if (countTotalTokens(text, tokenizer) <= maxTotalTokens) {
    return [text];
  }

  const results = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (countTotalTokens(remaining, tokenizer) <= maxTotalTokens) {
      results.push(remaining);
      break;
    }

    let low = 1;
    let high = remaining.length;
    let best = 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = remaining.slice(0, mid);
      if (countTotalTokens(candidate, tokenizer) <= maxTotalTokens) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

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
      if (countTotalTokens(piece, tokenizer) > maxTotalTokens) {
        throw new Error(`Unable to split chunk below ${maxTotalTokens} total tokens.`);
      }
      results.push(piece);
    }
    remaining = remaining.slice(splitAt).trim();
  }

  return results;
}

/**
 * Build a RecursiveCharacterTextSplitter configured for all-MiniLM-L6-v2.
 */
function createSplitter(options = {}) {
  const tokenizer = resolveTokenizer(options);

  if (tokenizer) {
    const maxTotalTokens = Math.min(
      MODEL_MAX_SEQ_LENGTH,
      options.maxChunkTokens || CHUNK_CONFIG.maxChunkTotalTokens
    );
    const maxContentTarget = Math.max(16, maxTotalTokens - 2);
    const chunkSize = Math.min(maxContentTarget, options.chunkSize || CHUNK_CONFIG.chunkSizeTokens);
    const chunkOverlap = Math.min(
      options.chunkOverlap !== undefined ? options.chunkOverlap : CHUNK_CONFIG.chunkOverlapTokens,
      Math.max(0, chunkSize - 1)
    );

    return new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ['\n\n', '\n', ' ', ''],
      lengthFunction: (text) => countContentTokens(text, tokenizer),
    });
  }

  // Explicit conservative character fallback when allowCharFallback=true
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
 * Chunk page-level extracted PDF documents while preserving exact page numbers
 * and enforcing the 240 total token ceiling (including [CLS]/[SEP]).
 */
async function chunkPdfPages(pages, options = {}) {
  if (!Array.isArray(pages) || pages.length === 0) {
    return [];
  }

  const tokenizer = resolveTokenizer(options);
  const maxTotalTokens = Math.min(
    MODEL_MAX_SEQ_LENGTH,
    options.maxChunkTokens || CHUNK_CONFIG.maxChunkTotalTokens
  );
  const splitter = createSplitter({ ...options, tokenizer, maxChunkTokens: maxTotalTokens });

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

      const safePieces = enforceTokenLimit(piece, tokenizer, maxTotalTokens);
      for (const safeText of safePieces) {
        if (!safeText) continue;
        finalChunks.push({
          chunkIndex: chunkIndex++,
          textContent: safeText,
          pageNumber: doc.metadata.pageNumber,
          extractionMethod: doc.metadata.extractionMethod,
          ocrConfidence: doc.metadata.ocrConfidence,
          tokenCount: tokenizer ? countTotalTokens(safeText, tokenizer) : null,
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

  const tokenizer = resolveTokenizer(options);
  const maxTotalTokens = Math.min(
    MODEL_MAX_SEQ_LENGTH,
    options.maxChunkTokens || CHUNK_CONFIG.maxChunkTotalTokens
  );
  const splitter = createSplitter({ ...options, tokenizer, maxChunkTokens: maxTotalTokens });

  const docs = await splitter.createDocuments([normalized], [{ pageNumber: null, extractionMethod: 'text' }]);
  const finalChunks = [];
  let chunkIndex = 0;

  for (const doc of docs) {
    const piece = (doc.pageContent || '').trim();
    if (!piece) continue;

    const safePieces = enforceTokenLimit(piece, tokenizer, maxTotalTokens);
    for (const safeText of safePieces) {
      if (!safeText) continue;
      finalChunks.push({
        chunkIndex: chunkIndex++,
        textContent: safeText,
        pageNumber: null,
        extractionMethod: 'text',
        ocrConfidence: null,
        tokenCount: tokenizer ? countTotalTokens(safeText, tokenizer) : null,
      });
    }
  }

  return finalChunks;
}

module.exports = {
  MODEL_MAX_SEQ_LENGTH,
  CHUNK_CONFIG,
  countTotalTokens,
  countContentTokens,
  countTokens: countTotalTokens,
  enforceTokenLimit,
  createSplitter,
  chunkPdfPages,
  chunkPlainText,
};
