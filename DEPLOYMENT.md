# FrameKraft — Hosting & Deployment Guide
## Secure, maintainable deployment with custom domain

### What we're using
| Component | Service | Cost |
|---|---|---|
| App hosting | Render.com (Web Service) | Free tier / $7/mo |
| Database | Render.com (MySQL) or PlanetScale | Free tier available |
| Image storage | Cloudinary | Free tier (25GB) |
| Domain | Namecheap or Porkbun | ~₹800-1000/yr for .com |
| SSL/HTTPS | Automatic via Render | Free |

---

## PHASE 1 — Prepare accounts (do this first, takes ~15 min)

### 1. Create a GitHub account
- Go to https://github.com and sign up
- Download GitHub Desktop from https://desktop.github.com (easier than command line)

### 2. Create a Render account
- Go to https://render.com and sign up (use GitHub login — it's easier)

### 3. Create a Cloudinary account
- Go to https://cloudinary.com and sign up (free)
- After login, go to Dashboard and copy:
  - Cloud Name
  - API Key
  - API Secret
- Save these — you'll need them later

### 4. Buy a domain
- Go to https://porkbun.com (cheapest) or https://www.namecheap.com
- Search for your desired domain (e.g. framekraft.in or framekraft.store)
- Buy it — .in domains are ~₹700/yr, .com ~₹900/yr

---

## PHASE 2 — Push your code to GitHub

### Step 1: Create a new repository on GitHub
- Go to https://github.com → click "New" (green button)
- Repository name: `framekraft-store`
- Set to **Private** (so your code isn't public)
- Do NOT initialize with README
- Click "Create repository"

### Step 2: Push your project using GitHub Desktop
1. Open GitHub Desktop → File → Add Local Repository
2. Navigate to your `framekraft-store` folder
3. Click "Publish repository" → select the repo you just created
4. Commit message: "Initial commit"
5. Click "Push origin"

### IMPORTANT: Make sure .gitignore is working
Before pushing, verify these files are NOT uploaded:
- `.env` (your secrets) ✓ ignored
- `node_modules/` ✓ ignored
- `uploads/` ✓ ignored
- `private-uploads/` ✓ ignored

---

## PHASE 3 — Set up Cloudinary

### Why you need this
Render's servers reset on every redeploy — any uploaded files (product images, avatars) disappear. Cloudinary stores files permanently in the cloud.

### Step 1: Note your Cloudinary credentials
From your Cloudinary dashboard:
```
Cloud Name:  dxxxxxxxxx
API Key:     123456789012345
API Secret:  abcdefghijklmnopqrstuvwxyz
```

### Step 2: Test locally first
In your local `.env` file add:
```
NODE_ENV=development   ← keep as development for local testing
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
Local dev still uses disk storage even with these set (since NODE_ENV=development).
Only when NODE_ENV=production does Cloudinary activate.

---

## PHASE 4 — Set up the database on Render

### Step 1: Create a MySQL database on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "MySQL"
3. Settings:
   - Name: `framekraft-db`
   - Database: `framekraft_db`
   - User: `framekraft_user`
   - Region: Singapore (closest to India)
   - Plan: Free (90-day trial) or Starter ($7/mo for permanent)
4. Click "Create Database"
5. Wait 2-3 minutes for it to spin up
6. Copy the **Internal Database URL** — looks like:
   `mysql://framekraft_user:password@hostname:3306/framekraft_db`

### Step 2: Import your schema into Render's MySQL
Render doesn't give you phpMyAdmin, so use a free tool called **TablePlus** or **DBeaver**:

1. Download TablePlus from https://tableplus.com (free version works)
2. Click "New Connection" → MySQL
3. Fill in the connection details from Render's database page:
   - Host: (from Render dashboard)
   - Port: 3306
   - User: framekraft_user
   - Password: (from Render dashboard)
   - Database: framekraft_db
4. Click "Connect"
5. Click "SQL" tab (top toolbar)
6. Open `database/schema.sql` from your project folder → copy all → paste → click "Run"
7. Open `database/seed.sql` → copy all → paste → click "Run"
8. Your database is ready

---

## PHASE 5 — Deploy to Render

### Step 1: Create a Web Service on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub account if not already connected
4. Select your `framekraft-store` repository
5. Settings:
   - **Name:** framekraft-store
   - **Region:** Singapore
   - **Branch:** main
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (for testing) or Starter ($7/mo for always-on)

### Step 2: Add Environment Variables (this is your .env for production)
In the Render web service settings → "Environment" tab, add each variable:

```
NODE_ENV                = production
DB_HOST                 = (hostname from Render MySQL dashboard)
DB_PORT                 = 3306
DB_USER                 = framekraft_user
DB_PASSWORD             = (password from Render MySQL dashboard)
DB_NAME                 = framekraft_db
SESSION_SECRET          = (generate: go to passwordsgenerator.net, 64-char random string)
ADMIN_EMAIL             = admin@framekraft.com
ADMIN_PASSWORD          = YourStrongAdminPassword@123
ADMIN_NAME              = Store Admin
CLOUDINARY_CLOUD_NAME   = (from Cloudinary dashboard)
CLOUDINARY_API_KEY      = (from Cloudinary dashboard)
CLOUDINARY_API_SECRET   = (from Cloudinary dashboard)
APP_URL                 = https://framekraft-store.onrender.com
```

### Step 3: Deploy
- Click "Create Web Service"
- Render will automatically:
  - Pull your code from GitHub
  - Run `npm install`
  - Run `npm start`
  - Assign a URL like `https://framekraft-store.onrender.com`
- Watch the "Logs" tab — you'll see "MySQL connected" and the server start message

### Step 4: Create the admin account
- Your deployed app is live but has no admin user yet
- Go to Render → your service → "Shell" tab
- Type: `npm run seed:admin`
- Press Enter — admin account created

### Step 5: Test your live site
- Open `https://framekraft-store.onrender.com`
- Register a customer account and test the full flow
- Login to admin at `https://framekraft-store.onrender.com/admin/login`
- Upload a product image — verify it appears (stored on Cloudinary)

---

## PHASE 6 — Connect your custom domain

### Step 1: Add domain to Render
1. Go to your Render web service → "Settings" → "Custom Domains"
2. Click "Add Custom Domain"
3. Type your domain: `www.framekraft.in`
4. Render will show you a CNAME record to add

### Step 2: Add DNS records in Namecheap/Porkbun
Go to your domain registrar → DNS Settings → Add records:

For Namecheap:
```
Type:   CNAME
Host:   www
Value:  (the CNAME value Render gave you, e.g. framekraft-store.onrender.com)
TTL:    Automatic
```

For root domain (framekraft.in without www):
```
Type:   A (or ALIAS/ANAME depending on registrar)
Host:   @
Value:  (Render's IP — shown in the custom domain panel)
```

### Step 3: Update APP_URL in Render environment variables
Change `APP_URL` from the `.onrender.com` URL to your custom domain:
```
APP_URL = https://www.framekraft.in
```

### Step 4: Wait for SSL certificate
- Render automatically provisions a free SSL (HTTPS) certificate via Let's Encrypt
- Takes 5-30 minutes after DNS propagates
- Once active, your site will be at `https://www.framekraft.in` with the padlock 🔒

### Step 5: Verify SSL is working
Go to https://www.ssllabs.com/ssltest/ → type your domain → should show A or A+ grade

---

## PHASE 7 — Ongoing maintenance

### Deploying updates (every time you change code)
1. Make changes locally
2. Open GitHub Desktop
3. Write a commit message (e.g. "Add new product category")
4. Click "Commit to main"
5. Click "Push origin"
6. Render automatically detects the push and redeploys — takes ~2 minutes
7. Zero downtime: Render builds the new version first, then switches over

### Monitoring
- **Logs:** Render dashboard → your service → "Logs" tab
- **Uptime:** Render dashboard shows uptime percentage
- **Database:** Use TablePlus to connect and view/manage data anytime

### Database backups
Render's paid MySQL plans include automatic daily backups.
For the free tier, do manual backups weekly:
1. Open TablePlus → connect to Render DB
2. File → Export → SQL → save to your computer

### Keeping dependencies updated
Every 1-2 months, run locally:
```bash
npm outdated          # see what's outdated
npm update            # update minor versions safely
```
Then push to GitHub — Render redeploys automatically.

---

## Summary: What each service does

```
User visits www.framekraft.in
       │
       ▼
  Namecheap DNS
  (routes .in domain → Render servers)
       │
       ▼
  Render Web Service
  (runs your Node.js/Express app, auto HTTPS)
       │
       ├──► Render MySQL
       │    (stores users, orders, products, sessions)
       │
       ├──► Cloudinary
       │    (stores product images, avatars, QR codes)
       │
       └──► /private-uploads/ (on Render disk)
            (payment proof screenshots — private, auth-gated)
```

---

## Costs breakdown (monthly)

| Service | Free tier | Paid (if you need it) |
|---|---|---|
| Render Web Service | Free (spins down after 15min inactivity) | $7/mo (always-on) |
| Render MySQL | Free (90 days) | $7/mo |
| Cloudinary | Free (25GB, 25k images) | $89/mo (you won't hit this) |
| Domain (.in) | — | ~₹60/mo (~₹700/yr) |

**For a personal store:** Free tier is fine for testing.
**When selling seriously:** $7+$7 = $14/mo (~₹1200/mo) for always-on hosting + DB.
