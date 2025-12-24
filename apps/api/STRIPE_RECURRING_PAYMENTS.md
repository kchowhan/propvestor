# Stripe Auto-Recurring Payments & Reconciliation

## How Stripe Auto-Recurring Payments Work

### Overview
The system automatically processes rent payments using stored payment methods (ACH or cards) when monthly rent charges are generated.

### Flow

#### 1. **Monthly Rent Generation** (Automated via Google Cloud Scheduler)
- **Trigger**: Google Cloud Scheduler calls `/api/billing/generate-monthly-rent` on the 1st of each month
- **Process**:
  - Creates rent charges for all active leases
  - For each charge, automatically attempts to process payment if a payment method exists
  - Uses the primary tenant's default payment method, or falls back to other tenants' payment methods

#### 2. **Automatic Payment Processing**
When a charge is created, the system:
1. Finds the best payment method:
   - Checks primary tenant's default payment method first
   - Falls back to other tenants' payment methods if needed
   - Only uses active payment methods

2. Creates Stripe Payment Intent:
   ```typescript
   stripe.paymentIntents.create({
     amount: rentAmount * 100, // in cents
     currency: 'usd',
     customer: tenant.stripeCustomerId,
     payment_method: paymentMethodId,
     confirmation_method: 'automatic',
     confirm: true,
     off_session: true, // Critical for recurring payments
     metadata: {
       chargeId,
       leaseId,
       tenantId,
       organizationId,
     },
   });
   ```

3. **Key Settings**:
   - `off_session: true` - Allows payment without customer being present (required for recurring)
   - `confirm: true` - Automatically confirms the payment intent
   - `confirmation_method: 'automatic'` - Stripe handles confirmation automatically

#### 3. **Payment Status Updates** (via Stripe Webhooks)
Stripe sends webhooks to `/api/stripe/webhook`:

- **`payment_intent.succeeded`**: 
  - Creates/updates payment record in database
  - Updates charge status to PAID
  - Stores `stripePaymentIntentId` and `stripeChargeId`

- **`payment_intent.payment_failed`**:
  - Logs failure
  - Charge remains PENDING (manual intervention required)

### Payment Method Setup
1. Tenant adds payment method via UI (Stripe.js)
2. Setup Intent created for ACH or card
3. Payment method attached to Stripe customer
4. Saved to database as `TenantPaymentMethod` with `isDefault` flag
5. Can be used for future recurring payments

## Reconciliation for Stripe Payments

### Current State
**Stripe payments create payment records, but bank transactions are NOT automatically created.**

### Reconciliation Options

#### Option 1: Import from Bank Statements (Current)
1. Stripe deposits funds to your bank account
2. Import bank statement transactions via `/api/reconciliation/import-transactions`
3. System auto-matches payments with bank transactions
4. Complete reconciliation

**Pros**: Works with any payment method, matches actual bank deposits
**Cons**: Manual import required, timing differences (Stripe may batch deposits)

#### Option 2: Import from Stripe Balance Transactions (Recommended Enhancement)
Stripe provides a Balance Transactions API that shows all deposits:

```typescript
// Pseudo-code for enhancement
const stripe = getStripeClient();
const balanceTransactions = await stripe.balanceTransactions.list({
  limit: 100,
  type: 'charge',
  created: { gte: startDate, lte: endDate },
});

// Create bank transactions from Stripe balance transactions
for (const tx of balanceTransactions.data) {
  await importBankTransactions(organizationId, [{
    date: new Date(tx.created * 1000),
    amount: tx.amount / 100, // Convert from cents
    description: `Stripe deposit - ${tx.description}`,
    reference: tx.id,
    accountName: 'Stripe Account',
  }], 'stripe');
}
```

**Pros**: Automatic, accurate, matches Stripe deposits exactly
**Cons**: Requires Stripe API integration

#### Option 3: Auto-Create Bank Transaction on Payment Success (Simple Enhancement)
When `payment_intent.succeeded` webhook fires, automatically create a bank transaction:

```typescript
// In handlePaymentSucceeded function
if (paymentIntent.charges?.data?.[0]?.id) {
  // Create bank transaction record
  await prisma.bankTransaction.create({
    data: {
      organizationId: charge.organizationId,
      date: new Date(), // Or use paymentIntent.created
      amount: paymentIntent.amount / 100,
      description: `Stripe payment - ${paymentIntent.id}`,
      reference: paymentIntent.charges.data[0].id,
      importSource: 'stripe',
      reconciled: false, // Will be auto-matched
      paymentId: payment.id,
    },
  });
}
```

**Pros**: Simple, automatic, immediate reconciliation
**Cons**: May not match actual bank deposit date (Stripe batches deposits)

### Recommended Approach: Hybrid
1. **Auto-create bank transaction** when payment succeeds (for immediate tracking)
2. **Import from Stripe Balance Transactions** monthly (for accurate reconciliation)
3. **Import from bank statements** as backup/verification

## Current Reconciliation Flow for Stripe Payments

### Step-by-Step

1. **Monthly Rent Generation** (Day 1)
   - Charges created
   - Payments automatically processed via Stripe
   - Payment records created with `method: 'STRIPE_ACH'` or `'STRIPE_CARD'`

2. **Payment Succeeds** (Same day or next day)
   - Stripe webhook fires
   - Payment record updated with `stripeChargeId`
   - Charge status updated to PAID

3. **Bank Deposit** (2-7 days later for ACH, instant for cards)
   - Stripe deposits funds to your bank account
   - **Currently**: Manual import required
   - **Recommended**: Auto-import from Stripe or auto-create on success

4. **Reconciliation** (End of month)
   - Create reconciliation period
   - System auto-matches payments with bank transactions
   - Review unmatched items
   - Complete reconciliation

## Payment Status Tracking

### Payment Intent Statuses
- `succeeded` - Payment completed successfully
- `processing` - Payment is processing (ACH takes 2-7 days)
- `requires_action` - Customer action needed (3D Secure, etc.)
- `requires_payment_method` - Payment method failed
- `canceled` - Payment was canceled

### Charge Status in System
- `PENDING` - Charge created, no payment
- `PARTIALLY_PAID` - Partial payment received
- `PAID` - Fully paid
- `CANCELLED` - Charge canceled

## Best Practices

1. **Monitor Failed Payments**:
   - Check webhook logs for `payment_intent.payment_failed`
   - Set up alerts for failed payments
   - Contact tenants for failed payments

2. **Reconciliation Timing**:
   - Wait 7-10 days after month end for all ACH payments to clear
   - Import Stripe balance transactions for accurate matching
   - Reconcile monthly to catch discrepancies early

3. **Payment Method Management**:
   - Encourage tenants to set default payment methods
   - Monitor payment method expiration (cards)
   - Notify tenants before payment method expires

4. **Error Handling**:
   - Failed payments leave charges as PENDING
   - Manual intervention required for failed payments
   - Consider retry logic for temporary failures

## Future Enhancements

1. **Automatic Bank Transaction Creation**:
   - Create bank transaction when Stripe payment succeeds
   - Use Stripe charge date or estimated deposit date

2. **Stripe Balance Transaction Import**:
   - Monthly import of Stripe balance transactions
   - Automatic matching with payments

3. **Payment Retry Logic**:
   - Automatic retry for failed payments
   - Configurable retry schedule

4. **Reconciliation Automation**:
   - Auto-reconcile Stripe payments monthly
   - Email notifications for unmatched items

5. **Payment Analytics**:
   - Track payment success rates
   - Monitor average processing times
   - Identify problematic payment methods

