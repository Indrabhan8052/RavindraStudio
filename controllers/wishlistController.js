// controllers/wishlistController.js
const Wishlist = require('../models/Wishlist');

const wishlistController = {
    async viewWishlist(req, res) {
        try {
            const items = await Wishlist.getItems(req.session.user.id);
            res.render('shop/wishlist', { items });
        } catch (err) {
            console.error('Wishlist view error:', err);
            res.status(500).render('shop/error', { message: 'Unable to load your wishlist right now.' });
        }
    },

    async toggle(req, res) {
        try {
            const { product_id } = req.body;
            const added = await Wishlist.toggle(req.session.user.id, product_id);
            req.flash('success', added ? 'Added to wishlist.' : 'Removed from wishlist.');
            res.redirect(req.body.redirectTo || 'back');
        } catch (err) {
            console.error('Wishlist toggle error:', err);
            req.flash('error', 'Unable to update wishlist.');
            res.redirect('back');
        }
    },

    async remove(req, res) {
        try {
            await Wishlist.remove(req.session.user.id, req.params.productId);
            req.flash('success', 'Removed from wishlist.');
            res.redirect('/wishlist');
        } catch (err) {
            console.error('Wishlist remove error:', err);
            res.redirect('/wishlist');
        }
    }
};

module.exports = wishlistController;
