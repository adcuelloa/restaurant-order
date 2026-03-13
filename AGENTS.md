# Restaurant Ordering API — Agent & Coding Rules

This file defines coding rules and architecture for the **Restaurant Ordering API + Timeline Viewer**.

---

## Project context

- **Monorepo:** Turborepo with `apps/api` (NestJS backend) and `apps/frontend` (React + Vite). Root scripts delegate via `turbo run` or `pnpm --filter`.
- **Stack:** NestJS (Express adapter for Lambda), TypeScript (strict), MongoDB (Mongoose), Redis, serverless-offline.
- **Scope:** Orders with server-side pricing (cents), idempotent checkout, append-only Order Timeline, PATCH for order status and item updates, React+Vite frontend with **shadcn/ui** (Tailwind v4, Base UI).
- **Runtime:** API runs via serverless-offline (AWS API Gateway + Lambda emulation); no PM2.

### Repository layout

- **Root:** `package.json` (Turbo scripts), `pnpm-workspace.yaml` (`apps/api`, `apps/frontend`), `turbo.json`, `README.md`, `PLAN.md`, `AGENTS.md`.
- **apps/api:** NestJS app. `src/` (main.ts, lambda.ts, app.module, config, common, modules), `infra/` (docker-compose.dev.yml), `serverless.yml`, `tsdown.config.ts`, `tsconfig.json`, `.env.example`.
- **apps/frontend:** React + Vite. `src/` (main.tsx, app/, features/, services/, config), `vite.config.ts`, `index.html`.

---

## Skills (see `skills-lock.json`)

- **`.agents/skills/redis-development/`** — Redis key naming, TTL, connection pooling/timeouts, avoiding blocking commands, security (auth, network). Use when changing Redis usage or adding new keys/cache. Key builder lives in `apps/api/src/common/redis-keys.ts`; never hardcode key strings.
- **`.agents/skills/vercel-react-best-practices/`** — React performance (async/parallel, bundle size, re-renders, rendering). Apply when writing or refactoring frontend code; prefer direct imports over barrel files, use transitions for non-urgent updates, derive state during render.

---

## Coding rules

### General

- **Language:** TypeScript only. Strict mode; no JavaScript files.
- **Formatting:** Prettier. Linting: ESLint. Fix before considering a task done.
- **Imports:** In API use path aliases for `src/` where configured (e.g. `apps/api/tsconfig.json`). In frontend use `@/` for `src/`.
- **Naming:**  
  - Modules: `{domain}.module.ts`.  
  - Controllers: `{domain}.controller.ts`.  
  - Services: `{domain}.service.ts`.  
  - Validators: Zod schemas in `*.validator.ts` or next to types.  
  - DTOs: infer types from Zod with `z.infer<typeof schema>`.

### Backend (NestJS)

- **DI:** Use `@Inject(ServiceClass)` for constructor parameters if the build does not emit decorator metadata (e.g. esbuild). Prefer explicit `@Inject()` so dependencies resolve under serverless/Lambda.
- **Controllers:** Return plain objects; let Nest serialize. Use `@Body(ZodValidationPipe(schema))`, `@Query(...)`, `@Param(...)`. For `POST /orders`, require `Idempotency-Key` via guard or pipe and pass to service.
- **Guards:** Use guards for idempotency key presence and for optional auth (e.g. API key). No Express middleware for business rules.
- **Pipes:** ZodValidationPipe for body/query/param validation; ZodUpdatePipe for PATCH (reject empty body then validate).
- **Errors:** Throw `BadRequestException`, `NotFoundException`, `ConflictException`, or custom `ApplicationError` with status code. AllExceptionsFilter formats them and sets `X-Request-Id`.
- **Money:** Store and compute in **cents (integer)**. Validate item ids and quantities; never accept `totalCents` or `price` from client for order creation.

### Order status (state-machine-like)

- Status values: e.g. `draft` | `submitted` | `confirmed` | `preparing` | `ready` | `completed` | `cancelled`.
- Only allow defined transitions (e.g. `submitted` → `confirmed` → …). In the service, before updating status: check current status and throw if transition is invalid.
- Emit timeline events on status change (via event-emitter or outbox); event type matches the new status or a generic `order.status_changed` with payload.

### Idempotency

- **Header:** `Idempotency-Key` (required on `POST /orders`).
- **Storage:** Redis. Key: e.g. `idempotency:orders:{key}`. Value: full response body (or reference); TTL e.g. 24 hours.
- **Behavior:** If key exists, return stored response with same HTTP status. If not, create order, write response to Redis, return. Key builder must live in the shared Redis keys module.

### Event Sourcing (Timeline)

- **Collection:** Append-only. Documents: `orderId`, `eventType`, `payload`, `occurredAt`, optional `version`.
- **Writes:** Only `insertOne` (or bulk insert). No update or delete on this collection.
- **Reads:** `GET /api/v1/orders/:id/timeline` returns events for `orderId`, ordered by `occurredAt` (asc). Return as array of DTOs (camelCase in JSON).

### Redis keys

- Single module (e.g. `src/common/redis-keys.ts` or `keys.ts` in a redis package). Export functions: `idempotencyOrdersKey(key: string)`, and any cache keys (e.g. `orderTimelineCacheKey(orderId: string)` if you cache timeline). Never hardcode `"idempotency:orders:"` in services.

### Async processing

- Use **@nestjs/event-emitter** (or equivalent) to emit domain events after order creation. Listeners run asynchronously (do not block the HTTP response): e.g. append to timeline, update status. If using an outbox table, document the contract and processing guarantees.

### Logging and PII

- **Custom logger:** Use a logger that **masks PII** in structured logs (e.g. redact `email`, `phone`, `name`). Integrate with Nest (LoggerService) so all logs go through it. Document which fields are masked.
- **Request context:** Optional ALS (AsyncLocalStorage) for requestId; set in middleware/hook and add to AllExceptionsFilter and logger. Include `X-Request-Id` in error responses.

### API responses

- **JSON:** Prefer **camelCase** in API responses (e.g. `orderId`, `totalCents`, `occurredAt`). Map Mongoose documents to DTOs in controllers or a small mapper layer.
- **Errors:** Consistent shape: `{ statusCode, message, error?, requestId? }`. Validation errors: 400 with field-level details if useful.

---

## Frontend (React + Vite + shadcn/ui)

- **UI:** shadcn/ui (Tailwind v4, Base UI). Components in `apps/frontend/src/components/ui/`; theme and CSS variables in `src/index.css`. Add components via `npx shadcn@latest add <name>` from `apps/frontend`.
- **Structure:** Feature-based under `apps/frontend/src/features/`: `orders/`, `items/`, timeline in order detail. Services for API calls; TanStack Query for data. Vite proxy `/api` to API.
- **Idempotency:** Generate a UUID (e.g. `crypto.randomUUID()`) for `Idempotency-Key` when submitting an order; send as header. Same key on retry returns same response.
- **Timeline:** Call `GET /orders/:id/timeline` and render events in chronological order.
- **Skills:** Follow `.agents/skills/vercel-react-best-practices/` (see skills-lock.json): avoid barrel imports from large libs, prefer explicit conditional rendering (ternary), derive state during render.

---

## Pre-completion checklist

Before marking a task done:

1. **Type-check:** From repo root run `pnpm run typecheck` (Turbo runs typecheck in api and type-check in frontend). Zero errors.
2. **Lint:** From root run `pnpm run lint`. Fix new errors in the touched app(s).
3. **Test:** From root run `pnpm run test` (Vitest in apps/api). All tests must pass.
4. **Build:** From root run `pnpm run build` (Turbo builds api and frontend). Must succeed.
5. **Idempotency:** Verify `POST /api/v1/orders` with same `Idempotency-Key` returns same response and does not create duplicate orders.
6. **Timeline:** Verify events are append-only and readable via `GET /api/v1/orders/:id/timeline`. Status changes (PATCH order) emit timeline events.
7. **PII:** Confirm logger does not log raw PII (masked or omitted). Logger in `apps/api/src/config/logger.ts`.

---

## Do not generate

- Extra READMEs beyond the existing root README (Phase 4).
- Test files unless explicitly requested.
- Dockerfile for the Node app (serverless-offline runs on host).
- PostgreSQL or Drizzle. Use only MongoDB (Mongoose).
- `any` types.

---

## Summary

- **Adapt:** MongoDB + Mongoose, serverless-offline, append-only timeline, idempotency with Redis, server-side cents, PII masking in logs.
- **Deliver:** Idempotent `POST /api/v1/orders`, `GET /api/v1/orders/:id/timeline`, `PATCH /api/v1/orders/:id` (status), `PATCH /api/v1/items/:id` (update item), minimal React UI with order status controls, and a copy-paste README for the reviewer (< 10 min).
