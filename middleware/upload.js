// middleware/upload.js
// Dev  → local disk storage (uploads/ folder on your PC)
// Prod → Cloudinary (except payment proofs — always private local disk)

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { isProduction, cloudinary } = require('../config/cloudinary');

// ── Private directory (never served statically, never on Cloudinary) ─────────
const privateDir      = path.join(__dirname, '..', 'private-uploads');
const paymentProofDir = path.join(privateDir, 'payment-proofs');

// ── Local public directories ──────────────────────────────────────────────────
const productDir  = path.join(__dirname, '..', 'uploads', 'products');
const avatarDir   = path.join(__dirname, '..', 'uploads', 'avatars');
const categoryDir = path.join(__dirname, '..', 'uploads', 'categories');
const settingsDir = path.join(__dirname, '..', 'uploads', 'settings');

// Create all directories if they don't exist
[productDir, avatarDir, categoryDir, settingsDir, paymentProofDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── File type filter ──────────────────────────────────────────────────────────
const imageFileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const validExt  = allowed.test(path.extname(file.originalname).toLowerCase());
    const validMime = allowed.test(file.mimetype);
    if (validExt && validMime) return cb(null, true);
    cb(new Error('Only image files (jpg, jpeg, png, webp, gif) are allowed.'));
};

// ── Local disk storage ────────────────────────────────────────────────────────
const localStorageFor = (destFolder) => multer.diskStorage({
    destination: (req, file, cb) => cb(null, destFolder),
    filename:    (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext    = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${unique}${ext}`);
    }
});

// ── Cloudinary storage (production only) ─────────────────────────────────────
const cloudinaryStorageFor = (folderName) => {
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    return new CloudinaryStorage({
        cloudinary,
        params: {
            folder:          `framekraft/${folderName}`,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            transformation:  [{ quality: 'auto', fetch_format: 'auto' }]
        }
    });
};

// ── Auto-switch uploader factory ──────────────────────────────────────────────
const makeUploader = (localDir, cloudinaryFolder, maxBytes) => {
    const storage = isProduction
        ? cloudinaryStorageFor(cloudinaryFolder)
        : localStorageFor(localDir);
    return multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: maxBytes } });
};

// ── Public uploaders (auto-switch dev ↔ prod) ─────────────────────────────────
const uploadProductImages = makeUploader(productDir,  'products',   5 * 1024 * 1024);
const uploadAvatar        = makeUploader(avatarDir,   'avatars',    2 * 1024 * 1024);
const uploadCategoryImage = makeUploader(categoryDir, 'categories', 3 * 1024 * 1024);
const uploadSettingsImage = makeUploader(settingsDir, 'settings',   3 * 1024 * 1024);

// ── Private uploader (ALWAYS local, NEVER Cloudinary) ────────────────────────
// Payment screenshots have sensitive data — served only via
// authenticated route /secure/payment-proof/:orderId
const uploadPaymentProof = multer({
    storage:    localStorageFor(paymentProofDir),
    fileFilter: imageFileFilter,
    limits:     { fileSize: 8 * 1024 * 1024 }
});

module.exports = {
    uploadProductImages,
    uploadAvatar,
    uploadCategoryImage,
    uploadSettingsImage,
    uploadPaymentProof,
    paymentProofDir
};
