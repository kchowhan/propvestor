# Tenant Payment Flow - Rent Collection

## Overview

This document explains how tenant rent collection works in PropVestor. **Important**: The organization does NOT pay tenant rent. Tenants pay their own rent using their own payment methods, and the organization receives those payments.

---

## 🔄 Complete Payment Flow

### Step 1: Tenant Adds Payment Method

1. **Organization navigates to Tenant detail page**
   - Route: `/tenants/[id]`
   - Shows tenant information, leases, payment methods

2. **Click "Add Payment Method"**
   - Opens Stripe.js payment form modal
   - Tenant can add ACH (bank account) or card

3. **Stripe Setup Intent Created**
   ```typescript
   POST /api/payment-methods/setup-intent
   {
     "tenantId": "tenant-uuid"
   }
   ```
   - Creates Stripe Setup Intent
   - Returns `clientSecret` for Stripe.js

4. **Tenant Provides Payment Details**
   - Uses Stripe.js Elements (secure, PCI-compliant)
   - Enters bank account or card information
   - Confirms setup intent

5. **Payment Method Attached**
   ```typescript
   POST /api/payment-methods/attach
   {
     "tenantId": "tenant-uuid",
     "setupIntentId": "seti_xxx",
     "isDefault": true
   }
   ```
   - Payment method saved to tenant's Stripe customer
   - Stored in `TenantPaymentMethod` table
   - Linked to tenant (not organization)

---

### Step 2: Rent Charge Created

1. **Monthly Rent Generation**
   - Automated via Google Cloud Scheduler
   - Or manual via `/api/billing/generate-monthly-rent`
   - Creates `Charge` record for each active lease

2. **Charge Details**
   ```typescript
   {
     type: 'RENT',
     amount: 2400.00,
     dueDate: '2024-01-01',
     status: 'PENDING',
     leaseId: 'lease-uuid',
     tenantId: 'tenant-uuid' // via lease
   }
   ```

---

### Step 3: Automatic Payment Processing

1. **System Finds Best Payment Method**
   ```typescript
   findBestPaymentMethodForCharge(chargeId)
   ```
   - Looks for primary tenant on lease
   - Checks for default payment method
   - Falls back to any active payment method

2. **Stripe Payment Intent Created**
   ```typescript
   POST /api/payments/process-stripe
   {
     "chargeId": "charge-uuid",
     "paymentMethodId": "pm_xxx" // Tenant's payment method
   }
   ```
   - Creates Stripe Payment Intent
   - Uses **tenant's payment method** (not organization's)
   - Charges **tenant's Stripe customer** (not organization's)
   - Amount: Rent amount (e.g., $2400)

3. **Payment Processing**
   - Stripe charges tenant's payment method
   - For ACH: May take 2-7 business days
   - For cards: Usually instant
   - Status: `succeeded`, `processing`, `requires_action`, `failed`

---

### Step 4: Funds Received by Organization

1. **Stripe Webhook Notification**
   ```typescript
   POST /api/stripe/webhook
   Event: payment_intent.succeeded
   ```

2. **Payment Record Created**
   ```typescript
   {
     organizationId: 'org-uuid',
     chargeId: 'charge-uuid',
     amount: 2400.00,
     method: 'STRIPE_ACH' or 'STRIPE_CARD',
     stripePaymentIntentId: 'pi_xxx',
     receivedDate: '2024-01-01'
   }
   ```

3. **Bank Transaction Created**
   - Automatically created for reconciliation
   - Linked to payment record
   - Funds deposited to organization's Stripe account
   - Organization can transfer to their bank account

4. **Charge Status Updated**
   - `PENDING` → `PAID` or `PARTIALLY_PAID`
   - Based on total payments received

---

## 💰 Who Pays What?

### Organization Pays:
- ✅ PropVestor SaaS subscription (if paid plan)
- ❌ **NOT tenant rent** (tenants pay their own rent)

### Tenant Pays:
- ✅ Their own rent (via their payment method)
- ✅ Lease charges (late fees, utilities, etc.)
- ✅ Funds go to organization's Stripe account

### Organization Receives:
- ✅ Rent payments from tenants
- ✅ Funds deposited to organization's Stripe account
- ✅ Can transfer to organization's bank account

---

## 🔐 Payment Method Ownership

### Tenant Payment Methods
- **Owned by**: Tenant (each tenant has their own)
- **Stored in**: `TenantPaymentMethod` table
- **Stripe Customer**: Each tenant has their own Stripe customer
- **Used for**: Charging tenant for rent

### Organization Payment Methods
- **Owned by**: Organization
- **Stored in**: Stripe (for subscriptions)
- **Stripe Customer**: Organization has its own Stripe customer
- **Used for**: Charging organization for SaaS subscription

**These are completely separate!**

---

## 📋 Example Scenario

### Setup
1. Organization: "ABC Property Management"
   - Free tier subscription (no payment method needed)
   - Has Stripe account for receiving tenant payments

2. Tenant: "John Doe"
   - Rents unit at $2400/month
   - Adds ACH payment method (his bank account)
   - Payment method stored with his Stripe customer

### Monthly Rent Collection
1. **January 1**: System generates rent charge ($2400)
2. **January 1**: System charges John's ACH payment method
3. **January 3-5**: ACH clears, funds deposited to ABC's Stripe account
4. **January 5**: ABC Property Management receives $2400
5. **Result**: 
   - John paid $2400 (from his bank account)
   - ABC received $2400 (to their Stripe account)
   - ABC did NOT pay anything

---

## 🎯 Key Points

1. **Tenants Pay Their Own Rent**
   - Each tenant provides their own payment method
   - Tenant's payment method is charged
   - Organization does NOT pay tenant rent

2. **Organization Receives Funds**
   - Rent payments go to organization's Stripe account
   - Organization can transfer to their bank
   - Organization is the recipient, not the payer

3. **Separate Payment Contexts**
   - Organization subscription = Organization pays Stripe
   - Tenant rent = Tenant pays organization (via Stripe)

4. **Free Tier Organizations**
   - No organization payment method needed for SaaS
   - Still need Stripe account for receiving tenant payments
   - Tenants still provide their own payment methods

---

## 🛠️ Technical Implementation

### Stripe Account Structure

```
Organization Stripe Account
├── Organization Customer (for SaaS subscription)
│   └── Payment method (only if paid plan)
│
└── Tenant Customers (for rent collection)
    ├── Tenant 1 Customer
    │   └── Payment methods (ACH/card)
    ├── Tenant 2 Customer
    │   └── Payment methods (ACH/card)
    └── ...
```

### Payment Processing

```typescript
// Tenant's payment method is charged
stripe.paymentIntents.create({
  customer: tenant.stripeCustomerId, // Tenant's customer
  payment_method: tenantPaymentMethodId, // Tenant's payment method
  amount: rentAmount, // Rent amount
  // Funds go to organization's Stripe account
});
```

---

## 📝 Summary

**For Leases and Payment Processing:**

1. **Tenants must add payment methods** (ACH or card)
2. **Tenants pay their own rent** using their payment methods
3. **Organization receives the funds** (doesn't pay them)
4. **Organization subscription is separate** (free tier = no payment needed)

**The organization never pays tenant rent. Tenants pay their own rent, and the organization receives those payments via Stripe.**

