// config/cloudinary.js
// Dev  → isProduction = false → local disk storage used in upload.js
// Prod → isProduction = true  → Cloudinary used in upload.js
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

let cloudinary = null;

if (isProduction) {
    // cloudinary v1 syntax
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure:     true
    });
    console.log('✅ Cloudinary configured for production.');
} else {
    console.log('ℹ️  Dev mode: using local disk for uploads.');
}

module.exports = { cloudinary, isProduction };
