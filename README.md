# 🖼️ RavindraStudio — Personal Photo Frame E-Commerce Store

A full-featured personal online store for selling photo frames, built with **Node.js + Express + MySQL + EJS**.  
Flipkart/Meesho style storefront with a full admin panel — built to run locally on XAMPP.

---

## ✅ Features

### Storefront (Customer-facing)
- **8 frame shape categories** — Square, Circle, Heart, Oval, Collage, Polaroid, Hexagon, Rectangle
- Product catalog with filtering by shape, price, and sorting
- Product detail pages with image gallery, specs, reviews
- Shape-based image display (product photos cropped into the frame's actual shape)
- Shopping cart with quantity control
- Wishlist
- Checkout with delivery address selection, COD / UPI payment
- Coupon/discount code support
- Order confirmation and order tracking timeline
- Customer review system (verified buyers only)

### User Account
- Register with full validation (name, email, phone, password strength, terms)
- Login / logout with session persistence
- Profile management with avatar upload
- Password change
- Address book (add, set default, delete)
- Order history with status and cancellation

### Admin Panel (`/admin/`)
- Dark sidebar layout with section navigation
- Dashboard with revenue stats, recent orders, top products, monthly sales
- Product management (create, edit, toggle active, delete, image upload with up to 6 photos per product)
- Category management (frame shapes, display order, shape icon)
- Order management with status updates (placed → confirmed → packed → shipped → delivered) and notes
- Customer list with activate/deactivate
- Coupon management (percent or flat, min order, max uses, expiry)
- Reviews moderation
- Contact message inbox
- Site settings (store name, shipping fee, free shipping threshold)

---

## 🚀 First-Time Setup (XAMPP / local)

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [XAMPP](https://www.apachefriends.org/) with **MySQL running**
- A terminal / command prompt

### Step 1: Start XAMPP MySQL
Open the XAMPP Control Panel and click **Start** next to MySQL.

### Step 2: Create the database
Open **phpMyAdmin** (http://localhost/phpmyadmin), then run the two SQL files in order:

1. Open the SQL tab → paste and run `database/schema.sql`
2. Paste and run `database/seed.sql`

Or use the terminal (if `mysql` is in PATH):
```bash
mysql -u root < database/schema.sql
mysql -u root < database/seed.sql
```

### Step 3: Configure environment
```bash
cp .env.example .env
```
Edit `.env` — for a default XAMPP install the only thing to change is `SESSION_SECRET`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=        # leave blank for default XAMPP
DB_NAME=framekraft_db
SESSION_SECRET=anything_long_and_random_here
```

### Step 4: Install Node dependencies
```bash
npm install
```

### Step 5: Create the admin account
```bash
npm run seed:admin
```
This creates (or resets) the admin account with bcrypt-hashed password:  
**Email:** `admin@framekraft.com`  
**Password:** `Admin@123`  
*(Change these in .env before running if you want different credentials)*

### Step 6: Start the server
```bash
npm run dev       # Development (auto-restart on changes) — requires nodemon
# or
npm start         # Production-style
```

### Step 7: Open in browser
| URL | Purpose |
|---|---|
| http://localhost:3000 | Customer storefront |
| http://localhost:3000/admin/login | Admin panel login |
| http://localhost:3000/register | Customer registration |

---

## 📁 Project Structure

```
photoframe-store/
├── config/
│   ├── db.js              # MySQL connection pool
│   └── session.js         # Session middleware (MySQL-backed)
├── controllers/
│   ├── authController.js
│   ├── shopController.js
│   ├── cartController.js
│   ├── wishlistController.js
│   ├── orderController.js
│   ├── userController.js
│   └── admin/
│       ├── dashboardController.js
│       ├── productController.js
│       ├── categoryController.js
│       ├── orderController.js
│       ├── userController.js
│       ├── couponController.js
│       └── settingsController.js
├── database/
│   ├── schema.sql          # All table definitions
│   └── seed.sql            # Sample categories + products
├── middleware/
│   ├── auth.js             # isAuthenticated, isAdmin, isGuest
│   ├── upload.js           # Multer image upload config
│   └── validators.js       # express-validator rules
├── models/
│   ├── User.js
│   ├── Address.js
│   ├── Category.js
│   ├── Product.js
│   ├── Cart.js
│   ├── Wishlist.js
│   ├── Order.js
│   ├── Review.js
│   ├── Coupon.js
│   ├── Settings.js
│   └── Contact.js
├── public/
│   ├── css/
│   │   ├── main.css        # Storefront styles
│   │   └── admin.css       # Admin panel styles
│   ├── js/
│   │   ├── main.js         # Storefront JS
│   │   └── admin.js        # Admin JS
│   └── images/
│       └── placeholder-frame.svg
├── routes/
│   ├── authRoutes.js
│   ├── shopRoutes.js
│   ├── cartRoutes.js
│   ├── wishlistRoutes.js
│   ├── orderRoutes.js
│   ├── userRoutes.js
│   └── adminRoutes.js
├── scripts/
│   └── seedAdmin.js        # Admin account setup script
├── uploads/                # Auto-created on first upload
│   ├── products/
│   ├── avatars/
│   └── categories/
├── views/
│   ├── partials/
│   │   ├── layout.ejs
│   │   ├── header.ejs
│   │   ├── footer.ejs
│   │   ├── product-card.ejs
│   │   └── shape-image.ejs
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   ├── shop/
│   │   ├── home.ejs
│   │   ├── products.ejs
│   │   ├── product-detail.ejs
│   │   ├── cart.ejs
│   │   ├── checkout.ejs
│   │   ├── order-confirmation.ejs
│   │   ├── wishlist.ejs
│   │   ├── contact.ejs
│   │   ├── about.ejs
│   │   └── error.ejs
│   ├── user/
│   │   ├── profile.ejs
│   │   ├── orders.ejs
│   │   └── order-detail.ejs
│   └── admin/
│       ├── layout.ejs
│       ├── login.ejs
│       ├── dashboard.ejs
│       ├── settings.ejs
│       ├── messages.ejs
│       ├── reviews.ejs
│       ├── error.ejs
│       ├── products/
│       │   ├── list.ejs
│       │   └── form.ejs
│       ├── categories/
│       │   ├── list.ejs
│       │   └── form.ejs
│       ├── orders/
│       │   ├── list.ejs
│       │   └── detail.ejs
│       ├── users/
│       │   └── list.ejs
│       └── coupons/
│           └── list.ejs
├── server.js
├── package.json
└── .env.example
```

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `users` | Customers + admin (role column) |
| `addresses` | Saved delivery addresses per user |
| `categories` | Frame shape categories (Square, Circle, Heart…) |
| `products` | Frame products with pricing, stock, specs |
| `product_images` | Multiple images per product |
| `cart_items` | Persistent cart (per user) |
| `wishlist_items` | Saved products |
| `orders` | Customer orders |
| `order_items` | Line items (snapshot at order time) |
| `order_status_history` | Full audit trail of status changes |
| `reviews` | Product reviews (verified buyers only) |
| `coupons` | Discount codes (percent or flat) |
| `contact_messages` | Customer enquiries |
| `settings` | Admin-editable store config |
| `sessions` | Auto-created by express-mysql-session |

---

## 💡 Tips

- **Adding a product image:** Go to Admin → Products → Edit product → upload up to 6 images. The first image uploaded is the primary display image.
- **Testing checkout:** Register a customer account, browse products, add to cart, then checkout. Use any 6-digit pincode.
- **Resetting admin password:** Edit `.env` `ADMIN_PASSWORD` and re-run `npm run seed:admin`.
- **Product stock management:** Edit a product to update stock. Products with 0 stock show "Out of Stock" and cannot be added to cart.
