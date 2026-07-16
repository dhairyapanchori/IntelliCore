const express = require('express');
const { advancedSearch } = require('../controllers/search.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticateToken);

router.post('/', advancedSearch);

module.exports = router;
