// routes/adminRoutes.js
const express = require('express');
const router = express.Router();

const { isAdmin, isGuest } = require('../middleware/auth');
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/admin/dashboardController');
const adminProductController = require('../controllers/admin/productController');
const adminCategoryController = require('../controllers/admin/categoryController');
const adminOrderController = require('../controllers/admin/orderController');
const adminUserController = require('../controllers/admin/userController');
const adminCouponController = require('../controllers/admin/couponController');
const adminSettingsController = require('../controllers/admin/settingsController');

const { uploadProductImages, uploadCategoryImage, uploadSettingsImage } = require('../middleware/upload');
const { productValidationRules, categoryValidationRules } = require('../middleware/validators');

// ---------- Admin Auth (separate login page) ----------
router.get('/login', isGuest, authController.showAdminLogin);
router.post('/login', isGuest, authController.adminLogin);

// Everything below requires an authenticated admin
router.use(isAdmin);

// Populate sidebar badge counts (unread messages, pending payment verifications)
// on every admin page, not just the dashboard.
router.use(async (req, res, next) => {
    try {
        const Contact = require('../models/Contact');
        const Order = require('../models/Order');
        res.locals.unreadMessages = await Contact.countUnread();
        res.locals.pendingVerificationCount = await Order.countPendingPaymentVerifications();
    } catch (err) {
        res.locals.unreadMessages = 0;
        res.locals.pendingVerificationCount = 0;
    }
    next();
});

// ---------- Dashboard ----------
router.get('/dashboard', dashboardController.index);

// ---------- Products ----------
router.get('/products', adminProductController.list);
router.get('/products/new', adminProductController.showCreateForm);
router.post('/products/new', uploadProductImages.array('images', 6), productValidationRules, adminProductController.create);
router.get('/products/:id/edit', adminProductController.showEditForm);
router.post('/products/:id/edit', uploadProductImages.array('images', 6), productValidationRules, adminProductController.update);
router.post('/products/:id/delete', adminProductController.delete);
router.post('/products/:id/toggle-active', adminProductController.toggleActive);
router.post('/products/:id/images/:imageId/delete', adminProductController.deleteImage);

// ---------- Categories ----------
router.get('/categories', adminCategoryController.list);
router.get('/categories/new', adminCategoryController.showCreateForm);
router.post('/categories/new', uploadCategoryImage.single('image'), categoryValidationRules, adminCategoryController.create);
router.get('/categories/:id/edit', adminCategoryController.showEditForm);
router.post('/categories/:id/edit', uploadCategoryImage.single('image'), categoryValidationRules, adminCategoryController.update);
router.post('/categories/:id/delete', adminCategoryController.delete);

// ---------- Orders ----------
router.get('/orders', adminOrderController.list);
router.get('/orders/verify-payments', adminOrderController.pendingVerifications);
router.get('/orders/:id', adminOrderController.detail);
router.post('/orders/:id/status', adminOrderController.updateStatus);
router.post('/orders/:id/payment-status', adminOrderController.updatePaymentStatus);
router.post('/orders/:id/verify-payment', adminOrderController.verifyPayment);
router.post('/orders/:id/reject-payment', adminOrderController.rejectPayment);

// ---------- Users ----------
router.get('/users', adminUserController.list);
router.post('/users/:id/toggle-active', adminUserController.toggleActive);

// ---------- Coupons ----------
router.get('/coupons', adminCouponController.list);
router.post('/coupons/new', adminCouponController.create);
router.post('/coupons/:id/toggle-active', adminCouponController.toggleActive);
router.post('/coupons/:id/delete', adminCouponController.delete);

// ---------- Settings ----------
router.get('/settings', adminSettingsController.show);
router.post('/settings', uploadSettingsImage.single('upi_qr_upload'), adminSettingsController.update);

// ---------- Contact Messages ----------
router.get('/messages', adminSettingsController.messages);
router.post('/messages/:id/read', adminSettingsController.markMessageRead);
router.post('/messages/:id/delete', adminSettingsController.deleteMessage);

// ---------- Reviews ----------
router.get('/reviews', adminSettingsController.reviews);
router.post('/reviews/:id/delete', adminSettingsController.deleteReview);

module.exports = router;
