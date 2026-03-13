# Restaurant Ordering API (NestJS) + Order Timeline Viewer

NestJS-based ordering service with clean architecture, robust validation, idempotent checkout, and an Order Timeline with a minimal UI to interact with the system.

**Stack:** Turborepo monorepo — NestJS API (serverless-offline) + React + Vite frontend. MongoDB, Redis, Docker for local infra.

---

## Goal

Build a NestJS-based ordering service with:

- Domain modules for menu, pricing, orders, timeline
- Asynchronous order processing (event bus / listeners)
- Minimal UI to create an order and view status + timeline

---

## Prerequisites

| Requirement | Version / notes |
|-------------|-----------------|
| **Node.js** | 24+ |
| **Package manager** | pnpm 10.x — `npm install -g pnpm` |
| **Docker + Docker Compose** | For MongoDB and Redis (required for API) |

---

## Environment setup

1. Copy the example env file for the API:

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

2. **Required variables** (defaults work with local Docker):

   | Variable      | Required | Default                          | Description        |
   |---------------|----------|----------------------------------|--------------------|
   | `MONGODB_URI` | Yes      | `mongodb://localhost:27017/restaurant` | MongoDB connection |
   | `REDIS_URL`   | Yes      | `redis://localhost:6379`         | Redis for idempotency |

3. **Optional:** `NODE_ENV`, `STAGE` (serverless stage).

Place `.env` in `apps/api/`. No env file is required for the frontend (it proxies `/api` to the API).

---

## How to run locally

**Expected time:** &lt; 10 minutes from clone to running system.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure (MongoDB + Redis)

```bash
pnpm run infra:up
```

### 3. (Optional) Populate menu items

The **Create Order** page and the menu list items from **GET /api/v1/items**. If the database has no items, the UI will show an empty state. To load sample menu items (pizzas, salads, drinks, etc.) run the seed once:

```bash
pnpm run seed
```

This inserts a few sample items into MongoDB. If the `items` collection already has documents, the seed skips. You can also create items manually via `POST /api/v1/items` (see [Verify](#verify-copy-paste)).

### 4. Run API (dev mode — no serverless-offline)

```bash
pnpm run dev:api
```

This runs the NestJS app on port 3000 with hot reload. For Lambda emulation (serverless-offline) instead:

```bash
pnpm run build
pnpm run start:offline
```

- **API base URL:** `http://localhost:3000`
- **Port:** `3000`

### 5. Run frontend (separate terminal)

```bash
pnpm run dev:frontend
```

- **Frontend URL:** `http://localhost:5173`
- **Port:** `5173` (Vite); frontend proxies `/api` to the API.

### 6. Run both (API + frontend) in one command

```bash
pnpm run dev
```

### Ports summary

| Service   | Port | URL                      |
|----------|------|---------------------------|
| API      | 3000 | http://localhost:3000    |
| Frontend | 5173 | http://localhost:5173     |
| MongoDB  | 27017 (internal) | — |
| Redis    | 6379 (internal) | — |

**Startup order:** Start infra first (`infra:up`), then API (`dev:api`), then frontend (or use `pnpm run dev` for both).

---

## How to test

From the repo root:

```bash
pnpm run typecheck   # TypeScript check (api + frontend)
pnpm run lint        # ESLint (api + frontend)
pnpm run test        # Unit tests (Vitest in api)
```

Tests include:

- Idempotent `POST /orders` (same `Idempotency-Key` returns same response)
- Order status transitions
- Modifier validation (when menu with modifiers is used)
- Pricing / service logic (when applicable)

No extra env or seed is required for unit tests (mocks are used).

---

## Verify (copy-paste)

Use a unique `Idempotency-Key` per order (e.g. UUID). After seeding, use GET /menu for categories and items (some have modifier groups for customization).

```bash
# Get menu (categories + items)
curl -s http://localhost:3000/api/v1/menu | jq

# Create order (replace <ITEM_ID> with an id from menu; optional modifierSelections for customizable items)
curl -s -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen 2>/dev/null || echo 'test-key-1')" \
  -d '{"items":[{"itemId":"<ITEM_ID>","quantity":2}]}' | jq

# Get order (use orderId from above)
curl -s "http://localhost:3000/api/v1/orders/<ORDER_ID>" | jq

# Get order timeline
curl -s "http://localhost:3000/api/v1/orders/<ORDER_ID>/timeline" | jq

# Update order status (e.g. submitted → confirmed)
curl -s -X PATCH "http://localhost:3000/api/v1/orders/<ORDER_ID>" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}' | jq

# Update item (replace <ITEM_ID> with item id)
curl -s -X PATCH "http://localhost:3000/api/v1/items/<ITEM_ID>" \
  -H "Content-Type: application/json" \
  -d '{"description":"Margherita pizza"}' | jq
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm run build` | Build all apps (Turbo) |
| `pnpm run dev` | Run API + frontend in parallel |
| `pnpm run dev:api` | Run API with tsx watch |
| `pnpm run dev:frontend` | Run Vite dev server |
| `pnpm run start:offline` | Serverless offline (run `build` first) |
| `pnpm run infra:up` | Start MongoDB + Redis |
| `pnpm run infra:down` | Stop stack |
| **`pnpm run seed`** | **Insert sample menu items (for Create Order / menu)** |
| `pnpm run typecheck` | TypeScript check (all apps) |
| `pnpm run test` | Run API unit tests (Vitest) |
| `pnpm run lint` | Lint (api + frontend) |

---

## Project layout

```
apps/
  api/        — NestJS API (items, orders, timeline, event-emitter)
  frontend/   — React + Vite (menu/items, create order, order detail, timeline viewer)
```

- **apps/api/infra/** — Docker Compose (MongoDB, Redis)
- **apps/api/src/** — NestJS modules (items, orders, timeline, health)

---

## PII masking (logger)

The custom logger (`apps/api/src/config/logger.ts`) masks PII in structured logs. **Masked fields:** `email`, `phone`, `name`, `password`, `token`, `authorization` (and any key containing these substrings, case-insensitive). Logs must not contain raw PII.

---

## Quick start checklist

You should be able to:

1. Clone the repo and run `pnpm install`
2. Start infra with `pnpm run infra:up`
3. Copy `apps/api/.env.example` to `apps/api/.env`
4. Run `pnpm run build` and `pnpm run start:offline` for the API, and `pnpm run dev:frontend` for the UI (or `pnpm run dev` for both)
5. Have the full system running locally in **10 minutes or less** by following this README
