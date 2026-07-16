const express = require('express');
const { getSessions, createSession, updateSession, deleteSession, getSessionMessages, semanticSearch } = require('../controllers/chat.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticateToken);

router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.patch('/sessions/:session_id', updateSession);
router.delete('/sessions/:session_id', deleteSession);
router.get('/sessions/:session_id/messages', getSessionMessages);
router.post('/query', semanticSearch);

module.exports = router;
