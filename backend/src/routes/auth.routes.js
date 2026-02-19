const express = require('express');
const router = express.Router();
const { auth } = require('../controllers');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

// Public routes
router.post('/register', validate(schemas.register), auth.register);
router.post('/login', validate(schemas.login), auth.login);
router.post('/refresh', validate(schemas.refreshToken), auth.refreshToken);

// Protected routes
router.get('/me', authenticate, auth.getMe);
router.post('/logout', authenticate, auth.logout);
router.put('/change-password', authenticate, auth.changePassword);
router.put('/profile', authenticate, auth.updateProfile);

module.exports = router;
