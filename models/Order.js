// models/Order.js
const db = require('../config/db');

const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(100 + Math.random() * 900);
    return `FK${timestamp}${random}`;
};

const Order = {
    // Places an order from the user's current cart items inside a DB transaction.
    // Either everything succeeds (order + items + stock update + cart clear) or nothing does.
    async placeOrder(userId, addressId, cartItems, { paymentMethod = 'COD', shippingFee = 0, notes = '' } = {}) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const subtotal = cartItems.reduce((sum, item) => {
                const unitPrice = item.discount_price || item.price;
                return sum + (unitPrice * item.quantity);
            }, 0);
            const totalAmount = subtotal + Number(shippingFee);
            const orderNumber = generateOrderNumber();

            const [orderResult] = await connection.query(
                `INSERT INTO orders (order_number, user_id, address_id, subtotal, shipping_fee, total_amount, payment_method, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [orderNumber, userId, addressId, subtotal, shippingFee, totalAmount, paymentMethod, notes]
            );
            const orderId = orderResult.insertId;

            for (const item of cartItems) {
                const unitPrice = item.discount_price || item.price;
                const lineTotal = unitPrice * item.quantity;

                // Verify stock availability inside the transaction to avoid overselling
                const [[stockRow]] = await connection.query(
                    `SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE`,
                    [item.product_id]
                );
                if (!stockRow || stockRow.stock_quantity < item.quantity) {
                    throw new Error(`"${item.name}" is no longer available in the requested quantity.`);
                }

                await connection.query(
                    `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, line_total)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [orderId, item.product_id, item.name, item.primary_image || null, unitPrice, item.quantity, lineTotal]
                );

                await connection.query(
                    `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`,
                    [item.quantity, item.product_id]
                );
            }

            await connection.query(
                `INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'placed', 'Order placed by customer')`,
                [orderId]
            );

            await connection.query(`DELETE FROM cart_items WHERE user_id = ?`, [userId]);

            await connection.commit();
            return { orderId, orderNumber, totalAmount };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    async findByUser(userId, { limit = 10, offset = 0 } = {}) {
        const [rows] = await db.query(
            `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, Number(limit), Number(offset)]
        );
        return rows;
    },

    async countByUser(userId) {
        const [rows] = await db.query(`SELECT COUNT(*) as total FROM orders WHERE user_id = ?`, [userId]);
        return rows[0].total;
    },

    async findById(orderId) {
        const [rows] = await db.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
        return rows[0] || null;
    },

    async findByIdForUser(orderId, userId) {
        const [rows] = await db.query(`SELECT * FROM orders WHERE id = ? AND user_id = ?`, [orderId, userId]);
        return rows[0] || null;
    },

    async getItems(orderId) {
        const [rows] = await db.query(`SELECT * FROM order_items WHERE order_id = ?`, [orderId]);
        return rows;
    },

    async getAddress(addressId) {
        const [rows] = await db.query(`SELECT * FROM addresses WHERE id = ?`, [addressId]);
        return rows[0] || null;
    },

    async getStatusHistory(orderId) {
        const [rows] = await db.query(`SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC`, [orderId]);
        return rows;
    },

    async getCustomer(orderId) {
        const [rows] = await db.query(`
            SELECT u.full_name, u.email, u.phone FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?
        `, [orderId]);
        return rows[0] || null;
    },

    // ---------- Admin ----------
    async getAllAdmin({ status, search, limit = 20, offset = 0 } = {}) {
        let query = `
            SELECT o.*, u.full_name as customer_name, u.email as customer_email
            FROM orders o JOIN users u ON u.id = o.user_id
            WHERE 1=1
        `;
        const params = [];
        if (status) { query += ` AND o.order_status = ?`; params.push(status); }
        if (search) { query += ` AND (o.order_number LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));
        const [rows] = await db.query(query, params);
        return rows;
    },

    async countAllAdmin({ status, search } = {}) {
        let query = `SELECT COUNT(*) as total FROM orders o JOIN users u ON u.id = o.user_id WHERE 1=1`;
        const params = [];
        if (status) { query += ` AND o.order_status = ?`; params.push(status); }
        if (search) { query += ` AND (o.order_number LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        const [rows] = await db.query(query, params);
        return rows[0].total;
    },

    async updateStatus(orderId, status, note = '') {
        await db.query(`UPDATE orders SET order_status = ? WHERE id = ?`, [status, orderId]);
        await db.query(`INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)`, [orderId, status, note]);
    },

    async updatePaymentStatus(orderId, status) {
        await db.query(`UPDATE orders SET payment_status = ? WHERE id = ?`, [status, orderId]);
    },

    async cancelOrder(orderId, restockItems = true) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            if (restockItems) {
                const [items] = await connection.query(`SELECT product_id, quantity FROM order_items WHERE order_id = ?`, [orderId]);
                for (const item of items) {
                    await connection.query(`UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?`, [item.quantity, item.product_id]);
                }
            }
            await connection.query(`UPDATE orders SET order_status = 'cancelled' WHERE id = ?`, [orderId]);
            await connection.query(`INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'cancelled', 'Order cancelled')`, [orderId]);
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    // ---------- Dashboard stats ----------
    async getRevenueStats() {
        const [rows] = await db.query(`
            SELECT
                COALESCE(SUM(CASE WHEN order_status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
                COUNT(*) as total_orders,
                COALESCE(SUM(CASE WHEN order_status = 'placed' THEN 1 ELSE 0 END), 0) as pending_orders,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END), 0) as today_revenue
            FROM orders
        `);
        return rows[0];
    },

    async getRecentOrders(limit = 5) {
        const [rows] = await db.query(`
            SELECT o.*, u.full_name as customer_name
            FROM orders o JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC LIMIT ?
        `, [Number(limit)]);
        return rows;
    },

    async getMonthlySales(months = 6) {
        const [rows] = await db.query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total_amount) as revenue, COUNT(*) as orders
            FROM orders
            WHERE order_status != 'cancelled' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY month ORDER BY month ASC
        `, [months]);
        return rows;
    },

    async getTopProducts(limit = 5) {
        const [rows] = await db.query(`
            SELECT product_name, SUM(quantity) as total_sold, SUM(line_total) as total_revenue
            FROM order_items oi JOIN orders o ON o.id = oi.order_id
            WHERE o.order_status != 'cancelled'
            GROUP BY product_name ORDER BY total_sold DESC LIMIT ?
        `, [Number(limit)]);
        return rows;
    },

    // ---------- UPI Payment Proof Workflow ----------
    // Flow: customer places order with payment_method='UPI' (status starts 'pending')
    //       → customer uploads screenshot (status becomes 'submitted')
    //       → admin reviews and marks 'paid' or 'rejected'

    async submitPaymentProof(orderId, userId, { imagePath, transactionId }) {
        const [result] = await db.query(
            `UPDATE orders
             SET payment_proof_image = ?,
                 upi_transaction_id = ?,
                 payment_status = 'submitted',
                 payment_proof_submitted_at = NOW()
             WHERE id = ? AND user_id = ? AND payment_method = 'UPI'`,
            [imagePath, transactionId || null, orderId, userId]
        );
        return result.affectedRows > 0;
    },

    async verifyPayment(orderId, note = '') {
        await db.query(
            `UPDATE orders SET payment_status = 'paid', payment_verified_at = NOW(), payment_rejection_reason = NULL WHERE id = ?`,
            [orderId]
        );
        await db.query(
            `INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'confirmed', ?)`,
            [orderId, note || 'Payment verified by admin']
        );
    },

    async rejectPayment(orderId, reason = '') {
        await db.query(
            `UPDATE orders SET payment_status = 'rejected', payment_rejection_reason = ? WHERE id = ?`,
            [reason || 'Payment could not be verified', orderId]
        );
    },

    async getPendingPaymentVerifications({ limit = 20, offset = 0 } = {}) {
        const [rows] = await db.query(`
            SELECT o.*, u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
            FROM orders o JOIN users u ON u.id = o.user_id
            WHERE o.payment_method = 'UPI' AND o.payment_status = 'submitted'
            ORDER BY o.payment_proof_submitted_at ASC
            LIMIT ? OFFSET ?
        `, [Number(limit), Number(offset)]);
        return rows;
    },

    async countPendingPaymentVerifications() {
        const [rows] = await db.query(
            `SELECT COUNT(*) as total FROM orders WHERE payment_method = 'UPI' AND payment_status = 'submitted'`
        );
        return rows[0].total;
    }
};

module.exports = Order;
