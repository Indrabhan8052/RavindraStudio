// models/Review.js
const db = require('../config/db');

const Review = {
    async getByProduct(productId, { limit = 10, offset = 0 } = {}) {
        const [rows] = await db.query(`
            SELECT r.*, u.full_name, u.avatar
            FROM reviews r JOIN users u ON u.id = r.user_id
            WHERE r.product_id = ? AND r.is_approved = 1
            ORDER BY r.created_at DESC LIMIT ? OFFSET ?
        `, [productId, Number(limit), Number(offset)]);
        return rows;
    },

    async countByProduct(productId) {
        const [rows] = await db.query(`SELECT COUNT(*) as total FROM reviews WHERE product_id = ? AND is_approved = 1`, [productId]);
        return rows[0].total;
    },

    async hasUserReviewed(productId, userId) {
        const [rows] = await db.query(`SELECT id FROM reviews WHERE product_id = ? AND user_id = ?`, [productId, userId]);
        return rows.length > 0;
    },

    async hasUserPurchased(productId, userId) {
        const [rows] = await db.query(`
            SELECT oi.id FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = ? AND o.user_id = ? AND o.order_status = 'delivered'
            LIMIT 1
        `, [productId, userId]);
        return rows.length > 0;
    },

    async create({ productId, userId, orderId, rating, comment }) {
        const [result] = await db.query(
            `INSERT INTO reviews (product_id, user_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)`,
            [productId, userId, orderId || null, rating, comment || null]
        );
        return result.insertId;
    },

    async delete(id) {
        await db.query(`DELETE FROM reviews WHERE id = ?`, [id]);
    },

    async getAllAdmin({ limit = 20, offset = 0 } = {}) {
        const [rows] = await db.query(`
            SELECT r.*, u.full_name, p.name as product_name, p.slug as product_slug
            FROM reviews r
            JOIN users u ON u.id = r.user_id
            JOIN products p ON p.id = r.product_id
            ORDER BY r.created_at DESC LIMIT ? OFFSET ?
        `, [Number(limit), Number(offset)]);
        return rows;
    }
};

module.exports = Review;
