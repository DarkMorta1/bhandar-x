const express = require('express');
const router = express.Router();
const { branch } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.use(authenticate);

// Branch routes
router.get('/', branch.getBranches);
router.get('/:id', branch.getBranch);
router.post('/', authorize('owner', 'admin'), validate(schemas.branch), branch.createBranch);
router.put('/:id', authorize('owner', 'admin'), validate(schemas.branch), branch.updateBranch);
router.delete('/:id', authorize('owner', 'admin'), branch.deleteBranch);

module.exports = router;
