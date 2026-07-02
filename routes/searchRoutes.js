// routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// GET /api/search/autocomplete?q=circle  → JSON for live dropdown
router.get('/api/search/autocomplete', searchController.autocomplete);

// GET /search?q=heart+frame              → Full search results page
router.get('/search', searchController.results);

module.exports = router;
