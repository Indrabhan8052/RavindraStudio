// middleware/csrf.js
const csurf = require('csurf');

// Store token in session, not cookie (more secure).
// Exported as a single shared instance so server.js and any route file
// that needs to apply CSRF checking *after* multer runs can import
// this exact same instance.
const csrfProtection = csurf({
    cookie: false
});

module.exports = csrfProtection;