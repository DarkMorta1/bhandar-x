const express = require('express');
const router = express.Router();
const { stock } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.use(authenticate);

// Stock routes
router.get('/warehouse/:warehouseId', stock.getStockByWarehouse);
router.get('/ledger', stock.getStockLedger);
router.post('/in', stock.stockIn);
router.post('/out', stock.stockOut);
router.post('/adjust', stock.adjustStock);

// Transfer routes
router.get('/transfers', stock.getTransfers);
router.get('/transfers/:id', stock.getTransfer);
router.post('/transfers', validate(schemas.stockTransfer), stock.createTransfer);
router.patch('/transfers/:id/:action', stock.processTransfer);

module.exports = router;
