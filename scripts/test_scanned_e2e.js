/**
 * TEST 16: Full End-to-End Scanned PDF Ingestion, Search, and Copilot Verification
 * Requires running backend (port 8001), worker, PostgreSQL/pgvector, and Redis.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PDFDocument } = require(path.join(__dirname, '../express-backend/node_modules/pdf-lib'));
const { createCanvas } = require(path.join(__dirname, '../express-backend/node_modules/canvas'));

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:8001/api/v1';

async function createScannedPdf(outPath) {
  const canvas = createCanvas(900, 320);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 900, 320);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Project Apollo Scanned Specification', 40, 80);
  ctx.fillText('Codename: ORION-7742', 40, 140);
  ctx.fillText('Lead Architect: Dhairya Panchori', 40, 200);

  const pngBytes = canvas.toBuffer('image/png');
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const pngImage = await pdfDoc.embedPng(pngBytes);
  page.drawImage(pngImage, { x: 40, y: 450, width: 520, height: 185 });
  fs.writeFileSync(outPath, await pdfDoc.save());
}

(async () => {
  const email = `scanned_e2e_${Date.now()}@intellicore.ai`;
  const password = 'Password123!';

  await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: 'Scanned PDF E2E Tester' }),
  });

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });
  const { access_token } = await loginRes.json();
  if (!access_token) throw new Error('Failed to authenticate');

  const authHeaders = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };
  const orgs = await (await fetch(`${BASE_URL}/organizations`, { headers: authHeaders })).json();
  const workspaces = await (await fetch(`${BASE_URL}/workspaces?organization_id=${orgs[0].id}`, { headers: authHeaders })).json();
  const depts = await (await fetch(`${BASE_URL}/departments?workspace_id=${workspaces[0].id}`, { headers: authHeaders })).json();

  const colRes = await fetch(`${BASE_URL}/collections`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'OCR E2E Verification', description: 'Scanned PDF test', department_id: depts[0].id }),
  });
  const col = await colRes.json();

  const tmpPdf = path.join(os.tmpdir(), `scanned_e2e_${Date.now()}.pdf`);
  await createScannedPdf(tmpPdf);

  try {
    const formData = new FormData();
    formData.append('file', new Blob([fs.readFileSync(tmpPdf)], { type: 'application/pdf' }), 'scanned_apollo.pdf');

    const uploadRes = await fetch(`${BASE_URL}/documents/upload?collection_id=${col.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}` },
      body: formData,
    });
    const doc = await uploadRes.json();
    console.log(`Uploaded scanned PDF (docId=${doc.id}, status=${doc.status})`);

    let completed = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusData = await (await fetch(`${BASE_URL}/documents/${doc.id}`, { headers: authHeaders })).json();
      console.log(`Status @ ${i * 2}s: ${statusData.status}`);
      if (statusData.status === 'completed') {
        completed = true;
        break;
      }
      if (statusData.status === 'error') {
        throw new Error('Document processing failed with status=error');
      }
    }
    if (!completed) throw new Error('Timed out waiting for OCR worker');

    const chunks = await (await fetch(`${BASE_URL}/documents/${doc.id}/chunks`, { headers: authHeaders })).json();
    console.log('Chunks indexed:', chunks.length, 'page_number:', chunks[0]?.page_number);
    if (!chunks.length || chunks[0].page_number !== 1) {
      throw new Error('Expected at least 1 chunk with page_number=1');
    }

    const searchRes = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ query: 'ORION-7742', search_type: 'semantic', collection_id: col.id }),
    });
    const searchResults = await searchRes.json();
    console.log('Semantic search hits:', searchResults.length, 'page_number:', searchResults[0]?.page_number);

    const chatRes = await fetch(`${BASE_URL}/chat/query`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ query: 'What is the codename in Project Apollo?', collection_id: col.id }),
    });
    const chatData = await chatRes.json();
    console.log('Copilot answer:', chatData.answer);
    console.log('Copilot citations:', JSON.stringify(chatData.citations.map((c) => ({ doc: c.document_title, page: c.page_number }))));
    console.log('✅ TEST 16 PASSED');
  } finally {
    if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf);
  }
})().catch((err) => {
  console.error('❌ TEST 16 FAILED:', err);
  process.exit(1);
});
