# Bank Reconciliation Workflow

## Overview

The reconciliation system allows you to match payments (expected income) with bank transactions (actual deposits) to ensure accurate accounting and identify discrepancies.

## Workflow for Check Payments

### Scenario: Tenant sends check via email

1. **Record Payment Received** (when check arrives)
   - Create a payment record via `POST /api/payments`
   - Set `method: 'CHECK'`
   - Include `checkNumber` (e.g., "1234")
   - Set `createBankTransaction: true` to create a bank transaction record immediately
   - This represents the check being received but not yet cleared

   ```json
   {
     "chargeId": "uuid",
     "amount": 1000,
     "receivedDate": "2024-01-15",
     "method": "CHECK",
     "checkNumber": "1234",
     "createBankTransaction": true
   }
   ```

   Response includes both the payment and the bank transaction:
   ```json
   {
     "data": {
       "id": "payment-uuid",
       "method": "CHECK",
       "amount": 1000,
       "bankTransaction": {
         "id": "transaction-uuid",
         "date": "2024-01-15",
         "amount": 1000,
         "reference": "1234",
         "reconciled": false
       }
     }
   }
   ```

2. **Check Clears** (when check is deposited and clears)
   - Import bank statement transactions via `POST /api/reconciliation/import-transactions`
   - Or manually update the bank transaction via `PUT /api/reconciliation/bank-transactions/:id`
   - Update the transaction date/amount if different from when received
   - Mark as `reconciled: true` when the check clears

   ```json
   {
     "date": "2024-01-17",  // Date check cleared
     "amount": 1000,
     "reconciled": true
   }
   ```

3. **Reconciliation Period** (monthly/periodic)
   - Create a reconciliation period via `POST /api/reconciliation`
   - System automatically matches payments with bank transactions
   - Review unmatched items
   - Complete reconciliation when all items are matched

## API Endpoints

### Reconciliation Management

- `GET /api/reconciliation` - List all reconciliations
- `POST /api/reconciliation` - Create a new reconciliation period
- `GET /api/reconciliation/:id` - Get reconciliation details with unmatched items
- `PUT /api/reconciliation/:id/complete` - Mark reconciliation as completed/reviewed

### Bank Transaction Import

- `POST /api/reconciliation/import-transactions` - Import bank transactions (CSV, OFX, or manual)
- `PUT /api/reconciliation/bank-transactions/:id` - Update a bank transaction (e.g., when check clears)

### Matching

- `POST /api/reconciliation/:id/match` - Manually match a payment with a bank transaction
- `POST /api/reconciliation/:id/auto-match` - Run auto-matching algorithm
- `GET /api/reconciliation/unmatched/list` - List unmatched payments and transactions

### Payment Creation (Enhanced)

- `POST /api/payments` - Create payment (supports check payments with bank transaction creation)

## Auto-Matching Algorithm

The system automatically matches payments with bank transactions using:

1. **Exact Match**: Same amount, within 3 days
   - Automatically reconciled
   - Confidence: 100%

2. **Fuzzy Match**: Amount within 1%, within 7 days
   - Suggested match (requires manual review)
   - Confidence score calculated based on amount difference and date difference

## Reconciliation Status

- `PENDING` - Reconciliation period created but not started
- `IN_PROGRESS` - Matching in progress
- `COMPLETED` - All items matched and reviewed
- `REVIEWED` - Final review completed

## Example: Complete Check Payment Flow

```bash
# 1. Tenant sends check #1234 for $1000 rent
POST /api/payments
{
  "chargeId": "charge-uuid",
  "amount": 1000,
  "receivedDate": "2024-01-15",
  "method": "CHECK",
  "checkNumber": "1234",
  "createBankTransaction": true
}

# 2. Check clears on 2024-01-17
PUT /api/reconciliation/bank-transactions/{transaction-id}
{
  "date": "2024-01-17",
  "reconciled": true
}

# 3. Monthly reconciliation
POST /api/reconciliation
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}

# System auto-matches the payment with the bank transaction

# 4. Review and complete
PUT /api/reconciliation/{reconciliation-id}/complete
{
  "notes": "All checks cleared, reconciliation complete"
}
```

## Manual Entry for Bank Transactions

If you receive bank statements via email or need to manually enter transactions:

```bash
POST /api/reconciliation/import-transactions
{
  "transactions": [
    {
      "date": "2024-01-17",
      "amount": 1000,
      "description": "Check payment #1234",
      "reference": "CHECK-1234",
      "accountNumber": "****1234",
      "accountName": "Business Checking"
    }
  ],
  "importSource": "email"  // or "manual", "csv", "ofx"
}
```

## Testing

All reconciliation functionality is covered by comprehensive tests:
- `apps/api/src/tests/reconciliation.test.ts` - API route tests
- `apps/api/src/tests/lib/reconciliation.test.ts` - Library function tests
- `apps/api/src/tests/payments.test.ts` - Check payment workflow tests

Run tests:
```bash
npm test -- reconciliation.test.ts payments.test.ts
```

