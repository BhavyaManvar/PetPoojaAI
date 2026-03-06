# FRONTEND-CHANGES.md

## Overview

The PetPoojaAI frontend has been restructured into a **dual-frontend architecture**:

| Frontend | Stack | Port | Audience |
|---|---|---|---|
| **customer-website/** | Vite 6 + React 19 + Tailwind 3.4 | `5173` | End customers (ordering food) |
| **frontend/** | Next.js 15 + React 19 + Tailwind | `3000/3001` | Restaurant owners / staff (admin dashboard) |

Both frontends share the same FastAPI backend on port `8000`.

---

## New: `customer-website/` (Vite + React)

A brand-new customer-facing ordering app with Zomato-inspired UI.

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `pages/Menu.tsx` | Hero banner, search, category pills, two-column menu grid with sticky cart sidebar |
| `/login` | `pages/Login.tsx` | Customer sign-in (Firebase Auth, email/password) |
| `/signup` | `pages/Signup.tsx` | Customer registration with password confirmation |
| `/checkout` | `pages/Checkout.tsx` | Order summary, customer details, places order via `POST /order/push` |
| `/orders` | `pages/Orders.tsx` | Order history for the logged-in customer |

### Components

- **`Navbar.tsx`** — Top nav with auth state, cart badge, mobile-responsive
- **`CartDrawer.tsx`** — Slide-out mobile cart with framer-motion animation

### Shared Modules

- **`context/AuthContext.tsx`** — Firebase Auth provider; calls `POST /auth/verify` for role detection
- **`hooks/useCart.ts`** — Cart state management with `sessionStorage` persistence
- **`lib/api.ts`** — API endpoint constants + typed `fetchJSON` helper
- **`lib/firebase.ts`** — Firebase app initialization singleton

### Styling

- **Zomato-like Tailwind theme** in `tailwind.config.js`:
  - Primary: `#E23744` (Zomato red)
  - Accent: `#FF7A59`
  - Green badge: `#3AB757`
  - Custom shadows: `shadow-card`, `shadow-card-hover`, `shadow-drawer`
  - Rounded cards: `rounded-2xl`
- Veg/Non-Veg badges on every menu item (Leaf / Flame icons)
- Skeleton loading states, image error fallbacks
- Fully responsive (mobile-first)

### Tests

3 test files, 16 passing tests:

- `__tests__/useCart.test.ts` — 7 tests (add, remove, increment, clear, persistence)
- `__tests__/AuthContext.test.tsx` — 2 tests (null user, exposed methods)
- `__tests__/api.test.ts` — 7 tests (endpoint construction, encoding, defaults)

Run: `cd customer-website && npm test`

---

## Modified: `frontend/` (Next.js Admin)

### Signup Removal

- **`app/signup/page.tsx`** — Entire signup form replaced with a "Registration Disabled" banner. Displays a shield icon and message directing users back to sign-in.

### Login Page

- **`app/login/page.tsx`** — Removed "Don't have an account? Sign up" link. Added amber info banner: *"Restaurant owners: Accounts are provided by our team."*

### Landing Page

- **`app/page.tsx`** — All `/signup` links replaced:
  - Navbar "Get Started" → "Order Food" → `http://localhost:5173`
  - Hero CTA → "Order Now" → `http://localhost:5173`
  - Pricing CTAs → "Admin Sign In" → `/login`
  - Bottom CTA → "Admin Sign In" → `/login`

### Live Order Polling

- **`app/admin/order-history/page.tsx`** — Added 10-second auto-refresh interval with `setInterval(load, 10_000)`. Added pulsing green "Live" indicator dot in the header.

### Admin Route Protection

- **`app/admin/layout.tsx`** — Already had client-side protection (redirects unauthenticated users to `/login`, customers to `/order`). No changes needed.

---

## Modified: Backend (`backend/`)

### New Endpoint

- **`app/api/routes_auth.py`** — `POST /auth/verify`
  - Accepts Firebase ID token in body + `Authorization` header
  - Decodes JWT payload (dev mode — no `firebase-admin` dependency required)
  - Returns `{ uid, email, role }` where role is `admin` if email is in `ADMIN_EMAILS`, otherwise `customer`
  - Registered at `/auth` prefix in `main.py`

### CORS

- **`app/config.py`** — `ALLOWED_ORIGINS` now includes `http://localhost:5173`

---

## Architecture Diagram

```
┌──────────────────┐      ┌──────────────────┐
│  customer-website │      │    frontend/      │
│  Vite :5173       │      │    Next.js :3000   │
│  (Customers)      │      │    (Admin/Staff)   │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         └────────┬────────────────┘
                  │
           ┌──────▼──────┐
           │   Backend    │
           │ FastAPI :8000│
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │   Firebase   │
           │  Auth + DB   │
           └─────────────┘
```

---

## How to Run

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# Customer website
cd customer-website && npm install && npm run dev

# Admin dashboard
cd frontend && npm install && npm run dev

# Run customer-website tests
cd customer-website && npm test
```
