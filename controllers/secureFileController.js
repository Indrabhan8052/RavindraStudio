// controllers/secureFileController.js
//
// Serves files that must NEVER be reachable by a guessable public URL.
// Right now this covers one thing: UPI payment proof screenshots, which can
// contain sensitive info (UPI IDs, partial account numbers, transaction
// history visible in the banking app UI).
//
// Security model:
//   1. The actual files live in /private-uploads/payment-proofs/, which is
//      NEVER passed to express.static() — so there is no direct URL to them.
//   2. The only way to view one is through this controller, reached via
//      GET /secure/payment-proof/:orderId
//   3. Before streaming any bytes, we check:
//        a) the requester is logged in (isAuthenticated middleware, applied in routes)
//        b) the requester is either the order's owner OR an admin
//      If neither is true, we return 403 — no file path is ever leaked.
//   4. We look the filename up from the DB ourselves (using the orderId) —
//      we never trust a filename passed directly by the client. This stops
//      path traversal attacks (e.g. ?file=../../.env) entirely, since the
//      client never controls the actual filename used on disk.

const path = require('path');
const fs = require('fs');
const Order = require('../models/Order');
const { paymentProofDir } = require('../middleware/upload');

const secureFileController = {
    async paymentProof(req, res) {
        try {
            const orderId = req.params.orderId;
            const order = await Order.findById(orderId);

            if (!order) {
                return res.status(404).send('Not found.');
            }

            const currentUser = req.session.user;
            const isOwner = currentUser && currentUser.role === 'customer' && order.user_id === currentUser.id;
            const isAdmin = currentUser && currentUser.role === 'admin';

            // ── The authorization check that fixes the vulnerability ──
            if (!isOwner && !isAdmin) {
                return res.status(403).send('You do not have permission to view this file.');
            }

            if (!order.payment_proof_image) {
                return res.status(404).send('No payment proof uploaded for this order.');
            }

            // order.payment_proof_image is just a filename (e.g. "payment_screenshot-123456.jpg"),
            // never a path — so this can't be used to escape the payment-proofs directory.
            const filename = path.basename(order.payment_proof_image);
            const filePath = path.join(paymentProofDir, filename);

            // Defense in depth: even though `filename` is already sanitized via
            // path.basename(), double-check the resolved path is still inside
            // the intended directory before reading from disk.
            const resolvedPath = path.resolve(filePath);
            const resolvedDir = path.resolve(paymentProofDir);
            if (!resolvedPath.startsWith(resolvedDir)) {
                return res.status(400).send('Invalid file path.');
            }

            if (!fs.existsSync(resolvedPath)) {
                return res.status(404).send('File not found.');
            }

            // Stream the file. Cache-Control: private prevents shared/proxy
            // caches (e.g. a corporate proxy or CDN) from storing a copy that
            // a different user could later be served.
            res.set('Cache-Control', 'private, no-store');
            res.sendFile(resolvedPath);

        } catch (err) {
            console.error('Secure file serve error:', err);
            res.status(500).send('Unable to load file.');
        }
    }
};

module.exports = secureFileController;
