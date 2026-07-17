const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Queue } = require('bullmq');
const prisma = require('../config/db');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Setup BullMQ for processing
const documentQueue = new Queue('documentProcessing', {
  connection: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
  }
});

const checkCollectionAccess = async (userId, collectionId) => {
  const collection = await prisma.collections.findUnique({
    where: { id: collectionId },
    include: { departments: true }
  });
  if (!collection) throw new Error("Collection not found");

  const deptAccess = await prisma.organization_users.findFirst({
    where: {
      user_id: userId,
      organizations: {
        workspaces: {
          some: {
            departments: { some: { id: collection.department_id } }
          }
        }
      }
    }
  });
  
  // Note: Simplified org access check for the sake of migration
  if (!deptAccess) {
    // Check if they are part of the org containing this collection
    const orgQuery = await prisma.$queryRaw`
      SELECT ou.id FROM organization_users ou
      JOIN workspaces w ON w.organization_id = ou.organization_id
      JOIN departments d ON d.workspace_id = w.id
      WHERE ou.user_id = ${userId} AND d.id = ${collection.department_id}
    `;
    if (orgQuery.length === 0) throw new Error("Not enough permissions");
  }

  return collection;
};

const getDocuments = async (req, res) => {
  try {
    const colId = parseInt(req.query.collection_id);
    if (!colId) return res.status(400).json({ detail: "collection_id required" });

    await checkCollectionAccess(req.user.id, colId);
    
    const docs = await prisma.documents.findMany({
      where: { collection_id: colId },
      orderBy: { created_at: 'desc' }
    });
    res.json(docs);
  } catch (err) { res.status(403).json({ detail: err.message }); }
};

const getAllDocuments = async (req, res) => {
  try {
    const orgs = await prisma.organization_users.findMany({
      where: { user_id: req.user.id },
      select: { organization_id: true }
    });
    const orgIds = orgs.map(o => o.organization_id);

    const docs = await prisma.documents.findMany({
      where: {
        collections: {
          departments: {
            workspaces: {
              organization_id: { in: orgIds }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(docs);
  } catch (err) { res.status(500).json({ detail: err.message }); }
};

const uploadDocument = async (req, res) => {
  try {
    const colId = parseInt(req.body.collection_id);
    await checkCollectionAccess(req.user.id, colId);

    const file = req.file;
    if (!file) return res.status(400).json({ detail: "File required" });

    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueFilename = `${uuidv4()}${ext}`;
    const storagePath = path.join(UPLOAD_DIR, uniqueFilename);

    fs.copyFileSync(file.path, storagePath);
    fs.unlinkSync(file.path); // remove multer temp file

    const doc = await prisma.documents.create({
      data: {
        collection_id: colId,
        title: file.originalname,
        original_filename: file.originalname,
        file_type: ext.replace('.', ''),
        file_size: file.size,
        storage_path: storagePath,
        status: 'pending'
      }
    });

    await documentQueue.add('processDocument', { documentId: doc.id });

    await prisma.activity_logs.create({
      data: {
        user_id: req.user.id,
        action: "document_uploaded",
        target_type: "document",
        target_id: doc.id,
        details: `Uploaded document '${file.originalname}'`
      }
    });

    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ detail: err.message }); }
};

const getDocumentDetails = async (req, res) => {
  try {
    const docId = parseInt(req.params.document_id);
    const doc = await prisma.documents.findUnique({
      where: { id: docId },
      include: { document_metadata: true }
    });
    if (!doc) return res.status(404).json({ detail: "Not found" });
    await checkCollectionAccess(req.user.id, doc.collection_id);

    res.json({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      file_type: doc.file_type,
      created_at: doc.created_at,
      metadata: {
        summary: doc.document_metadata?.summary,
        topics: doc.document_metadata?.topics || [],
        suggested_questions: doc.document_metadata?.suggested_questions || []
      }
    });
  } catch (err) { res.status(500).json({ detail: err.message }); }
};

const deleteDocument = async (req, res) => {
  try {
    const docId = parseInt(req.params.document_id);
    const doc = await prisma.documents.findUnique({ where: { id: docId } });
    if (!doc) return res.status(404).json({ detail: "Not found" });
    await checkCollectionAccess(req.user.id, doc.collection_id);

    if (fs.existsSync(doc.storage_path)) {
      fs.unlinkSync(doc.storage_path);
    }
    
    await prisma.documents.delete({ where: { id: docId } });
    res.status(204).send();
  } catch (err) { res.status(500).json({ detail: err.message }); }
};

const getRelatedDocuments = async (req, res) => {
  try {
    const docId = parseInt(req.params.document_id);
    const doc = await prisma.documents.findUnique({ where: { id: docId } });
    if (!doc) return res.status(404).json({ detail: "Not found" });
    await checkCollectionAccess(req.user.id, doc.collection_id);

    // Vector query for pgvector
    const result = await prisma.$queryRaw`
      SELECT d.id, d.title, 1 - (c.embedding <=> (SELECT embedding FROM document_chunks WHERE document_id = ${docId} LIMIT 1)) as similarity
      FROM document_chunks c
      JOIN documents d ON d.id = c.document_id
      WHERE d.id != ${docId} AND d.collection_id = ${doc.collection_id}
      ORDER BY c.embedding <=> (SELECT embedding FROM document_chunks WHERE document_id = ${docId} LIMIT 1)
      LIMIT 5
    `;

    // Deduplicate logic
    const unique = [];
    const seen = new Set();
    for (let r of result) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        unique.push({ id: r.id, title: r.title, similarity: Math.max(0, parseFloat(r.similarity) || 0) });
      }
    }
    res.json(unique);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: err.message });
  }
};

const getDocumentChunks = async (req, res) => {
  try {
    const docId = parseInt(req.params.document_id);
    const doc = await prisma.documents.findUnique({ where: { id: docId } });
    if (!doc) return res.status(404).json({ detail: "Not found" });
    await checkCollectionAccess(req.user.id, doc.collection_id);

    const chunks = await prisma.document_chunks.findMany({
      where: { document_id: docId },
      orderBy: { chunk_index: 'asc' },
      select: { id: true, chunk_index: true, page_number: true, text_content: true }
    });
    res.json(chunks);
  } catch (err) { res.status(500).json({ detail: err.message }); }
};

module.exports = { getDocuments, getAllDocuments, uploadDocument, getDocumentDetails, deleteDocument, getRelatedDocuments, getDocumentChunks };
