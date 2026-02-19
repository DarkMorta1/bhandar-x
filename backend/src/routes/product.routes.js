const express = require('express');
const router = express.Router();
const { product } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.use(authenticate);

// Product routes
router.get('/', product.getProducts);
router.get('/low-stock', product.getLowStockProducts);
router.get('/barcode/:barcode', product.getProductByBarcode);
router.get('/sku/:sku', product.getProductBySKU);
router.get('/:id', product.getProduct);
router.post('/', validate(schemas.product), product.createProduct);
router.put('/:id', validate(schemas.product), product.updateProduct);
router.delete('/:id', authorize('owner', 'admin'), product.deleteProduct);
router.patch('/:id/status', product.updateStatus);
router.post('/bulk', authorize('owner', 'admin'), product.bulkCreate);

module.exports = router;
