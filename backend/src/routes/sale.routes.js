const express = require('express');
const router = express.Router();
const { sale } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.use(authenticate);

// Sale routes
router.get('/', sale.getSales);
router.get('/today', sale.getTodaySales);
router.get('/:id', sale.getSale);
router.post('/', validate(schemas.sale), sale.createSale);
router.patch('/:id/status', sale.updateStatus);
router.post('/:id/payment', sale.addPayment);
router.post('/:id/cancel', sale.cancelSale);

module.exports = router;
