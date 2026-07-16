const express = require('express');
const { getWorkspaces, createWorkspace, deleteWorkspace } = require('../controllers/workspaces.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticateToken);

router.get('/', getWorkspaces);
router.post('/', createWorkspace);
router.delete('/:workspace_id', deleteWorkspace);

module.exports = router;
