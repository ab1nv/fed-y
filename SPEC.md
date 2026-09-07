# LogiFlow — Technical Specification
### AI-Assisted Logistics & Fleet Management Platform

**Version:** 1.0
**Purpose:** Handoff spec for automated/AI-assisted implementation (opencode)
**Target:** College capstone project — must be a genuinely complete, professional, full-stack product

---

## 1. Product Overview

LogiFlow is a logistics and shipment management platform that lets a company manage orders, warehouses, fleet/drivers, and customer-facing shipment tracking from one dashboard, with an AI copilot (Groq-powered) that answers natural-language questions about the operation, flags at-risk shipments, and extracts data from uploaded shipping documents.

It is **not** a toy CRUD app — the spec below intentionally includes enough real domain logic (route assignment, status state machines, delay risk scoring) that it reads as a real product, not a tutorial project.

### 1.1 Core value proposition
- **Ops team**: one dashboard to create orders, assign drivers/vehicles, track shipment status, manage warehouse stock.
- **Customers**: a public tracking page (like a mini FedEx/DHL tracker) with live status timeline.
- **AI Copilot**: ask things like *"which shipments are at risk of missing their delivery window this week?"* or *"summarize today's fleet performance"* and get a grounded answer computed from real DB data, not a hallucinated one.

### 1.2 Personas
| Persona | Role in app |
|---|---|
| **Admin** | Full access — manages users, warehouses, vehicles, all orders |
| **Dispatcher** | Creates/assigns shipments, manages routes, talks to AI copilot |
| **Driver** | Mobile-friendly view: assigned shipments, updates status (picked up / in transit / delivered / exception) |
| **Customer** | No login required — tracks a shipment via tracking ID/link on a public page |

---

## 2. Tech Stack (Vercel-deployable + locally runnable)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14/15 (App Router, TypeScript)** | One codebase for frontend + backend (API routes / server actions), first-class Vercel support |
| Styling | **Tailwind CSS + shadcn/ui** | Professional, consistent design system, fast to theme |
| Landing animation | **GSAP (+ ScrollTrigger)**, optional Lottie for icon micro-animations | Requested explicitly; scroll-driven storytelling, not generic fade-ins |
| ORM/DB | **Prisma + PostgreSQL** | Type-safe, migrations, works against any Postgres |
| DB hosting (prod) | **Neon** (free tier, serverless Postgres — Vercel-native integration) | Free, scales to zero, works great with Vercel serverless |
| DB hosting (local) | **Docker Compose Postgres** (or local Postgres install) | Same schema, zero code change — only `DATABASE_URL` differs |
| Auth | **Auth.js (NextAuth v5)**, credentials provider + optional Google OAuth | Free, self-hosted, role-based sessions |
| File storage (documents) | **Vercel Blob** (free tier) in prod, local filesystem (`/uploads`) in dev via an abstraction layer | Needed for AI document parsing feature |
| AI | **Groq API** (`llama-3.3-70b-versatile` or current free Groq model) via server-side route handlers | Free, extremely fast inference, generous free tier |
| State/data fetching | **TanStack Query** + **Zustand** (light UI state) | Predictable client state |
| Charts | **Recharts** | Dashboard KPIs |
| Validation | **Zod**, shared between client forms and API route handlers | Single source of truth for shapes |
| Testing | **Vitest** (unit) + **Playwright** (a handful of e2e smoke tests) | Shows engineering maturity to a faculty panel |
| Deployment | **Vercel** (web) + **Neon** (DB) — both have permanent free tiers | Meets "free hosting" requirement |

> **Why not raw Express + separate React app?** Two deploys, two hosting bills, more moving parts, harder to keep "runs locally AND on Vercel for free" trivially true. Next.js full-stack collapses this into one deployable unit, which is exactly what a solo/small-team capstone should optimize for.

---

## 3. System Architecture

```
                         ┌────────────────────────────┐
                         │        Next.js App          │
                         │  (Vercel Serverless/Edge)    │
                         │                              │
   Browser  ───────────► │  App Router pages (RSC)      │
   (customer/            │  API route handlers          │
    dispatcher/           │  Server actions              │
    driver UIs)           │                              │
                         └───────┬──────────────┬───────┘
                                 │              │
                     Prisma Client      Groq SDK (fetch)
                                 │              │
                        ┌────────▼───────┐  ┌───▼─────────────┐
                        │ Postgres (Neon) │  │ Groq Cloud API   │
                        │ or local docker │  │ (chat + JSON     │
                        │                 │  │  extraction)     │
                        └─────────────────┘  └──────────────────┘
                                 │
                        ┌────────▼───────┐
                        │ Vercel Blob /   │
                        │ local /uploads  │  (shipping docs, PODs)
                        └─────────────────┘
```

All AI calls happen **server-side only** (route handlers) so the Groq API key is never exposed to the client. AI answers are always grounded by first querying Postgres for the relevant data, then passing that data + the user's question to Groq — never letting the model "make up" operational data.

---

## 4. Data Model (Prisma schema — entities)

```prisma
enum Role { ADMIN DISPATCHER DRIVER }
enum ShipmentStatus { CREATED ASSIGNED PICKED_UP IN_TRANSIT OUT_FOR_DELIVERY DELIVERED EXCEPTION CANCELLED }
enum VehicleStatus { AVAILABLE ON_ROUTE MAINTENANCE }

model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String?
  role          Role     @default(DISPATCHER)
  driverProfile Driver?
  createdAt     DateTime @default(now())
}

model Driver {
  id          String   @id @default(cuid())
  user        User     @relation(fields: [userId], references: [id])
  userId      String   @unique
  phone       String
  vehicle     Vehicle? @relation(fields: [vehicleId], references: [id])
  vehicleId   String?
  shipments   Shipment[]
}

model Vehicle {
  id         String        @id @default(cuid())
  plateNo    String        @unique
  type       String        // van, truck, bike
  capacityKg Int
  status     VehicleStatus @default(AVAILABLE)
  drivers    Driver[]
}

model Warehouse {
  id        String   @id @default(cuid())
  name      String
  address   String
  lat       Float
  lng       Float
  inventory InventoryItem[]
  originShipments Shipment[] @relation("origin")
}

model InventoryItem {
  id          String   @id @default(cuid())
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  warehouseId String
  sku         String
  name        String
  quantity    Int
}

model Customer {
  id      String @id @default(cuid())
  name    String
  email   String
  phone   String
  shipments Shipment[]
}

model Shipment {
  id                String         @id @default(cuid())
  trackingCode      String         @unique // public-facing code
  customer          Customer       @relation(fields: [customerId], references: [id])
  customerId        String
  origin            Warehouse      @relation("origin", fields: [originId], references: [id])
  originId          String
  destinationAddress String
  destLat           Float
  destLng           Float
  weightKg          Float
  status            ShipmentStatus @default(CREATED)
  driver            Driver?        @relation(fields: [driverId], references: [id])
  driverId          String?
  promisedDate      DateTime
  events            ShipmentEvent[]
  documents         ShipmentDocument[]
  createdAt         DateTime       @default(now())
}

model ShipmentEvent {
  id          String        @id @default(cuid())
  shipment    Shipment      @relation(fields: [shipmentId], references: [id])
  shipmentId  String
  status      ShipmentStatus
  note        String?
  lat         Float?
  lng         Float?
  createdAt   DateTime      @default(now())
}

model ShipmentDocument {
  id            String   @id @default(cuid())
  shipment      Shipment @relation(fields: [shipmentId], references: [id])
  shipmentId    String
  fileUrl       String
  type          String   // "invoice" | "pod" | "bol"
  extractedJson Json?    // AI-parsed structured data
  createdAt     DateTime @default(now())
}
```

This is deliberately a **state-machine-backed** shipment model (`ShipmentEvent` is an append-only timeline), which is what makes the tracking page and AI risk-scoring feature meaningful rather than decorative.

---

## 5. Core Feature Modules

### 5.1 Auth & Roles
- Credentials login (email/password, hashed with bcrypt) + session via Auth.js JWT strategy (works well on serverless).
- Middleware-protected route groups: `/dashboard/*` (dispatcher/admin), `/driver/*` (driver), `/admin/*` (admin only).
- Public routes: `/`, `/track/[code]`.

### 5.2 Dispatcher/Admin Dashboard
- **Orders/Shipments table**: filter by status, date, driver; bulk-assign driver+vehicle.
- **Create shipment** form: pick customer (or quick-create), origin warehouse, destination (address + geocoded lat/lng — use a free geocoding API like OpenStreetMap Nominatim), weight, promised date.
- **Fleet view**: vehicles + drivers, current status, capacity.
- **Warehouse/inventory view**: stock per warehouse, low-stock indicator.
- **KPI dashboard**: on-time delivery %, shipments in transit, exceptions this week, avg delivery time (Recharts).

### 5.3 Driver View (mobile-first)
- List of assigned shipments for today.
- One-tap status update (Picked up → In transit → Out for delivery → Delivered), optionally capturing geolocation via `navigator.geolocation`.
- Exception reporting (delay, damage, failed delivery) with note.

### 5.4 Public Tracking Page (`/track/[trackingCode]`)
- No login. Clean timeline UI of `ShipmentEvent`s, current status badge, ETA, map preview (static map image or lightweight Leaflet map, both free).

### 5.5 AI Copilot (Groq) — see Section 6 for full detail
- Chat panel inside the dispatcher dashboard.
- "Delay risk" badge computed per shipment.
- Document upload → auto-extracted structured data.

---

## 6. AI Features (Groq API)

**Model:** use a current free Groq-hosted model (e.g. `llama-3.3-70b-versatile` for reasoning/chat, `llama-3.1-8b-instant` for cheap/fast extraction — confirm exact current model names against Groq's docs at build time, since free-tier model availability changes). All calls go through `groq-sdk` server-side, using `GROQ_API_KEY` from env — never on the client.

### 6.1 Ops Copilot (RAG-lite over your own DB, not a generic chatbot)
- Endpoint: `POST /api/ai/copilot`
- Flow: (1) classify the user's question into one of a few supported query intents (e.g. "at-risk shipments", "fleet summary", "specific shipment lookup") — either via a cheap keyword/embedding check or by asking the model itself to emit a small JSON "which data do I need" plan; (2) run the corresponding Prisma query; (3) pass the **retrieved rows + the user's question** into a Groq chat completion with a system prompt that says "only use the provided data, cite shipment IDs, say if data is insufficient"; (4) stream the answer back to the UI.
- This grounding step is the difference between a real feature and "a chatbot wrapper" — call it out clearly in the README/demo.

### 6.2 Delay-risk scoring
- A small scheduled/derived computation (can run on-demand per dashboard load, not literally a cron given Vercel free-tier limits): for each active shipment, compute a simple heuristic risk score from real signals (time since last event, distance remaining vs. time remaining, historical on-time rate for that route/driver).
- Then send that structured summary to Groq to generate a one-line human-readable explanation ("High risk — no status update in 14h and only 3h left to promised delivery"). The *scoring* is deterministic code; the *explanation text* is the AI feature. This avoids having the LLM invent risk numbers.

### 6.3 Document data extraction
- Endpoint: `POST /api/ai/extract-document`
- User uploads an invoice/BOL (image or PDF text already extracted client-side or via a lightweight parser) → prompt Groq with strict instructions to return **only valid JSON** matching a defined schema (fields like sender, receiver, weight, itemized lines) → validate with Zod → store in `ShipmentDocument.extractedJson` → show an editable review form before saving (never trust LLM output blindly — this also demonstrates good engineering judgment for the panel).

### 6.4 Daily ops summary
- A "Generate today's summary" button on the dashboard that feeds the day's KPI numbers (already computed in SQL) into Groq to produce a short written ops report. Same grounding principle as 6.1.

---

## 7. Landing Page Specification (must not look "vibe-coded")

The landing page is a separate concern from the app dashboard — it should read like a real SaaS marketing site (think Linear, Vercel, Ramp-style landing pages).

### 7.1 Design language
- Restrained palette: one dark neutral (near-black), one accent color (e.g. an electric indigo or amber), generous whitespace, no default Tailwind blue/purple gradient clichés.
- Real typographic hierarchy: a distinctive display font for headlines (self-hosted variable font, e.g. via `next/font`), a clean sans for body copy.
- Custom iconography/illustration rather than generic stock icon packs where possible — simple SVG route/map/truck motifs designed specifically for this brand.

### 7.2 Sections
1. **Hero** — animated route line drawing itself across a stylized map (SVG path + GSAP `DrawSVGPlugin`-style stroke animation, or manual `stroke-dashoffset` tween if using only free GSAP plugins), headline, CTA, subtle floating package/truck sprites parallaxed on scroll.
2. **Problem/solution strip** — 3 short panels pinned via `ScrollTrigger` that swap icon+copy as the user scrolls (pin + snap).
3. **Feature showcase** — dashboard screenshots/mockups in perspective-tilted cards that straighten out on scroll into view (`gsap.from` with rotateX/rotateY + `ScrollTrigger`).
4. **AI copilot spotlight** — a live-feeling typed conversation snippet (typewriter effect) demonstrating the grounded AI answer, since this is the standout feature.
5. **Stats/trust bar** — animated count-up numbers (`gsap.to` with number tween) for fake-but-labeled "demo data" metrics (on-time %, shipments handled) — label clearly as demo since this is a college project, not real production numbers.
6. **CTA + footer** — clean, minimal.

### 7.3 Animation implementation notes for opencode
- Use `gsap` + `@gsap/react`'s `useGSAP` hook, all animations scoped inside `useGSAP(() => {...}, { scope: containerRef })` to avoid memory leaks in React.
- Only free GSAP plugins (Core, `ScrollTrigger`, `useGSAP`) — do not depend on Club GreenSock paid plugins (`SplitText`, `MorphSVG`, `DrawSVG`) since this must stay free; achieve similar effects manually (e.g. split text via a small custom split utility, draw-in via CSS stroke-dashoffset).
- Respect `prefers-reduced-motion`.
- Keep animations snappy (200–600ms per micro-interaction) — the biggest "vibe-coded" tell is animations that are either absent, generic (fade+slide-up on every single element identically), or laggy. Vary easing and timing per section.

---

## 8. API Surface (representative — opencode should expand consistently)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/[...nextauth]` | Auth.js handler |
| GET/POST | `/api/shipments` | list/create shipments |
| GET/PATCH | `/api/shipments/[id]` | get/update a shipment |
| POST | `/api/shipments/[id]/events` | append status event (driver update) |
| GET | `/api/track/[code]` | public tracking data (no auth) |
| GET/POST | `/api/vehicles` | fleet CRUD |
| GET/POST | `/api/warehouses` | warehouse + inventory CRUD |
| POST | `/api/ai/copilot` | grounded chat (streamed) |
| POST | `/api/ai/extract-document` | document → structured JSON |
| GET | `/api/dashboard/kpis` | KPI aggregation for charts |

All request/response bodies validated with shared Zod schemas in `/lib/schemas`.

---

## 9. Local & Free Hosting Setup

### 9.1 Local development
```bash
docker compose up -d          # spins up local postgres
cp .env.example .env
npx prisma migrate dev
npm run dev
```
`.env` only differs from prod in `DATABASE_URL` and `BLOB_*` (falls back to local filesystem via a storage abstraction, e.g. `/lib/storage.ts` exporting `put()`/`get()` that switches implementation by `NODE_ENV`/an explicit `STORAGE_DRIVER` env var).

### 9.2 Production (fully free tier)
- **Vercel**: import repo, set env vars (`DATABASE_URL`, `GROQ_API_KEY`, `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`), deploy.
- **Neon**: free Postgres project, connection string pasted into Vercel env, run `npx prisma migrate deploy` once (via a one-off script or Vercel's build command).
- **Vercel Blob**: free tier is enough for demo-scale document uploads.
- **Groq**: free API key from console.groq.com.

No paid service is required anywhere in this stack.

---

## 10. Non-Functional Requirements
- **Security**: bcrypt password hashing, RBAC middleware, Zod validation on every input, never trust client-provided role, rate-limit `/api/ai/*` routes (simple in-memory or Upstash free-tier limiter) since Groq free tier has request limits.
- **Performance**: use React Server Components for data-heavy dashboard pages, TanStack Query for client-side mutations, pagination on shipment lists.
- **Accessibility**: landing page respects reduced-motion, proper contrast ratios, keyboard-navigable dashboard.
- **Testing**: Vitest unit tests for risk-scoring logic and Zod schemas; Playwright smoke test for the create-shipment → track-shipment flow.
- **Seed data**: a `prisma/seed.ts` that generates realistic demo warehouses/vehicles/drivers/shipments/events so the app looks alive on first run and for the demo/viva.

---

## 11. Suggested Build Order (for opencode)
1. Scaffold Next.js + Tailwind + shadcn + Prisma schema + Docker Compose Postgres; get `prisma migrate dev` and seed script working.
2. Auth.js + role middleware + basic protected layout shells.
3. Core CRUD: warehouses, vehicles, customers, shipments (dashboard tables + forms).
4. Shipment status/event timeline + public tracking page.
5. Driver view.
6. KPI dashboard (Recharts) fed by real seeded data.
7. Groq integration: copilot endpoint with DB-grounding, delay-risk scoring + explanation, document extraction.
8. Landing page with GSAP (build this after the app works — it's marketing dressing on top of a real product, not the other way around).
9. Tests + polish + deployment to Vercel/Neon.
10. README with architecture diagram, setup instructions, and an "AI grounding" explanation section (useful for faculty panel questions about "is this just a ChatGPT wrapper").

---

## 12. Stretch Goals (only if time remains)
- Route optimization suggestion (nearest-neighbor/greedy TSP heuristic across a driver's assigned shipments, with Groq generating the human-readable route plan explanation).
- Simple notification emails (Resend free tier) on shipment delivered/exception.
- CSV bulk-import for shipments.