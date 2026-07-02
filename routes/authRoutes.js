// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isGuest } = require('../middleware/auth');
const {
    handleValidation,
    registerValidationRules,
    loginValidationRules
} = require('../middleware/validators');

router.get('/register', isGuest, authController.showRegister);
router.post('/register', isGuest, registerValidationRules, handleValidation('auth/register'), authController.register);

router.get('/login', isGuest, authController.showLogin);
router.post('/login', isGuest, loginValidationRules, handleValidation('auth/login'), authController.login);

router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

module.exports = router;
