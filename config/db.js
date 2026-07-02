// config/db.js
// Central MySQL connection pool used across the whole app.

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'framekraft_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});

// Quick startup check so connection problems fail loudly and early.
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL connected successfully to database:', process.env.DB_NAME || 'framekraft_db');
        connection.release();
    } catch (err) {
        console.error('❌ MySQL connection failed:', err.message);
        console.error('   Check your .env DB_HOST / DB_USER / DB_PASSWORD / DB_NAME values,');
        console.error('   and make sure MySQL (e.g. via XAMPP) is running.');
    }
})();

module.exports = pool;
