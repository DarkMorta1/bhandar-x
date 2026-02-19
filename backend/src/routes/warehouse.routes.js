const express = require('express');
const router = express.Router();
const { warehouse } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.use(authenticate);

// Warehouse routes
router.get('/', warehouse.getWarehouses);
router.get('/:id', warehouse.getWarehouse);
router.post('/', authorize('owner', 'admin'), validate(schemas.warehouse), warehouse.createWarehouse);
router.put('/:id', authorize('owner', 'admin'), validate(schemas.warehouse), warehouse.updateWarehouse);
router.delete('/:id', authorize('owner', 'admin'), warehouse.deleteWarehouse);

module.exports = router;
