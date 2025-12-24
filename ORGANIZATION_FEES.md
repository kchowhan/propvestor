# Organization Fees - RentSpree & Stripe Processing Fees

## Overview

The organization (property management company) is responsible for paying service fees associated with:
1. **RentSpree Background Checks** - Screening fees when requesting tenant background checks
2. **Stripe Processing Fees** - Transaction fees when collecting rent payments from tenants via Stripe

**Important**: While tenants pay their own rent, the organization pays the service fees (RentSpree screening costs and Stripe processing fees).

---

## Implementation

### Database Model

A new `OrganizationFee` model tracks all fees that the organization must pay:

```prisma
model OrganizationFee {
  id                String   @id @default(uuid())
  organizationId    String
  feeType           String   // 'RENTSPREE_SCREENING', 'STRIPE_PROCESSING'
  amount            Decimal
  description       String
  screeningRequestId String?  // If from RentSpree
  paymentId         String?   // If from Stripe payment
  chargeId          String?   // Charge created for this fee
  stripeFeeAmount   Decimal?  // Actual Stripe fee (if available)
  stripeFeeType     String?  // 'processing_fee', 'ach_fee'
  createdAt         DateTime
  updatedAt         DateTime
}
```

Each organization fee automatically creates a `Charge` record (type: `SERVICE_FEE`) that the organization must pay.

---

## RentSpree Screening Fees

### When Fees Are Created

When an organization requests a background check via RentSpree:
1. Screening request is created
2. **Organization fee is automatically created** for the RentSpree screening cost
3. A `Charge` record is created for the organization to pay

### Fee Amount

- **Default**: $29.95 per screening (configurable via `RENTSPREE_SCREENING_FEE` environment variable)
- Can be retrieved from RentSpree API response if available

### Code Flow

```typescript
// In /api/screening/request
const rentspreeResponse = await createScreeningApplication({...});
const screeningRequest = await prisma.screeningRequest.create({...});

// Create organization fee
await createRentSpreeScreeningFee(
  organizationId,
  screeningRequest.id,
  29.95, // Fee amount
  `Background check for ${tenant.name}`
);
```

---

## Stripe Processing Fees

### When Fees Are Created

When a tenant payment is successfully processed via Stripe:
1. Payment record is created
2. **Organization fee is automatically created** for the Stripe processing fee
3. A `Charge` record is created for the organization to pay

### Fee Calculation

Stripe fees are calculated based on payment method type:

- **Cards**: 2.9% + $0.30 per transaction
  - Example: $2,000 payment → $58.30 fee (2000 × 0.029 + 0.30)

- **ACH**: $0.80 per transaction
  - Example: $2,000 payment → $0.80 fee

### Actual vs. Estimated Fees

The system attempts to retrieve the **actual** Stripe fee from the PaymentIntent's balance transaction. If unavailable, it uses the calculated estimate.

### Code Flow

```typescript
// In Stripe webhook handler (payment_intent.succeeded)
const payment = await prisma.payment.create({...});

// Get actual fee from Stripe (if available)
const actualFee = await getStripeFeeFromPaymentIntent(
  paymentIntent.id,
  stripeClient
);

// Create organization fee
await createStripeProcessingFee(
  organizationId,
  payment.id,
  paymentAmount,
  paymentMethodType, // 'card' or 'ach'
  paymentIntent.id,
  actualFee // Use actual if available, otherwise calculate
);
```

---

## API Endpoints

### List Organization Fees

```http
GET /api/organization-fees
Authorization: Bearer <token>
```

**Query Parameters:**
- `feeType` (optional): Filter by fee type (`RENTSPREE_SCREENING`, `STRIPE_PROCESSING`)
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "feeType": "RENTSPREE_SCREENING",
      "amount": "29.95",
      "description": "Background check for John Doe",
      "screeningRequest": {...},
      "charge": {...},
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "organizationId": "uuid",
      "feeType": "STRIPE_PROCESSING",
      "amount": "58.30",
      "description": "Stripe card processing fee for payment",
      "payment": {...},
      "stripeFeeAmount": "58.30",
      "stripeFeeType": "processing_fee",
      "charge": {...},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Charge Records

Each organization fee automatically creates a `Charge` record:

- **Type**: `SERVICE_FEE`
- **Amount**: Fee amount
- **Due Date**: Immediately (current date)
- **Status**: `PENDING` (until organization pays)

The organization can track and pay these charges like any other charge in the system.

---

## Environment Variables

### RentSpree Screening Fee

```env
RENTSPREE_SCREENING_FEE=29.95
```

Default: `29.95` if not set.

---

## Summary

### Who Pays What?

| Service | Who Pays | What For |
|---------|----------|----------|
| **RentSpree Screening** | Organization | Background check fees |
| **Stripe Processing** | Organization | Transaction fees (2.9% + $0.30 for cards, $0.80 for ACH) |
| **Tenant Rent** | Tenant | Their own rent payments |

### Key Points

1. **Organization pays service fees** (RentSpree, Stripe)
2. **Tenants pay their own rent** (not the organization)
3. **Fees are automatically tracked** and create charge records
4. **Organization can view all fees** via API endpoint
5. **Charges are created immediately** for the organization to pay

---

## Testing

All functionality is covered by comprehensive tests in `apps/api/src/tests/organization-fees.test.ts`:

- ✅ Fee calculation (Stripe card and ACH)
- ✅ RentSpree screening fee creation
- ✅ Stripe processing fee creation
- ✅ Organization fee listing
- ✅ Fee filtering by type
- ✅ API endpoint tests

Run tests:
```bash
npm test -- organization-fees.test.ts
```

