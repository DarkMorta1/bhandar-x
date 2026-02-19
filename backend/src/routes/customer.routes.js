const express = require('express');
const router = express.Router();
const { customer } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.use(authenticate);

// Customer routes
router.get('/', customer.getCustomers);
router.get('/:id', customer.getCustomer);
router.post('/', validate(schemas.customer), customer.createCustomer);
router.put('/:id', validate(schemas.customer), customer.updateCustomer);
router.delete('/:id', authorize('owner', 'admin'), customer.deleteCustomer);
router.get('/:id/statement', customer.getStatement);

module.exports = router;
