const express = require('express');
const router = express.Router();
const { supplier } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.use(authenticate);

// Supplier routes
router.get('/', supplier.getSuppliers);
router.get('/:id', supplier.getSupplier);
router.post('/', validate(schemas.supplier), supplier.createSupplier);
router.put('/:id', validate(schemas.supplier), supplier.updateSupplier);
router.delete('/:id', authorize('owner', 'admin'), supplier.deleteSupplier);
router.get('/:id/statement', supplier.getStatement);

module.exports = router;
