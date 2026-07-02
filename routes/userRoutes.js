// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { addressValidationRules, handleValidation } = require('../middleware/validators');

router.get('/profile', isAuthenticated, userController.showProfile);
router.post('/profile/update', isAuthenticated, uploadAvatar.single('avatar'), userController.updateProfile);
router.post('/profile/change-password', isAuthenticated, userController.changePassword);

router.post('/profile/addresses', isAuthenticated, addressValidationRules, userController.addAddress);
router.post('/profile/addresses/:id/update', isAuthenticated, userController.updateAddress);
router.post('/profile/addresses/:id/delete', isAuthenticated, userController.deleteAddress);

module.exports = router;
