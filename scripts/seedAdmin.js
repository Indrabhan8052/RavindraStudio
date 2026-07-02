// scripts/seedAdmin.js
// Run with: npm run seed:admin
// Creates (or resets the password of) the admin account using values from .env

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL || 'admin@framekraft.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';
    const fullName = process.env.ADMIN_NAME || 'Store Admin';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const [existing] = await db.query(`SELECT id FROM users WHERE email = ?`, [email]);

        if (existing.length > 0) {
            await db.query(`UPDATE users SET password = ?, role = 'admin', is_active = 1 WHERE email = ?`, [hashedPassword, email]);
            console.log(`✅ Existing admin account updated: ${email}`);
        } else {
            await db.query(
                `INSERT INTO users (full_name, email, phone, password, role, email_verified) VALUES (?, ?, ?, ?, 'admin', 1)`,
                [fullName, email, '9999999999', hashedPassword]
            );
            console.log(`✅ Admin account created: ${email}`);
        }

        console.log(`   Email:    ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   ⚠️  Please log in and change this password if this is a shared/production environment.\n`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to seed admin account:', err.message);
        process.exit(1);
    }
}

seedAdmin();
