// controllers/userController.js
const User = require('../models/User');
const Address = require('../models/Address');
const bcrypt = require('bcryptjs');
const { isProduction } = require('../config/cloudinary');

const getAvatarUrl = (file) => isProduction ? file.path : `/uploads/avatars/${file.filename}`;

const userController = {
    async showProfile(req, res) {
        try {
            const user = await User.findById(req.session.user.id);
            const addresses = await Address.findByUser(req.session.user.id);
            res.render('user/profile', { user, addresses, errors: [] });
        } catch (err) {
            console.error('Profile view error:', err);
            res.status(500).render('shop/error', { message: 'Unable to load your profile right now.' });
        }
    },

    async updateProfile(req, res) {
        try {
            const { full_name, phone } = req.body;
            const avatar = req.file ? getAvatarUrl(req.file) : undefined;

            await User.updateProfile(req.session.user.id, { full_name, phone, avatar });

            req.session.user.full_name = full_name;
            req.flash('success', 'Profile updated successfully.');
            res.redirect('/profile');
        } catch (err) {
            console.error('Profile update error:', err);
            req.flash('error', 'Unable to update profile right now.');
            res.redirect('/profile');
        }
    },

    async changePassword(req, res) {
        try {
            const { current_password, new_password, confirm_new_password } = req.body;
            const user = await User.findByEmail(req.session.user.email);

            const fullUser = await User.findByEmail(req.session.user.email);
            // findByEmail returns password hash too (used internally for login); reuse it here
            const isMatch = await bcrypt.compare(current_password, fullUser.password);

            if (!isMatch) {
                req.flash('error', 'Current password is incorrect.');
                return res.redirect('/profile');
            }
            if (new_password !== confirm_new_password) {
                req.flash('error', 'New passwords do not match.');
                return res.redirect('/profile');
            }
            if (new_password.length < 8) {
                req.flash('error', 'New password must be at least 8 characters long.');
                return res.redirect('/profile');
            }

            await User.updatePassword(req.session.user.id, new_password);
            req.flash('success', 'Password changed successfully.');
            res.redirect('/profile');
        } catch (err) {
            console.error('Change password error:', err);
            req.flash('error', 'Unable to change password right now.');
            res.redirect('/profile');
        }
    },

    // ---------- Address book ----------
    async addAddress(req, res) {
        try {
            await Address.create(req.session.user.id, {
                ...req.body,
                is_default: req.body.is_default === 'on' || req.body.is_default === 'true'
            });
            req.flash('success', 'Address added successfully.');
            res.redirect(req.body.redirectTo || '/profile');
        } catch (err) {
            console.error('Add address error:', err);
            req.flash('error', 'Unable to add address right now.');
            res.redirect('back');
        }
    },

    async updateAddress(req, res) {
        try {
            await Address.update(req.params.id, req.session.user.id, {
                ...req.body,
                is_default: req.body.is_default === 'on' || req.body.is_default === 'true'
            });
            req.flash('success', 'Address updated successfully.');
            res.redirect('/profile');
        } catch (err) {
            console.error('Update address error:', err);
            req.flash('error', 'Unable to update address right now.');
            res.redirect('/profile');
        }
    },

    
    async deleteAddress(req, res) {
        try {
            await Address.delete(req.params.id, req.session.user.id);
            req.flash('success', 'Address removed.');
            res.redirect('/profile');
        } catch (err) {
            console.error('Delete address error:', err);
            req.flash('error', 'Unable to remove address right now.');
            res.redirect('/profile');
        }
    }
};

module.exports = userController;
