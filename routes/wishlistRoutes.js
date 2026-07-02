// routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/wishlist', isAuthenticated, wishlistController.viewWishlist);
router.post('/wishlist/toggle', isAuthenticated, wishlistController.toggle);
router.post('/wishlist/remove/:productId', isAuthenticated, wishlistController.remove);

module.exports = router;
