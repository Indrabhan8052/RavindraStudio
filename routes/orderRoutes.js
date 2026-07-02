// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { isAuthenticated } = require('../middleware/auth');
const { uploadPaymentProof } = require('../middleware/upload');

router.get('/checkout', isAuthenticated, orderController.showCheckout);
router.post('/checkout/apply-coupon', isAuthenticated, orderController.applyCoupon);
router.post('/checkout/place-order', isAuthenticated, orderController.placeOrder);
router.get('/orders/:id/confirmation', isAuthenticated, orderController.orderConfirmation);

router.get('/orders', isAuthenticated, orderController.myOrders);
router.get('/orders/:id', isAuthenticated, orderController.orderDetail);
router.post('/orders/:id/payment-proof', isAuthenticated, uploadPaymentProof.single('payment_screenshot'), orderController.submitPaymentProof);
router.post('/orders/:id/cancel', isAuthenticated, orderController.cancelOrder);

module.exports = router;
