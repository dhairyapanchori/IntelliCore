const express = require('express');
const multer = require('multer');
const { getDocuments, getAllDocuments, uploadDocument, getDocumentDetails, deleteDocument, getRelatedDocuments, getDocumentChunks } = require('../controllers/documents.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const upload = multer({ dest: 'uploads/temp/' });
const router = express.Router();

router.use(authenticateToken);

router.get('/all', getAllDocuments);
router.get('/', getDocuments);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/:document_id', getDocumentDetails);
router.delete('/:document_id', deleteDocument);
router.get('/:document_id/related', getRelatedDocuments);
router.get('/:document_id/chunks', getDocumentChunks);
router.post('/:document_id/log-download', async (req, res) => res.json({ status: "logged" }));

module.exports = router;
