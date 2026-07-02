// models/Wishlist.js
const db = require('../config/db');

const Wishlist = {
    async getItems(userId) {
        const [rows] = await db.query(`
            SELECT w.id as wishlist_id, p.id as product_id, p.name, p.slug, p.price, p.discount_price, p.stock_quantity,
                   (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
            FROM wishlist_items w
            JOIN products p ON p.id = w.product_id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `, [userId]);
        return rows;
    },

    async toggle(userId, productId) {
        const [existing] = await db.query(`SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?`, [userId, productId]);
        if (existing.length > 0) {
            await db.query(`DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?`, [userId, productId]);
            return false; // removed
        } else {
            await db.query(`INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)`, [userId, productId]);
            return true; // added
        }
    },

    async isWishlisted(userId, productId) {
        const [rows] = await db.query(`SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?`, [userId, productId]);
        return rows.length > 0;
    },

    async remove(userId, productId) {
        await db.query(`DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?`, [userId, productId]);
    }
};

module.exports = Wishlist;
