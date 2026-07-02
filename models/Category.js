// models/Category.js
const db = require('../config/db');

const slugify = (text) =>
    text.toString().toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

const Category = {
    async getAll(activeOnly = true) {
        const query = activeOnly
            ? `SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC, name ASC`
            : `SELECT * FROM categories ORDER BY display_order ASC, name ASC`;
        const [rows] = await db.query(query);
        return rows;
    },

    async getAllWithProductCount() {
        const [rows] = await db.query(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
            GROUP BY c.id
            ORDER BY c.display_order ASC, c.name ASC
        `);
        return rows;
    },

    async findBySlug(slug) {
        const [rows] = await db.query(`SELECT * FROM categories WHERE slug = ?`, [slug]);
        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await db.query(`SELECT * FROM categories WHERE id = ?`, [id]);
        return rows[0] || null;
    },

    async create({ name, description, icon_shape, image, display_order }) {
        const slug = slugify(name);
        const [result] = await db.query(
            `INSERT INTO categories (name, slug, description, icon_shape, image, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
            [name, slug, description || null, icon_shape || 'square', image || null, display_order || 0]
        );
        return result.insertId;
    },

    async update(id, { name, description, icon_shape, image, display_order, is_active }) {
        const slug = name ? slugify(name) : undefined;
        const fields = [];
        const values = [];
        if (name) { fields.push('name = ?', 'slug = ?'); values.push(name, slug); }
        if (description !== undefined) { fields.push('description = ?'); values.push(description); }
        if (icon_shape) { fields.push('icon_shape = ?'); values.push(icon_shape); }
        if (image) { fields.push('image = ?'); values.push(image); }
        if (display_order !== undefined) { fields.push('display_order = ?'); values.push(display_order); }
        if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }
        if (fields.length === 0) return;
        values.push(id);
        await db.query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
    },

    async delete(id) {
        await db.query(`DELETE FROM categories WHERE id = ?`, [id]);
    },

    async countAll() {
        const [rows] = await db.query(`SELECT COUNT(*) as total FROM categories`);
        return rows[0].total;
    }
};

module.exports = Category;
