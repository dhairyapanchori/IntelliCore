require('dotenv').config();
const { Worker } = require('bullmq');
const fs = require('fs');
const pdf = require('pdf-parse');
const prisma = require('./config/db');
const { createRedisConnection } = require('./config/redis');
const IORedis = require('ioredis');

async function checkRedisBeforeStart() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log('│   ⚙️ IntelliCore Background Worker Process    │');
  console.log('└──────────────────────────────────────────────┘');
  try {
    const testRedis = new IORedis(redisUrl, { maxRetriesPerRequest: 1, retryStrategy: () => null, connectTimeout: 2000 });
    testRedis.on('error', () => {});
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { testRedis.disconnect(); reject(new Error("Connection timeout")); }, 2500);
      testRedis.on('connect', () => { clearTimeout(timeout); testRedis.quit(); resolve(); });
      testRedis.on('error', (err) => { clearTimeout(timeout); reject(err); });
    });
    console.log(`✅ [Redis/BullMQ] Connected successfully (${redisUrl}).`);
  } catch (err) {
    console.error(`❌ [Worker Warning] Redis server unreachable at ${redisUrl} (${err.message}).`);
    console.error(`   BullMQ background job processor cannot start without Redis.`);
    console.error(`   Shutting down worker process cleanly without crash looping.`);
    process.exit(0);
  }
}

let pipeline = null;
(async () => {
  await checkRedisBeforeStart();
  try {
    console.log("⏳ [Model] Loading Xenova/all-MiniLM-L6-v2 transformers pipeline...");
    const transformers = await import('@xenova/transformers');
    pipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log("✅ [Model] Transformers model loaded successfully for worker.");
  } catch (err) {
    console.error("⚠️ [Model] Failed to load transformers:", err.message);
  }
})();

async function extractText(filePath, fileType) {
  if (fileType === 'pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } else if (fileType === 'txt') {
    return fs.readFileSync(filePath, 'utf8');
  }
  // Fallback for docx or other supported types - basic implementation for now
  return fs.readFileSync(filePath, 'utf8');
}

function chunkText(text, size = 500) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(' '));
  }
  return chunks;
}

const worker = new Worker('documentProcessing', async job => {
  if (job.name === 'processDocument') {
    const { documentId } = job.data;
    console.log(`Processing document: ${documentId}`);

    try {
      await prisma.documents.update({
        where: { id: documentId },
        data: { status: 'processing' }
      });

      const doc = await prisma.documents.findUnique({ where: { id: documentId } });
      if (!doc || !fs.existsSync(doc.storage_path)) {
        throw new Error("Document file not found.");
      }

      const text = await extractText(doc.storage_path, doc.file_type);
      const chunks = chunkText(text);

      for (let i = 0; i < chunks.length; i++) {
        const textContent = chunks[i];
        
        let embeddingStr = "[]";
        if (pipeline) {
          const output = await pipeline(textContent, { pooling: 'mean', normalize: true });
          const embedding = Array.from(output.data);
          embeddingStr = `[${embedding.join(',')}]`;
        }
        
        await prisma.$queryRawUnsafe(`
          INSERT INTO document_chunks (document_id, chunk_index, page_number, text_content, embedding, created_at)
          VALUES ($1, $2, $3, $4, $5::vector, NOW())
        `, documentId, i, 1, textContent, embeddingStr);
      }

      await prisma.documents.update({
        where: { id: documentId },
        data: { status: 'completed' }
      });
      
      console.log(`Document ${documentId} processed successfully.`);
    } catch (err) {
      console.error(`Error processing document ${documentId}:`, err);
      await prisma.documents.update({
        where: { id: documentId },
        data: { status: 'error' }
      });
    }
  }
}, {
  connection: createRedisConnection()
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job && job.id ? job.id : 'unknown'} failed:`, err);
});

worker.on('error', (err) => {
  // Catch silent connection errors to prevent unhandled exception crash when Redis is offline
  if (err.code !== 'ECONNREFUSED' && err.code !== 'ENOTFOUND' && err.code !== 'ERR_CANCELED') {
    console.error('BullMQ Worker Error:', err.message);
  }
});

console.log("BullMQ Worker started, listening to 'documentProcessing' queue...");
