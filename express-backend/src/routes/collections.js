const express = require('express');
const prisma = require('../config/db');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const departmentId = parseInt(req.query.department_id, 10);
    if (!departmentId || isNaN(departmentId)) {
      return res.status(400).json({ detail: "A valid numeric department_id query parameter is required." });
    }
    
    const collections = await prisma.collections.findMany({
      where: { department_id: departmentId },
      include: {
        documents: true
      }
    });

    const result = collections.map(c => {
      const storageUsed = c.documents.reduce((acc, doc) => acc + (doc.file_size || 0), 0);
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        department_id: c.department_id,
        documents_count: c.documents.length,
        storage_used: storageUsed,
        created_at: c.created_at
      };
    });
    res.json(result);
  } catch (err) {
    console.error(`❌ [GET /collections error]:`, err);
    res.status(500).json({ detail: `Failed to retrieve collections: ${err.message}`, code: err.code || 'INTERNAL_ERROR' });
  }
});

router.get('/:collection_id', async (req, res) => {
  try {
    const id = parseInt(req.params.collection_id, 10);
    if (isNaN(id)) return res.status(400).json({ detail: "Valid numeric collection ID required in URL path." });
    
    const collection = await prisma.collections.findUnique({
      where: { id },
      include: {
        documents: true,
        departments: {
          select: {
            id: true,
            name: true,
            workspace_id: true,
            workspaces: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!collection) return res.status(404).json({ detail: "Collection not found." });

    const storageUsed = collection.documents.reduce((acc, doc) => acc + (doc.file_size || 0), 0);
    res.json({
      id: collection.id,
      collection_id: collection.id,
      name: collection.name,
      description: collection.description,
      department_id: collection.department_id,
      department_name: collection.departments ? collection.departments.name : null,
      workspace_name: collection.departments && collection.departments.workspaces ? collection.departments.workspaces.name : null,
      documents_count: collection.documents.length,
      document_count: collection.documents.length,
      storage_used: storageUsed,
      total_size_bytes: storageUsed,
      created_at: collection.created_at
    });
  } catch (err) {
    console.error(`❌ [GET /collections/:id error]:`, err);
    res.status(500).json({ detail: `Failed to retrieve collection: ${err.message}`, code: err.code || 'INTERNAL_ERROR' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, department_id } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ detail: "Collection name is required and cannot be empty." });
    }
    
    const deptId = parseInt(department_id, 10);
    if (isNaN(deptId) || deptId <= 0) {
      return res.status(400).json({ detail: "Valid department_id integer is required to create a collection." });
    }
    
    const collection = await prisma.collections.create({
      data: { name: name.trim(), description: description || null, department_id: deptId }
    });
    
    res.status(201).json({
      ...collection,
      documents_count: 0,
      storage_used: 0
    });
  } catch (err) {
    console.error(`❌ [POST /collections error]:`, err);
    if (err.code === 'P2003') {
      return res.status(400).json({ detail: "Foreign key constraint failed: The specified department does not exist in the database.", error_code: err.code });
    }
    res.status(500).json({ detail: `Database Error: ${err.message}`, code: err.code || 'UNKNOWN' });
  }
});

router.put('/:collection_id', async (req, res) => {
  try {
    const id = parseInt(req.params.collection_id, 10);
    if (isNaN(id)) return res.status(400).json({ detail: "Valid numeric collection ID required in URL path." });
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ detail: "Collection name cannot be empty." });
    
    const updated = await prisma.collections.update({
      where: { id },
      data: { name: name.trim(), description: description || null }
    });
    res.json(updated);
  } catch (err) {
    console.error(`❌ [PUT /collections/:id error]:`, err);
    if (err.code === 'P2025') return res.status(404).json({ detail: "Collection not found in PostgreSQL database." });
    res.status(500).json({ detail: `Failed to update collection: ${err.message}`, code: err.code || 'INTERNAL_ERROR' });
  }
});

router.patch('/:collection_id', async (req, res) => {
  try {
    const id = parseInt(req.params.collection_id, 10);
    if (isNaN(id)) return res.status(400).json({ detail: "Valid numeric collection ID required in URL path." });
    const { name, description } = req.body;
    const updateData = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ detail: "Collection name cannot be empty." });
      updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description;
    
    const updated = await prisma.collections.update({
      where: { id },
      data: updateData
    });
    res.json(updated);
  } catch (err) {
    console.error(`❌ [PATCH /collections/:id error]:`, err);
    if (err.code === 'P2025') return res.status(404).json({ detail: "Collection not found in PostgreSQL database." });
    res.status(500).json({ detail: `Failed to edit collection: ${err.message}`, code: err.code || 'INTERNAL_ERROR' });
  }
});

router.delete('/:collection_id', async (req, res) => {
  try {
    const id = parseInt(req.params.collection_id, 10);
    if (isNaN(id)) return res.status(400).json({ detail: "Valid numeric collection ID required in URL path." });
    await prisma.collections.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(`❌ [DELETE /collections/:id error]:`, err);
    if (err.code === 'P2025') return res.status(404).json({ detail: "Collection not found or already deleted." });
    res.status(500).json({ detail: `Failed to delete collection: ${err.message}`, code: err.code || 'INTERNAL_ERROR' });
  }
});

module.exports = router;
