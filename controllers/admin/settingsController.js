// controllers/admin/settingsController.js
const Settings = require('../../models/Settings');
const Contact = require('../../models/Contact');
const Review = require('../../models/Review');

const adminSettingsController = {
    async show(req, res) {
        try {
            const settings = await Settings.getAll();
            res.render('admin/settings', { settings });
        } catch (err) {
            console.error('Admin settings view error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load settings right now.' });
        }
    },

    async update(req, res) {
        try {
            await Settings.setMultiple(req.body);

            // If admin uploaded a new UPI QR code image, save its path too
            if (req.file) {
                await Settings.set('upi_qr_image', `/uploads/settings/${req.file.filename}`);
            }

            req.flash('success', 'Settings updated successfully.');
            res.redirect('/admin/settings');
        } catch (err) {
            console.error('Update settings error:', err);
            req.flash('error', 'Unable to update settings right now.');
            res.redirect('/admin/settings');
        }
    },

    async messages(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = 15;
            const messages = await Contact.getAll({ limit, offset: (page - 1) * limit });
            res.render('admin/messages', { messages, currentPage: page });
        } catch (err) {
            console.error('Admin messages view error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load messages right now.' });
        }
    },

    async markMessageRead(req, res) {
        try {
            await Contact.markRead(req.params.id);
            res.redirect('/admin/messages');
        } catch (err) {
            console.error('Mark message read error:', err);
            res.redirect('/admin/messages');
        }
    },

    async deleteMessage(req, res) {
        try {
            await Contact.delete(req.params.id);
            req.flash('success', 'Message deleted.');
            res.redirect('/admin/messages');
        } catch (err) {
            console.error('Delete message error:', err);
            res.redirect('/admin/messages');
        }
    },

    async reviews(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = 15;
            const reviews = await Review.getAllAdmin({ limit, offset: (page - 1) * limit });
            res.render('admin/reviews', { reviews, currentPage: page });
        } catch (err) {
            console.error('Admin reviews view error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load reviews right now.' });
        }
    },

    async deleteReview(req, res) {
        try {
            const Product = require('../../models/Product');
            const reviews = await Review.getAllAdmin({ limit: 1000, offset: 0 });
            const review = reviews.find(r => r.id == req.params.id);
            await Review.delete(req.params.id);
            if (review) await Product.updateRating(review.product_id);
            req.flash('success', 'Review deleted.');
            res.redirect('/admin/reviews');
        } catch (err) {
            console.error('Delete review error:', err);
            req.flash('error', 'Unable to delete review.');
            res.redirect('/admin/reviews');
        }
    }
};

module.exports = adminSettingsController;
