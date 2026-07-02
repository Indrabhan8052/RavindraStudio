// controllers/cartController.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Settings = require('../models/Settings');

const cartController = {
    async viewCart(req, res) {
        try {
            const items = await Cart.getItems(req.session.user.id);
            const subtotal = items.reduce((sum, item) => sum + (Number(item.discount_price || item.price) * item.quantity), 0);
            const shippingFee = Number(await Settings.get('shipping_fee', 49));
            const freeShippingAbove = Number(await Settings.get('free_shipping_above', 999));
            const finalShipping = subtotal >= freeShippingAbove ? 0 : shippingFee;
            const total = subtotal + finalShipping;

            res.render('shop/cart', { items, subtotal, shippingFee: finalShipping, total, freeShippingAbove });
        } catch (err) {
            console.error('Cart view error:', err);
            res.status(500).render('shop/error', { message: 'Unable to load your cart right now.' });
        }
    },

    async addToCart(req, res) {
        try {
            const { product_id, quantity = 1 } = req.body;
            const product = await Product.findById(product_id);

            if (!product || !product.is_active) {
                req.flash('error', 'This product is currently unavailable.');
                return res.redirect('back');
            }
            if (product.stock_quantity < quantity) {
                req.flash('error', `Sorry, only ${product.stock_quantity} item(s) left in stock.`);
                return res.redirect('back');
            }

            await Cart.addItem(req.session.user.id, product_id, parseInt(quantity));
            req.flash('success', `${product.name} added to your cart.`);
            res.redirect(req.body.redirectTo || '/cart');
        } catch (err) {
            console.error('Add to cart error:', err);
            req.flash('error', 'Unable to add item to cart right now.');
            res.redirect('back');
        }
    },

    async updateQuantity(req, res) {
        try {
            const { product_id, quantity } = req.body;
            const qty = parseInt(quantity);

            if (qty > 0) {
                const product = await Product.findById(product_id);
                if (product && qty > product.stock_quantity) {
                    req.flash('error', `Only ${product.stock_quantity} item(s) available in stock.`);
                    return res.redirect('/cart');
                }
            }

            await Cart.updateQuantity(req.session.user.id, product_id, qty);
            res.redirect('/cart');
        } catch (err) {
            console.error('Update quantity error:', err);
            req.flash('error', 'Unable to update cart.');
            res.redirect('/cart');
        }
    },

    async removeItem(req, res) {
        try {
            await Cart.removeItem(req.session.user.id, req.params.productId);
            req.flash('success', 'Item removed from cart.');
            res.redirect('/cart');
        } catch (err) {
            console.error('Remove from cart error:', err);
            req.flash('error', 'Unable to remove item.');
            res.redirect('/cart');
        }
    }
};

module.exports = cartController;
