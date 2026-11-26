const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { createCanvas } = require('canvas');

const { extractPdfPages } = require('../src/services/pdfExtractionService');
const { terminateOcrWorkers } = require('../src/services/pdfOcrService');
const {
  CHUNK_CONFIG,
  countTokens,
  chunkPdfPages,
  chunkPlainText,
} = require('../src/services/documentChunkingService');
const {
  processDocumentById,
  generateValidatedEmbedding,
  EXPECTED_EMBEDDING_DIMS,
} = require('../src/worker');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'intellicore-ingestion-test-'));

let sharedPipeline = null;
async function getTestPipeline() {
  if (!sharedPipeline) {
    const transformers = await import('@xenova/transformers');
    sharedPipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return sharedPipeline;
}

function renderTextToPngBuffer(lines, width = 900, height = 320) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 28px sans-serif';
  lines.forEach((line, idx) => {
    ctx.fillText(line, 40, 70 + idx * 48);
  });
  return canvas.toBuffer('image/png');
}

async function createPdfFile(filename, pageSpecs) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const spec of pageSpecs) {
    const page = pdfDoc.addPage([612, 792]);
    if (spec.type === 'native') {
      const lines = Array.isArray(spec.lines) ? spec.lines : [spec.text];
      lines.forEach((line, idx) => {
        page.drawText(line, {
          x: 50,
          y: 720 - idx * 24,
          size: 14,
          font,
          color: rgb(0, 0, 0),
        });
      });
    } else if (spec.type === 'scanned') {
      const pngBytes = renderTextToPngBuffer(Array.isArray(spec.lines) ? spec.lines : [spec.text]);
      const pngImage = await pdfDoc.embedPng(pngBytes);
      page.drawImage(pngImage, { x: 40, y: 450, width: 520, height: 185 });
    } else if (spec.type === 'blank') {
      // Intentionally leave page blank
    }
  }

  const outPath = path.join(TMP_DIR, filename);
  fs.writeFileSync(outPath, await pdfDoc.save());
  return outPath;
}

test.after(async () => {
  await terminateOcrWorkers();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

// ============================================================================
// OCR TESTS (1 - 6)
// ============================================================================

test('TEST 1: Normal selectable-text PDF extracts native text without invoking OCR', async () => {
  const filePath = await createPdfFile('normal.pdf', [
    {
      type: 'native',
      lines: [
        'IntelliCore Enterprise Knowledge Policy',
        'Employees are entitled to 18 days of annual leave per year.',
        'All leave requests must be approved by the department manager.',
      ],
    },
  ]);

  const result = await extractPdfPages(filePath);
  assert.equal(result.numPages, 1);
  assert.equal(result.stats.nativePages, 1);
  assert.equal(result.stats.ocrPages, 0);
  assert.equal(result.pages[0].extractionMethod, 'native');
  assert.equal(result.pages[0].ocrConfidence, null);
  assert.match(result.pages[0].text, /18 days of annual leave/);
});

test('TEST 2: Scanned PDF invokes OCR and recognizes embedded image text', async () => {
  const filePath = await createPdfFile('scanned.pdf', [
    {
      type: 'scanned',
      lines: ['Project Horizon Budget', 'Approved allocation is 450000 dollars'],
    },
  ]);

  const result = await extractPdfPages(filePath);
  assert.equal(result.numPages, 1);
  assert.equal(result.stats.ocrPages, 1);
  assert.equal(result.pages[0].extractionMethod, 'ocr');
  assert.equal(typeof result.pages[0].ocrConfidence, 'number');
  assert.ok(result.pages[0].ocrConfidence > 50);
  assert.match(result.pages[0].text, /Horizon/i);
  assert.match(result.pages[0].text, /450000/);
});

test('TEST 3: Mixed PDF uses per-page extraction and preserves original page order', async () => {
  const filePath = await createPdfFile('mixed.pdf', [
    { type: 'native', lines: ['Page One Native Header: Corporate Security Guidelines for All Staff'] },
    { type: 'scanned', lines: ['Page Two Scanned Clause', 'Zero Trust Access Required'] },
    { type: 'native', lines: ['Page Three Native Footer: Compliance Audit Schedule Q4 2026'] },
    { type: 'scanned', lines: ['Page Four Scanned Appendix', 'Encrypted Backup Retention'] },
  ]);

  const result = await extractPdfPages(filePath);
  assert.equal(result.numPages, 4);
  assert.equal(result.stats.nativePages, 2);
  assert.equal(result.stats.ocrPages, 2);

  assert.deepEqual(
    result.pages.map((p) => ({ pageNumber: p.pageNumber, method: p.extractionMethod })),
    [
      { pageNumber: 1, method: 'native' },
      { pageNumber: 2, method: 'ocr' },
      { pageNumber: 3, method: 'native' },
      { pageNumber: 4, method: 'ocr' },
    ]
  );
  assert.match(result.pages[0].text, /Corporate Security Guidelines/);
  assert.match(result.pages[1].text, /Zero Trust/i);
  assert.match(result.pages[2].text, /Compliance Audit Schedule/);
  assert.match(result.pages[3].text, /Encrypted Backup/i);
});

test('TEST 4: Blank PDF produces empty text without inventing content', async () => {
  const filePath = await createPdfFile('blank.pdf', [{ type: 'blank' }, { type: 'blank' }]);
  const result = await extractPdfPages(filePath);
  assert.equal(result.numPages, 2);
  assert.equal(result.stats.blankPages, 2);
  assert.equal(result.stats.ocrPages, 0);
  for (const page of result.pages) {
    assert.equal(page.isBlank, true);
    assert.equal(page.text, '');
  }
});

test('TEST 5: Corrupted PDF throws controlled error without crashing worker', async () => {
  const corruptPath = path.join(TMP_DIR, 'corrupt.pdf');
  fs.writeFileSync(corruptPath, Buffer.from('%PDF-1.4\nnot-a-valid-pdf-stream-%%%'));

  await assert.rejects(async () => {
    await extractPdfPages(corruptPath);
  });
});

test('TEST 6: Multi-page scanned PDF preserves page numbers, order, and avoids duplication', async () => {
  const filePath = await createPdfFile('multipage_scanned.pdf', [
    { type: 'scanned', lines: ['Alpha Section One', 'Unique token ALPHA91'] },
    { type: 'scanned', lines: ['Beta Section Two', 'Unique token BETA82'] },
    { type: 'scanned', lines: ['Gamma Section Three', 'Unique token GAMMA73'] },
  ]);

  const result = await extractPdfPages(filePath);
  assert.equal(result.numPages, 3);
  assert.equal(result.stats.ocrPages, 3);
  assert.equal(result.pages[0].pageNumber, 1);
  assert.equal(result.pages[1].pageNumber, 2);
  assert.equal(result.pages[2].pageNumber, 3);
  assert.match(result.pages[0].text, /ALPHA91/i);
  assert.doesNotMatch(result.pages[0].text, /BETA82/i);
  assert.match(result.pages[1].text, /BETA82/i);
  assert.doesNotMatch(result.pages[1].text, /GAMMA73/i);
  assert.match(result.pages[2].text, /GAMMA73/i);
});

// ============================================================================
// CHUNKING TESTS (7 - 14)
// ============================================================================

test('TEST 7: Paragraph preservation keeps paragraph boundaries when size allows', async () => {
  const pipe = await getTestPipeline();
  const para1 = 'Employees are entitled to 18 days of annual leave. Employees can carry forward up to 5 unused days.';
  const para2 = 'Leave applications must be approved by the department manager at least two weeks in advance.';
  const text = `${para1}\n\n${para2}`;

  const chunks = await chunkPlainText(text, { tokenizer: pipe.tokenizer, chunkSize: 35, chunkOverlap: 5 });
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].textContent, para1);
  assert.equal(chunks[1].textContent, para2);
});

test('TEST 8 & 10: Sentence continuity and overlap retain context between adjacent chunks', async () => {
  const pipe = await getTestPipeline();
  const sentences = [];
  for (let i = 1; i <= 30; i++) {
    sentences.push(`Policy rule number ${i} requires documented approval from security engineering.`);
  }
  const text = sentences.join(' ');
  const chunks = await chunkPlainText(text, { tokenizer: pipe.tokenizer, chunkSize: 100, chunkOverlap: 20 });

  assert.ok(chunks.length >= 2);
  const words0 = chunks[0].textContent.split(/\s+/);
  const tail0 = words0.slice(-5).join(' ');
  assert.ok(chunks[1].textContent.includes(tail0), 'Expected overlap from end of chunk 0 in chunk 1');
});

test('TEST 9: Every final chunk stays safely below embedding tokenizer limit', async () => {
  const pipe = await getTestPipeline();
  const longUnbroken = 'A'.repeat(4000);
  const longProse = Array.from({ length: 120 }, (_, i) => `Sentence ${i}: Enterprise RAG indexing verifies token budgets.`).join(' ');
  const chunks = await chunkPlainText(`${longProse}\n\n${longUnbroken}`, { tokenizer: pipe.tokenizer });

  assert.ok(chunks.length > 3);
  for (const chunk of chunks) {
    const tokens = countTokens(chunk.textContent, pipe.tokenizer);
    assert.ok(tokens <= CHUNK_CONFIG.maxChunkTokens, `Chunk exceeded maxChunkTokens (${tokens} > ${CHUNK_CONFIG.maxChunkTokens})`);
    assert.ok(tokens < 512, `Chunk exceeded model_max_length (${tokens} >= 512)`);
  }
});

test('TEST 11: Page metadata preserves exact source page numbers and extraction methods', async () => {
  const pipe = await getTestPipeline();
  const pages = [
    { pageNumber: 1, text: Array(80).fill('Native page one content word.').join(' '), extractionMethod: 'native', ocrConfidence: null },
    { pageNumber: 2, text: Array(80).fill('Scanned page two content word.').join(' '), extractionMethod: 'ocr', ocrConfidence: 92.4 },
  ];

  const chunks = await chunkPdfPages(pages, { tokenizer: pipe.tokenizer, chunkSize: 120, chunkOverlap: 20 });
  const p1Chunks = chunks.filter((c) => c.pageNumber === 1);
  const p2Chunks = chunks.filter((c) => c.pageNumber === 2);

  assert.ok(p1Chunks.length >= 2);
  assert.ok(p2Chunks.length >= 2);
  assert.ok(p1Chunks.every((c) => c.extractionMethod === 'native' && c.ocrConfidence === null));
  assert.ok(p2Chunks.every((c) => c.extractionMethod === 'ocr' && c.ocrConfidence === 92.4));
});

test('TEST 12: Short documents are not unnecessarily fragmented', async () => {
  const pipe = await getTestPipeline();
  const shortText = 'Short memo: Office closed on Friday for maintenance.';
  const txtChunks = await chunkPlainText(shortText, { tokenizer: pipe.tokenizer });
  assert.equal(txtChunks.length, 1);
  assert.equal(txtChunks[0].textContent, shortText);

  const pdfChunks = await chunkPdfPages([{ pageNumber: 1, text: shortText, extractionMethod: 'native' }], {
    tokenizer: pipe.tokenizer,
  });
  assert.equal(pdfChunks.length, 1);
  assert.equal(pdfChunks[0].pageNumber, 1);
});

test('TEST 13: Large multi-page document chunks within token and memory bounds', async () => {
  const pipe = await getTestPipeline();
  const pages = Array.from({ length: 25 }, (_, i) => ({
    pageNumber: i + 1,
    text: Array.from({ length: 40 }, (__, j) => `Page ${i + 1} paragraph ${j + 1}: Quarterly financial compliance summary.`).join('\n\n'),
    extractionMethod: 'native',
    ocrConfidence: null,
  }));

  const chunks = await chunkPdfPages(pages, { tokenizer: pipe.tokenizer });
  assert.ok(chunks.length > 25);
  for (const c of chunks) {
    assert.ok(c.pageNumber >= 1 && c.pageNumber <= 25);
    assert.ok(c.tokenCount <= CHUNK_CONFIG.maxChunkTokens);
  }
});

test('TEST 14: TXT regression handles UTF-8 text with recursive chunking and null pageNumber', async () => {
  const pipe = await getTestPipeline();
  const txtPath = path.join(TMP_DIR, 'utf8_sample.txt');
  const utf8Content = 'IntelliCore UTF-8 Test — Café, naïve, résumé.\n\nSecond paragraph with structured data.';
  fs.writeFileSync(txtPath, utf8Content, 'utf8');

  const raw = fs.readFileSync(txtPath, 'utf8');
  const chunks = await chunkPlainText(raw, { tokenizer: pipe.tokenizer });
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].pageNumber, null);
  assert.match(chunks[0].textContent, /Café, naïve, résumé/);
});

// ============================================================================
// EMBEDDING & IDEMPOTENCY TESTS (15)
// ============================================================================

test('TEST 15: Embedding dimensions, non-empty validation, and idempotent transactional indexing', async () => {
  const pipe = await getTestPipeline();
  const embStr = await generateValidatedEmbedding(pipe, 'Valid enterprise text chunk.');
  const parsed = JSON.parse(embStr);
  assert.equal(parsed.length, EXPECTED_EMBEDDING_DIMS);
  assert.ok(parsed.every((v) => typeof v === 'number' && Number.isFinite(v)));

  await assert.rejects(() => generateValidatedEmbedding(pipe, '   '));

  // Simulate Prisma DB + $transaction to verify idempotent swap and rollback safety
  const txtPath = path.join(TMP_DIR, 'idempotent.txt');
  fs.writeFileSync(txtPath, 'First version of the document content for indexing.', 'utf8');

  let storedChunks = [{ document_id: 99, chunk_index: 0, text_content: 'stale chunk', embedding: '[0.1]' }];
  let docStatus = 'pending';

  const mockPrisma = {
    documents: {
      update: async ({ data }) => { docStatus = data.status; return { id: 99, status: docStatus }; },
      findUnique: async () => ({ id: 99, file_type: 'txt', storage_path: txtPath }),
    },
    $transaction: async (fn) => {
      const staged = [...storedChunks];
      const tx = {
        document_chunks: {
          deleteMany: async ({ where }) => {
            for (let i = staged.length - 1; i >= 0; i--) {
              if (staged[i].document_id === where.document_id) staged.splice(i, 1);
            }
          },
        },
        $executeRawUnsafe: async (_sql, docId, idx, pageNum, text, emb) => {
          staged.push({ document_id: docId, chunk_index: idx, page_number: pageNum, text_content: text, embedding: emb });
        },
        documents: {
          update: async ({ data }) => { docStatus = data.status; },
        },
      };
      await fn(tx);
      storedChunks = staged;
    },
  };

  await processDocumentById(99, { prisma: mockPrisma, pipeline: pipe });
  assert.equal(docStatus, 'completed');
  assert.equal(storedChunks.length, 1);
  assert.match(storedChunks[0].text_content, /First version/);

  // Re-run (retry) should replace, not duplicate
  await processDocumentById(99, { prisma: mockPrisma, pipeline: pipe });
  assert.equal(storedChunks.length, 1);

  // Transaction failure must NOT delete previous valid chunks
  const failingPrisma = {
    ...mockPrisma,
    $transaction: async (fn) => {
      const staged = [...storedChunks];
      const tx = {
        document_chunks: {
          deleteMany: async () => { staged.length = 0; },
        },
        $executeRawUnsafe: async () => {
          throw new Error('Simulated DB insert failure');
        },
        documents: { update: async () => {} },
      };
      await fn(tx);
      storedChunks = staged;
    },
  };

  await assert.rejects(() => processDocumentById(99, { prisma: failingPrisma, pipeline: pipe }));
  assert.equal(storedChunks.length, 1, 'Existing valid chunks must remain intact if transaction fails');
});
