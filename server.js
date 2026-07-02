// server.js
require('dotenv').config();
const express        = require('express');
const path           = require('path');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const flash          = require('connect-flash');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const csurf          = require('csurf');

const sessionMiddleware  = require('./config/session');
const { attachUserContext } = require('./middleware/auth');

const app    = express();
const PORT   = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── Trust proxy ───────────────────────────────────────────────────────────────
// Required on Render/Railway so req.ip shows the real visitor IP,
// not the proxy IP. Without this, rate limiting and secure cookies break.
if (isProd) app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc:  ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc:    ["'self'", "https://fonts.gstatic.com"],
            imgSrc:     ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com"],
            connectSrc: ["'self'"],
            frameSrc:   ["'none'"],
        }
    },
    noSniff:       true,
    frameguard:    { action: 'deny' },
    hsts:          isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    hidePoweredBy: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders:   false,
    message: 'Too many attempts. Please try again after 15 minutes.',
    skip: () => !isProd
});
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    skip: () => !isProd
});

app.use('/login',       authLimiter);
app.use('/register',    authLimiter);
app.use('/admin/login', authLimiter);
app.use('/api/',        apiLimiter);

// ── View engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'partials/layout');

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// ── Static assets ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// NOTE: /private-uploads is NOT registered here — payment proofs are only
// accessible via the authenticated /secure/payment-proof/:orderId route.

// ── Sessions + flash ──────────────────────────────────────────────────────────
app.use(sessionMiddleware);
app.use(flash());

// ── CSRF protection ───────────────────────────────────────────────────────────
// Prevents attackers from submitting forms on behalf of logged-in users.
const csrfProtection = csurf({
    cookie: false // store token in session, not cookie (more secure)
});

// Apply CSRF to all routes EXCEPT the search API (GET only, no state change)
// csurf only checks POST/PUT/DELETE/PATCH by default — GETs are always skipped.
app.use((req, res, next) => {
    // Skip CSRF for JSON API endpoints (they use GET, no state change)
    if (req.path.startsWith('/api/')) return next();
    csrfProtection(req, res, next);
});

// ── App-level locals ──────────────────────────────────────────────────────────
app.use(attachUserContext);
app.use((req, res, next) => {
    res.locals.successMessages = req.flash('success');
    res.locals.errorMessages   = req.flash('error');
    res.locals.currentPath     = req.path;
    // Make CSRF token available in every EJS view
    try {
        res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    } catch {
        res.locals.csrfToken = '';
    }
    // Admin routes use the dark sidebar layout
    if (req.path.startsWith('/admin') && req.path !== '/admin/login') {
        res.locals.layout = 'admin/layout';
    }
    next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/',       require('./routes/authRoutes'));
app.use('/',       require('./routes/shopRoutes'));
app.use('/',       require('./routes/cartRoutes'));
app.use('/',       require('./routes/wishlistRoutes'));
app.use('/',       require('./routes/orderRoutes'));
app.use('/',       require('./routes/userRoutes'));
app.use('/',       require('./routes/searchRoutes'));
app.use('/secure', require('./routes/secureFileRoutes'));
app.use('/admin',  require('./routes/adminRoutes'));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    const isAdmin = req.path.startsWith('/admin');
    res.status(404).render('shop/error', {
        message: 'Page not found.',
        layout:  isAdmin ? false : 'partials/layout'
    });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    // CSRF token mismatch
    if (err.code === 'EBADCSRFTOKEN') {
        req.flash('error', 'Your session has expired. Please try again.');
        return res.redirect('back');
    }
    // File too large
    if (err.code === 'LIMIT_FILE_SIZE') {
        req.flash('error', 'File is too large. Please upload a smaller image.');
        return res.redirect('back');
    }
    // Wrong file type
    if (err.message && err.message.includes('Only image files')) {
        req.flash('error', err.message);
        return res.redirect('back');
    }
    console.error('Unhandled error:', err);
    res.status(500).render('shop/error', {
        message: 'Something went wrong. Please try again.'
    });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🖼️  FrameKraft running at http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Admin panel: http://localhost:${PORT}/admin/login\n`);
});
