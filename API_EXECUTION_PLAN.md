# API Execution Plan

This document captures the agreed performance/scalability patch plan for the API. It is intended to be executed after the other agent completes their current work.

## Global Conventions
- Add `limit` (max 100, default 50) and `offset` (default 0) to list endpoints.
- Response format:
  - `data: [...]`
  - `pagination: { total, limit, offset, hasMore }`
- Keep existing `data` shape for each item (no breaking changes).
- If endpoint already paginates, align to the same response shape.

## Priority 0 — Rate Limit Cache
**Goal**: avoid DB hit per request for subscription limits.

**Change**
- Add in-memory TTL cache (e.g., Map with `expiresAt`) keyed by orgId in `rate-limit.ts`.
- Cache value: `{ apiCalls }` from `getSubscriptionLimits`.
- TTL: 60s (configurable).

**Files**
- `apps/api/src/middleware/rate-limit.ts`
- `apps/api/src/lib/subscriptions.ts` (no change unless a helper is added)

**Tests**
- `apps/api/src/tests/rate-limit.test.ts` — add test to ensure limits are reused within TTL.
- `apps/api/src/tests/lib/subscriptions.test.ts` — no change unless new helper added.

## Priority 1 — Pagination for list endpoints
Add query parsing + pagination to these endpoints:

1) **Work Orders**
- File: `apps/api/src/routes/work-orders.ts`
- Query: `status`, `propertyId`, `priority`, `limit`, `offset`
- Response: `{ data: WorkOrder[], pagination }`
- Tests: `apps/api/src/tests/work-orders.test.ts`

2) **Vendors**
- File: `apps/api/src/routes/vendors.ts`
- Query: `limit`, `offset`
- Response: `{ data: Vendor[], pagination }`
- Tests: `apps/api/src/tests/vendors.test.ts`

3) **Charges**
- File: `apps/api/src/routes/charges.ts`
- Query: `limit`, `offset`, optionally `status`, `type`
- Response: `{ data: Charge[], pagination }`
- Tests: `apps/api/src/tests/charges.test.ts`

4) **Payments**
- File: `apps/api/src/routes/payments.ts`
- Query: `tenantId`, `limit`, `offset`
- Response: `{ data: Payment[], pagination }`
- Tests: `apps/api/src/tests/payments.test.ts`

5) **Screening Requests**
- File: `apps/api/src/routes/screening.ts`
- Query: `status`, `tenantId`, `limit`, `offset`
- Response: `{ data: ScreeningRequest[], pagination }`
- Tests: `apps/api/src/tests/screening.test.ts`

6) **Associations**
- File: `apps/api/src/routes/associations.ts`
- Query: `isActive`, `limit`, `offset`
- Response: `{ data: AssociationSummary[], pagination }`
- Tests: `apps/api/src/tests/associations.test.ts`

7) **Board Members**
- File: `apps/api/src/routes/board-members.ts`
- Query: `associationId`, `isActive`, `role`, `limit`, `offset`
- Response: `{ data: BoardMember[], pagination }`
- Tests: `apps/api/src/tests/board-members.test.ts`

## Priority 2 — Reconciliation + Reports payload sizing
**Reconciliation**
- File: `apps/api/src/routes/reconciliation.ts`
- Add pagination to:
  - `GET /reconciliation` (list)
  - `GET /reconciliation/:id` (paginate `unmatchedPayments` and `unmatchedTransactions` with `limit/offset` query params)
  - `GET /reconciliation/unmatched/list` (paginate)
- Response: keep `data`, add `pagination` for list endpoints and for unmatched collections.

**Reports**
- File: `apps/api/src/routes/reports.ts`
- Add pagination for `GET /reports/rent-roll` (limit/offset); keep KPIs unchanged.

**Tests**
- `apps/api/src/tests/reconciliation.test.ts`
- `apps/api/src/tests/reports.test.ts`

## Priority 3 — Billing batching
**Goal**: avoid timeouts for large orgs.

**Change**
- `POST /billing/generate-monthly-rent`
  - Add batching with concurrency limit (e.g., 10 leases at a time).
  - Optional: move payment processing to async job; return accepted response if too large.

**Files**
- `apps/api/src/routes/billing.ts`
- Optional new helper: `apps/api/src/lib/billing.ts`

**Tests**
- `apps/api/src/tests/billing.test.ts`

## Priority 4 — Payment status calc
**Change**
- Replace loading all payments with aggregate sum query for `chargeId`.

**File**
- `apps/api/src/routes/payments.ts`

**Tests**
- `apps/api/src/tests/payments.test.ts`
