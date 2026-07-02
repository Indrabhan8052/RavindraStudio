// models/Contact.js
const db = require('../config/db');

const Contact = {
    async create({ name, email, subject, message }) {
        const [result] = await db.query(
            `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`,
            [name, email, subject || null, message]
        );
        return result.insertId;
    },

    async getAll({ limit = 20, offset = 0 } = {}) {
        const [rows] = await db.query(`SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ? OFFSET ?`, [Number(limit), Number(offset)]);
        return rows;
    },

    async countUnread() {
        const [rows] = await db.query(`SELECT COUNT(*) as total FROM contact_messages WHERE is_read = 0`);
        return rows[0].total;
    },

    async markRead(id) {
        await db.query(`UPDATE contact_messages SET is_read = 1 WHERE id = ?`, [id]);
    },

    async delete(id) {
        await db.query(`DELETE FROM contact_messages WHERE id = ?`, [id]);
    }
};

module.exports = Contact;
