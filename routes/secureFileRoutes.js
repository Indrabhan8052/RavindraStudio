// routes/secureFileRoutes.js
// Serves files from /private-uploads/ — never from a public static URL.
// Only the authenticated order owner or an admin can access a payment screenshot.

const express = require('express');
const router  = express.Router();
const secureFileController = require('../controllers/secureFileController');
const { isAuthenticated } = require('../middleware/auth');

// GET /secure/payment-proof/:orderId
// Checks: logged in + (is owner OR is admin) → streams file
// Returns 403 if not authorized, 404 if no proof uploaded, 404 if file missing
router.get('/payment-proof/:orderId', isAuthenticated, secureFileController.paymentProof);

module.exports = router;
