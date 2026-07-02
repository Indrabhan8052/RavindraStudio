// controllers/searchController.js
// Two endpoints:
//   GET /api/search/autocomplete?q=...  → JSON (for live dropdown)
//   GET /search?q=...                   → Full search results page

const db = require('../config/db');

const searchController = {

    // ─── Live autocomplete endpoint (called via fetch as user types) ──────────
    // Returns up to 8 matching products + categories as JSON
    async autocomplete(req, res) {
        try {
            const q = (req.query.q || '').trim();

            // Don't search on very short queries — avoids DB spam
            if (q.length < 2) {
                return res.json({ products: [], categories: [] });
            }

            const term = `%${q}%`;

            // Products matching name or material
            const [products] = await db.query(`
                SELECT
                    p.id,
                    p.name,
                    p.slug,
                    COALESCE(p.discount_price, p.price) AS effective_price,
                    p.stock_quantity,
                    c.name AS category_name,
                    c.icon_shape,
                    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
                FROM products p
                JOIN categories c ON c.id = p.category_id
                WHERE p.is_active = 1
                  AND (p.name LIKE ? OR p.material LIKE ? OR c.name LIKE ?)
                ORDER BY
                    CASE WHEN p.name LIKE ? THEN 0 ELSE 1 END,
                    p.is_featured DESC,
                    p.rating_avg DESC
                LIMIT 8
            `, [term, term, term, `${q}%`]);

            // Categories matching name
            const [categories] = await db.query(`
                SELECT id, name, slug, icon_shape
                FROM categories
                WHERE is_active = 1 AND name LIKE ?
                LIMIT 4
            `, [term]);

            res.json({ products, categories });

        } catch (err) {
            console.error('Autocomplete search error:', err);
            res.status(500).json({ products: [], categories: [], error: 'Search unavailable' });
        }
    },

    // ─── Full search results page ─────────────────────────────────────────────
    async results(req, res) {
        try {
            const q = (req.query.q || '').trim();
            const sort = req.query.sort || 'relevance';
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = 12;
            const offset = (page - 1) * limit;

            if (!q) return res.redirect('/products');

            const term = `%${q}%`;

            // Sort options
            const sortMap = {
                relevance: 'CASE WHEN p.name LIKE ? THEN 0 ELSE 1 END ASC, p.rating_avg DESC',
                newest: 'p.created_at DESC',
                price_low: 'effective_price ASC',
                price_high: 'effective_price DESC',
                rating: 'p.rating_avg DESC'
            };
            const orderClause = sortMap[sort] || sortMap.relevance;

            // Extra bind param needed for relevance sort
            const relevanceParam = sort === 'relevance' ? [`${q}%`] : [];

            const [products] = await db.query(`
                SELECT
                    p.*,
                    COALESCE(p.discount_price, p.price) AS effective_price,
                    c.name AS category_name,
                    c.slug AS category_slug,
                    c.icon_shape,
                    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
                    MATCH(p.name, p.description) AGAINST(? IN NATURAL LANGUAGE MODE) AS relevance_score
                FROM products p
                JOIN categories c ON c.id = p.category_id
                WHERE p.is_active = 1
                  AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ? OR p.material LIKE ?)
                ORDER BY ${orderClause}
                LIMIT ? OFFSET ?
            `, [q, term, term, term, term, ...relevanceParam, Number(limit), Number(offset)]);

            const [[{ total }]] = await db.query(`
                SELECT COUNT(*) AS total
                FROM products p
                JOIN categories c ON c.id = p.category_id
                WHERE p.is_active = 1
                  AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ? OR p.material LIKE ?)
            `, [term, term, term, term]);

            const totalPages = Math.ceil(total / limit);

            // Related category suggestions
            const [suggestedCategories] = await db.query(`
                SELECT DISTINCT c.name, c.slug, c.icon_shape
                FROM products p
                JOIN categories c ON c.id = p.category_id
                WHERE p.is_active = 1
                  AND (p.name LIKE ? OR c.name LIKE ?)
                LIMIT 4
            `, [term, term]);

            res.render('shop/search', {
                pageTitle: `Search: "${q}"`,
                q, sort, products, total, totalPages,
                currentPage: page, suggestedCategories,
                query: req.query
            });

        } catch (err) {
            console.error('Search results error:', err);
            res.status(500).render('shop/error', { message: 'Search is unavailable right now.' });
        }
    }
};

module.exports = searchController;
