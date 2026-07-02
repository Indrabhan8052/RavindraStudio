// controllers/admin/orderController.js
const Order = require('../../models/Order');

const adminOrderController = {
    async list(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = 15;
            const offset = (page - 1) * limit;
            const { status, search } = req.query;

            const [orders, totalCount] = await Promise.all([
                Order.getAllAdmin({ status, search, limit, offset }),
                Order.countAllAdmin({ status, search })
            ]);

            res.render('admin/orders/list', {
                orders, totalPages: Math.ceil(totalCount / limit), currentPage: page,
                totalCount, statusFilter: status || '', search: search || ''
            });
        } catch (err) {
            console.error('Admin order list error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load orders right now.' });
        }
    },

    async detail(req, res) {
        try {
            const order = await Order.findById(req.params.id);
            if (!order) {
                req.flash('error', 'Order not found.');
                return res.redirect('/admin/orders');
            }

            const [items, address, history, customer] = await Promise.all([
                Order.getItems(order.id),
                Order.getAddress(order.address_id),
                Order.getStatusHistory(order.id),
                Order.getCustomer(order.id)
            ]);

            res.render('admin/orders/detail', { order, items, address, history, customer });
        } catch (err) {
            console.error('Admin order detail error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load this order.' });
        }
    },

    async updateStatus(req, res) {
        try {
            const { status, note } = req.body;
            const validStatuses = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                req.flash('error', 'Invalid status.');
                return res.redirect(`/admin/orders/${req.params.id}`);
            }

            if (status === 'cancelled') {
                await Order.cancelOrder(req.params.id, true);
            } else {
                await Order.updateStatus(req.params.id, status, note || '');
            }

            req.flash('success', 'Order status updated.');
            res.redirect(`/admin/orders/${req.params.id}`);
        } catch (err) {
            console.error('Update order status error:', err);
            req.flash('error', 'Unable to update order status.');
            res.redirect('back');
        }
    },

    async updatePaymentStatus(req, res) {
        try {
            await Order.updatePaymentStatus(req.params.id, req.body.payment_status);
            req.flash('success', 'Payment status updated.');
            res.redirect(`/admin/orders/${req.params.id}`);
        } catch (err) {
            console.error('Update payment status error:', err);
            req.flash('error', 'Unable to update payment status.');
            res.redirect('back');
        }
    },

    // ── UPI Payment Verification Queue ──────────────────────────────────────
    // Shows all orders where the customer uploaded a screenshot and is
    // waiting on the admin to confirm the money actually arrived.
    async pendingVerifications(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = 15;
            const offset = (page - 1) * limit;

            const [orders, totalCount] = await Promise.all([
                Order.getPendingPaymentVerifications({ limit, offset }),
                Order.countPendingPaymentVerifications()
            ]);

            res.render('admin/orders/verify-payments', {
                orders, totalPages: Math.ceil(totalCount / limit), currentPage: page, totalCount
            });
        } catch (err) {
            console.error('Pending payment verifications error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load pending verifications.' });
        }
    },

    // Admin confirms the screenshot is genuine and the payment is real.
    // This marks payment_status='paid' AND bumps order_status to 'confirmed'
    // (since the order can now be safely fulfilled).
    async verifyPayment(req, res) {
        try {
            const order = await Order.findById(req.params.id);
            if (!order) {
                req.flash('error', 'Order not found.');
                return res.redirect('/admin/orders/verify-payments');
            }

            await Order.verifyPayment(order.id, req.body.note || 'Payment screenshot verified by admin');

            req.flash('success', `Payment verified for order #${order.order_number}. Order moved to Confirmed.`);
            res.redirect(req.body.redirectTo || `/admin/orders/${order.id}`);
        } catch (err) {
            console.error('Verify payment error:', err);
            req.flash('error', 'Unable to verify payment right now.');
            res.redirect('back');
        }
    },

    // Admin rejects the screenshot (blurry, wrong amount, fake, etc.)
    // Customer will see the rejection reason and can re-upload.
    async rejectPayment(req, res) {
        try {
            const order = await Order.findById(req.params.id);
            if (!order) {
                req.flash('error', 'Order not found.');
                return res.redirect('/admin/orders/verify-payments');
            }

            const reason = req.body.reason || 'Payment could not be verified. Please re-upload a clear screenshot.';
            await Order.rejectPayment(order.id, reason);

            req.flash('success', `Payment rejected for order #${order.order_number}. Customer has been notified to re-submit.`);
            res.redirect(req.body.redirectTo || `/admin/orders/${order.id}`);
        } catch (err) {
            console.error('Reject payment error:', err);
            req.flash('error', 'Unable to reject payment right now.');
            res.redirect('back');
        }
    }
};

module.exports = adminOrderController;
