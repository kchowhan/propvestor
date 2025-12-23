# Payment Processing & Reconciliation Setup Guide

This guide covers the complete payment processing system including Stripe integration, auto-debit, and bank reconciliation.

## Overview

The payment processing system includes:
1. **Stripe Integration** - ACH, bank transfers, and card payments
2. **Auto-Debit** - Recurring payments from saved payment methods
3. **Google Cloud Scheduler** - Automated monthly charge generation
4. **Bank Reconciliation** - Import and match bank transactions with payments

## Prerequisites

1. Stripe account (https://stripe.com)
2. Google Cloud Project with Scheduler API enabled
3. Service account with appropriate permissions

## Step 1: Stripe Setup

### 1.1 Get Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret Key** (starts with `sk_`)
3. Copy your **Publishable Key** (starts with `pk_`) - for frontend use

### 1.2 Configure Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Set URL to: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_method.attached`
   - `payment_method.detached`
5. Copy the **Signing secret** (starts with `whsec_`)

### 1.3 Environment Variables

Add to `apps/api/.env`:

```env
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Note:** The publishable key is used by the frontend to securely collect payment method details. The API endpoint `/api/payment-methods/publishable-key` automatically returns this key to authenticated users.

## Step 2: Google Cloud Scheduler Setup

### 2.1 Enable APIs

```bash
gcloud services enable cloudscheduler.googleapis.com
```

### 2.2 Create Service Account

```bash
gcloud iam service-accounts create propvestor-scheduler \
  --display-name="PropVestor Scheduler"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:propvestor-scheduler@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.jobRunner"
```

### 2.3 Environment Variables

Add to `apps/api/.env`:

```env
GCS_PROJECT_ID=your-project-id
GCS_SCHEDULER_LOCATION=us-central1
GCS_SCHEDULER_SERVICE_ACCOUNT=propvestor-scheduler@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 2.4 Set Scheduler Secret

Add to `apps/api/.env`:

```env
SCHEDULER_SECRET=your-random-secret-token-here  # Generate a secure random string
```

This secret is used to authenticate requests from Google Cloud Scheduler.

### 2.5 Create Scheduled Job

The scheduled job runs on the 1st of each month at 2 AM to generate rent charges for all active leases.

Create it manually:

```bash
gcloud scheduler jobs create http generate-monthly-rent \
  --location=us-central1 \
  --schedule="0 2 1 * *" \
  --uri="https://your-api-domain.com/api/billing/generate-monthly-rent" \
  --http-method=POST \
  --oidc-service-account-email=propvestor-scheduler@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --headers="Content-Type=application/json,X-Scheduler-Secret=your-random-secret-token-here" \
  --message-body='{"month":1,"year":2024}'
```

**Important:** Replace `your-random-secret-token-here` with the same value you set in `SCHEDULER_SECRET` environment variable.

**Note:** The scheduler will automatically use the current month/year when it runs, but you can specify a month/year in the body for testing.

## Step 3: API Endpoints

### Payment Methods

**Create Setup Intent** (for adding payment method):
```
POST /api/payment-methods/setup-intent
Body: { tenantId: "uuid" }
Response: { clientSecret: "...", setupIntentId: "..." }
```

**Attach Payment Method** (after setup completes):
```
POST /api/payment-methods/attach
Body: { tenantId: "uuid", setupIntentId: "...", isDefault: true }
```

**List Payment Methods**:
```
GET /api/payment-methods/tenant/:tenantId
```

**Delete Payment Method**:
```
DELETE /api/payment-methods/:paymentMethodId
```

### Payment Processing

**Process Payment via Stripe**:
```
POST /api/payments/process-stripe
Body: { chargeId: "uuid", paymentMethodId: "pm_..." }
```

**Check Payment Status**:
```
GET /api/payments/stripe-status/:paymentIntentId
```

### Reconciliation

**Import Bank Transactions**:
```
POST /api/reconciliation/import
Body: {
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  transactions: [
    {
      date: "2024-01-15",
      amount: 1500.00,
      description: "Rent payment",
      reference: "CHK1234",
      accountNumber: "1234",
      accountName: "Main Account"
    }
  ],
  importSource: "csv"
}
```

**Create Reconciliation**:
```
POST /api/reconciliation/create
Body: {
  startDate: "2024-01-01",
  endDate: "2024-01-31"
}
```

**Manual Match**:
```
POST /api/reconciliation/match
Body: {
  reconciliationId: "uuid",
  paymentId: "uuid",
  bankTransactionId: "uuid"
}
```

## Step 4: Workflow

### 4.1 Tenant Payment Setup

1. Tenant navigates to payment methods page
2. Clicks "Add Payment Method"
3. Frontend calls `POST /api/payment-methods/setup-intent`
4. Frontend uses Stripe.js to collect payment method details
5. After setup completes, frontend calls `POST /api/payment-methods/attach`
6. Payment method is saved and can be used for recurring payments

### 4.2 Processing Payments

**Automatic (via Scheduler)**:
1. Google Cloud Scheduler triggers on 1st of month
2. System generates rent charges for all active leases
3. For leases with saved payment methods, automatically process payment
4. Update charge status based on payment result

**Manual**:
1. User selects charge to pay
2. Selects saved payment method
3. Calls `POST /api/payments/process-stripe`
4. Payment is processed and charge status updated

### 4.3 Bank Reconciliation

1. Export bank statement (CSV/OFX)
2. Import transactions via API
3. System auto-matches payments with transactions
4. Review suggested matches
5. Manually match any unmatched items
6. Complete reconciliation

## Step 5: Testing

### Test Stripe Integration

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Test Webhooks Locally

Use Stripe CLI:
```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

## Security Considerations

1. **Webhook Verification**: Always verify Stripe webhook signatures
2. **PCI Compliance**: Never store full card numbers
3. **Service Account**: Use least privilege for GCS Scheduler
4. **HTTPS**: Always use HTTPS in production
5. **Environment Variables**: Never commit secrets to version control

## Troubleshooting

### Payment Intent Fails

- Check Stripe dashboard for error details
- Verify payment method is attached to customer
- Ensure sufficient funds/credit limit
- Check webhook is receiving events

### Reconciliation Not Matching

- Verify transaction dates are within range
- Check amount precision (rounding differences)
- Review match confidence scores
- Manually match if auto-match fails

### Scheduler Not Running

- Verify service account has correct permissions
- Check job exists in GCS console
- Review job execution logs
- Verify target URL is accessible

## Production Checklist

- [ ] Switch to Stripe live keys
- [ ] Update webhook URL to production domain
- [ ] Configure production GCS Scheduler
- [ ] Set up monitoring/alerts
- [ ] Test end-to-end payment flow
- [ ] Verify reconciliation accuracy
- [ ] Set up backup/recovery procedures
- [ ] Document organization-specific processes

