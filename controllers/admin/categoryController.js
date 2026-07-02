// controllers/admin/categoryController.js
const Category = require('../../models/Category');
const { validationResult } = require('express-validator');

const adminCategoryController = {
    async list(req, res) {
        try {
            const categories = await Category.getAllWithProductCount();
            res.render('admin/categories/list', { categories });
        } catch (err) {
            console.error('Admin category list error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load categories right now.' });
        }
    },

    showCreateForm(req, res) {
        res.render('admin/categories/form', { category: null, errors: [], oldInput: {} });
    },

    async create(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(422).render('admin/categories/form', { category: null, errors: errors.array(), oldInput: req.body });
            }

            const image = req.file ? `/uploads/categories/${req.file.filename}` : null;
            await Category.create({ ...req.body, image });

            req.flash('success', 'Category created successfully.');
            res.redirect('/admin/categories');
        } catch (err) {
            console.error('Create category error:', err);
            req.flash('error', err.code === 'ER_DUP_ENTRY' ? 'A category with this name already exists.' : 'Unable to create category right now.');
            res.redirect('/admin/categories/new');
        }
    },

    async showEditForm(req, res) {
        try {
            const category = await Category.findById(req.params.id);
            if (!category) {
                req.flash('error', 'Category not found.');
                return res.redirect('/admin/categories');
            }
            res.render('admin/categories/form', { category, errors: [], oldInput: category });
        } catch (err) {
            console.error('Show edit category form error:', err);
            res.status(500).render('admin/error', { message: 'Unable to load the form right now.' });
        }
    },

    async update(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const category = await Category.findById(req.params.id);
                return res.status(422).render('admin/categories/form', { category, errors: errors.array(), oldInput: req.body });
            }

            const data = { ...req.body, is_active: req.body.is_active === 'on' || req.body.is_active === 'true' ? 1 : 0 };
            if (req.file) data.image = `/uploads/categories/${req.file.filename}`;

            await Category.update(req.params.id, data);
            req.flash('success', 'Category updated successfully.');
            res.redirect('/admin/categories');
        } catch (err) {
            console.error('Update category error:', err);
            req.flash('error', 'Unable to update category right now.');
            res.redirect(`/admin/categories/${req.params.id}/edit`);
        }
    },

    async delete(req, res) {
        try {
            await Category.delete(req.params.id);
            req.flash('success', 'Category deleted.');
            res.redirect('/admin/categories');
        } catch (err) {
            console.error('Delete category error:', err);
            req.flash('error', 'Unable to delete this category. Make sure no products are linked to it first.');
            res.redirect('/admin/categories');
        }
    }
};

module.exports = adminCategoryController;
