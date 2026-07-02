// controllers/shopController.js
const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Wishlist = require('../models/Wishlist');
const Settings = require('../models/Settings');

const shopController = {
    async home(req, res) {
        try {
            const [categories, featuredProducts, newArrivals, settings] = await Promise.all([
                Category.getAll(),
                Product.getFeatured(8),
                Product.getAll({ sort: 'newest', limit: 8 }),
                Settings.getAll()
            ]);
            res.render('shop/home', { categories, featuredProducts, newArrivals, settings });
        } catch (err) {
            console.error('Home page error:', err);
            res.status(500).render('shop/error', { message: 'Unable to load the homepage right now.' });
        }
    },

    async listProducts(req, res) {
        try {
            const { category, search, min, max, sort, page = 1 } = req.query;
            const limit = 12;
            const offset = (Math.max(1, parseInt(page)) - 1) * limit;

            const filters = { categorySlug: category, search, minPrice: min, maxPrice: max, sort, limit, offset };

            const [products, totalCount, categories] = await Promise.all([
                Product.getAll(filters),
                Product.countAll(filters),
                Category.getAll()
            ]);

            const totalPages = Math.ceil(totalCount / limit);
            const activeCategory = category ? categories.find(c => c.slug === category) : null;

            res.render('shop/products', {
                products, categories, totalCount, totalPages,
                currentPage: Math.max(1, parseInt(page)),
                activeCategory, query: req.query
            });
        } catch (err) {
            console.error('Product listing error:', err);
            res.status(500).render('shop/error', { message: 'Unable to load products right now.' });
        }
    },

    async productDetail(req, res) {
        try {
            const product = await Product.findBySlug(req.params.slug);
            if (!product) {
                return res.status(404).render('shop/error', { message: 'This product could not be found.' });
            }

            const [related, reviews, reviewCount] = await Promise.all([
                Product.getRelated(product.category_id, product.id, 4),
                Review.getByProduct(product.id, { limit: 10 }),
                Review.countByProduct(product.id)
            ]);

            let isWishlisted = false;
            let canReview = false;
            if (req.session.user && req.session.user.role === 'customer') {
                isWishlisted = await Wishlist.isWishlisted(req.session.user.id, product.id);
                const alreadyReviewed = await Review.hasUserReviewed(product.id, req.session.user.id);
                const purchased = await Review.hasUserPurchased(product.id, req.session.user.id);
                canReview = purchased && !alreadyReviewed;
            }

            res.render('shop/product-detail', { product, related, reviews, reviewCount, isWishlisted, canReview });
        } catch (err) {
            console.error('Product detail error:', err);
            res.status(500).render('shop/error', { message: 'Unable to load this product right now.' });
        }
    },

    async submitReview(req, res) {
        try {
            const product = await Product.findBySlug(req.params.slug);
            if (!product) return res.status(404).render('shop/error', { message: 'Product not found.' });

            const { rating, comment } = req.body;
            const userId = req.session.user.id;

            const purchased = await Review.hasUserPurchased(product.id, userId);
            if (!purchased) {
                req.flash('error', 'You can only review products you have purchased and received.');
                return res.redirect(`/products/${product.slug}`);
            }

            const alreadyReviewed = await Review.hasUserReviewed(product.id, userId);
            if (alreadyReviewed) {
                req.flash('error', 'You have already reviewed this product.');
                return res.redirect(`/products/${product.slug}`);
            }

            await Review.create({ productId: product.id, userId, rating, comment });
            await Product.updateRating(product.id);

            req.flash('success', 'Thank you for your review!');
            res.redirect(`/products/${product.slug}`);
        } catch (err) {
            console.error('Review submission error:', err);
            req.flash('error', 'Unable to submit your review right now.');
            res.redirect('back');
        }
    },

    async contactPage(req, res) {
        res.render('shop/contact', { errors: [], oldInput: {} });
    },

    async submitContact(req, res) {
        try {
            const Contact = require('../models/Contact');
            await Contact.create(req.body);
            req.flash('success', "Thanks for reaching out! We'll get back to you soon.");
            res.redirect('/contact');
        } catch (err) {
            console.error('Contact form error:', err);
            req.flash('error', 'Unable to send your message right now. Please try again.');
            res.redirect('/contact');
        }
    },

    async aboutPage(req, res) {
        res.render('shop/about');
    }
};

module.exports = shopController;
