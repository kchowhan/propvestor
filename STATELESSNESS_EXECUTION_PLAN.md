# Statelessness Execution Plan

This document captures the plan to make `apps/api` and `apps/web` safe for multi-instance deployment, with minimal memory risks and no cross-instance data leakage.

## Goals
- Ensure request handling is stateless across API instances.
- Move any shared state (rate limits, caches) to external stores.
- Prevent in-memory growth and memory spikes under load.

## Scope
- API: `apps/api`
- Web: `apps/web`

## Priority 0 — Shared Rate Limiting
**Goal**: enforce consistent limits across instances and prevent unbounded in-memory growth.

**Change**
- Replace in-process Maps in `rate-limit.ts` with a shared store (Redis recommended).
- If Redis is unavailable initially, add TTL cleanup to every in-memory limiter store (including `createRateLimiter` instances).
- Ensure admin/webhook limiters also use the shared store or share cleanup logic.

**Files**
- `apps/api/src/middleware/rate-limit.ts`

**Tests**
- `apps/api/src/tests/rate-limit.test.ts`

## Priority 1 — Upload Memory Safety
**Goal**: avoid memory spikes when uploading documents.

**Change**
- Use streaming uploads to storage (GCS/S3) instead of `multer.memoryStorage()`.
- Enforce content-type and size limits consistently.
- Consider temporary disk storage if streaming is not feasible immediately.

**Files**
- `apps/api/src/routes/documents.ts`
- `apps/api/src/lib/storage.ts`

**Tests**
- `apps/api/src/tests/documents.test.ts`

## Priority 2 — Remove Hidden Process State
**Goal**: avoid any future in-process caches that can diverge between instances.

**Change**
- Add a short design note in `apps/api/README` or `DEPLOYMENT.md` indicating all caches must be externalized.
- Optionally add a lint or code check guideline for in-memory stores.

**Files**
- `DEPLOYMENT.md` or `apps/api/README.md`

## Priority 3 — Web App Statelessness Guardrails
**Goal**: confirm server-side rendering paths are stateless.

**Change**
- Keep auth/session state in cookies/JWT only (already true).
- Avoid server-side in-memory caches in Next.js app.
- If caching is needed, use CDN or external cache.

**Files**
- `apps/web/src/context/AuthContext.tsx`
- `apps/web/src/context/HomeownerAuthContext.tsx`

## Validation Checklist
- Rate limits behave consistently when round-robined across two API instances.
- Uploads do not increase API memory linearly with file size.
- No request-specific data persists in memory across requests.

