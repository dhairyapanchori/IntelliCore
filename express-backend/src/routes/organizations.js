const express = require('express');
const { getOrganizations, createOrganization, getOrganization, getOrganizationUsers } = require('../controllers/organizations.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getOrganizations);
router.post('/', createOrganization);
router.get('/:org_id', getOrganization);
router.get('/:org_id/users', getOrganizationUsers);

module.exports = router;
