// models/Cart.js
const db = require('../config/db');

const Cart = {
    async getItems(userId) {
        const [rows] = await db.query(`
            SELECT ci.id as cart_item_id, ci.quantity, p.id as product_id, p.name, p.slug, p.price, p.discount_price,
                   p.stock_quantity, c.icon_shape,
                   (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            JOIN categories c ON c.id = p.category_id
            WHERE ci.user_id = ?
            ORDER BY ci.created_at DESC
        `, [userId]);
        return rows;
    },

    async addItem(userId, productId, quantity = 1) {
        await db.query(`
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        `, [userId, productId, quantity]);
    },

    async updateQuantity(userId, productId, quantity) {
        if (quantity <= 0) {
            await this.removeItem(userId, productId);
            return;
        }
        await db.query(`UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?`, [quantity, userId, productId]);
    },

    async removeItem(userId, productId) {
        await db.query(`DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`, [userId, productId]);
    },

    async clear(userId) {
        await db.query(`DELETE FROM cart_items WHERE user_id = ?`, [userId]);
    },

    async getCount(userId) {
        const [rows] = await db.query(`SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE user_id = ?`, [userId]);
        return rows[0].count;
    }
};

module.exports = Cart;
