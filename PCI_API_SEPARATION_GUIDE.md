# PCI API Separation Guide

This guide outlines how to separate PCI (Payment Card Industry) related APIs into a separate service to reduce PCI DSS compliance scope.

## Current PCI-Related Routes

The following routes currently handle PCI-sensitive operations:

1. **`/payment-methods`** - Payment method management
   - `GET /publishable-key` - Get Stripe publishable key
   - `POST /setup-intent` - Create setup intent for adding payment methods
   - `POST /attach` - Attach payment method to customer
   - `GET /tenant/:tenantId` - List payment methods for tenant
   - `DELETE /:paymentMethodId` - Delete payment method

2. **`/payments`** - Payment processing
   - `POST /process-stripe` - Process payment via Stripe
   - `GET /stripe-status/:paymentIntentId` - Check Stripe payment status

3. **`/stripe/webhook`** - Stripe webhook handler
   - `POST /webhook` - Receives Stripe events

## Architecture Approach

### Option 1: Separate Microservice (Recommended)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │ ──────> │  Main API   │ ──────> │  PCI API    │
│  (Next.js)  │         │  (Port 4000)│         │ (Port 4001) │
└─────────────┘         └──────┬───────┘         └──────┬──────┘
                              │                         │
                              ▼                         ▼
                        ┌─────────────┐         ┌─────────────┐
                        │  PostgreSQL │         │   Stripe    │
                        │  (Shared)   │         │     API     │
                        └─────────────┘         └─────────────┘
```

### Option 2: API Gateway Pattern

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ API Gateway │ ───> Routes to appropriate service
│ (Port 4000) │
└──────┬──────┘
       │
       ├──────> Main API (Port 4001)
       │
       └──────> PCI API (Port 4002)
```

## Implementation Steps

### Step 1: Create New PCI API Service

**Structure:**
```
apps/
├── api/              # Main API (existing)
└── pci-api/          # New PCI API service
    ├── src/
    │   ├── index.ts
    │   ├── app.ts
    │   ├── routes/
    │   │   ├── payment-methods.ts
    │   │   ├── payments.ts
    │   │   └── stripe-webhook.ts
    │   ├── lib/
    │   │   ├── stripe.ts
    │   │   └── prisma.ts
    │   ├── middleware/
    │   │   └── auth.ts
    │   └── config/
    │       └── env.ts
    ├── package.json
    └── .env
```

### Step 2: Identify Routes to Move

**Move to PCI API:**
- ✅ `/payment-methods/*` - All payment method operations
- ✅ `/payments/process-stripe` - Stripe payment processing
- ✅ `/payments/stripe-status/:paymentIntentId` - Stripe status check
- ✅ `/stripe/webhook` - Stripe webhook handler

**Keep in Main API:**
- ✅ `/payments` (GET, POST) - Payment record CRUD (non-PCI)
- ✅ `/payments/tenant/:tenantId` - List payments (read-only, no PCI data)
- ✅ `/charges` - Charge management (no PCI data)

### Step 3: Authentication Between Services

**Option A: Shared JWT Secret**
- Both APIs use the same `JWT_SECRET`
- Frontend sends JWT to PCI API directly
- PCI API validates JWT independently

**Option B: Service-to-Service Auth**
- Main API validates JWT
- Main API calls PCI API with service token
- PCI API validates service token

**Option C: API Gateway**
- Gateway validates JWT
- Gateway routes to appropriate service
- Services trust gateway

**Recommended: Option A** (simplest, maintains stateless auth)

### Step 4: Database Access

**Shared Database Approach:**
- Both APIs connect to same PostgreSQL database
- PCI API only accesses:
  - `TenantPaymentMethod` table
  - `Payment` table (for Stripe-related fields)
  - `Tenant` table (for `stripeCustomerId`)
- Use database-level permissions if needed

**Alternative: Separate Database**
- PCI API has its own database
- Sync via events/messaging (more complex)

### Step 5: Environment Variables

**PCI API `.env`:**
```bash
# Server
PORT=4001
DATABASE_URL=postgresql://user:password@localhost:5432/propvestor

# Authentication (shared with main API)
JWT_SECRET=your-shared-secret
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:4000

# Stripe (PCI-sensitive)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Main API `.env` (remove Stripe):**
```bash
# Remove Stripe-related env vars
# Keep everything else
```

### Step 6: Frontend Changes

**Update API Client:**
```typescript
// apps/web/src/api/client.ts

const MAIN_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const PCI_API_URL = process.env.NEXT_PUBLIC_PCI_API_URL ?? 'http://localhost:4001/api';

export const apiFetch = async (path: string, options: FetchOptions = {}) => {
  // Use main API by default
  const API_URL = MAIN_API_URL;
  // ... existing code
};

export const pciApiFetch = async (path: string, options: FetchOptions = {}) => {
  // Use PCI API for payment operations
  const API_URL = PCI_API_URL;
  // ... same implementation
};
```

**Update Components:**
- `AddPaymentMethodModal.tsx` - Use `pciApiFetch` for payment method operations
- Payment processing - Use `pciApiFetch` for Stripe operations

### Step 7: Main API Changes

**Remove from Main API:**
- `apps/api/src/routes/payment-methods.ts` (move to PCI API)
- `apps/api/src/routes/stripe-webhook.ts` (move to PCI API)
- Stripe processing from `apps/api/src/routes/payments.ts`
- `apps/api/src/lib/stripe.ts` (move to PCI API)

**Keep in Main API:**
- Payment record CRUD (non-PCI operations)
- Charge management
- Payment history queries (read-only)

**Add to Main API:**
- Optional: Proxy endpoints that forward to PCI API (if using gateway pattern)

### Step 8: Communication Between Services

**Option A: Direct Frontend Calls (Recommended)**
- Frontend calls PCI API directly
- Simpler, fewer hops
- Requires CORS configuration

**Option B: Main API Proxy**
- Frontend → Main API → PCI API
- Main API acts as proxy
- More control, but adds latency

**Option C: Event-Driven**
- PCI API publishes events
- Main API subscribes to events
- More complex, better for async operations

### Step 9: Deployment

**Separate Deployments:**
```yaml
# docker-compose.yml
services:
  api:
    build: ./apps/api
    ports:
      - "4000:4000"
    # No Stripe env vars

  pci-api:
    build: ./apps/pci-api
    ports:
      - "4001:4001"
    environment:
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
    # Isolated network (optional)
    networks:
      - pci-network
```

**Security Considerations:**
- PCI API should be in isolated network/VPC
- Stricter firewall rules
- Enhanced logging and monitoring
- Regular security audits
- PCI DSS compliance certification

## Benefits

1. **Reduced PCI Scope**: Main API doesn't handle card data
2. **Better Security**: Isolated PCI operations
3. **Independent Scaling**: Scale PCI API separately
4. **Compliance**: Easier to certify PCI API separately
5. **Risk Isolation**: PCI breach doesn't affect main API

## Challenges

1. **Complexity**: Two services to manage
2. **Authentication**: Need shared or service-to-service auth
3. **Database**: Shared database or sync mechanism
4. **Deployment**: Two services to deploy
5. **Monitoring**: Two services to monitor

## Migration Checklist

- [ ] Create `apps/pci-api` directory structure
- [ ] Move PCI-related routes to PCI API
- [ ] Move Stripe library to PCI API
- [ ] Update environment variables
- [ ] Update frontend to use PCI API
- [ ] Remove Stripe dependencies from main API
- [ ] Update CORS configuration
- [ ] Update deployment configuration
- [ ] Test authentication flow
- [ ] Test payment processing end-to-end
- [ ] Update documentation
- [ ] Set up monitoring for PCI API
- [ ] Configure security hardening for PCI API

## Example: PCI API Route

```typescript
// apps/pci-api/src/routes/payment-methods.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createSetupIntent, attachPaymentMethod } from '../lib/stripe.js';

export const paymentMethodRouter = Router();

// All routes require authentication
paymentMethodRouter.use(requireAuth);

paymentMethodRouter.post('/setup-intent', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const { tenantId } = req.body;
    
    // Verify tenant belongs to organization
    const tenant = await prisma.tenant.findFirst({
      where: { 
        id: tenantId, 
        organizationId: req.auth.organizationId 
      },
    });

    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found.');
    }

    // Create setup intent
    const setupIntent = await createSetupIntent(tenant.stripeCustomerId);
    
    res.json({ 
      data: { 
        clientSecret: setupIntent.client_secret 
      } 
    });
  } catch (err) {
    next(err);
  }
});
```

## Security Best Practices

1. **Network Isolation**: PCI API in separate VPC/network
2. **Firewall Rules**: Restrict access to PCI API
3. **Encryption**: TLS 1.3 for all communications
4. **Logging**: Comprehensive audit logs (no card data)
5. **Monitoring**: Real-time security monitoring
6. **Access Control**: Strict RBAC for PCI API
7. **Regular Audits**: PCI DSS compliance audits
8. **Key Management**: Secure key storage (AWS KMS, etc.)
9. **Tokenization**: Never store full card numbers
10. **Compliance**: Regular PCI DSS assessments

## Alternative: PCI Proxy Service

Instead of full separation, you could use a PCI proxy service like:
- **Stripe Connect** - Handles PCI compliance
- **Braintree** - PCI-compliant proxy
- **Adyen** - PCI-compliant payment gateway

These services handle PCI compliance, reducing your scope further.

