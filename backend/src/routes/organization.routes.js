const express = require('express');
const router = express.Router();
const { organization } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.use(authenticate);

// Organization routes
router.get('/', organization.getOrganization);
router.put('/', validate(schemas.organization), organization.updateOrganization);
router.put('/settings', organization.updateSettings);

// User management routes
router.get('/users', organization.getUsers);
router.post('/users', authorize('owner', 'admin'), organization.addUser);
router.put('/users/:userId', authorize('owner', 'admin'), organization.updateUser);
router.delete('/users/:userId', authorize('owner', 'admin'), organization.removeUser);

module.exports = router;
