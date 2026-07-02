// middleware/auth.js

// Allows only logged-in users (customer or admin)
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
}

// Allows only logged-out visitors onto pages like /login, /register
function isGuest(req, res, next) {
    if (req.session && req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/');
    }
    return next();
}

// Allows only admins
function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    if (req.session && req.session.user) {
        req.flash('error', 'You do not have permission to access the admin panel.');
        return res.redirect('/');
    }
    req.flash('error', 'Please log in as admin to continue.');
    return res.redirect('/admin/login');
}

// Makes current user + cart count available in every view without repeating logic in each controller
async function attachUserContext(req, res, next) {
    res.locals.currentUser = req.session.user || null;
    res.locals.cartCount = 0;

    if (req.session.user && req.session.user.role === 'customer') {
        try {
            const Cart = require('../models/Cart');
            res.locals.cartCount = await Cart.getCount(req.session.user.id);
        } catch (err) {
            res.locals.cartCount = 0;
        }
    }
    next();
}

module.exports = { isAuthenticated, isGuest, isAdmin, attachUserContext };
