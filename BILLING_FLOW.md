# Billing Information Requirements

## Overview

This document explains when billing information (payment methods) is required in PropVestor. There are **TWO SEPARATE** payment contexts:

1. **Organization Subscription Billing** - Organization pays for PropVestor SaaS subscription
2. **Tenant Payment Methods** - Tenants pay their own rent (organization doesn't foot the bill)

---

---

## 💰 Two Payment Contexts Explained

### Context 1: Organization Subscription (SaaS Billing)
- **Who Pays**: The organization (property management company)
- **What For**: PropVestor SaaS subscription (platform access)
- **Payment Method**: Organization's payment method
- **Free Tier**: No payment needed

### Context 2: Tenant Payment Methods (Rent Collection)
- **Who Pays**: The tenants (renters)
- **What For**: Rent payments, lease charges
- **Payment Method**: Each tenant's own payment method (ACH/card)
- **Organization Role**: Does NOT pay - tenants pay their own rent

**Key Point**: These are completely separate. Organization subscription billing is independent from tenant rent collection.

---

## 🆓 Free Subscription (No Organization Billing Required)

### When Free Plan is Active

**No organization billing information is ever required** for the Free plan:

1. **Registration**: User registers → Organization created → No subscription → Free tier limits apply
2. **Free Plan Subscription**: User explicitly subscribes to Free plan ($0/month) → No Stripe integration → No payment method needed
3. **Usage**: User can use platform indefinitely within free tier limits

### Free Plan Characteristics

- **Price**: $0/month
- **Stripe Price ID**: `null` (not configured in Stripe)
- **Payment Method**: Not required
- **Billing**: No billing cycle, no invoices
- **Limits**: 
  - 1 property
  - 5 tenants
  - 2 users
  - 100 MB storage
  - 100 API calls/hour

### Code Implementation

```typescript
// In createStripeSubscription()
if (!plan.stripePriceId) {
  throw new AppError(400, 'BAD_REQUEST', 'Plan does not have a Stripe price ID configured');
}
```

**Note**: Free plan subscriptions cannot be created via Stripe because there's no `stripePriceId`. Free tier is the default state when no subscription exists.

---

## 💳 Paid Subscriptions (Organization Billing Required)

### When Organization Billing Information is Required

Organization billing information is required **immediately** when subscribing to a paid plan:

1. **Basic Plan** ($49/month)
2. **Pro Plan** ($149/month)
3. **Enterprise Plan** ($499/month)

### Subscription Flow for Paid Plans

#### Step 1: User Clicks "Subscribe"
- User navigates to `/pricing` or `/subscription`
- Selects a paid plan (Basic, Pro, or Enterprise)
- Clicks "Subscribe" button

#### Step 2: Stripe Subscription Creation
```typescript
// createStripeSubscription() creates Stripe subscription
const stripeSubscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: plan.stripePriceId }], // Requires Stripe Price ID
  payment_behavior: 'default_incomplete', // Payment required
  payment_settings: { save_default_payment_method: 'on_subscription' },
});
```

#### Step 3: Payment Method Required
- **If payment method provided**: Subscription created immediately
- **If no payment method**: Stripe returns `clientSecret` for payment setup
- User must complete payment setup before subscription is active

#### Step 4: Trial Period (14 days)
- Subscription starts with `status: 'trialing'`
- **Payment method still required upfront** (Stripe requirement)
- Trial period: 14 days
- After trial: Automatic charge to saved payment method

### Payment Method Collection

**Option 1: Payment Method Provided**
```typescript
// User provides paymentMethodId in subscribe request
POST /api/subscriptions/subscribe
{
  "planId": "basic-plan-id",
  "paymentMethodId": "pm_1234567890" // Optional
}
```

**Option 2: Stripe Checkout/Setup Intent**
```typescript
// If no payment method, Stripe returns clientSecret
{
  "subscription": { ... },
  "clientSecret": "seti_1234567890_secret_xxx"
}
// Frontend uses Stripe.js to collect payment method
```

---

## 📋 Billing Information Requirements Summary

### Organization Subscription Billing

| Plan | Org Billing Required? | When? | Stripe Integration |
|------|----------------------|-------|-------------------|
| **Free** | ❌ No | Never | Not used |
| **Basic** | ✅ Yes | Immediately on subscribe | Required |
| **Pro** | ✅ Yes | Immediately on subscribe | Required |
| **Enterprise** | ✅ Yes | Immediately on subscribe | Required |

### Tenant Payment Methods (Rent Collection)

| Scenario | Tenant Payment Method Required? | Who Provides? |
|----------|--------------------------------|---------------|
| **Rent Collection via Stripe** | ✅ Yes | Tenant provides their own ACH/card |
| **Manual Payments** | ❌ No | Cash, check, bank transfer (no Stripe) |
| **Auto-Debit** | ✅ Yes | Tenant must add payment method |

**Important**: 
- Tenants add their own payment methods (not the organization)
- Organization does NOT pay tenant rent
- Each tenant has their own Stripe customer and payment methods
- Used for automatic rent collection from tenants

---

## 🔄 Subscription States

### No Subscription (Free Tier)
- **Status**: No subscription record exists
- **Billing**: Not applicable
- **Payment Method**: Not required
- **Limits**: Default free tier limits

### Free Plan Subscription
- **Status**: `ACTIVE` (if explicitly created, though unlikely)
- **Billing**: $0/month, no billing cycle
- **Payment Method**: Not required
- **Stripe**: Not integrated (no `stripePriceId`)

### Paid Plan - Trial
- **Status**: `TRIAL`
- **Billing**: Payment method required upfront
- **Payment Method**: Required (saved in Stripe)
- **Trial End**: 14 days from subscription start
- **After Trial**: Automatic charge

### Paid Plan - Active
- **Status**: `ACTIVE`
- **Billing**: Charged monthly/annually
- **Payment Method**: Required and saved
- **Invoices**: Generated automatically

### Paid Plan - Past Due
- **Status**: `PAST_DUE`
- **Billing**: Payment failed
- **Payment Method**: Needs to be updated
- **Access**: May be restricted (middleware can block)

---

## 💡 Key Points

### Organization Subscription Billing

1. **Free Tier = No Organization Billing Ever**
   - Organizations on free tier never need to provide billing information
   - Free tier is the default state (no subscription record)
   - Can use platform indefinitely within limits

2. **Paid Plans = Organization Billing Required Immediately**
   - Cannot subscribe to paid plan without organization payment method
   - Stripe requires payment method even for trial subscriptions
   - Payment method is collected before trial starts

3. **Trial Period Still Requires Payment Method**
   - 14-day trial is free (no charge)
   - But organization payment method must be on file
   - Stripe will charge automatically after trial ends

4. **No "Pay Later" Option**
   - Unlike some SaaS platforms, PropVestor requires payment method upfront
   - This is a Stripe requirement for subscriptions
   - Prevents trial abuse

### Tenant Payment Methods (Rent Collection)

1. **Tenants Pay Their Own Rent**
   - Organization does NOT foot the bill for tenant rent
   - Each tenant must provide their own payment method
   - Used for automatic rent collection via Stripe

2. **Tenant Payment Methods Are Separate**
   - Stored per tenant (not per organization)
   - Each tenant has their own Stripe customer
   - Organization can view/manage but doesn't pay

3. **When Tenant Payment Methods Are Needed**
   - For Stripe auto-debit (automatic rent collection)
   - For online rent payments
   - Optional - manual payments (cash, check) don't require Stripe

4. **Organization Doesn't Pay Tenant Rent**
   - Rent charges are created for tenants
   - Tenants' payment methods are charged
   - Organization receives the funds (via Stripe Connect or direct deposit)

---

## 🛠️ Implementation Details

### Free Plan Handling

```typescript
// Free plan has no stripePriceId
const freePlan = {
  price: 0,
  stripePriceId: null, // No Stripe integration
};

// Cannot create Stripe subscription for free plan
if (!plan.stripePriceId) {
  throw new AppError(400, 'BAD_REQUEST', 'Plan does not have a Stripe price ID configured');
}
```

**Solution**: Free tier is the default state. No subscription record = free tier.

### Paid Plan Subscription

```typescript
// Paid plans require Stripe Price ID
const paidPlan = {
  price: 49,
  stripePriceId: 'price_1234567890', // Required
};

// Stripe subscription creation
const stripeSubscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: plan.stripePriceId }],
  payment_behavior: 'default_incomplete', // Payment required
  payment_settings: { save_default_payment_method: 'on_subscription' },
});
```

---

## 🎯 User Experience Flow

### Organization Subscription Flow

**Free Tier Organization:**
```
1. Register → No subscription → Free tier active
2. Use platform within limits
3. Never asked for organization billing information
4. Can upgrade anytime (then organization billing required)
```

**Paid Plan Organization:**
```
1. Register → No subscription → Free tier active
2. Navigate to Pricing page
3. Select paid plan (Basic/Pro/Enterprise)
4. Click "Subscribe"
5. **Organization payment method required** (Stripe checkout)
6. Trial starts (14 days)
7. After trial: Automatic charge to organization
```

### Tenant Payment Method Flow

**For Rent Collection:**
```
1. Organization creates lease for tenant
2. Organization navigates to Tenant detail page
3. Click "Add Payment Method" for tenant
4. Tenant provides their ACH or card details (via Stripe.js)
5. Payment method saved to tenant's Stripe customer
6. Used for automatic rent collection
7. Organization does NOT pay - tenant's payment method is charged
```

**Important**: 
- Tenant payment methods are collected per tenant
- Organization never pays tenant rent
- Each tenant manages their own payment methods
- Used for Stripe auto-debit and online payments

---

## 🔐 Security & Compliance

### Payment Method Storage
- Payment methods stored securely in Stripe
- Never stored in PropVestor database
- Only Stripe payment method IDs stored locally
- PCI compliance handled by Stripe

### Billing Information
- Billing address, card details: Stripe only
- PropVestor only stores: subscription status, plan, dates
- No sensitive payment data in our database

---

## 📝 Recommendations

### For Free Tier Users
- ✅ No billing information collection
- ✅ Clear messaging about free tier limits
- ✅ Easy upgrade path when ready

### For Paid Plan Users
- ✅ Clear pricing display
- ✅ Transparent trial terms
- ✅ Easy payment method management
- ✅ Automatic renewal (with cancellation option)

---

## 💸 Payment Flow Diagram

### Organization Subscription (SaaS Billing)
```
Organization → Pays → Stripe → PropVestor SaaS Subscription
- Free tier: $0 (no payment)
- Paid plans: $49-$499/month (organization's payment method)
```

### Tenant Rent Collection
```
Tenant → Pays Rent → Stripe → Organization's Bank Account
- Tenant provides their own ACH/card
- Tenant's payment method is charged
- Funds go to organization's Stripe account
- Organization receives the money (doesn't pay it)
```

**Key Point**: Organization receives rent payments from tenants. Organization does NOT pay tenant rent.

---

## Summary

### Organization Subscription Billing

**Free Subscription**: No organization billing information ever required. Organizations can use the platform indefinitely within free tier limits.

**Paid Subscriptions**: Organization billing information required immediately when subscribing. Organization payment method must be provided before trial starts (Stripe requirement).

### Tenant Payment Methods (Rent Collection)

**Rent Collection**: Tenants must provide their own payment methods (ACH/card) for automatic rent collection via Stripe. 

**How It Works**:
1. Tenant adds their payment method (ACH or card) via Stripe.js
2. Payment method is stored with tenant's Stripe customer
3. When rent is due, tenant's payment method is charged
4. Funds are deposited to organization's Stripe account
5. Organization receives the money (doesn't pay it)

**Organization does NOT pay tenant rent. Tenants pay their own rent, and the organization receives the funds.**

### Key Distinctions

1. **Organization Subscription** = Organization pays for PropVestor SaaS access
   - Free tier = No payment needed
   - Paid plans = Organization provides payment method
   - Organization pays Stripe for SaaS subscription

2. **Tenant Payment Methods** = Tenants pay their own rent
   - Separate from organization subscription
   - Each tenant has their own Stripe customer
   - Tenant's payment method is charged for rent
   - Organization receives the funds (doesn't pay them)
   - Used for Stripe auto-debit and online payments

**The organization never pays tenant rent. Tenants pay their own rent using their own payment methods, and the organization receives those payments.**

