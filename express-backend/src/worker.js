require('dotenv').config();
const { Worker } = require('bullmq');
const fs = require('fs');
const pdf = require('pdf-parse');
const prisma = require('./config/db');

let pipeline = null;
(async () => {
  try {
    const transformers = await import('@xenova/transformers');
    pipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log("Transformers model loaded for worker.");
  } catch (err) {
    console.error("Failed to load transformers:", err);
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
  connection: {
    host: '127.0.0.1',
    port: 6379
  }
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

console.log("BullMQ Worker started, listening to 'documentProcessing' queue...");
