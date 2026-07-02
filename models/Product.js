// models/Product.js
const db = require('../config/db');

const slugify = (text) =>
    text.toString().toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

const Product = {
    // Storefront: list with filters, search, sort, pagination
    async getAll({ categorySlug, search, minPrice, maxPrice, sort = 'newest', limit = 12, offset = 0, activeOnly = true } = {}) {
        let query = `
            SELECT p.*, c.name as category_name, c.slug as category_slug, c.icon_shape,
                   (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
            FROM products p
            JOIN categories c ON c.id = p.category_id
            WHERE 1=1
        `;
        const params = [];

        if (activeOnly) query += ` AND p.is_active = 1`;
        if (categorySlug) { query += ` AND c.slug = ?`; params.push(categorySlug); }
        if (search) { query += ` AND (p.name LIKE ? OR p.description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
        if (minPrice) { query += ` AND COALESCE(p.discount_price, p.price) >= ?`; params.push(minPrice); }
        if (maxPrice) { query += ` AND COALESCE(p.discount_price, p.price) <= ?`; params.push(maxPrice); }

        const sortMap = {
            newest: 'p.created_at DESC',
            price_low: 'COALESCE(p.discount_price, p.price) ASC',
            price_high: 'COALESCE(p.discount_price, p.price) DESC',
            rating: 'p.rating_avg DESC',
            popular: 'p.rating_count DESC'
        };
        query += ` ORDER BY ${sortMap[sort] || sortMap.newest}`;
        query += ` LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));

        const [rows] = await db.query(query, params);
        return rows;
    },

    async countAll({ categorySlug, search, minPrice, maxPrice, activeOnly = true } = {}) {
        let query = `SELECT COUNT(*) as total FROM products p JOIN categories c ON c.id = p.category_id WHERE 1=1`;
        const params = [];
        if (activeOnly) query += ` AND p.is_active = 1`;
        if (categorySlug) { query += ` AND c.slug = ?`; params.push(categorySlug); }
        if (search) { query += ` AND (p.name LIKE ? OR p.description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
        if (minPrice) { query += ` AND COALESCE(p.discount_price, p.price) >= ?`; params.push(minPrice); }
        if (maxPrice) { query += ` AND COALESCE(p.discount_price, p.price) <= ?`; params.push(maxPrice); }
        const [rows] = await db.query(query, params);
        return rows[0].total;
    },

    async getFeatured(limit = 8) {
        const [rows] = await db.query(`
            SELECT p.*, c.name as category_name, c.slug as category_slug,
                   (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
            FROM products p JOIN categories c ON c.id = p.category_id
            WHERE p.is_featured = 1 AND p.is_active = 1
            ORDER BY p.created_at DESC LIMIT ?
        `, [Number(limit)]);
        return rows;
    },

    async findBySlug(slug) {
        const [rows] = await db.query(`
            SELECT p.*, c.name as category_name, c.slug as category_slug, c.icon_shape
            FROM products p JOIN categories c ON c.id = p.category_id
            WHERE p.slug = ?
        `, [slug]);
        if (!rows[0]) return null;
        const product = rows[0];
        const [images] = await db.query(`SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC`, [product.id]);
        product.images = images;
        return product;
    },

    async findById(id) {
        const [rows] = await db.query(`SELECT * FROM products WHERE id = ?`, [id]);
        if (!rows[0]) return null;
        const product = rows[0];
        const [images] = await db.query(`SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC`, [id]);
        product.images = images;
        return product;
    },

    async getRelated(categoryId, excludeProductId, limit = 4) {
        const [rows] = await db.query(`
            SELECT p.*, (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
            FROM products p
            WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
            ORDER BY RAND() LIMIT ?
        `, [categoryId, excludeProductId, Number(limit)]);
        return rows;
    },

    async create(data) {
        const { category_id, name, description, material, size, color, price, discount_price, stock_quantity, sku, is_featured } = data;
        const slug = slugify(name) + '-' + Date.now().toString().slice(-5);
        const [result] = await db.query(
            `INSERT INTO products (category_id, name, slug, description, material, size, color, price, discount_price, stock_quantity, sku, is_featured)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [category_id, name, slug, description || null, material || 'Wood', size || 'Medium', color || 'Brown',
             price, discount_price || null, stock_quantity || 0, sku || null, is_featured ? 1 : 0]
        );
        return result.insertId;
    },

    async addImage(productId, imagePath, isPrimary = false) {
        if (isPrimary) {
            await db.query(`UPDATE product_images SET is_primary = 0 WHERE product_id = ?`, [productId]);
        }
        await db.query(
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, ?)`,
            [productId, imagePath, isPrimary ? 1 : 0]
        );
    },

    async deleteImage(imageId) {
        await db.query(`DELETE FROM product_images WHERE id = ?`, [imageId]);
    },

    async update(id, data) {
        const allowed = ['category_id', 'name', 'description', 'material', 'size', 'color', 'price', 'discount_price', 'stock_quantity', 'sku', 'is_featured', 'is_active'];
        const fields = [];
        const values = [];
        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        }
        if (data.name) {
            fields.push('slug = ?');
            values.push(slugify(data.name) + '-' + id);
        }
        if (fields.length === 0) return;
        values.push(id);
        await db.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    },

    async delete(id) {
        await db.query(`DELETE FROM products WHERE id = ?`, [id]);
    },

    async decrementStock(id, qty) {
        await db.query(`UPDATE products SET stock_quantity = GREATEST(stock_quantity - ?, 0) WHERE id = ?`, [qty, id]);
    },

    async updateRating(productId) {
        await db.query(`
            UPDATE products p
            SET rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = ? AND is_approved = 1),
                rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ? AND is_approved = 1)
            WHERE p.id = ?
        `, [productId, productId, productId]);
    },

    async countAllAdmin() {
        const [rows] = await db.query(`SELECT COUNT(*) as total FROM products`);
        return rows[0].total;
    },

    async countLowStock(threshold = 5) {
        const [rows] = await db.query(`SELECT COUNT(*) as total FROM products WHERE stock_quantity <= ? AND is_active = 1`, [threshold]);
        return rows[0].total;
    },

    async getLowStock(threshold = 5, limit = 10) {
        const [rows] = await db.query(
            `SELECT * FROM products WHERE stock_quantity <= ? AND is_active = 1 ORDER BY stock_quantity ASC LIMIT ?`,
            [threshold, limit]
        );
        return rows;
    }
};

module.exports = Product;
