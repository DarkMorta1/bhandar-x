const express = require('express');
const router = express.Router();
const { report } = require('../controllers');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

// Report routes
router.get('/sales', report.getSalesReport);
router.get('/purchases', report.getPurchaseReport);
router.get('/stock', report.getStockReport);
router.get('/profit-loss', report.getProfitLossReport);
router.get('/tax', report.getTaxReport);
router.get('/expiry', report.getExpiryReport);
router.get('/stock-movement', report.getStockMovementReport);

module.exports = router;
