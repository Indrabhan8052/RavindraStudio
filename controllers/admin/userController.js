// controllers/admin/userController.js
const User = require('../../models/User');

const adminUserController = {
    async list(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = 15;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';

            const [users, totalCount] = await Promise.all([
                User.getAll({ limit, offset, search }),
                User.countAll(search)
            ]);

            res.render('admin/users/list', { users, totalPages: Math.ceil(totalCount / limit), currentPage: page, search });
        } catch (err) {
            console.error('Admin user list error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load users right now.' });
        }
    },

    async toggleActive(req, res) {
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                req.flash('error', 'User not found.');
                return res.redirect('/admin/users');
            }
            await User.setActiveStatus(req.params.id, user.is_active ? 0 : 1);
            req.flash('success', `User ${user.is_active ? 'deactivated' : 'activated'} successfully.`);
            res.redirect('/admin/users');
        } catch (err) {
            console.error('Toggle user active error:', err);
            req.flash('error', 'Unable to update user status.');
            res.redirect('/admin/users');
        }
    }
};

module.exports = adminUserController;
