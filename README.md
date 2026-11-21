# ShopSphere

A full-stack e-commerce platform: premium storefront, customer account portal, and a separate admin dashboard, backed by a REST API, PostgreSQL (Prisma), Auth.js, Stripe and Cloudinary.

> **Status: read this first.** This codebase was written in an environment with no network access, so `npm install`, `next build`, `tsc`, `next lint` and the database-backed tests could **not** be run before delivery. What *was* verified is listed under [Verification status](#verification-status). Expect to spend a little time on first-run fixes (typing nits, a dependency version tweak). Run the [first-run checklist](#first-run-checklist) in order and treat any failure as a normal bug to fix.

## Features

**Storefront**: home (hero, promotions, categories, featured / new / best sellers / offers, testimonials, newsletter), shop with search, category / brand / price / rating filters, sorting and pagination, product pages (gallery, variants, stock state, quantity, add to cart, buy now, wishlist, reviews, related and recently viewed), server-side cart, checkout (shipping, billing, shipping method, coupon, Stripe or Cash on Delivery), product comparison, global search with suggestions, dark / light theme, mobile navigation, SEO metadata, Open Graph, JSON-LD, sitemap, robots, custom 404 / error pages, and policy, FAQ, about and contact pages.

**Customer portal** (`/account`): overview, profile, orders and tracking timeline, cancel eligible orders, printable invoices, wishlist, multiple addresses, reviews (verified purchasers only, moderated), password change, newsletter preference.

**Admin** (`/admin`): dashboard (KPIs, revenue chart, status breakdown, recent orders, best sellers, low stock), products (CRUD, images, variants, publish / feature, CSV bulk import), categories (with images), orders (search, filter, status machine, cancel, refund, tracking, invoice), customers (search, profile, history, activate / deactivate), inventory (adjustments, movement history, low-stock alerts), coupons, review moderation, website (promotions, featured, newsletter subscribers + CSV), reports (daily / monthly / annual revenue, top products, customer growth, CSV exports), activity log, admin creation, store settings (name, contact, currency, shipping, tax, alerts).

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn-style UI primitives (Radix Slot + CVA) · Lucide · Framer Motion · React Hook Form + Zod · Auth.js v5 (credentials, JWT sessions in HTTP-only cookies) · bcrypt · Prisma 5 · PostgreSQL · Stripe · Cloudinary · Nodemailer (SMTP) · Recharts · Vitest.

## Architecture

```
prisma/            schema.prisma, seed.ts (migrations are generated, see below)
src/
  app/
    (store)/       storefront + /account portal
    (auth)/        login, register, forgot / reset password, verify email
    admin/         admin dashboard (own layout)
    api/           REST route handlers (public, /account, /admin, /webhooks/stripe)
  actions/         server actions (login / logout)
  components/      ui/, store/, account/, admin/, auth/
  lib/             db, auth, authz, http (error → status mapping), rate-limit, stripe, cloudinary, email, tokens, audit, utils, money
  services/        business logic: checkout, inventory, orders, payments, cart, products, analytics, invoice, pricing
  validation/      Zod schemas (shared by client and server)
tests/             Vitest suites
```

Business rules live in `services/` (never in route handlers or components) so that they are testable and reusable by both REST routes and server components.

## Security model

- **Authorization is server-side and database-backed.** `lib/authz.ts` re-reads the user (role, `isActive`) from the database on every guarded request. A forged or stale JWT role claim is ignored; a deactivated or demoted user loses access immediately.
- **Admin protection in four layers**: middleware (coarse gate) → `requireAdmin()` in the admin layout *and in every admin page* (layouts do not re-run on client navigation) → `requireAdminApi()` as the first line of every `/api/admin/*` handler → ownership / role conditions in queries. Non-admins receive **404** on admin pages (existence not revealed), **401/403** on APIs.
- **No role field exists in any public schema.** Registration and profile updates strip unknown keys. Administrators are created only by the env-driven seed or by an existing admin (`POST /api/admin/users`).
- **Customer data**: every customer query puts `userId` from the *session* in the `where` clause (orders, cart items, addresses, invoices). Someone else's id yields 404.
- **Passwords**: bcrypt cost 12; policy enforced server-side; constant-time-ish unknown-user path; 5 failed logins → 15-minute lock; DB-backed rate limiting on login, register, forgot / reset, coupons, checkout, contact and newsletter (works on serverless).
- **Tokens**: email-verification and reset tokens are random 256-bit values; only the SHA-256 hash is stored; single use; expiry enforced. Verification is a POST on click so link scanners can't consume it. Responses don't reveal whether an email exists.
- **Money**: integer cents; prices, discounts, shipping and tax are always recomputed on the server from the database. Client totals are ignored.
- **Checkout consistency** (`services/checkout.ts`): a single transaction re-prices the cart, validates and atomically redeems the coupon, deducts stock using conditional updates (`stock >= qty`), writes the order, payment, inventory movements and coupon usage, and clears the cart. An `idempotencyKey` makes double submits safe.
- **Payments**: card data never touches the server (Stripe-hosted Checkout). The webhook verifies the signature on the raw body; `PENDING → PAID` and `PENDING → CONFIRMED` are guarded `updateMany` transitions, so duplicate deliveries are no-ops. Expired / failed sessions cancel the order and return stock and coupon. Refunds call Stripe with an idempotency key, then flip state transactionally.
- **Uploads**: type is verified from magic bytes (not the client MIME), 5 MB cap, JPEG / PNG / WebP only, uploaded to Cloudinary (never to local disk).
- **Other**: security headers, CSV formula-injection neutralisation, HTML-escaped emails and invoices (invoice served with a restrictive CSP), JSON-LD escaped, open-redirect-safe `callbackUrl`, secrets only via environment variables, audit log of admin actions.

## First-run checklist

Requirements: Node ≥ 18.18, a PostgreSQL database (local or Supabase).

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env             # fill in values (see below)
npx prisma migrate dev --name init   # creates AND commits the initial migration in prisma/migrations
npm run db:seed                  # creates the admin from SEED_ADMIN_* + demo catalogue
npm run typecheck                # fix any reported nits first
npm run lint
npm test
npm run build
npm run dev                      # http://localhost:3000
```

**Why `migrate dev` and not a shipped migration?** The Prisma CLI couldn't run where this was authored, so the SQL migration was not generated. `npx prisma migrate dev --name init` produces it from `schema.prisma`; commit the resulting `prisma/migrations` folder. In production use `npm run db:deploy`.

**Fonts**: `next/font/google` downloads Inter and Playfair Display at build time, so the first build needs internet access.

### Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public base URL (links in emails, Stripe redirects, sitemap) |
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL. On Supabase: pooled URL for `DATABASE_URL`, direct URL for `DIRECT_URL` |
| `AUTH_SECRET` | Session signing key: `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` behind proxies / Vercel |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (≥ 12 chars), `SEED_ADMIN_NAME` | Initial admin, used **only** by `db:seed` |
| `SEED_DEMO_DATA` | `true` also creates `customer@example.com` / `DemoCustomer123` (demo only; delete in production) |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe test-mode keys |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image uploads |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Transactional email |

**Without credentials**: with no SMTP, emails are logged to the server console in development (verification links can be copied from there). Without Stripe, the card option is disabled and Cash on Delivery works. Without Cloudinary, image upload returns a clear 503; everything else works and products show a placeholder.

### Admin setup

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env`, run `npm run db:seed`, sign in at `/login`, then open `/admin` (admins also get a shield icon in the header). Re-running the seed re-applies the admin role and password for that email. Further admins: **Admin → Activity log → Add administrator**.

### Stripe (test mode)

1. Put the test keys in `.env`.
2. `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`.
3. Pay with card `4242 4242 4242 4242`, any future expiry, any CVC.
4. In production, create a webhook endpoint for `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` and `payment_intent.payment_failed`.

Unpaid card orders hold stock for the 30-minute Stripe session; the `expired` event then cancels the order and releases stock and coupon.

## Testing

```bash
npm test                                   # unit + mocked route tests
TEST_DATABASE_URL=postgresql://… npm test  # also runs DB-backed checkout tests (DISPOSABLE database only!)
```

| Suite | Covers |
|---|---|
| `pricing` | coupon rules, totals, shipping thresholds, order state machine, customer-cancel rule |
| `schemas` | registration (role stripped), password policy, profile, product, coupon, checkout validation |
| `utils` | money, CSV escape / parse, slugs, order numbers, image magic-byte sniffing |
| `authz` | 401 / 403 / forged-role / deactivated user, page guards, ownership helper |
| `admin-routes` | **auto-discovers every `/api/admin/**` handler** and asserts anonymous → 401 and customer → 403 for every exported HTTP method, with the database untouched |
| `customer-ownership` | order / cart / address queries are scoped to the session user; foreign ids → 404 |
| `checkout.integration` | (needs DB) no overselling under concurrency, idempotent checkout, server-side pricing, atomic coupon redemption, cancel restores stock and coupon, double-cancel rejected |

Registration, login, logout, password-reset and product create / update flows are implemented and their *validation and authorization rules* are covered by the suites above, but there are **no end-to-end (browser) tests**. Adding Playwright for those flows is the natural next step.

## Verification status

Honest account of what was and wasn't done before delivery:

| Check | Result |
|---|---|
| Syntax parse of all 180 `.ts` / `.tsx` files | ✅ no errors |
| Every `@/` and relative import resolves; named imports exist; all npm imports declared in `package.json` | ✅ (static script) |
| `pricing` and `schemas` tests, executed against real Zod with a vitest stand-in | ✅ 22 / 22 assertions |
| `npm install`, `tsc`, `next lint`, `next build` | ❌ **not run** (no network) |
| Full Vitest run incl. `admin-routes`, `authz`, `customer-ownership`, `utils` | ❌ **not run** |
| `checkout.integration` (needs PostgreSQL) | ❌ **not run** |
| Prisma migration SQL | ❌ not generated (see checklist) |
| Live Stripe / Cloudinary / SMTP calls | ❌ not exercised (no credentials) |
| Visual QA in a browser, responsive layouts | ❌ not done |

## Known limitations / next steps

- Guests can browse but cart and checkout require an account (the cart is stored server-side per user).
- Demo products ship without images (placeholders are shown); upload real ones in Admin → Products → Edit.
- Homepage promotions are text cards; the banner `image` field exists in the schema but there is no banner image uploader.
- "Store logo" setting is stored in the schema (`logoUrl`) but has no upload control yet.
- Abandoned-cart tracking is implemented as a service (`findAbandonedCarts`) and `Cart.reminderSentAt`, but no scheduled job sends reminders. Wire it to a Vercel Cron route if wanted.
- "New order" notification email setting is stored but order-notification emails to the merchant are not sent.
- Policy pages contain template text. Have them reviewed for your jurisdiction.
- Variant stock and product stock are kept in sync by the services; adding a variant to a product that already has stock adds to the product total.
- No MFA, OAuth providers, or tax-by-region logic.

## Deployment (Vercel + Supabase)

1. Create a Supabase project; copy the pooled connection string to `DATABASE_URL` and the direct string to `DIRECT_URL`.
2. Run `npm run db:deploy` and `npm run db:seed` locally against it (or in CI) with those env vars.
3. Import the repo in Vercel; add every variable from the table above (set `NEXT_PUBLIC_APP_URL` to the production URL).
4. Add the Stripe webhook endpoint pointing to `https://<domain>/api/webhooks/stripe`.
5. Remove the demo customer and use a strong `SEED_ADMIN_PASSWORD`.

## API reference

JSON in / out. Errors: `{ "error": string, "details"?: … }` with 400 validation, 401 unauthenticated, 403 forbidden, 404 not found / not yours, 409 conflict (stock, state), 429 rate limited.

**Public**

| Method & path | Notes |
|---|---|
| `GET /api/products` | filters: `q, category, brand, minPrice, maxPrice, rating, sort, page` |
| `GET /api/products/by-ids?ids=a,b` | published products only |
| `GET /api/search?q=` | suggestions |
| `POST /api/newsletter` · `POST /api/contact` | rate limited |
| `POST /api/auth/register` · `verify-email` · `forgot-password` · `reset-password` | rate limited; no account enumeration |
| `POST /api/auth/[...nextauth]` | Auth.js handlers |
| `POST /api/webhooks/stripe` | signature-verified |

**Authenticated customer** (always scoped to the session user)

| Method & path | Notes |
|---|---|
| `GET/POST/PATCH /api/cart` | add `{productId, variantId?, quantity}`; update `{itemId, quantity}` (0 removes) |
| `POST /api/coupons/validate` | `{code}` → discount for current cart |
| `POST /api/checkout` | requires `idempotencyKey`; returns `{orderNumber, redirectUrl}` |
| `GET /api/orders` · `GET /api/orders/:id` · `DELETE /api/orders/:id` (cancel) · `GET /api/orders/:id/invoice` | own orders only |
| `GET/POST /api/wishlist` | POST toggles |
| `POST /api/reviews` | purchasers only, one per product, moderated |
| `GET/PATCH /api/account/profile` · `POST /api/account/password` · `GET/POST/DELETE /api/account/addresses` | |

**Admin** (every handler calls `requireAdminApi()` first)

`/api/admin/products` (GET, POST) · `/products/:id` (GET, PUT, PATCH toggles, DELETE) · `/products/:id/images` (POST multipart, DELETE) · `/products/:id/variants` (POST, DELETE) · `/products/import` (POST CSV: `name,sku,description,brand,price,salePrice,stock,category,isPublished`) · `/categories` (GET, POST multipart) · `/categories/:id` (PUT, DELETE) · `/orders` (GET `?q&status`) · `/orders/:id` (GET, PATCH status) · `/customers` (GET) · `/customers/:id` (GET, PATCH activate) · `/users` (POST create admin) · `/inventory` (GET, POST adjust) · `/coupons` (GET, POST) · `/coupons/:id` (PATCH, DELETE) · `/reviews/:id` (PATCH, DELETE) · `/settings` (GET, PUT) · `/banners` (GET, POST, DELETE) · `/newsletter/export` (CSV) · `/reports/export?type=orders|revenue-daily|revenue-monthly|revenue-yearly|top-products|customer-growth|inventory` (CSV)

## Screenshots

_Add screenshots here after your first run:_ `docs/home.png`, `docs/shop.png`, `docs/product.png`, `docs/admin-dashboard.png`.

## License

Choose a license before publishing (MIT is common for portfolio projects).
