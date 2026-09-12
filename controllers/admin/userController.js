// controllers/admin/userController.js

const User = require('../../models/User');

const userController = {
    // ---------- List Users ----------
    async list(req, res) {
        try {
            const search = (req.query.search || '').trim();

            const page = Math.max(
                parseInt(req.query.page, 10) || 1,
                1
            );

            const limit = 50;
            const offset = (page - 1) * limit;

            const users = await User.getAll({
                limit,
                offset,
                search
            });

            const total = await User.countAll(search);
            const totalPages = Math.max(Math.ceil(total / limit), 1);

            // If requested page is beyond available pages,
            // show the last valid page.
            if (page > totalPages && total > 0) {
                return res.redirect(
                    `/admin/users?page=${totalPages}${
                        search
                            ? `&search=${encodeURIComponent(search)}`
                            : ''
                    }`
                );
            }

            res.render('admin/users', {
                users,
                search,
                page,
                totalPages,
                total
            });
        } catch (err) {
            console.error('Admin users list error:', err);

            res.status(500).render('shop/error', {
                message: 'Unable to load users right now.'
            });
        }
    },

    // ---------- Toggle User Active Status ----------
    async toggleActive(req, res) {
        try {
            const userId = Number(req.params.id);

            if (!Number.isInteger(userId) || userId <= 0) {
                req.flash('error', 'Invalid user ID.');
                return res.redirect('/admin/users');
            }

            const user = await User.findById(userId);

            if (!user) {
                req.flash('error', 'User not found.');
                return res.redirect('/admin/users');
            }

            // Prevent an admin from deactivating their own account.
            if (
                req.session.user &&
                Number(req.session.user.id) === userId
            ) {
                req.flash(
                    'error',
                    'You cannot deactivate your own account.'
                );
                return res.redirect('/admin/users');
            }

            // Prevent this route from changing another admin account.
            if (user.role === 'admin') {
                req.flash(
                    'error',
                    'Admin accounts cannot be changed here.'
                );
                return res.redirect('/admin/users');
            }

            const newStatus = user.is_active ? 0 : 1;

            await User.setActiveStatus(userId, newStatus);

            req.flash(
                'success',
                newStatus === 1
                    ? 'User activated successfully.'
                    : 'User deactivated successfully.'
            );

            return res.redirect('/admin/users');
        } catch (err) {
            console.error('Toggle user status error:', err);

            req.flash(
                'error',
                'Unable to update user status right now.'
            );

            return res.redirect('/admin/users');
        }
    }
};

module.exports = userController;
