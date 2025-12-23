# PropVestor

PropVestor is a property management platform with a Phase 1 operational suite and a Phase 2 investment schema.

## Stack

- Backend: Node.js + TypeScript + Express + Prisma + PostgreSQL
- Frontend: Next.js + React + TypeScript + React Query + Tailwind CSS

## Project structure

- `apps/api` – Express API + Prisma schema
- `apps/web` – React frontend

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

**Note**: Next.js uses `.env.local` for local development. Set `NEXT_PUBLIC_API_URL` in this file.

3. Run migrations and generate Prisma client:

```bash
npm run prisma:migrate
```

4. Seed demo data:

```bash
npm run seed
```

5. Start the backend and frontend:

```bash
# Start backend (in one terminal)
npm --workspace apps/api run dev

# Start frontend (in another terminal)
npm --workspace apps/web run dev
```

The frontend will be available at `http://localhost:3000` (Next.js default port).

## Tests

```bash
npm --workspace apps/api run test
```

## Scripts

- `npm run prisma:generate` – Generate Prisma client
- `npm run prisma:migrate` – Create/execute migrations
- `npm run prisma:studio` – Launch Prisma Studio
- `npm run seed` – Seed demo org + property data

## API notes

All API routes are served under `/api` and require a Bearer JWT token, except `/auth/*`.

## Architecture: Unified Property & Investment Management

**Key Design Principle**: The same user with the same role can access BOTH property management (Phase 1) AND investment management (Phase 2) within the same organization.

- A single `OrganizationMembership` with one role grants access to all features
- No separate accounts or roles needed for property vs investment management
- The role (OWNER, ADMIN, MANAGER, ACCOUNTANT, VIEWER) applies consistently across both domains
- Users can seamlessly work with properties, tenants, leases, AND investment entities, investors, and distributions using the same account

See `ROLES_AND_PERMISSIONS.md` for detailed role definitions and permissions.

## Phase 2 schema

Investment management models are included in `apps/api/prisma/schema.prisma` but have no API or UI yet. When implemented, they will be accessible to the same users with the same roles as property management.

## Deployment

PropVestor is designed to deploy the backend and frontend separately. See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions, including:

- Docker and Docker Compose setup
- Separate deployment guides for backend and frontend
- Environment variable configuration (Note: Frontend uses `NEXT_PUBLIC_API_URL` instead of `VITE_API_URL`)
- Production checklist
- Platform-specific deployment guides (Vercel recommended for Next.js, Netlify, AWS, GCP, etc.)
- Scaling and monitoring recommendations

**Frontend Migration**: The frontend has been migrated to Next.js. See [NEXTJS_MIGRATION_COMPLETE.md](./NEXTJS_MIGRATION_COMPLETE.md) for details.
