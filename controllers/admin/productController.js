// controllers/admin/productController.js
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const fs = require('fs');
const path = require('path');
const { isProduction } = require('../../config/cloudinary');

// multer-storage-cloudinary sets file.path to the Cloudinary secure_url.
// The local diskStorage sets file.path to an absolute filesystem path,
// which isn't a usable public URL — for that backend we need the
// express.static-served relative path instead.
const getImageUrl = (file) => isProduction ? file.path : `/uploads/products/${file.filename}`;

const adminProductController = {
    async list(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = 15;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';

            const [products, totalCount, categories] = await Promise.all([
                Product.getAll({ search, limit, offset, activeOnly: false }),
                Product.countAll({ search, activeOnly: false }),
                Category.getAll(false)
            ]);

            res.render('admin/products/list', {
                products, categories, search,
                totalPages: Math.ceil(totalCount / limit), currentPage: page, totalCount
            });
        } catch (err) {
            console.error('Admin product list error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load products right now.' });
        }
    },

    async showCreateForm(req, res) {
        try {
            const categories = await Category.getAll(false);
            res.render('admin/products/form', { product: null, categories, errors: [], oldInput: {} });
        } catch (err) {
            console.error('Show create product form error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load the form right now.' });
        }
    },

    async create(req, res) {
        try {
            const categories = await Category.getAll(false);
            const errors = require('express-validator').validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(422).render('admin/products/form', {
                    product: null, categories, errors: errors.array(), oldInput: req.body
                });
            }

            const productId = await Product.create(req.body);

            // Handle uploaded images
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const imagePath = getImageUrl(req.files[i]);
                    await Product.addImage(productId, imagePath, i === 0);
                }
            }

            req.flash('success', 'Product created successfully.');
            res.redirect('/admin/products');
        } catch (err) {
            console.error('Create product error:', err);
            req.flash('error', err.message || 'Unable to create product right now.');
            res.redirect('/admin/products/new');
        }
    },

    async showEditForm(req, res) {
        try {
            const product = await Product.findById(req.params.id);
            if (!product) {
                req.flash('error', 'Product not found.');
                return res.redirect('/admin/products');
            }
            const categories = await Category.getAll(false);
            res.render('admin/products/form', { product, categories, errors: [], oldInput: product });
        } catch (err) {
            console.error('Show edit product form error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load the form right now.' });
        }
    },

    async update(req, res) {
        try {
            const productId = req.params.id;
            const categories = await Category.getAll(false);
            const errors = require('express-validator').validationResult(req);
            if (!errors.isEmpty()) {
                const product = await Product.findById(productId);
                return res.status(422).render('admin/products/form', {
                    product, categories, errors: errors.array(), oldInput: req.body
                });
            }

            const data = { ...req.body };
            data.is_featured = req.body.is_featured === 'on' || req.body.is_featured === 'true' ? 1 : 0;
            data.is_active = req.body.is_active === 'on' || req.body.is_active === 'true' ? 1 : 0;

            await Product.update(productId, data);

            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const imagePath = getImageUrl(req.files[i]);
                    await Product.addImage(productId, imagePath, false);
                }
            }

            req.flash('success', 'Product updated successfully.');
            res.redirect('/admin/products');
        } catch (err) {
            console.error('Update product error:', err);
            req.flash('error', 'Unable to update product right now.');
            res.redirect(`/admin/products/${req.params.id}/edit`);
        }
    },

    async deleteImage(req, res) {
        try {
            await Product.deleteImage(req.params.imageId);
            req.flash('success', 'Image removed.');
            res.redirect(`/admin/products/${req.params.id}/edit`);
        } catch (err) {
            console.error('Delete product image error:', err);
            req.flash('error', 'Unable to remove image.');
            res.redirect('back');
        }
    },

    async delete(req, res) {
        try {
            await Product.delete(req.params.id);
            req.flash('success', 'Product deleted.');
            res.redirect('/admin/products');
        } catch (err) {
            console.error('Delete product error:', err);
            req.flash('error', 'Unable to delete this product. It may have existing orders linked to it.');
            res.redirect('/admin/products');
        }
    },

    async toggleActive(req, res) {
        try {
            const product = await Product.findById(req.params.id);
            await Product.update(req.params.id, { is_active: product.is_active ? 0 : 1 });
            res.redirect('/admin/products');
        } catch (err) {
            console.error('Toggle product active error:', err);
            req.flash('error', 'Unable to update product status.');
            res.redirect('/admin/products');
        }
    }
};

module.exports = adminProductController;
