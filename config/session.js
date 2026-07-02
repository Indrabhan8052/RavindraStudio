// config/session.js
// Stores sessions server-side in MySQL so they persist across restarts.
// In production the session cookie is HTTPS-only (secure: true).

const session  = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

const sessionStore = new MySQLStore({
    host:     process.env.DB_HOST || 'localhost',
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'framekraft_db',
    createDatabaseTable: true,
    schema: {
        tableName:   'sessions',
        columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' }
    }
});

const sessionMiddleware = session({
    key:    'framekraft_sid',
    secret: process.env.SESSION_SECRET || 'fallback_dev_secret_change_me',
    store:  sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge:   1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,                      // JS cannot read this cookie
        secure:   isProd,                    // HTTPS only in production
        sameSite: isProd ? 'strict' : 'lax' // strict in prod blocks CSRF via cookies too
    }
});

module.exports = sessionMiddleware;
