// models/Address.js
const db = require('../config/db');

const Address = {
    async create(userId, data) {
        const { label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default } = data;

        // If this is set as default, unset other defaults first
        if (is_default) {
            await db.query(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`, [userId]);
        }

        const [result] = await db.query(
            `INSERT INTO addresses (user_id, label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, label, full_name, phone, address_line1, address_line2 || null, city, state, pincode, is_default ? 1 : 0]
        );
        return result.insertId;
    },

    async findByUser(userId) {
        const [rows] = await db.query(
            `SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
            [userId]
        );
        return rows;
    },

    async findById(id, userId) {
        const [rows] = await db.query(`SELECT * FROM addresses WHERE id = ? AND user_id = ?`, [id, userId]);
        return rows[0] || null;
    },

    async update(id, userId, data) {
        const { label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default } = data;

        if (is_default) {
            await db.query(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`, [userId]);
        }

        await db.query(
            `UPDATE addresses SET label=?, full_name=?, phone=?, address_line1=?, address_line2=?, city=?, state=?, pincode=?, is_default=?
             WHERE id = ? AND user_id = ?`,
            [label, full_name, phone, address_line1, address_line2 || null, city, state, pincode, is_default ? 1 : 0, id, userId]
        );
    },

    async delete(id, userId) {
        await db.query(`DELETE FROM addresses WHERE id = ? AND user_id = ?`, [id, userId]);
    }
};

module.exports = Address;
