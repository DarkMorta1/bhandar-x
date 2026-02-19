const express = require('express');
const router = express.Router();
const { purchase } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.use(authenticate);

// Purchase routes
router.get('/', purchase.getPurchases);
router.get('/:id', purchase.getPurchase);
router.post('/', validate(schemas.purchase), purchase.createPurchase);
router.post('/:id/receive', purchase.receivePurchase);
router.post('/:id/payment', purchase.addPayment);
router.post('/:id/cancel', purchase.cancelPurchase);

module.exports = router;
