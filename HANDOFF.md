# FedY — Technical Handoff Document

**Purpose:** This file is the complete, verified technical specification of the FedY codebase as built. It exists so that a downstream LLM (or human) can author a formal Software Requirements Specification (SRS, e.g. IEEE 830-style) for distribution with the software. Every number, threshold, route, field and behaviour below matches the implementation at handoff time. Anything *not* here was not built.

**How to use this doc:** Sections 3–15 define *what the system is*; Section 16 lists what it deliberately **is not** (use these as "out of scope / future enhancement" items in the SRS). Section 17 has the acceptance-relevant facts (demo data, logins, verification status).

---

## 1. Product identity

| | |
|---|---|
| Name | **FedY** |
| Tagline | *Logistics, delivered.* |
| Type | Full-stack logistics & fleet management SaaS (single deployable web app) |
| Domain | Parcel freight: booking, dispatch, driver execution, warehouse stock, public tracking |
| Brand | Dark near-black surfaces + single amber accent (`#ffb800`); light theme for internal console |
| Status | Complete capstone-grade reference implementation, all gates green |

## 2. Personas and roles

System has three **authenticated roles** (`enum Role { ADMIN DISPATCHER DRIVER }`) and one **anonymous persona**:

| Persona | Auth | Capabilities |
|---|---|---|
| Administrator | username/password | Everything a dispatcher can do + Team provisioning (create/remove users incl. admins) |
| Dispatcher / Ops | username/password (self-signup allowed) | Overview KPIs, shipment list, booking desk, driver assignment, status moves, fleet & warehouse creation, customer directory |
| Driver | username/password (self-signup allowed, requires phone; or admin-provisioned) | `/driver` mobile view: own open stops, field status transitions, exception reporting |
| Customer | **none** | Public tracking page + JSON API by tracking code |

Enforcement is two-layer: `proxy.ts` (edge JWT signature check → redirects, UX only) and `requireSession(roles)` + per-action role checks (authoritative). A client-forged navigation still hits server-side guards; a stolen cookie cannot be forged without `SESSION_SECRET`.

## 3. Technology stack (exact, from `package.json`)

**Runtime/tooling:** Node ≥ 20 (built/verified on Node 26.8.1), pnpm 11.20.0 (`packageManager` pinned), Docker for local Postgres (macOS alternative: Homebrew service — §5).

| Package | Version | Purpose |
|---|---|---|
| `next` | **16.3.4** | App Router, React Compiler lint rules, Turbopack dev/build. Note: Next 16 renames `middleware.ts` → **`proxy.ts`**; all request-time APIs (`cookies()`, route `params`, `searchParams`) are **async** |
| `react` / `react-dom` | 19.2.8 | `useActionState` for form feedback |
| `typescript` | ^5 (strict) | |
| `tailwindcss` | ^4 | CSS-first config; `@theme inline` token mapping in `globals.css` |
| `prisma` / `@prisma/client` / `@prisma/adapter-pg` | ^7.10.0 | Prisma 7 architecture: driver adapter (no Rust engine), `prisma-client` generator emits TS to `src/generated/prisma/` (gitignored; rebuilt by `postinstall`), `prisma.config.ts` holds schema path + seed command + datasource URL |
| database | PostgreSQL **18** (alpine, Docker; any PG ≥ 14 or Neon works) | |
| `gsap` / `@gsap/react` | ^3.15 / ^2.1.2 | Landing animation. Since GSAP 3.13 **all plugins are free** — uses `SplitText`, `DrawSVGPlugin`, `MotionPathPlugin`, `ScrollTrigger` |
| `recharts` | ^3.10.1 | Dashboard charts |
| `zod` | ^4.5.4 | All input validation |
| `jose` | ^6.2.12 | HS256 session JWTs (edge-safe, used in both `proxy.ts` and server code) |
| `next-themes` | ^0.4.6 | Dashboard light/dark persistence (`attribute="class"`, default `light`) |
| `dotenv` | ^17.2.3 | Prisma 7 CLI/seed env loading |
| `vitest` | ^5 | 9 unit tests (`src/lib/core.test.ts`) |
| `tsx` | ^4.23.13 | Runs seed |
| `eslint` + `eslint-config-next` | ^9 / 16.3.4 | Includes `react-hooks/purity` and `react-hooks/set-state-in-effect` compiler rules (see §12 constraints) |

**Explicitly not used:** Auth.js, Redux/TanStack-Query/Zustand, shadcn/Radix, any CSS-in-JS, any icon pack, any ORM other than Prisma. Reasoning recorded in README §Tech stack.

## 4. Repository layout

```
fed-y/
├── AGENTS.md / CLAUDE.md        next-generated agent guidance (keep block)
├── SPEC.md                      original product brief (superseded where this doc differs)
├── README.md                    user-facing docs (setup, features, deploy)
├── HANDOFF.md                   ← this file
├── package.json                 scripts + pnpm pin
├── pnpm-workspace.yaml          allowBuilds: prisma/@prisma/client/@prisma/engines/esbuild=true; sharp/unrs-resolver=false
├── tsconfig.json                strict, paths: "@/*" → "./src/*"
├── next.config.ts               stock (typedRoutes true)
├── Makefile                     cross-platform orchestration (setup/dev/db:*/check, §5)
├── docker-compose.yml           postgres:18-alpine, network_mode: host, port 5433, user/pass/db = fedy, pgdata volume, healthcheck
├── scripts/setup-macos.sh       unattended macOS install (Homebrew→node/pnpm/postgres service→db→env→deps→seed)
├── .github/dependabot.yml       weekly minor/patch bumps (npm/pnpm), monthly actions, majors ignored
├── .env.example / .env          DATABASE_URL, SESSION_SECRET  (.env gitignored; !.env.example tracked)
├── prisma.config.ts             { schema, migrations.seed: "tsx prisma/seed.ts", datasource.url: env DATABASE_URL }
├── prisma/
│   ├── schema.prisma            §6
│   ├── migrations/0…_init/      full DDL incl. 3 enums
│   └── seed.ts                  §15 (deterministic)
├── proxy.ts                     §8 route guard
└── src/
    ├── app/
    │   ├── layout.tsx            root: 3 next/font Google fonts + ThemeProvider + metadata
    │   ├── globals.css           §12 design tokens (3 palettes)
    │   ├── (marketing)/page.tsx  landing; (marketing)/layout.tsx wraps div.marketing
    │   ├── login/page.tsx  signup/page.tsx         dark auth pages
    │   ├── track/page.tsx        public code entry (server-action form → /track/[code])
    │   ├── track/[code]/page.tsx public tracking UI
    │   ├── api/track/[code]/route.ts  public JSON
    │   ├── (app)/layout.tsx      requireSession() + Shell sidebar; contains:
    │   │     dashboard/page.tsx (Overview) · dashboard/shipments/page.tsx (list)
    │   │     dashboard/shipments/new/page.tsx · dashboard/shipments/[id]/page.tsx
    │   │     dashboard/fleet · dashboard/warehouses · dashboard/customers
    │   │     admin/team/page.tsx
    │   └── driver/{layout,page}.tsx  mobile driver app (own narrow layout)
    ├── components/
    │   ├── ui.tsx (8 primitives + badges + formatters) · theme-toggle.tsx · shell.tsx (sidebar client)
    │   ├── auth-form.tsx · new-shipment-form.tsx · add-vehicle-form.tsx · team-forms.tsx
    │   ├── charts.tsx (DeliveriesChart, StatusDonut — client, Recharts)
    │   └── landing/ (gsap.ts registry, header, hero, problems, showcase, spotlight, stats, footer)
    ├── lib/
    │   ├── db.ts password.ts session.ts tracking.ts
    │   ├── state-machine.ts risk.ts schemas.ts
    │   ├── auth-actions.ts shipment-actions.ts fleet-actions.ts
    │   └── core.test.ts
    └── generated/prisma/        generated client (gitignored)
```

## 5. Runtime configuration

| Env var | Value / format | Used by |
|---|---|---|
| `DATABASE_URL` | `postgresql://fedy:fedy@localhost:5433/fedy?schema=public` (local Docker; **5432** on Homebrew Postgres) | Prisma adapter, CLI |
| `SESSION_SECRET` | ≥32-byte hex; HS256 key for session JWTs | `session.ts`, `proxy.ts` |
| `NODE_ENV` | `production` ⇒ session cookie `Secure` | session cookie |

NPM scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `db:up`, `db:down`, `db:migrate` (dev), `db:deploy` (prod), `db:seed`, `postinstall=prisma generate`.
`make` wraps everything cross-platform: `make setup` (macOS → `scripts/setup-macos.sh`; Linux → docker path), `make db-up|db-down` (brew service vs docker), `make dev`, `make check` = lint+typecheck+test+build, `make db-reset` = `prisma migrate reset --force`.
Local DB port: **5433** via Docker (compose uses `network_mode: host` with `postgres -c port=5433` for sandboxed-Docker compat) / **5432** via Homebrew — only `DATABASE_URL` differs.

## 6. Data model (Prisma schema — normative)

Enums:
- `Role { ADMIN DISPATCHER DRIVER }`
- `ShipmentStatus { CREATED ASSIGNED PICKED_UP IN_TRANSIT OUT_FOR_DELIVERY DELIVERED EXCEPTION CANCELLED }`
- `VehicleStatus { AVAILABLE ON_ROUTE MAINTENANCE }`

Models (fields → constraints):

| Model | Fields |
|---|---|
| `User` | `id cuid pk` · `name` · `username @unique` · `email @unique` · `passwordHash` · `role @default(DISPATCHER)` · `createdAt @default(now())` · 1:0..1 `Driver` (cascade delete) |
| `Driver` | `id` · `userId @unique` (1:1 with User) · `phone` · `vehicleId?` (many-to-one Vehicle) · shipments back-ref |
| `Vehicle` | `id` · `plateNo @unique` · `type` (free text: "Van"/"Truck"/"Bike") · `capacityKg Int` · `status VehicleStatus @default(AVAILABLE)` · `createdAt` |
| `Warehouse` | `id` · `name` · `code @unique` · `address` · `city` · `lat Float` · `lng Float` · `createdAt`; back-refs: inventory, `originOf` shipments |
| `InventoryItem` | `id` · `warehouseId` (cascade) · `sku` · `name` · `quantity Int` · `reorderAt Int @default(20)` |
| `Customer` | `id` · `name` · `email` · `phone` · `city` · `createdAt` (email/phone not unique — customers are lightweight records) |
| `Shipment` | `id` · `trackingCode @unique` · `customerId` (restrict) · `originId`→Warehouse (restrict) · `destinationAddress` · `destinationCity` · `destLat?/destLng?` · `weightKg Float` · `status @default(CREATED)` · `driverId?` (optional → SetNull if driver removed) · `promisedDate DateTime` · `createdAt` · `updatedAt @updatedAt` |
| `ShipmentEvent` | `id` · `shipmentId` (cascade) · `status ShipmentStatus` · `note?` · `lat?/lng?` · `createdAt @default(now())` — **append-only; never mutated; the event log is the source of truth for timelines** |

Invariants enforced in code (DB cannot express them): status transitions per §9; one Driver per User; username pattern `^[a-z0-9_.]{3,32}$` (validated, lowercased before store).

## 7. Identity & session specification

**Hashing (`src/lib/password.ts`):** scrypt via `node:crypto`, parameters `N=32768, r=8, p=1, maxmem=64 MiB`, key length 32, random 16-byte salt per hash. Stored format: `scrypt$<saltHex>$<keyHex>`. Verification: re-derive with stored salt, compare with `timingSafeEqual` (constant time). Scheme prefix is forward-compatible.

**Session (`src/lib/session.ts`):** HS256 JWT (`jose`), claims `{ sub: userId, name, username, role }`, `iat`, `exp = iat + 7 days`. Cookie: name `fedy_session`, `httpOnly`, `sameSite=lax`, `path=/`, `secure` in production, `maxAge=1 week`. No server-side session store → logout = cookie delete; token expiry is the hard ceiling.

**Flows:**
- *Signup* (`signupAction`): validates `signupSchema`; rejects taken username/email (case-insensitive pre-check); role restricted to `DISPATCHER | DRIVER` (DRIVER additionally creates `Driver{phone}`); on success auto-login + redirect to role home.
- *Login*: lookup by lowercased username, verify scrypt, issue JWT, redirect to `next` hidden field (only if starts with `/` and not `//`) else role home. Wrong credentials ⇒ generic "Incorrect username or password" (no user enumeration).
- Login/signup pages are proxy-blocked for authenticated users (redirect to their home).

## 8. Route authorization matrix

`proxy.ts` matcher: `["/dashboard/:path*","/admin/:path*","/driver/:path*","/login","/signup"]`.

| Path | Anon | DRIVER | DISPATCHER | ADMIN |
|---|---|---|---|---|
| `/`, `/track`, `/track/[code]`, `/api/track/[code]`, `/login`, `/signup` | open | open | open | open |
| `/dashboard*` (all console pages) | → `/login?next=…` | → `/driver` | allowed | allowed |
| `/admin/team` | → login | → `/dashboard` | → `/dashboard` | allowed |
| `/driver` | → login | allowed | → `/dashboard` | → `/dashboard` |

Second layer: every protected page/layout calls `requireSession(roles?)`; every server action calls `requireSession([...])` (or role-branch inside `addEventAction`) — proxy is never the only gate. Public tracking intentionally exposes: status, city-level origin/destination, weight, promised date, event notes, and the consignee's **name only** in a "contact {name} or your FedY rep" footnote — no email/phone.

## 9. Shipment lifecycle — state machine (normative)

Exact table from `src/lib/state-machine.ts`:

| From | Allowed to |
|---|---|
| CREATED | ASSIGNED, CANCELLED |
| ASSIGNED | PICKED_UP, CANCELLED |
| PICKED_UP | IN_TRANSIT, EXCEPTION |
| IN_TRANSIT | OUT_FOR_DELIVERY, EXCEPTION |
| OUT_FOR_DELIVERY | DELIVERED, EXCEPTION |
| EXCEPTION | IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, CANCELLED |
| DELIVERED | — |
| CANCELLED | — |

Happy lane: `CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED`; `EXCEPTION` is a recoverable side-state; `CANCELLED`/`DELIVERED` terminal.

- `DRIVER_ACTIONS = [PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, EXCEPTION]` — `nextActions(from, isDriver=true)` = intersection with table (drivers can't assign or cancel).
- Transition is enforced **server-side** in `addEventAction`; illegal or unauthorized attempts silently no-op (the UI never offers illegal buttons — documented behaviour, returns `void`).
- Driver writes additionally require `shipment.driverId == sessionDriver.id`.
- `assignDriverAction` sets CREATED/ASSIGNED→ASSIGNED, appends event (`Driver assigned` / on reassign: `Reassigned to another driver`), only while status ∈ {CREATED, ASSIGNED}.
- **Vehicle reconciliation side effect:** on a `DELIVERED` transition, if that shipment's driver has zero remaining non-terminal shipments, their vehicle is set `AVAILABLE`.

## 10. Delay-risk scoring (normative algorithm)

`computeRisk(status, lastEventAt, promisedDate, now) → {score, level, reasons[]}`; terminal ⇒ `level:"none"`. Pure, deterministic, no external services.

Signals (all additive); `hoursLeft=(promisedDate−now)/3600s`, `hoursSinceUpdate=(now−lastEventAt)/3600s` (0 if no events):
1. hoursLeft < 0 → **+3** "Past promised delivery by Xh"
2. else hoursLeft < 6 → **+2** "Delivery window closes in Xh"; else < 24 → **+1** "Due within 24h"
3. hoursSinceUpdate > 24 → **+3** "No status update for Xh"; else > 16 → **+2** "Stale: no update for Xh"; else > 8 → **+1** "Quiet for Xh"
4. hoursLeft < 24 **and** status ∈ {CREATED, ASSIGNED, PICKED_UP} → **+1** "Not yet in transit with <24h remaining"
5. status = EXCEPTION → **+2** "Open exception"

`level = score ≥ 4 ? high : ≥ 2 ? medium : low`. UI: Overview "At risk" queue (top 6 non-low, score desc), table badge (`Watch`/`At risk`), detail card lists raw reasons verbatim. **Scoring is code; there is no AI-generated risk.**

## 11. Server actions & API — complete functional spec

All in `src/lib/*-actions.ts`, `"use server"`, every input through Zod (§13).

| Action | Guard | Behaviour |
|---|---|---|
| `loginAction(prev, fd)` | public | §7; returns `FormState {error} \| null` |
| `signupAction` | public | §7 |
| `logoutAction` | session | clear cookie → `/` |
| `createShipmentAction` | DISPATCHER/ADMIN | create Shipment (`newTrackingCode()`) + first `ShipmentEvent{CREATED,"Order accepted"}`; revalidate shipments list; redirect to detail |
| `assignDriverAction(fd)` | DISPATCHER/ADMIN | §9; transactional update+event; revalidates shipments, detail, /driver |
| `addEventAction(fd)` | any role; DRIVER path: own shipment + field statuses only | validate `canTransition`; transaction: update status + append event (note/lat/lng optional); vehicle reconciliation; revalidates 5 paths incl. public tracking |
| `createVehicleAction` | DISPATCHER/ADMIN | unique plate → friendly error on collision |
| `createWarehouseAction` | DISPATCHER/ADMIN | unique code |
| `createTeamUserAction` | ADMIN | creates user (+Driver profile if role DRIVER); §7 hashing |
| `removeTeamUserAction` | ADMIN | refuses username `admin`; cascade deletes driver profile (their shipments survive, driverId→null) |

HTTP: `GET /api/track/[code]` (case-insensitive trim-normalized lookup) → 200 `{trackingCode,status,origin{name,city},destination{address,city},weightKg,promisedDate,events[{status,note,createdAt}]}` or 404 `{error:"not_found"}`. No auth, no rate limiting (accepted, §16).

## 12. UI / design system

**Tokens:** three palettes via CSS vars in `globals.css` — `:root` (console light), `.dark` (console dark, toggled by next-themes on `<html class>`), `.marketing` (forced dark for landing/login/signup/track pages via wrapper class, immune to the toggle).

| var | light | dark / marketing |
|---|---|---|
| bg | #f5f5f4 | #0d0e11 / #0a0a0c |
| surface / surface2 | #fff / #fafaf9 | #16181d,#1c1f25 / #121215,#17171b |
| line | #e7e5e4 | #292c33 / #26262c |
| ink / muted | #1c1c1f / #6f7078 | #e9eaee,#9195a1 / #f0f0f2,#9b9ca6 |
| brand / brand-ink | #b45309 / #fff | #ffb800 / #1a1400 |

**Type:** Space Grotesk (display), Inter (body), JetBrains Mono (codes/numerals) — `next/font/google`, CSS-variable scoped.

**Primitives (`components/ui.tsx`):** `Button(primary|secondary|ghost|danger, sm|md|lg)` · `Input/Select/Textarea/Label/Field` · `Card` · `PageHeader` · `StatusBadge` (per-status colour map) · `RiskBadge` (`—`/`Watch`/`At risk`) · `Logo` · `fmtDate/fmtDateTime/fmtWeight` (en-IN; ≥1000 kg → tonnes).

**Shell:** 240px sidebar — Overview, Shipments, Fleet, Warehouses, Customers, Team (admin), My stops (driver), user block + sign-out; mobile hamburger drawer; top bar theme toggle (both sun/moon SVGs rendered, CSS `dark:` switches — zero JS theme read, no hydration flag).

**React-Compiler constraints honored** (lint *errors* in this config): no impure calls during render (timestamps computed server-side, passed as props), no `setState` in effects for route changes (drawer closes via `onClick`).

**Landing page** (`(marketing)/page.tsx` + `components/landing/*`), sections in order: sticky blurred header → hero (asymmetric; SplitText line-mask headline; hand-built network-map SVG — dotted `<pattern>` grid, hub nodes pulsing staggered, lanes drawing via `DrawSVGPlugin`, truck marker looping BOM→HYD via `MotionPathPlugin`; desktop pointer-parallax on `[data-depth]` layers; tracking pill → `/track`) → 3-panel snap-scroll problem strip → perspective product-mockup tiles (`rotateX` straightening on `ScrollTrigger`) → tracking spotlight (typewriter waybill → status chip) → count-up stats (labelled demo) → CTA + hairline footer. Motion: `gsap.ts` registers plugins; `useGSAP({scope})` per component; `from()` only (content visible without JS); all animation gated by `gsap.matchMedia` `prefers-reduced-motion: no-preference`. Responsive verified 375/844/1024/1440 px.

**Accessibility:** semantic landmarks, single `h1`/page, skip link, `aria-current` nav, `aria-label` on icon-only controls, `role="alert"` form errors, AA contrast (amber-on-black ≈ 9.4:1), ≥44px driver taps, keyboard order sane, `aria-hidden` decorative SVGs.

## 13. Validation schemas (Zod, normative)

- `loginSchema`: username 3–32 trimmed; password 8–128.
- `signupSchema`: name 2–64; username regex `^[a-z0-9_.]{3,32}$`; email ≤128; phone 8–20 optional; password 8–128; role ∈ {DISPATCHER, DRIVER}; **refine:** DRIVER ⇒ phone required ≥8.
- `shipmentCreateSchema`: customerId/originId non-empty; destinationAddress 5–240; city 2–64; weightKg >0 ≤24000; promisedDate coerced > now−1h.
- `assignSchema`: both ids non-empty.
- `eventSchema`: status ∈ {ASSIGNED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, EXCEPTION, CANCELLED}; note ≤500; lat −90..90; lng −180..180 (optional).
- `vehicleSchema`: plate 6–12 uppercased; type ∈ {Van,Truck,Bike}; capacityKg int 1..40000; status enum.
- `warehouseSchema`: name 3–80; code 3–8 uppercased; address 5–240; city 2–64; lat/lng ranges.
- `teamUserSchema`: like signup + ADMIN role, no phone.
- `trackCodeSchema`: 8–16 uppercased.

First issue message surfaces to the user (single error string per form — deliberate simplification, documented).

## 14. Tracking code format

`FDY-XXXX-XXXX`, X ∈ 31-char unambiguous alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no I/O/0/1), from 8 `crypto.randomBytes` bytes, mod-mapped. Length 13. Lookup normalizes `trim().toUpperCase()`; DB unique index. Collision odds ≈ 1 in 8.9e11 per code — no retry loop (ponytail note: add retry if ever at scale).

## 15. Seed dataset (`prisma/seed.ts`) — exact composition

Deterministic (mulberry32 PRNG seeded `20260907`), idempotent (deleteMany → create). Contents: **6 users** (admin `admin`; dispatchers `priya`,`kabir`; drivers `ravi`,`imran`,`deepa` — all password `password123`), 5 vehicles (2 trucks, 2 vans — one in maintenance, 1 bike), 3 drivers w/ phone+vehicle, 4 warehouses (DEL-N1, BOM-R2, BLR-S1, HYD-X3; 12 inventory items incl. 3 below reorder level), 15 pan-India customers, **51 shipments** over ~42 days. Status plan: 26 DELIVERED (≈25% with note "Delivered past promised window" — this **note convention is how the on-time KPI counts late**; documented debt), 7 IN_TRANSIT (2 stale ≥16h ⇒ guaranteed high-risk demo), 3 OUT_FOR_DELIVERY, 3 PICKED_UP, 4 ASSIGNED, 3 CREATED, 3 EXCEPTION (4 note variants), 2 CANCELLED. Event chains chronological per §9; active shipments' last event back-dated to `now − staleH`.

KPI derivations (SQL-side, only risk scoring computed in JS):
- On-time % = (delivered30 − count(note contains "past")) / delivered30.
- 14-day chart: per-day `ShipmentEvent{status=DELIVERED}`; late = note contains "past". Donut: `groupBy` active statuses. Feed: last 8 events. At-risk: §10 over active.

## 16. Explicitly out of scope / not built (SRS: future work)

1. **AI copilot, document extraction, file uploads** (original SPEC.md §6): needs external `GROQ_API_KEY`; deliberately omitted so no fake feature ships. Slot-in point: grounded queries + `computeRisk`.
2. Auth hardening: no password change/reset, no rate limiting, no email verification, no 2FA, no lockout, no refresh rotation.
3. Geocoding/live maps: lat/lng stored; no Nominatim, no Leaflet embed; driver cards use `geo:` deep link.
4. Notifications (email/SMS), CSV import, route optimization, cron jobs.
5. Edit/delete UI for shipments/customers/vehicles/inventory (creation + lifecycle only).
6. i18n (en), multi-tenancy (single operator). Stateless app + Postgres scales trivially.
7. `updatedAt` doubles as recency; late-detection via event **note string** — production schema would add `deliveredAt`/`onTime` columns.

## 17. Verification state at handoff

- `make check` equivalent: `pnpm build` ✓ (16 routes: 2 static, rest dynamic RSC) · `pnpm lint` ✓ 0 (React-Compiler rules on) · `pnpm typecheck` ✓ · `pnpm test` ✓ **9/9** (state machine ×3, risk ×3, scrypt, zod ×2).
- HTTP matrix against real Postgres: public 200s; guards 307→`/login?next=…`; cross-role verified (driver token→`/driver` 200 w/ real stops; admin→`/driver` 307); seeded data renders on detail/track/API.
- Landing verified headless-screenshotted at 1440×900, 1024×800, 390×844, 375×812 + reduced-motion full page.
- Bootstrap: macOS `scripts/setup-macos.sh` once then `make dev`; Linux `make setup` then `make dev` → http://localhost:3000. Known-good code: `FDY-ERZS-N6J3`.

## 18. CI/CD & dependency policy

`.github/dependabot.yml`: npm(pnpm) weekly Monday — grouped minor+patch, majors ignored (human decision), ≤5 open PRs, `chore(deps)` prefix; github-actions monthly, `chore(ci)` prefix. No GitHub workflows ship yet; recommended minimal CI = `pnpm install && pnpm check` on Node 22 + service-less (unit tests need no DB).

## 19. Suggested SRS skeleton for the downstream generator

1. Introduction (purpose, scope, refs: this doc + README, definitions)
2. Overall description: product perspective, user classes (§2), constraints (§3/§16), assumptions
3. System features: per §8–§11 (each feature: description, I/O, processing, data, role matrix, error behaviour)
4. External interfaces: UI/design system (§12), HTTP API (§11), DB (§6), env/bootstrap (§5, §17)
5. Non-functional: security (§7), reliability, performance notes, accessibility (§12), verification (§17)
6. Other requirements: out-of-scope register (§16) — label each "future enhancement"; acceptance data (§14, §15, demo logins §17)

*End of handoff. Generated from the as-shipped tree; where this doc and code disagree, trust `prisma/schema.prisma`, `src/lib/state-machine.ts`, `src/lib/risk.ts`, `proxy.ts`, the Makefile and setup script.*
