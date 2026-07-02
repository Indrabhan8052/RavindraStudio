// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/cart', isAuthenticated, cartController.viewCart);
router.post('/cart/add', isAuthenticated, cartController.addToCart);
router.post('/cart/update', isAuthenticated, cartController.updateQuantity);
router.post('/cart/remove/:productId', isAuthenticated, cartController.removeItem);

module.exports = router;
