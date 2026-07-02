// controllers/admin/couponController.js
const Coupon = require('../../models/Coupon');

const adminCouponController = {
    async list(req, res) {
        try {
            const coupons = await Coupon.getAll();
            res.render('admin/coupons/list', { coupons, errors: [], oldInput: {} });
        } catch (err) {
            console.error('Admin coupon list error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load coupons right now.' });
        }
    },

    async create(req, res) {
        try {
            const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at } = req.body;

            if (!code || !discount_value) {
                req.flash('error', 'Coupon code and discount value are required.');
                return res.redirect('/admin/coupons');
            }

            await Coupon.create({ code, discount_type, discount_value, min_order_amount, max_uses, expires_at });
            req.flash('success', 'Coupon created successfully.');
            res.redirect('/admin/coupons');
        } catch (err) {
            console.error('Create coupon error:', err);
            req.flash('error', err.code === 'ER_DUP_ENTRY' ? 'This coupon code already exists.' : 'Unable to create coupon right now.');
            res.redirect('/admin/coupons');
        }
    },

    async toggleActive(req, res) {
        try {
            const coupons = await Coupon.getAll();
            const coupon = coupons.find(c => c.id == req.params.id);
            await Coupon.toggleActive(req.params.id, coupon.is_active ? 0 : 1);
            req.flash('success', 'Coupon status updated.');
            res.redirect('/admin/coupons');
        } catch (err) {
            console.error('Toggle coupon error:', err);
            req.flash('error', 'Unable to update coupon.');
            res.redirect('/admin/coupons');
        }
    },

    async delete(req, res) {
        try {
            await Coupon.delete(req.params.id);
            req.flash('success', 'Coupon deleted.');
            res.redirect('/admin/coupons');
        } catch (err) {
            console.error('Delete coupon error:', err);
            req.flash('error', 'Unable to delete coupon.');
            res.redirect('/admin/coupons');
        }
    }
};

module.exports = adminCouponController;
