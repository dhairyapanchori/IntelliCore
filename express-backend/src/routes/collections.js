const express = require('express');
const prisma = require('../config/db');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const departmentId = parseInt(req.query.department_id);
    if (!departmentId) return res.status(400).json({ detail: "department_id required" });
    
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
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, department_id } = req.body;
    const collection = await prisma.collections.create({
      data: { name, description, department_id }
    });
    res.status(201).json({
      ...collection,
      documents_count: 0,
      storage_used: 0
    });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.delete('/:collection_id', async (req, res) => {
  try {
    const id = parseInt(req.params.collection_id);
    await prisma.collections.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
