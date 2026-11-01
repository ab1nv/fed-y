# FedY

**Logistics, delivered.** FedY is a full-stack shipment, fleet and warehouse operations platform: a dispatch console, a mobile-first driver app, a public customer tracking page with live driver location, and a dark landing site. One Next.js app, one Turso database.

---

## Contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Roles and auth](#roles-and-auth)
5. [Feature walkthrough](#feature-walkthrough)
6. [Domain logic](#domain-logic)
7. [Data model](#data-model)
8. [Getting started](#getting-started)
9. [Demo accounts](#demo-accounts)
10. [API surface](#api-surface)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Project structure](#project-structure)
14. [Known limits](#known-limits)

---

## What it does

| Who | Gets |
|---|---|
| **Admin** | Everything, plus a Team page to provision accounts and roles |
| **Dispatcher / Ops** | KPI overview with charts, shipment list with filters and pagination, booking desk, driver assignment, fleet and warehouse management, at-risk queue |
| **Driver** | Mobile-first "My stops": today's assignments, one-tap status changes, exception reporting, optional live GPS sharing |
| **Customer** | No login. Public tracking at `/track/FDY-XXXX-XXXX` with a progress rail, event history, live parcel location, and a JSON endpoint |

Every number in the UI is computed from the database at request time. There are no mock screens.

## Tech stack

- **Next.js 16.3.4** (App Router, React 19, Turbopack), one codebase for the marketing site, server actions, and the public API
- **TypeScript 5**, strict
- **Tailwind CSS v4**, CSS-first tokens
- **Prisma 7** with the **libSQL driver adapter** and **Turso** (SQLite) for storage
- **GSAP 3.15 + @gsap/react** for the landing animation
- **Recharts 3** for dashboard charts
- **Zod 4** for validation at every trust boundary
- **jose** for signed session tokens, **node:crypto scrypt** for passwords
- **next-themes** for the dashboard light/dark toggle
- **Vitest** for domain tests, **Playwright** for browser and API end-to-end tests
- **pnpm 11** (`packageManager` pinned)

Deliberately not used: Auth.js (a self-managed JWT cookie covers the role model), React Query/Zustand (server components and server actions are the data path), a UI kit (a few hand-rolled primitives keep the design consistent).

## Architecture

```
Browser ──────────► Next.js 16 (App Router)
                     │
                     ├─ src/proxy.ts        optimistic JWT check → role redirects
                     ├─ (marketing)         GSAP landing (dark, always)
                     ├─ /track, /login…     public and auth pages
                     ├─ (app) dashboard     RSC reads → Prisma; writes → server actions
                     ├─ /driver             mobile-first RSC, same action layer
                     ├─ /api/track/[code]   public JSON API (single raw SQL query)
                     │
                     └─ Prisma 7 + @prisma/adapter-libsql ──► Turso (SQLite)
```

All data access is server-side. Forms call **server actions** that re-check the session, the role, and the state machine on every write. The client's button set is convenience; the action's guard is the rule. Session is an HS256 JWT in an `httpOnly` `fedy_session` cookie; `src/proxy.ts` re-verifies it at the edge for redirect UX, and `requireSession()` in pages and actions is the actual gate.

## Roles and auth

- Signup (`/signup`) is open for **DISPATCHER** and **DRIVER**. Driver signup collects a phone number and creates the `Driver` profile in the same transaction. **ADMIN** accounts are provisioned on the Team page or by the seed.
- Login is username plus password, hashed with scrypt (N=32768, random 16-byte salt, constant-time compare).
- Session: jose JWT (`sub`, `name`, `username`, `role`), 7-day expiry, signed with `SESSION_SECRET`.
- Route protection has two layers:
  - `src/proxy.ts` matches `/dashboard/*`, `/admin/*`, `/driver/*`, `/login`, `/signup`. Unauthenticated users are sent to `/login?next=…`; dispatchers cannot open `/admin`; drivers land on `/driver`; signed-in users skip the login form.
  - `requireSession(roles)` in every layout, page, and action, enforced even if someone bypasses the proxy.

## Feature walkthrough

### Overview (`/dashboard`)

Four KPI cards (active shipments, 30-day on-time rate, open exceptions, monthly deliveries), a 14-day delivered-vs-late chart, a pipeline donut, an at-risk queue, and a live feed of the latest network events. Every value is a real aggregate over current data.

### Shipments (`/dashboard/shipments`)

Status, driver, and text filters (search over tracking code, city, address, customer name), 25 rows per page, pagination. Rows link to the detail page.

### Booking desk (`/dashboard/shipments/new`)

Customer, origin hub, destination, weight, promised window. Zod-validated. A unique `FDY-XXXX-XXXX` code is minted from `crypto.randomBytes` and the user lands on the new shipment.

### Shipment detail (`/dashboard/shipments/[id]`)

Route card, full append-only event timeline, driver assignment (only while `CREATED` or `ASSIGNED`), status buttons derived from the state machine, exception reporting with a note, a live location card, and a link to the public view. When a driver's last open shipment is delivered, their vehicle flips back to `AVAILABLE`.

### Fleet (`/dashboard/fleet`)

Vehicles with status pills and an add-vehicle form, plus drivers with vehicle, phone, and open-stop count.

### Warehouses (`/dashboard/warehouses`)

Add a site, and inspect per-site inventory with automatic **reorder** highlighting when `quantity <= reorderAt`.

### Customers (`/dashboard/customers`)

Directory with lifetime shipment counts.

### Team (`/admin/team`)

Admin-only. Create users with any role (driver creation also creates the profile) and remove anyone except the seeded `admin`.

### Driver app (`/driver`)

A mobile column capped at `max-w-lg`: open stops and delivered-today count. Each stop card shows destination, promised time (red when overdue), weight, and big-tap buttons generated from the state machine. Reporting an issue files an `EXCEPTION` event; "Back on route" resumes. The **Share location** control uses the browser geolocation API and writes the latest position to the database, so dispatch and public tracking see the same pin.

### Public tracking (`/track/FDY-…`)

No login. Current status on a six-step progress rail, origin and destination cards, driver and vehicle, live location with an OpenStreetMap link, reverse-chronological history, and an honest "running late" state. The JSON endpoint returns the same data.

## Domain logic

1. **Shipment state machine** (`src/lib/state-machine.ts`). `CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED`, with `EXCEPTION` as a recoverable side state and `CANCELLED` as terminal. Invalid transitions are rejected inside the server action. The UI's buttons are derived from `nextActions(status, isDriver)`, so drivers see fewer moves than dispatchers.
2. **Delay-risk scoring** (`src/lib/risk.ts`). Deterministic and explainable: overdue, close window, stale updates, not yet in transit, open exception. Reasons are rendered verbatim, for example "Stale: no update for 19h".
3. **Fleet status reconciliation**. Vehicle availability is recomputed when a driver's last open shipment is delivered.
4. **Live location fan-out**. A geolocation ping updates the driver profile and every open shipment assigned to that driver in one transaction. Dispatch, the driver app, public tracking, and the API all read the same row.

## Data model

Prisma schema: `User 1:0..1 Driver *:1 Vehicle`, `Shipment *:1 Customer`, `*:1 Warehouse (origin)`, `*:0..1 Driver`, `1:* ShipmentEvent` (append-only timeline), `Warehouse 1:* InventoryItem` with reorder levels. Tracking code, username, email, plate number, and warehouse code are unique. SQLite has no enum type, so statuses and roles are strings constrained by the action layer and Zod schemas.

`prisma/seed.ts` uses a deterministic RNG to create a realistic dataset: 6 users, 5 vehicles, 4 warehouses with stock, 15 customers, and 51 shipments spanning about six weeks, including delivered, late, in transit, exceptions, stale updates, and cancellations. Every driver gets a seeded last-known position so tracking has something to show before the first live ping.

## Getting started

Requirements: Node 20+, pnpm 11 (`corepack enable`), and a Turso database.

```bash
pnpm install
cp .env.example .env      # add TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, SESSION_SECRET
pnpm db:push              # create the schema in an empty Turso database
pnpm db:seed              # demo users, fleet, warehouses, 51 shipments
pnpm dev                  # http://localhost:3000
```

`make setup` runs install, schema push, and seed. `make help` lists the other targets. There is no local database server and no Docker step.

The seed is idempotent: it clears the app tables and rebuilds the demo dataset. `db:push` only applies the schema when the `Shipment` table is absent.

## Demo accounts

| Username | Password | Role | Lands on |
|---|---|---|---|
| `admin` | `password123` | Admin | `/dashboard`, plus Team |
| `priya` | `password123` | Dispatcher | `/dashboard` |
| `kabir` | `password123` | Dispatcher | `/dashboard` |
| `ravi` | `password123` | Driver | `/driver` |
| `imran` | `password123` | Driver | `/driver` |
| `deepa` | `password123` | Driver | `/driver` |

The login page lists the three primary demo profiles and fills the form when one is clicked. Warehouse operations are handled by the dispatcher account; there is no separate warehouse-manager role.

A live tracking code: open `/track` and it shows a current example from the seeded network.

## API surface

Writes are server actions (typed, validated, role-guarded). The HTTP endpoint:

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/track/[code]` | public | status, route, driver location, and full event history as JSON |
| action | `loginAction` / `signupAction` / `logoutAction` | public | credentials flow |
| action | `createShipmentAction` | DISPATCHER/ADMIN | book a shipment and mint a tracking code |
| action | `assignDriverAction` | DISPATCHER/ADMIN | assign or reassign a driver |
| action | `addEventAction` | DISPATCHER/ADMIN, DRIVER (own stops, field statuses) | state-machine transitions and exceptions |
| action | `pingLocationAction` | DRIVER | write the driver and open parcels' latest GPS position |
| action | `createVehicleAction` / `createWarehouseAction` | DISPATCHER/ADMIN | fleet and site creation |
| action | `createTeamUserAction` / `removeTeamUserAction` | ADMIN | user provisioning |

## Testing

```bash
pnpm test        # Vitest domain tests
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e    # Playwright: auth roles, dispatch flow, driver flow, GPS, bulk data, API load
```

The browser suite runs against a production build on port 3100. It covers the redirect matrix, role boundaries, signup, shipment booking, driver assignment, the full status lane including exception recovery, public tracking, JSON API, search and pagination, team provisioning, fleet and warehouse forms, and live GPS across driver, dispatcher, and public sessions. Test rows are removed by `tests/global-teardown.ts`.

The load spec inserts 300 shipments, checks pagination and filters, then fires 300 tracking API requests in concurrent batches. The tracking API uses one JSON-aggregated SQL query instead of Prisma relation loading, which keeps it fast against remote Turso.

Playwright needs a browser once: `pnpm exec playwright install chromium`.

## Deployment

Target: **Vercel** plus **Turso**.

1. Create a Turso database and copy its URL and auth token.
2. Set these Vercel environment variables for Production and Preview:
   - `TURSO_DATABASE_URL` (`libsql://…`)
   - `TURSO_AUTH_TOKEN`
   - `SESSION_SECRET` (`openssl rand -hex 32`)
3. Deploy. The build command is `prisma generate && next build` from `package.json`; no database server or migration step runs at build time.
4. On first setup, create the schema and seed from a machine with the same environment:
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

The app is stateless. All state lives in Turso; no cron jobs, no local files, no long-running server processes.

## Project structure

```
├── prisma/
│   ├── schema.prisma          SQLite schema for Turso
│   ├── migrations/            init SQL (applied by scripts/db-push.ts)
│   └── seed.ts                deterministic demo dataset
├── scripts/db-push.ts         apply migrations to an empty Turso database
├── src/
│   ├── proxy.ts               Next 16 proxy: role redirects
│   ├── app/
│   │   ├── (marketing)/       GSAP landing page
│   │   ├── (app)/             protected shell: dashboard pages and /admin/team
│   │   ├── driver/            mobile driver app
│   │   ├── login|signup/      auth (dark)
│   │   ├── track/             public tracking and [code]
│   │   └── api/track/[code]/  JSON endpoint
│   ├── components/            UI kit, shell, charts, forms, landing, location pinger
│   ├── lib/                   db, turso, session, password, state machine, risk,
│   │                          schemas, actions, tracking, geo helpers
│   └── generated/prisma/      Prisma 7 generated client (gitignored)
├── tests/                     Playwright auth, ops, location, load specs
├── src/lib/core.test.ts       Vitest domain tests
├── playwright.config.ts
└── Makefile
```

## Known limits

- No email notifications, password reset, CSV import, or route optimisation.
- No embedded map tiles. Live location is shown as coordinates with an OpenStreetMap link, which keeps the app dependency-free and fast.
- Rate limiting is delegated to Vercel. A single-operator deployment does not need an in-memory limiter.
- The seed records lateness through event notes; a dedicated `deliveredAt` column would be the next step for production reporting.
