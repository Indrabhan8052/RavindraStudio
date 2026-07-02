-- ============================================================
-- FrameKraft Seed Data
-- Run AFTER schema.sql
-- ============================================================
USE framekraft_db;

-- ------------------------------------------------------------
-- NOTE on Admin account:
-- Do NOT insert the admin user here with a plain/fake password hash.
-- After running this seed file, create the admin account by running:
--     npm run seed:admin
-- This properly bcrypt-hashes the password defined in your .env file
-- (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME). See README "First-Time Setup".
-- ------------------------------------------------------------
-- Categories = Frame Shapes
-- ------------------------------------------------------------
INSERT INTO categories (name, slug, description, icon_shape, image, display_order) VALUES
('Square Frames', 'square-frames', 'Classic square photo frames, perfect for portraits and instant prints.', 'square', '/images/categories/square.jpg', 1),
('Circle Frames', 'circle-frames', 'Elegant round frames that add a soft, modern touch to any wall.', 'circle', '/images/categories/circle.jpg', 2),
('Heart Frames', 'heart-frames', 'Romantic heart-shaped frames, ideal for couples and special memories.', 'heart', '/images/categories/heart.jpg', 3),
('Oval Frames', 'oval-frames', 'Timeless oval frames with a vintage, classic appeal.', 'oval', '/images/categories/oval.jpg', 4),
('Collage Frames', 'collage-frames', 'Multi-photo collage frames to display several memories together.', 'collage', '/images/categories/collage.jpg', 5),
('Polaroid Style', 'polaroid-frames', 'Retro polaroid-style frames for a nostalgic instant-camera look.', 'polaroid', '/images/categories/polaroid.jpg', 6),
('Hexagon Frames', 'hexagon-frames', 'Trendy geometric hexagon frames for a contemporary gallery wall.', 'hexagon', '/images/categories/hexagon.jpg', 7),
('Rectangle Frames', 'rectangle-frames', 'Versatile rectangular frames for landscape or portrait photos.', 'rectangle', '/images/categories/rectangle.jpg', 8);

-- ------------------------------------------------------------
-- Sample Products
-- ------------------------------------------------------------
INSERT INTO products (category_id, name, slug, description, material, size, color, price, discount_price, stock_quantity, sku, is_featured) VALUES
(1, 'Classic Wooden Square Frame', 'classic-wooden-square-frame', 'A timeless square frame crafted from solid wood with a smooth matte finish. Great for desk or wall display.', 'Wood', '8x8 inch', 'Brown', 499.00, 399.00, 50, 'SQ-WD-001', 1),
(1, 'Minimalist Black Square Frame', 'minimalist-black-square-frame', 'Sleek black square frame with a slim border, perfect for modern interiors.', 'Acrylic', '6x6 inch', 'Black', 349.00, NULL, 40, 'SQ-AC-002', 0),
(2, 'Golden Circle Frame', 'golden-circle-frame', 'A statement circular frame finished in antique gold, designed to catch the eye on any wall.', 'Metal', '10 inch dia', 'Gold', 699.00, 599.00, 30, 'CR-MT-001', 1),
(2, 'Rose Wood Circle Frame', 'rose-wood-circle-frame', 'Soft rounded wooden frame with a warm rosewood tone.', 'Wood', '8 inch dia', 'Rosewood', 549.00, NULL, 25, 'CR-WD-002', 0),
(3, 'Romantic Heart Frame - Couple Edition', 'romantic-heart-frame-couple', 'A heart-shaped frame designed for couples, perfect for anniversaries and valentines gifts.', 'Wood', '7x7 inch', 'Red', 599.00, 499.00, 35, 'HT-WD-001', 1),
(3, 'Rustic Heart Frame', 'rustic-heart-frame', 'Distressed wooden heart frame with a rustic, hand-finished look.', 'Wood', '6x6 inch', 'Natural', 449.00, NULL, 20, 'HT-WD-002', 0),
(4, 'Vintage Oval Frame', 'vintage-oval-frame', 'An ornately detailed oval frame inspired by vintage portrait studios.', 'Metal', '8x10 inch', 'Antique Bronze', 749.00, 649.00, 18, 'OV-MT-001', 1),
(5, 'Memory Wall Collage Frame (12 Photos)', 'memory-wall-collage-12', 'Display 12 of your favorite memories together in this elegant collage frame set.', 'Wood', 'Mixed sizes', 'White', 1299.00, 1099.00, 15, 'CL-WD-001', 1),
(6, 'Retro Polaroid Frame Set (Pack of 5)', 'retro-polaroid-frame-set', 'A nostalgic set of 5 mini polaroid-style frames for instant photo displays.', 'PVC', '4x6 inch each', 'White', 399.00, NULL, 60, 'PL-PV-001', 0),
(7, 'Modern Hexagon Frame', 'modern-hexagon-frame', 'Geometric hexagon-shaped frame for a contemporary gallery wall arrangement.', 'Wood', '8x9 inch', 'Walnut', 649.00, 549.00, 22, 'HX-WD-001', 1),
(8, 'Panoramic Rectangle Frame', 'panoramic-rectangle-frame', 'Wide rectangular frame ideal for landscape and panoramic photography.', 'Wood', '12x18 inch', 'Black', 899.00, NULL, 28, 'RC-WD-001', 0),
(8, 'Family Rectangle Frame', 'family-rectangle-frame', 'A generously sized rectangle frame perfect for family portraits.', 'Acrylic', '11x14 inch', 'Clear', 549.00, 479.00, 33, 'RC-AC-002', 0);

-- ------------------------------------------------------------
-- Default site settings
-- ------------------------------------------------------------
INSERT INTO settings (setting_key, setting_value) VALUES
('site_name', 'FrameKraft'),
('site_tagline', 'Frame Every Memory, Beautifully'),
('shipping_fee', '49'),
('free_shipping_above', '999'),
('contact_email', 'support@framekraft.com'),
('contact_phone', '+91 98765 43210'),
('currency_symbol', '₹'),
('upi_id', 'yourname@upi'),
('upi_payee_name', 'FrameKraft Store'),
('upi_qr_image', '');
