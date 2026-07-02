// routes/shopRoutes.js
const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const { isAuthenticated } = require('../middleware/auth');
const { contactValidationRules, reviewValidationRules, handleValidation } = require('../middleware/validators');

router.get('/', shopController.home);
router.get('/products', shopController.listProducts);
router.get('/products/:slug', shopController.productDetail);
router.post('/products/:slug/review', isAuthenticated, reviewValidationRules, shopController.submitReview);

router.get('/contact', shopController.contactPage);
router.post('/contact', contactValidationRules, handleValidation('shop/contact'), shopController.submitContact);

router.get('/about', shopController.aboutPage);

module.exports = router;
