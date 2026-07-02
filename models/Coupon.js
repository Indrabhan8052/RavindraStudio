// models/Coupon.js
const db = require('../config/db');

const Coupon = {
    async findByCode(code) {
        const [rows] = await db.query(`SELECT * FROM coupons WHERE code = ? AND is_active = 1`, [code.toUpperCase()]);
        return rows[0] || null;
    },

    async validate(code, orderAmount) {
        const coupon = await this.findByCode(code);
        if (!coupon) return { valid: false, message: 'Invalid coupon code.' };
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return { valid: false, message: 'This coupon has expired.' };
        }
        if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
            return { valid: false, message: 'This coupon has reached its usage limit.' };
        }
        if (orderAmount < coupon.min_order_amount) {
            return { valid: false, message: `Minimum order amount of ₹${coupon.min_order_amount} required.` };
        }
        const discount = coupon.discount_type === 'percent'
            ? (orderAmount * coupon.discount_value) / 100
            : coupon.discount_value;
        return { valid: true, coupon, discount: Math.min(discount, orderAmount) };
    },

    async getAll() {
        const [rows] = await db.query(`SELECT * FROM coupons ORDER BY created_at DESC`);
        return rows;
    },

    async create({ code, discount_type, discount_value, min_order_amount, max_uses, expires_at }) {
        const [result] = await db.query(
            `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [code.toUpperCase(), discount_type, discount_value, min_order_amount || 0, max_uses || null, expires_at || null]
        );
        return result.insertId;
    },

    async incrementUsage(code) {
        await db.query(`UPDATE coupons SET used_count = used_count + 1 WHERE code = ?`, [code.toUpperCase()]);
    },

    async toggleActive(id, isActive) {
        await db.query(`UPDATE coupons SET is_active = ? WHERE id = ?`, [isActive, id]);
    },

    async delete(id) {
        await db.query(`DELETE FROM coupons WHERE id = ?`, [id]);
    }
};

module.exports = Coupon;
