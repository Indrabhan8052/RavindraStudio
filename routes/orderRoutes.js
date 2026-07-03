// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { isAuthenticated } = require('../middleware/auth');
const { uploadPaymentProof } = require('../middleware/upload');
const csrfProtection = require('../middleware/csrf');

router.get('/checkout', isAuthenticated, orderController.showCheckout);
router.post('/checkout/apply-coupon', isAuthenticated, orderController.applyCoupon);
router.post('/checkout/place-order', isAuthenticated, orderController.placeOrder);
router.get('/orders/:id/confirmation', isAuthenticated, orderController.orderConfirmation);

router.get('/orders', isAuthenticated, orderController.myOrders);
router.get('/orders/:id', isAuthenticated, orderController.orderDetail);

// uploadPaymentProof (multer) MUST run before csrfProtection here.
// The form uses multipart/form-data (it has a file input), so only
// multer can parse req.body and expose the _csrf field csurf needs.
// Running csrfProtection first (as it used to, globally) always saw an
// empty req.body and rejected every submission with EBADCSRFTOKEN.
router.post(
    '/orders/:id/payment-proof',
    isAuthenticated,
    uploadPaymentProof.single('payment_screenshot'),
    csrfProtection,
    orderController.submitPaymentProof
);

router.post('/orders/:id/cancel', isAuthenticated, orderController.cancelOrder);

module.exports = router;