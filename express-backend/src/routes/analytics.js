const express = require('express');
const { getOverview, getRecentActivity, getTopCollections, getPopularQueries, getAnalyticsDashboard } = require('../controllers/analytics.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticateToken);

router.get('/overview', getOverview);
router.get('/dashboard', getAnalyticsDashboard);
router.get('/recent-activity', getRecentActivity);
router.get('/top-collections', getTopCollections);
router.get('/popular-queries', getPopularQueries);

module.exports = router;
