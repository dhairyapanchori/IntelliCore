require('dotenv').config();
const { Worker } = require('bullmq');
const fs = require('fs');
const path = require('path');
const IORedis = require('ioredis');
const prisma = require('./config/db');
const { createRedisConnection } = require('./config/redis');
const { extractPdfPages } = require('./services/pdfExtractionService');
const { terminateOcrWorkers } = require('./services/pdfOcrService');
const { chunkPdfPages, chunkPlainText, countTotalTokens, MODEL_MAX_SEQ_LENGTH } = require('./services/documentChunkingService');

const EXPECTED_EMBEDDING_DIMS = parseInt(process.env.EMBEDDING_DIMENSIONS, 10) || 384;
const MAX_DOCUMENT_BYTES = parseInt(process.env.MAX_DOCUMENT_BYTES, 10) || 50 * 1024 * 1024; // 50 MB
const WORKER_CONCURRENCY = Math.max(1, parseInt(process.env.WORKER_CONCURRENCY, 10) || 1);

async function checkRedisBeforeStart() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log('│   ⚙️ IntelliCore Background Worker Process    │');
  console.log('└──────────────────────────────────────────────┘');
  try {
    const testRedis = new IORedis(redisUrl, { maxRetriesPerRequest: 1, retryStrategy: () => null, connectTimeout: 2000 });
    testRedis.on('error', () => {});
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { testRedis.disconnect(); reject(new Error('Connection timeout')); }, 2500);
      testRedis.on('connect', () => { clearTimeout(timeout); testRedis.quit(); resolve(); });
      testRedis.on('error', (err) => { clearTimeout(timeout); reject(err); });
    });
    console.log(`✅ [Redis/BullMQ] Connected successfully (${redisUrl}).`);
  } catch (err) {
    console.error(`❌ [Worker Warning] Redis server unreachable at ${redisUrl} (${err.message}).`);
    console.error('   BullMQ background job processor cannot start without Redis.');
    console.error('   Shutting down worker process cleanly without crash looping.');
    process.exit(0);
  }
}

let pipelinePromise = null;
function getEmbeddingPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      console.log('⏳ [Model] Loading Xenova/all-MiniLM-L6-v2 transformers pipeline...');
      const transformers = await import('@xenova/transformers');
      const pipe = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('✅ [Model] Transformers model loaded successfully for worker.');
      return pipe;
    })().catch((err) => {
      pipelinePromise = null;
      throw new Error(`Embedding model initialization failed: ${err.message}`);
    });
  }
  return pipelinePromise;
}

/**
 * Generate and validate an embedding vector for a non-empty chunk.
 */
async function generateValidatedEmbedding(pipe, textContent) {
  if (!textContent || typeof textContent !== 'string' || !textContent.trim()) {
    throw new Error('Cannot generate embedding for empty chunk text.');
  }
  if (typeof pipe?.tokenizer === 'function') {
    const totalTokens = countTotalTokens(textContent, pipe.tokenizer);
    if (totalTokens > MODEL_MAX_SEQ_LENGTH) {
      throw new Error(`Chunk exceeds all-MiniLM-L6-v2 max_seq_length (${totalTokens} > ${MODEL_MAX_SEQ_LENGTH} total tokens).`);
    }
  }
  const output = await pipe(textContent, { pooling: 'mean', normalize: true });
  const embedding = Array.from(output?.data || []);

  if (embedding.length !== EXPECTED_EMBEDDING_DIMS) {
    throw new Error(`Unexpected embedding dimensions: got ${embedding.length}, expected ${EXPECTED_EMBEDDING_DIMS}.`);
  }
  for (let i = 0; i < embedding.length; i++) {
    if (!Number.isFinite(embedding[i])) {
      throw new Error(`Invalid non-finite embedding value at index ${i}.`);
    }
  }
  return `[${embedding.join(',')}]`;
}

/**
 * Extract, chunk, embed, and atomically index a document.
 * Exported for deterministic integration testing.
 */
async function processDocumentById(documentId, deps = {}) {
  const db = deps.prisma || prisma;
  const pipe = deps.pipeline || (await getEmbeddingPipeline());

  await db.documents.update({
    where: { id: documentId },
    data: { status: 'processing', updated_at: new Date() },
  });

  const doc = await db.documents.findUnique({ where: { id: documentId } });
  if (!doc || !doc.storage_path || !fs.existsSync(doc.storage_path)) {
    throw new Error('Document file not found.');
  }

  const stat = fs.statSync(doc.storage_path);
  if (stat.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`Document exceeds maximum allowed size (${stat.size} > ${MAX_DOCUMENT_BYTES} bytes).`);
  }

  const fileType = (doc.file_type || path.extname(doc.storage_path).replace('.', '')).toLowerCase();
  const tokenizer = pipe.tokenizer;
  let chunks = [];

  if (fileType === 'pdf') {
    const extraction = await extractPdfPages(doc.storage_path);
    console.log(
      `📄 [Document ${documentId}] PDF extracted: ${extraction.stats.totalPages} pages ` +
      `(native=${extraction.stats.nativePages}, ocr=${extraction.stats.ocrPages}, blank=${extraction.stats.blankPages})`
    );
    chunks = await chunkPdfPages(extraction.pages, { tokenizer });
  } else if (fileType === 'txt') {
    const rawText = fs.readFileSync(doc.storage_path, 'utf8');
    chunks = await chunkPlainText(rawText, { tokenizer });
  } else {
    // Preserve existing fallback behavior for other file types (e.g., docx)
    const rawText = fs.readFileSync(doc.storage_path, 'utf8');
    chunks = await chunkPlainText(rawText, { tokenizer });
  }

  if (chunks.length === 0) {
    throw new Error('No extractable text content found in document.');
  }

  // Generate and validate all embeddings BEFORE modifying existing database chunks
  const indexedRecords = [];
  for (const chunk of chunks) {
    const embeddingStr = await generateValidatedEmbedding(pipe, chunk.textContent);
    indexedRecords.push({
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber ?? null,
      textContent: chunk.textContent,
      embeddingStr,
    });
  }

  // Atomic idempotent swap inside a PostgreSQL transaction
  await db.$transaction(async (tx) => {
    await tx.document_chunks.deleteMany({
      where: { document_id: documentId },
    });

    for (const rec of indexedRecords) {
      await tx.$executeRawUnsafe(
        `INSERT INTO document_chunks (document_id, chunk_index, page_number, text_content, embedding, created_at)
         VALUES ($1, $2, $3, $4, $5::vector, NOW())`,
        documentId,
        rec.chunkIndex,
        rec.pageNumber,
        rec.textContent,
        rec.embeddingStr
      );
    }

    await tx.documents.update({
      where: { id: documentId },
      data: { status: 'completed', updated_at: new Date() },
    });
  }, { timeout: 60000 });

  console.log(`✅ [Document ${documentId}] Indexed ${indexedRecords.length} chunks successfully.`);
  return { documentId, chunkCount: indexedRecords.length };
}

let worker = null;

async function startWorker() {
  await checkRedisBeforeStart();
  // Ensure embedding model is loaded before accepting/completing jobs
  await getEmbeddingPipeline();

  worker = new Worker(
    'documentProcessing',
    async (job) => {
      if (job.name === 'processDocument') {
        const { documentId } = job.data;
        console.log(`⚙️ [Worker] Processing document: ${documentId} (attempt ${job.attemptsMade + 1})`);

        try {
          return await processDocumentById(documentId);
        } catch (err) {
          console.error(`❌ [Worker] Error processing document ${documentId}:`, err.message);
          await prisma.documents
            .update({
              where: { id: documentId },
              data: { status: 'error', updated_at: new Date() },
            })
            .catch(() => {});
          throw err;
        }
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job && job.id ? job.id : 'unknown'} failed:`, err.message);
  });

  worker.on('error', (err) => {
    if (err.code !== 'ECONNREFUSED' && err.code !== 'ENOTFOUND' && err.code !== 'ERR_CANCELED') {
      console.error('BullMQ Worker Error:', err.message);
    }
  });

  console.log(`BullMQ Worker started (concurrency=${WORKER_CONCURRENCY}), listening to 'documentProcessing' queue...`);
}

async function shutdown() {
  console.log('Shutting down IntelliCore Worker...');
  if (worker) {
    await worker.close().catch(() => {});
  }
  await terminateOcrWorkers();
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
}

if (require.main === module) {
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  startWorker().catch((err) => {
    console.error('❌ [Worker Fatal]', err.message);
    process.exit(1);
  });
}

module.exports = {
  processDocumentById,
  generateValidatedEmbedding,
  getEmbeddingPipeline,
  EXPECTED_EMBEDDING_DIMS,
};
