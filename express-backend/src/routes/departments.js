const express = require('express');
const prisma = require('../config/db');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticateToken);

router.get('/all', async (req, res) => {
  try {
    const orgs = await prisma.organization_users.findMany({
      where: { user_id: req.user.id },
      select: { organization_id: true }
    });
    const orgIds = orgs.map(o => o.organization_id);

    const depts = await prisma.departments.findMany({
      where: {
        workspaces: { organization_id: { in: orgIds } }
      },
      include: {
        collections: {
          include: { documents: true }
        }
      }
    });

    const result = depts.map(d => {
      let docCount = 0;
      d.collections.forEach(c => docCount += c.documents.length);
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        workspace_id: d.workspace_id,
        status: d.status || 'Active',
        head_id: d.head_id,
        head_name: null,
        collections_count: d.collections.length,
        documents_count: docCount,
        created_at: d.created_at
      };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const workspaceId = parseInt(req.query.workspace_id);
    if (!workspaceId) return res.status(400).json({ detail: "workspace_id required" });
    
    const depts = await prisma.departments.findMany({
      where: { workspace_id: workspaceId },
      include: {
        // users: true,
        collections: {
          include: { documents: true }
        }
      }
    });

    const result = depts.map(d => {
      let docCount = 0;
      d.collections.forEach(c => docCount += c.documents.length);
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        workspace_id: d.workspace_id,
        status: d.status || 'Active',
        head_id: d.head_id,
        head_name: null,
        collections_count: d.collections.length,
        documents_count: docCount,
        created_at: d.created_at
      };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, workspace_id } = req.body;
    const wsId = parseInt(workspace_id, 10);
    if (isNaN(wsId)) return res.status(400).json({ detail: "Valid workspace_id is required" });
    const dept = await prisma.departments.create({
      data: {
        name, description, workspace_id: wsId, head_id: req.user.id, status: "Active"
      }
    });
    res.status(201).json({
      ...dept,
      head_name: req.user.full_name,
      collections_count: 0,
      documents_count: 0
    });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.delete('/:department_id', async (req, res) => {
  try {
    const id = parseInt(req.params.department_id);
    await prisma.departments.delete({ where: { id } });
    res.status(204).send();
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
