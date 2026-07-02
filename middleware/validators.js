// middleware/validators.js
const { body, validationResult } = require('express-validator');

// Generic handler: collects express-validator errors and re-renders the same form with messages
function handleValidation(viewPath, extraLocals = {}) {
    return (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).render(viewPath, {
                errors: errors.array(),
                oldInput: req.body,
                ...extraLocals
            });
        }
        next();
    };
}

const registerValidationRules = [
    body('full_name')
        .trim()
        .notEmpty().withMessage('Full name is required.')
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters.')
        .matches(/^[a-zA-Z\s.'-]+$/).withMessage('Full name can only contain letters and spaces.'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required.')
        .isEmail().withMessage('Please enter a valid email address.')
        .normalizeEmail(),

    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required.')
        .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit Indian phone number.'),

    body('password')
        .notEmpty().withMessage('Password is required.')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
        .matches(/[0-9]/).withMessage('Password must contain at least one number.'),

    body('confirm_password')
        .notEmpty().withMessage('Please confirm your password.')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match.');
            }
            return true;
        }),

    body('terms')
        .notEmpty().withMessage('You must agree to the Terms & Conditions to register.')
];

const loginValidationRules = [
    body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Please enter a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.')
];

const addressValidationRules = [
    body('full_name').trim().notEmpty().withMessage('Full name is required.'),
    body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit phone number.'),
    body('address_line1').trim().notEmpty().withMessage('Address line 1 is required.'),
    body('city').trim().notEmpty().withMessage('City is required.'),
    body('state').trim().notEmpty().withMessage('State is required.'),
    body('pincode').trim().matches(/^\d{6}$/).withMessage('Please enter a valid 6-digit pincode.')
];

const productValidationRules = [
    body('name').trim().notEmpty().withMessage('Product name is required.').isLength({ min: 3, max: 150 }).withMessage('Name must be between 3-150 characters.'),
    body('category_id').notEmpty().withMessage('Please select a category.').isInt().withMessage('Invalid category.'),
    body('price').notEmpty().withMessage('Price is required.').isFloat({ min: 1 }).withMessage('Price must be a positive number.'),
    body('discount_price').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Discount price must be a positive number.')
        .custom((value, { req }) => {
            if (value && Number(value) >= Number(req.body.price)) {
                throw new Error('Discount price must be less than the regular price.');
            }
            return true;
        }),
    body('stock_quantity').notEmpty().withMessage('Stock quantity is required.').isInt({ min: 0 }).withMessage('Stock must be 0 or more.')
];

const categoryValidationRules = [
    body('name').trim().notEmpty().withMessage('Category name is required.').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters.'),
    body('icon_shape').notEmpty().withMessage('Please select a shape icon.')
];

const contactValidationRules = [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
    body('message').trim().notEmpty().withMessage('Message cannot be empty.').isLength({ min: 10 }).withMessage('Message should be at least 10 characters.')
];

const reviewValidationRules = [
    body('rating').notEmpty().withMessage('Please select a rating.').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
    body('comment').optional({ checkFalsy: true }).isLength({ max: 1000 }).withMessage('Review is too long (max 1000 characters).')
];

module.exports = {
    handleValidation,
    registerValidationRules,
    loginValidationRules,
    addressValidationRules,
    productValidationRules,
    categoryValidationRules,
    contactValidationRules,
    reviewValidationRules
};
