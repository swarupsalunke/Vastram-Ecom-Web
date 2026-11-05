# Vastram — MERN Clothes E-commerce PWA

A runnable starter MVP for a clothing store with two roles: Customer and Admin.
Includes product/category management, gender/category/size/color/price filters, cart, orders,
order cancellation, admin order status updates, customer delivery messages, coupons, basic reports,
MongoDB persistence, JWT authentication, and optional Razorpay test-mode integration.

## Requirements
- Node.js 20+ recommended
- MongoDB Atlas account or local MongoDB
- Razorpay account only if testing online payments

## 1. Configure backend
1. Open `server/`.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL`.
4. For Razorpay, add test keys from your Razorpay dashboard. Without keys, Cash on Delivery works and online checkout reports that gateway configuration is missing.

## 2. Configure frontend
1. Open `client/`.
2. Copy `.env.example` to `.env`.
3. Set `VITE_API_URL=http://localhost:5000/api`.

## 3. Install and run
Open two terminals:

Terminal 1:
```bash
cd server
npm install
npm run dev
```

Terminal 2:
```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally http://localhost:5173).

## 4. Seed default Men/Women categories
Run from `server/` after MongoDB is configured:
```bash
npm run seed-categories
```
This creates the starter categories without duplicating existing ones. You can manage them later from Admin → Categories.

## 5. Create the first Admin
Public registration always creates a `customer`. Do not allow public users to choose the Admin role.

With the backend running, run this from `server/` in a separate terminal:
```bash
npm run create-admin
```
Follow the prompts. The admin account is created or promoted only by this local setup script.

## 6. Razorpay test payments
Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `server/.env`, then restart the server.
Set `VITE_RAZORPAY_KEY_ID` in `client/.env` to the same test Key ID.
Use Razorpay test mode and its test payment methods. Do not use live keys until your account is approved and the whole flow has been tested.
The backend verifies checkout signatures and has a webhook endpoint at `/api/payments/webhook`. Configure the webhook secret in `RAZORPAY_WEBHOOK_SECRET` if using webhooks.

## Included functionality
- Customer registration/login and role-based routing
- Admin-only API protection
- Product CRUD with gender, category, sizes, per-size stock, colors, price and images URL
- Category CRUD
- Product filtering by gender, category, size, color, price and availability
- MongoDB-persisted customer cart and checkout
- Cash on Delivery
- Razorpay online checkout (requires credentials)
- Customer order history and cancellation while order is eligible
- Admin order listing and status updates
- Admin customer list
- Delivery update messages managed by admin and shown to customers
- Coupon CRUD (basic fixed/percentage discounts; validation is intentionally MVP-level)
- Dashboard summary
- Basic settings/profile page
- PWA manifest, installability and basic static asset caching

## Important production notes
This is an MVP starter, not a fully audited production store. Before accepting real orders/payments:
- Add email/SMS delivery and order notifications if required. Current delivery messages are stored in-app.
- Configure and test Razorpay webhooks in the live environment.
- Add rate limiting, stronger validation, logging/monitoring, backup policies, image upload storage (currently image URLs), privacy/terms/return policy, and deployment environment variables.
- Configure CORS to your deployed frontend URL.
- Payment records and historical orders are intentionally not hard-deleted. Product/category removal is protected when historical references exist.
- Use HTTPS in production. Never commit `.env` files or live secrets.
