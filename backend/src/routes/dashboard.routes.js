const express = require('express');
const router = express.Router();
const { dashboard } = require('../controllers');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

// Dashboard routes
router.get('/summary', dashboard.getDashboardSummary);
router.get('/sales-chart', dashboard.getSalesChart);
router.get('/category-distribution', dashboard.getCategoryDistribution);
router.get('/stock-overview', dashboard.getStockOverview);
router.get('/low-stock-alerts', dashboard.getLowStockAlerts);
router.get('/expiring-products', dashboard.getExpiringProducts);

module.exports = router;
