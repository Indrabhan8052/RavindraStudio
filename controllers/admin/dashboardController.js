// controllers/admin/dashboardController.js
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const Category = require('../../models/Category');
const Contact = require('../../models/Contact');

const dashboardController = {
    async index(req, res) {
        try {
            const [revenueStats, recentOrders, topProducts, monthlySales, totalProducts, totalCategories, totalCustomers, lowStockCount, unreadMessages] = await Promise.all([
                Order.getRevenueStats(),
                Order.getRecentOrders(5),
                Order.getTopProducts(5),
                Order.getMonthlySales(6),
                Product.countAllAdmin(),
                Category.countAll(),
                User.countCustomers(),
                Product.countLowStock(5),
                Contact.countUnread()
            ]);

            res.render('admin/dashboard', {
                revenueStats, recentOrders, topProducts, monthlySales,
                totalProducts, totalCategories, totalCustomers, lowStockCount, unreadMessages
            });
        } catch (err) {
            console.error('Admin dashboard error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load the dashboard right now.' });
        }
    }
};

module.exports = dashboardController;
