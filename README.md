# FedY

**Logistics, delivered.** FedY is a full-stack shipment, fleet and warehouse operations platform — a working dispatch console, a mobile-first driver execution app, a public customer tracking page, and an award-quality dark landing site, all in one deployable Next.js app.

The name is a wink at FedX: same problem — moving parcels on time — run on a yellow line.

---

## Table of contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Roles & auth](#roles--auth)
5. [Feature walkthrough](#feature-walkthrough)
6. [Domain logic (the parts that aren't CRUD)](#domain-logic)
7. [Data model](#data-model)
8. [Landing page & animation system](#landing-page)
9. [Theming](#theming)
10. [Getting started](#getting-started)
11. [Demo accounts](#demo-accounts)
12. [API surface](#api-surface)
13. [Testing & quality gates](#testing)
14. [Deployment](#deployment)
15. [Project structure](#structure)
16. [Known limits / deferred ideas](#limits)

---

## What it does

| Who | Gets |
|---|---|
| **Admin** | Everything, plus a Team page to provision accounts and roles |
| **Dispatcher / Ops** | KPI overview with charts, shipment list with filters + pagination, booking desk, assign drivers, warehouse/fleet management, at-risk queue |
| **Driver** | Mobile-first "My stops": today's assignments, one-tap status changes (picked up → in transit → out for delivery → delivered), exception reporting |
| **Customer** | No login. A public tracking page (`/track/FDY-XXXX-XXXX`) with a progress rail and full event history, plus a JSON endpoint (`/api/track/…`) |

Everything the UI shows is computed from the database at request time. There are no mock screens.

## Tech stack

- **[Next.js 16.3.4](https://nextjs.org)** (App Router, React 19, React Compiler lint rules, Turbopack) — one codebase serves the marketing site, the app backend (server actions) and the public API
- **TypeScript 5** everywhere, strict
- **Tailwind CSS v4** — CSS-first config, custom `@theme` tokens
- **Prisma 7** + **PostgreSQL 18** (new driver-adapter client architecture, `@prisma/adapter-pg`)
- **GSAP 3.15 + @gsap/react** (all plugins now free: `SplitText`, `DrawSVGPlugin`, `MotionPathPlugin`, `ScrollTrigger`) for landing animation
- **Recharts 3** for dashboard charts
- **Zod 4** for validation at every trust boundary
- **jose** for signed session tokens; **node:crypto scrypt** for password hashing (stdlib — no native build deps)
- **next-themes** for the dashboard light/dark toggle
- **Vitest 5** for domain-logic tests
- **pnpm** as the package manager (`packageManager: pnpm@11` pinned)

Deliberately *not* used: Auth.js (self-managed JWT cookie is ~60 lines and covers roles exactly), React Query/Zustand (server components + server actions + `revalidatePath` are the platform-native data path), a UI kit (six hand-rolled primitives, ~200 lines, are enough and keep the design opinionated).

## Architecture

```
Browser ──────────► Next.js 16 (App Router)
                     │
                     ├─ proxy.ts            optimistic JWT check → role redirects
                     ├─ (marketing)         GSAP landing · dark, always
                     ├─ /track, /login…     public + auth pages
                     ├─ (app) dashboard     RSC reads → Prisma; writes → server actions
                     ├─ /driver             mobile-first RSC, same action layer
                     ├─ /api/track/[code]   public JSON API
                     │
                     └─ Prisma 7 + @prisma/adapter-pg ──► PostgreSQL (Docker local / Neon prod)
```

All data access is server-side. Forms call **server actions** that re-check the session *and* the role *and* the state machine on every write — the client's button set is convenience, the action's guard is law. Session is an HS256 JWT in an `httpOnly` `fedy_session` cookie; `proxy.ts` re-verifies the signature at the edge of every protected navigation purely for redirect UX (`requireSession()` in the pages themselves is the actual gate).

## Roles & auth

- Signup (`/signup`) is open for **DISPATCHER** and **DRIVER**. Driver signup collects a phone number and creates the `Driver` profile in the same transaction. **ADMIN** accounts are provisioned on the Team page (admin only) or by the seed.
- Login is username + password, hashed with `scrypt` (N=32768, random 16-byte salt, constant-time compare via `timingSafeEqual`).
- Session: `jose` JWT (`sub`, `name`, `username`, `role`), 7-day expiry, signed with `SESSION_SECRET`.
- Route protection, two layers:
  - `proxy.ts` matcher on `/dashboard/*`, `/admin/*`, `/driver/*`, `/login`, `/signup` — unauthenticated users are bounced to `/login?next=…`, dispatchers can't reach `/admin`, drivers land on `/driver` instead of `/dashboard`, logged-in users can't see the login form.
  - `requireSession(roles)` in every layout/page/action — enforced even if someone forges around the proxy.

## Feature walkthrough

### Overview (`/dashboard`)
Four KPI cards (active shipments, 30-day on-time %, open exceptions, monthly deliveries), a 14-day delivered-vs-late chart and pipeline mix donut (Recharts, fed by `groupBy`/date-bucket queries), an **At risk** queue (see below) and a **live feed** of the last eight network events. Every number is a real aggregate over seeded/created data.

### Shipments (`/dashboard/shipments`)
Status/driver/text filters (OR-search over tracking code, city, address, customer name), 25-per-page pagination. Rows link to the detail page.

### Booking desk (`/dashboard/shipments/new`)
Customer, origin hub, destination, weight, promised window. Zod-validated; a unique `FDY-XXXX-XXXX` code is minted from `crypto.randomBytes` on save and the user lands on the new shipment's page.

### Shipment detail (`/dashboard/shipments/[id]`)
Route card (origin → destination, weight, promised date with overdue flag), full append-only event timeline, driver assignment dropdown (only offered while the shipment is still `CREATED`/`ASSIGNED`), status-movement buttons generated from the state machine (never hand-coded per page), exception reporting with a note, and a link to the public tracking view. When a driver's last open shipment is delivered, their vehicle flips back to `AVAILABLE` — a small piece of real fleet bookkeeping.

### Fleet (`/dashboard/fleet`)
Vehicles with status pills and add-vehicle form; drivers with vehicle, phone and open-stop count.

### Warehouses (`/dashboard/warehouses`)
Per-site inventory with automatic **reorder** highlighting when `quantity ≤ reorderAt`.

### Customers (`/dashboard/customers`)
Directory with lifetime shipment counts.

### Team (`/admin/team`)
Admin-only. Create users with any role (driver creation makes the profile too), remove anyone except the seeded `admin`.

### Driver app (`/driver`)
A single mobile column capped at `max-w-lg`: "N open stops · M delivered today", each stop a card with destination, promised time (red when overdue), weight, and 2-column big-tap buttons generated from the same state machine (`PICKED_UP`, `IN_TRANSIT`, …). Reporting an issue files an `EXCEPTION` event; "Back on route" resumes. `geo:` deep-link opens the phone's maps app.

### Public tracking (`/track/FDY-…`)
No auth: current status as a six-step progress rail, origin/destination/on-board cards, reverse-chronological history, honest "running late" state. Same data as `/api/track/[code]` JSON.

## Domain logic

The app is not flat CRUD; three pieces carry real logic (all unit-tested):

1. **Shipment state machine** (`src/lib/state-machine.ts`) — an explicit `CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED` lane with `EXCEPTION` as a recoverable side-state and `CANCELLED` as terminal. Invalid transitions are rejected inside the server action, and the UI's action buttons are *derived* from `nextActions(status, isDriver)` — drivers see strictly fewer moves than dispatchers.
2. **Delay-risk scoring** (`src/lib/risk.ts`) — deterministic, explainable, no LLM: overdue +3, window <6h +2, no status update for >16h/>24h, not-yet-picked-up with <24h left, open exception +2 → `low / medium / high`. Reasons are rendered verbatim ("Stale: no update for 19h") so dispatchers can audit every badge. Shown on the overview queue, shipment table and detail page.
3. **Fleet status reconciliation** — vehicle availability recomputed on delivery events.

## Data model

Prisma schema in `prisma/schema.prisma`: `User ─1:0..1─ Driver ─*:1─ Vehicle`, `Shipment *─1 Customer`, `*─1 Warehouse (origin)`, `*─0..1 Driver`, `1─* ShipmentEvent` (append-only timeline), `Warehouse 1─* InventoryItem` with reorder levels. Enums: `Role`, `ShipmentStatus`, `VehicleStatus`. `trackingCode` and `username`/`email`/`plateNo`/`code` are unique. `prisma/seed.ts` (deterministic RNG) creates a realistic operational picture: 6 users, 5 vehicles, 4 warehouses with stock, 15 customers and **51 shipments** spanning ~6 weeks — delivered (some late, for honest on-time %), in transit, exceptions with notes, stale-update shipments that will light up the risk queue, and cancellations.

## Landing page

A hand-built marketing site (`src/app/(marketing)` + `src/components/landing`) in the FedY palette: near-black `#0a0a0c`, one accent (`#ffb800`), Space Grotesk / Inter / JetBrains Mono, custom line-art SVG throughout — no stock icons, no gradient-text hero.

- **Hero**: asymmetric split. A giant display headline with a per-line mask reveal (SplitText), beside a stylized freight-network SVG — dotted grid, hub nodes pulsing in staggered loops, lanes drawing themselves in (`DrawSVGPlugin`) and a truck marker gliding a closed route (`MotionPathPlugin`), plus pointer-parallax on desktop and a tracking quick-check pill.
- **Problem strip**: three horizontally scroll-snapping panels with bespoke line illustrations.
- **Product mockups**: pure CSS/SVG tiles of the real screens (tracking timeline, driver stop, KPI card) that de-tilt from `rotateX` as they scroll into view.
- **Tracking spotlight**: a waybill code types itself and a status chip resolves on a loop.
- **Stats bar**: GSAP count-ups (labelled as demo data — they're the seed's, not a real company's).
- All motion runs through `useGSAP` with `matchMedia` `prefers-reduced-motion` fallbacks and `from()` tweens, so the page is complete and legible with JS off. Fully responsive at 375 px, 844 px, 1024 px and 1440 px.

## Theming

CSS custom properties in `src/app/globals.css` are the whole system. `:root` is the light dashboard, `.dark` flips it, and `.marketing` re-pins the dark values for public surfaces — so **the landing page, login and tracking are always dark**, while the dashboard offers a persistent light/dark toggle (next-themes, sun/moon in the top bar). Components consume only semantic classes (`bg-surface`, `text-muted`, `border-line`, `bg-brand`…), which is what makes the 3-way theming free.

## Getting started

### The short version

```bash
make setup    # macOS: unattended Homebrew→node→pnpm→Postgres(service)+deps+seed
              # Linux: docker compose Postgres + deps + migrate + seed
make dev      # http://localhost:3000
```

On macOS **no Docker is required** — `scripts/setup-macos.sh` installs everything (including Homebrew itself if missing) and runs Postgres as a brew service on 5432. The only interactive moment is Homebrew's sudo prompt. Then `make dev` is all you need; `make help` lists targets (`db-up db-down db-migrate db-seed db-reset build lint typecheck test check clean`).

### Manual path (any OS)

Requirements: Node 20+, pnpm 11 (`corepack enable`), Docker (or brew Postgres on macOS).

```bash
pnpm install          # also runs prisma generate
cp .env.example .env  # defaults match docker (5433); macOS brew pg → set 5432
pnpm db:up            # Postgres 18 on :5433 (host-network container)
pnpm db:migrate       # apply schema (prisma/migrations)
pnpm db:seed          # demo users + fleet + 51 shipments
pnpm dev              # http://localhost:3000
```

Day-2 commands: `pnpm build`, `pnpm lint` (React-Compiler rules on), `pnpm test` (Vitest), `pnpm db:down`.

> Local Docker note: on hosts where bridge networking is unavailable (some sandboxed/containerised environments), this compose file uses `network_mode: host` with Postgres pinned to port 5433 — same URL either way.

## Demo accounts

| Username | Password | Role | Lands on |
|---|---|---|---|
| `admin` | `password123` | Admin | `/dashboard` (+ Team page) |
| `priya` / `kabir` | `password123` | Dispatcher | `/dashboard` |
| `ravi` / `imran` / `deepa` | `password123` | Driver | `/driver` |

A live in-transit tracking code for the public page: `FDY-ERZS-N6J3` (freshly seeded codes shuffle on every reseed — `/track` shows an example from the current data).

## API surface

Writes are server actions (typed, validated, role-guarded); the listed HTTP endpoints exist too:

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/track/[code]` | public | shipment status + event history as JSON |
| action | `loginAction` / `signupAction` / `logoutAction` | — | credentials flow |
| action | `createShipmentAction` | DISPATCHER/ADMIN | book + mint tracking code |
| action | `assignDriverAction` | DISPATCHER/ADMIN | assign/reassign driver |
| action | `addEventAction` | DISPATCHER/ADMIN + DRIVER (own stops, field statuses only) | state-machine transitions incl. exceptions, optional GPS |
| action | `createVehicleAction` / `createWarehouseAction` | DISPATCHER/ADMIN | fleet & sites CRUD |
| action | `createTeamUserAction` / `removeTeamUserAction` | ADMIN only | user provisioning |

## Testing & quality gates

- `pnpm test` — Vitest, 9 tests over the parts that compute: state machine (happy lane, illegal skips, driver restriction), risk scoring (terminal states, overdue+stale → high, escalation with silence), scrypt round-trip + wrong password, Zod signup rules.
- `pnpm lint` — ESLint with Next 16 / React Compiler rules (`purity`, `set-state-in-effect`) — clean.
- `pnpm exec tsc --noEmit` — clean. `pnpm build` — green, 16 routes.
- Manual/browser verification: route matrix for logged-out (307 → `/login`), dispatcher-as-admin (blocked), driver landing on `/driver`, seeded data rendering on every page.

## Deployment

The app is one deployable unit. Target: **Vercel** + **Neon** (both free tiers).

1. Create a Neon Postgres project, copy the pooled URL.
2. Set `DATABASE_URL` and a random `SESSION_SECRET` (`openssl rand -hex 32`) in Vercel env vars.
3. Build command: `prisma migrate deploy && next build`; done. No stateful servers, no cron — risk and KPIs derive on read.

## Project structure

```
├── docker-compose.yml         Postgres 18 (host-net, port 5433)
├── prisma.config.ts           Prisma 7 CLI config (schema path, seed, datasource)
├── prisma/
│   ├── schema.prisma          8 models, 3 enums
│   ├── migrations/            init
│   └── seed.ts                deterministic demo dataset (51 shipments etc.)
├── proxy.ts                   Next 16 proxy (replaces middleware.ts): role redirects
├── src/
│   ├── app/
│   │   ├── (marketing)/       GSAP landing page
│   │   ├── (app)/             protected shell: dashboard pages + /admin/team
│   │   ├── driver/            mobile driver app
│   │   ├── login|signup/      auth (dark)
│   │   ├── track/             public tracking + [code]
│   │   └── api/track/[code]/  JSON endpoint
│   ├── components/            ui kit, shell, charts, forms, landing/*
│   ├── lib/                   db, session, password, state-machine, risk,
│   │                          schemas, actions (auth/shipment/fleet), tracking
│   └── generated/prisma/      Prisma 7 generated client (gitignored)
└── src/lib/core.test.ts       vitest domain tests
```

## Known limits / deferred ideas

Written down so nobody has to guess whether they're accidents:

- **Groq AI copilot, document extraction, file uploads** (from `SPEC.md`) — intentionally not built: they need an external API key to be anything more than a stub, and a fake demo is worse than a shipped, verified core. The copilot layer slots onto `computeRisk` + the event timeline cleanly when a `GROQ_API_KEY` exists.
- **No live map** on tracking pages (coordinates are stored; a Leaflet/OSM embed is additive). No geocoding on the booking form — lat/lng defaults to null/seeded.
- **Passwords can't be changed/reset** yet; no email notifications; CSV import and route-optimisation heuristics remain stretch goals from the spec.
- Rate limiting on actions is delegated to hosting (Vercel) — a single-campus app doesn't need an in-memory limiter.
- The seed's "late" flag is recorded via event notes; a proper `deliveredAt` column would replace that lookup if this went to real production.

---

*FedY was built as a capstone-grade reference implementation: real state machines, real role enforcement, deterministic explainable risk, and a landing page that passes the squint test.*
