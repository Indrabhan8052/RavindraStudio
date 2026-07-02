// models/User.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    // Create a new customer/admin account
    async create({ full_name, email, phone, password, role = 'customer' }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            `INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)`,
            [full_name, email, phone, hashedPassword, role]
        );
        return result.insertId;
    },

    async findByEmail(email) {
        const [rows] = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);
        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await db.query(
            `SELECT id, full_name, email, phone, role, avatar, is_active, email_verified, created_at FROM users WHERE id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    async comparePassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    },

    async updateProfile(id, { full_name, phone, avatar }) {
        const fields = [];
        const values = [];
        if (full_name) { fields.push('full_name = ?'); values.push(full_name); }
        if (phone) { fields.push('phone = ?'); values.push(phone); }
        if (avatar) { fields.push('avatar = ?'); values.push(avatar); }
        if (fields.length === 0) return;
        values.push(id);
        await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    },

    async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, id]);
    },

    // ---------- Admin-facing ----------
    async getAll({ limit = 50, offset = 0, search = '' } = {}) {
        let query = `SELECT id, full_name, email, phone, role, is_active, created_at FROM users WHERE 1=1`;
        const params = [];
        if (search) {
            query += ` AND (full_name LIKE ? OR email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));
        const [rows] = await db.query(query, params);
        return rows;
    },

    async countAll(search = '') {
        let query = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
        const params = [];
        if (search) {
            query += ` AND (full_name LIKE ? OR email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        const [rows] = await db.query(query, params);
        return rows[0].total;
    },

    async setActiveStatus(id, isActive) {
        await db.query(`UPDATE users SET is_active = ? WHERE id = ?`, [isActive, id]);
    },

    async countCustomers() {
        const [rows] = await db.query(`SELECT COUNT(*) as total FROM users WHERE role = 'customer'`);
        return rows[0].total;
    }
};

module.exports = User;
