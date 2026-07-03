// server.js
require('dotenv').config();
const express        = require('express');
const path           = require('path');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const flash          = require('connect-flash');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');

const sessionMiddleware  = require('./config/session');
const { attachUserContext } = require('./middleware/auth');
const csrfProtection = require('./middleware/csrf');

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
            scriptSrc:     ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            // Helmet defaults scriptSrcAttr to 'none' even when scriptSrc allows
            // 'unsafe-inline', which silently blocks every onclick=/onchange=
            // attribute in the app (reject-payment toggle, apply-coupon,
            // cart quantity, sort dropdowns, payment method toggle, etc.)
            // with no visible error except in the browser console. Since
            // inline <script> blocks are already trusted via scriptSrc above,
            // allow inline event handler attributes too for consistency.
            scriptSrcAttr: ["'unsafe-inline'"],
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
//
// IMPORTANT: csurf reads the token from req.body._csrf. That field only
// exists once something has parsed the request body. express.urlencoded()/
// express.json() (registered above) can ONLY parse
// application/x-www-form-urlencoded and application/json bodies — they do
// NOT parse multipart/form-data (the encoding used by any <form> that has
// a file input, e.g. payment screenshot / product images / QR upload).
//
// Multipart bodies are only parsed by multer, which runs *inside* the
// individual upload routes (see routes/orderRoutes.js and
// routes/adminRoutes.js). If we ran csrfProtection globally here, it would
// always see an empty req.body on those routes and reject every upload
// with EBADCSRFTOKEN — which is exactly the "Your session has expired"
// error users were hitting on every image upload.
//
// Fix: skip the global CSRF check for those specific multipart POST
// routes. Each of those routes applies csrfProtection itself, AFTER
// multer has run and populated req.body._csrf from the multipart data.
// IMPORTANT: match the EXACT upload routes only — not a broad prefix.
// A broad prefix like '/admin/products' would also swallow
// '/admin/products/:id/delete' and '/admin/products/:id/toggle-active',
// which are NOT multipart routes and must keep their CSRF check.
const multipartRoutes = [
    { method: 'POST', regex: /^\/orders\/[^/]+\/payment-proof$/ },   // payment screenshot
    { method: 'POST', regex: /^\/admin\/products\/new$/ },           // new product images
    { method: 'POST', regex: /^\/admin\/products\/[^/]+\/edit$/ },   // edit product images
    { method: 'POST', regex: /^\/admin\/categories\/new$/ },         // new category image
    { method: 'POST', regex: /^\/admin\/categories\/[^/]+\/edit$/ }, // edit category image
    { method: 'POST', regex: /^\/admin\/settings$/ },                // UPI QR upload
];

app.use((req, res, next) => {
    // Skip CSRF for JSON API endpoints (they use GET, no state change)
    if (req.path.startsWith('/api/')) return next();

    // Skip the global check ONLY for the exact multipart/form-data upload
    // routes above — csrfProtection is applied inside those specific
    // routes instead, after multer has parsed the body. Every other POST
    // route (including /admin/products/:id/delete, :id/toggle-active,
    // /admin/products/:id/images/:imageId/delete, /admin/categories/:id/delete,
    // etc.) still goes through the normal global CSRF check right here.
    if (multipartRoutes.some(r => r.method === req.method && r.regex.test(req.path))) {
        return next();
    }

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