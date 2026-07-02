// controllers/authController.js
const User = require('../models/User');

const authController = {
    showRegister(req, res) {
        res.render('auth/register', { errors: [], oldInput: {} });
    },

    async register(req, res) {
        try {
            const { full_name, email, phone, password } = req.body;

            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(422).render('auth/register', {
                    errors: [{ msg: 'An account with this email already exists. Please log in instead.' }],
                    oldInput: req.body
                });
            }

            const userId = await User.create({ full_name, email, phone, password, role: 'customer' });

            // Auto-login after successful registration
            req.session.user = { id: userId, full_name, email, role: 'customer' };
            req.flash('success', `Welcome to FrameKraft, ${full_name.split(' ')[0]}! Your account has been created.`);
            res.redirect('/');
        } catch (err) {
            console.error('Registration error:', err);
            res.status(500).render('auth/register', {
                errors: [{ msg: 'Something went wrong while creating your account. Please try again.' }],
                oldInput: req.body
            });
        }
    },

    showLogin(req, res) {
        res.render('auth/login', { errors: [], oldInput: {}, redirectTo: req.query.redirect || '/' });
    },

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const redirectTo = req.body.redirectTo || '/';

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(422).render('auth/login', {
                    errors: [{ msg: 'No account found with this email address.' }],
                    oldInput: req.body,
                    redirectTo
                });
            }

            if (!user.is_active) {
                return res.status(403).render('auth/login', {
                    errors: [{ msg: 'Your account has been deactivated. Please contact support.' }],
                    oldInput: req.body,
                    redirectTo
                });
            }

            const isMatch = await User.comparePassword(password, user.password);
            if (!isMatch) {
                return res.status(422).render('auth/login', {
                    errors: [{ msg: 'Incorrect password. Please try again.' }],
                    oldInput: req.body,
                    redirectTo
                });
            }

            req.session.user = { id: user.id, full_name: user.full_name, email: user.email, role: user.role };
            req.flash('success', `Welcome back, ${user.full_name.split(' ')[0]}!`);

            if (user.role === 'admin') {
                return res.redirect('/admin/dashboard');
            }
            res.redirect(redirectTo && redirectTo !== '/login' ? redirectTo : '/');
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).render('auth/login', {
                errors: [{ msg: 'Something went wrong. Please try again.' }],
                oldInput: req.body,
                redirectTo: '/'
            });
        }
    },

    logout(req, res) {
        req.session.destroy(() => {
            res.clearCookie('framekraft_sid');
            res.redirect('/login');
        });
    },

    // Admin login uses the same users table but only accepts role = 'admin'
    showAdminLogin(req, res) {
        res.render('admin/login', { errors: [], oldInput: {}, layout: false });
    },

    async adminLogin(req, res) {
        try {
            const { email, password } = req.body;
            const user = await User.findByEmail(email);

            if (!user || user.role !== 'admin') {
                return res.status(422).render('admin/login', {
                    errors: [{ msg: 'Invalid admin credentials.' }],
                    oldInput: req.body,
                    layout: false
                });
            }

            const isMatch = await User.comparePassword(password, user.password);
            if (!isMatch) {
                return res.status(422).render('admin/login', {
                    errors: [{ msg: 'Invalid admin credentials.' }],
                    oldInput: req.body,
                    layout: false
                });
            }

            req.session.user = { id: user.id, full_name: user.full_name, email: user.email, role: user.role };
            res.redirect('/admin/dashboard');
        } catch (err) {
            console.error('Admin login error:', err);
            res.status(500).render('admin/login', {
                errors: [{ msg: 'Something went wrong. Please try again.' }],
                oldInput: req.body,
                layout: false
            });
        }
    }
};

module.exports = authController;
