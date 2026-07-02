// controllers/orderController.js
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Address = require('../models/Address');
const Coupon = require('../models/Coupon');
const Settings = require('../models/Settings');

const orderController = {
    async showCheckout(req, res) {
        try {
            const userId = req.session.user.id;
            const items = await Cart.getItems(userId);

            if (items.length === 0) {
                req.flash('error', 'Your cart is empty. Add some products before checking out.');
                return res.redirect('/cart');
            }

            // Verify stock before showing checkout
            const Product = require('../models/Product');
            for (const item of items) {
                const product = await Product.findById(item.product_id);
                if (!product || !product.is_active) {
                    req.flash('error', `"${item.name}" is no longer available. Please remove it from your cart.`);
                    return res.redirect('/cart');
                }
                if (product.stock_quantity < item.quantity) {
                    req.flash('error', `Only ${product.stock_quantity} unit(s) of "${item.name}" are available.`);
                    return res.redirect('/cart');
                }
            }

            const addresses = await Address.findByUser(userId);
            const subtotal = items.reduce((sum, item) => sum + (Number(item.discount_price || item.price) * item.quantity), 0);
            const shippingFee = Number(await Settings.get('shipping_fee', 49));
            const freeShippingAbove = Number(await Settings.get('free_shipping_above', 999));
            const finalShipping = subtotal >= freeShippingAbove ? 0 : shippingFee;

            const upiId = await Settings.get('upi_id', '');
            const upiPayeeName = await Settings.get('upi_payee_name', '');
            const upiQrImage = await Settings.get('upi_qr_image', '');

            res.render('shop/checkout', {
                items, addresses, subtotal, shippingFee: finalShipping, total: subtotal + finalShipping,
                errors: [], appliedCoupon: null, discount: 0,
                upiId, upiPayeeName, upiQrImage
            });
        } catch (err) {
            console.error('Checkout page error:', err);
            res.status(500).render('shop/error', { message: 'Unable to load checkout right now.' });
        }
    },

    async applyCoupon(req, res) {
        try {
            const userId = req.session.user.id;
            const { coupon_code } = req.body;
            const items = await Cart.getItems(userId);
            const subtotal = items.reduce((sum, item) => sum + (Number(item.discount_price || item.price) * item.quantity), 0);

            const result = await Coupon.validate(coupon_code, subtotal);
            const addresses = await Address.findByUser(userId);
            const shippingFee = Number(await Settings.get('shipping_fee', 49));
            const freeShippingAbove = Number(await Settings.get('free_shipping_above', 999));
            const finalShipping = subtotal >= freeShippingAbove ? 0 : shippingFee;

            const upiId = await Settings.get('upi_id', '');
            const upiPayeeName = await Settings.get('upi_payee_name', '');
            const upiQrImage = await Settings.get('upi_qr_image', '');

            if (!result.valid) {
                return res.status(422).render('shop/checkout', {
                    items, addresses, subtotal, shippingFee: finalShipping, total: subtotal + finalShipping,
                    errors: [{ msg: result.message }], appliedCoupon: null, discount: 0,
                    upiId, upiPayeeName, upiQrImage
                });
            }

            res.render('shop/checkout', {
                items, addresses, subtotal, shippingFee: finalShipping,
                total: subtotal + finalShipping - result.discount,
                errors: [], appliedCoupon: result.coupon, discount: result.discount,
                upiId, upiPayeeName, upiQrImage
            });
        } catch (err) {
            console.error('Coupon apply error:', err);
            req.flash('error', 'Unable to apply coupon right now.');
            res.redirect('/checkout');
        }
    },

    async placeOrder(req, res) {
        try {
            const userId = req.session.user.id;
            const { address_id, payment_method, notes, coupon_code } = req.body;

            const address = await Address.findById(address_id, userId);
            if (!address) {
                req.flash('error', 'Please select a valid delivery address.');
                return res.redirect('/checkout');
            }

            const items = await Cart.getItems(userId);
            if (items.length === 0) {
                req.flash('error', 'Your cart is empty.');
                return res.redirect('/cart');
            }

            const subtotal = items.reduce((sum, item) => sum + (Number(item.discount_price || item.price) * item.quantity), 0);
            const shippingFeeBase = Number(await Settings.get('shipping_fee', 49));
            const freeShippingAbove = Number(await Settings.get('free_shipping_above', 999));
            let shippingFee = subtotal >= freeShippingAbove ? 0 : shippingFeeBase;

            // Re-validate coupon at order time (server-side, not trusting client state)
            if (coupon_code) {
                const result = await Coupon.validate(coupon_code, subtotal);
                if (result.valid) {
                    shippingFee = Math.max(0, shippingFee - result.discount); // simple discount application via shipping offset
                }
            }

            const { orderId, orderNumber } = await Order.placeOrder(userId, address_id, items, {
                paymentMethod: payment_method || 'COD',
                shippingFee,
                notes: notes || ''
            });

            if (coupon_code) {
                await Coupon.incrementUsage(coupon_code).catch(() => {});
            }

            req.flash('success', `Order placed successfully! Your order number is ${orderNumber}.`);
            res.redirect(`/orders/${orderId}/confirmation`);
        } catch (err) {
            console.error('Place order error:', err);
            req.flash('error', err.message || 'Unable to place your order right now. Please try again.');
            res.redirect('/checkout');
        }
    },

    async orderConfirmation(req, res) {
        try {
            const order = await Order.findByIdForUser(req.params.id, req.session.user.id);
            if (!order) return res.status(404).render('shop/error', { message: 'Order not found.' });

            const items = await Order.getItems(order.id);
            const address = await Order.getAddress(order.address_id);

            res.render('shop/order-confirmation', { order, items, address });
        } catch (err) {
            console.error('Order confirmation error:', err);
            res.status(500).render('shop/error', { message: 'Unable to load order confirmation.' });
        }
    },

    async myOrders(req, res) {
        try {
            const userId = req.session.user.id;
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = 10;
            const offset = (page - 1) * limit;

            const [orders, totalCount] = await Promise.all([
                Order.findByUser(userId, { limit, offset }),
                Order.countByUser(userId)
            ]);

            res.render('user/orders', { orders, totalPages: Math.ceil(totalCount / limit), currentPage: page });
        } catch (err) {
            console.error('My orders error:', err);
            res.status(500).render('shop/error', { message: 'Unable to load your orders right now.' });
        }
    },

    async orderDetail(req, res) {
        try {
            const order = await Order.findByIdForUser(req.params.id, req.session.user.id);
            if (!order) return res.status(404).render('shop/error', { message: 'Order not found.' });

            const [items, address, history] = await Promise.all([
                Order.getItems(order.id),
                Order.getAddress(order.address_id),
                Order.getStatusHistory(order.id)
            ]);

            // Show UPI QR/ID on this page if the order still needs payment proof
            let upiId = '', upiPayeeName = '', upiQrImage = '';
            if (order.payment_method === 'UPI' && ['pending', 'rejected'].includes(order.payment_status)) {
                upiId = await Settings.get('upi_id', '');
                upiPayeeName = await Settings.get('upi_payee_name', '');
                upiQrImage = await Settings.get('upi_qr_image', '');
            }

            res.render('user/order-detail', { order, items, address, history, upiId, upiPayeeName, upiQrImage });
        } catch (err) {
            console.error('Order detail error:', err);
            res.status(500).render('shop/error', { message: 'Unable to load this order.' });
        }
    },

    // Customer uploads a screenshot proving they completed the UPI payment.
    // This moves payment_status from 'pending'/'rejected' → 'submitted',
    // which then appears in the admin's "Pending Verifications" queue.
    async submitPaymentProof(req, res) {
        try {
            const order = await Order.findByIdForUser(req.params.id, req.session.user.id);
            if (!order) {
                req.flash('error', 'Order not found.');
                return res.redirect('/orders');
            }

            if (order.payment_method !== 'UPI') {
                req.flash('error', 'Payment proof can only be submitted for UPI orders.');
                return res.redirect(`/orders/${order.id}`);
            }

            if (order.payment_status === 'paid') {
                req.flash('error', 'This order is already marked as paid.');
                return res.redirect(`/orders/${order.id}`);
            }

            if (!req.file) {
                req.flash('error', 'Please upload a screenshot of your payment.');
                return res.redirect(`/orders/${order.id}`);
            }

            // IMPORTANT: store only the filename, not a public URL.
            // The actual file lives in /private-uploads/payment-proofs/ which is
            // never served statically — it can only be retrieved through the
            // authenticated /secure/payment-proof/:orderId route, which checks
            // that the requester is either the order's owner or an admin.
            const imagePath = req.file.filename;
            const transactionId = req.body.transaction_id || null;

            const updated = await Order.submitPaymentProof(order.id, req.session.user.id, {
                imagePath,
                transactionId
            });

            if (!updated) {
                req.flash('error', 'Unable to submit payment proof. Please try again.');
                return res.redirect(`/orders/${order.id}`);
            }

            req.flash('success', 'Payment screenshot submitted! We will verify it and update your order shortly.');
            res.redirect(`/orders/${order.id}`);
        } catch (err) {
            console.error('Submit payment proof error:', err);
            req.flash('error', err.message && err.message.includes('image files')
                ? err.message
                : 'Unable to upload screenshot. Please try a smaller image.');
            res.redirect(`/orders/${req.params.id}`);
        }
    },

    async cancelOrder(req, res) {
        try {
            const order = await Order.findByIdForUser(req.params.id, req.session.user.id);
            if (!order) return res.status(404).render('shop/error', { message: 'Order not found.' });

            if (!['placed', 'confirmed'].includes(order.order_status)) {
                req.flash('error', 'This order can no longer be cancelled as it has already been processed.');
                return res.redirect(`/orders/${order.id}`);
            }

            await Order.cancelOrder(order.id, true);
            req.flash('success', 'Your order has been cancelled.');
            res.redirect(`/orders/${order.id}`);
        } catch (err) {
            console.error('Cancel order error:', err);
            req.flash('error', 'Unable to cancel this order right now.');
            res.redirect('back');
        }
    }
};

module.exports = orderController;
