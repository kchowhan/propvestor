# Critical SaaS Implementation Items

## 🔴 CRITICAL - Must Have for SaaS Launch

### 1. Subscription & Billing Management ⚠️ **BLOCKER**

**Why Critical**: Without subscriptions, you can't monetize or manage customer tiers.

**What's Missing**:
- No subscription plans (Free, Basic, Pro, Enterprise)
- No subscription status tracking
- No billing cycles (monthly/annual)
- No Stripe subscription integration
- No trial periods
- No upgrade/downgrade flows

**Implementation Required**:

1. **Database Schema** (Add to `schema.prisma`):
```prisma
model Subscription {
  id                String            @id @default(uuid()) @db.Uuid
  organizationId    String            @unique @db.Uuid
  planId            String            @db.Uuid
  status            SubscriptionStatus // ACTIVE, TRIAL, CANCELLED, EXPIRED, PAST_DUE
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean          @default(false)
  trialEndsAt        DateTime?
  stripeSubscriptionId String?        @unique
  stripeCustomerId    String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  organization      Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  plan              SubscriptionPlan  @relation(fields: [planId], references: [id])
  invoices          Invoice[]
}

model SubscriptionPlan {
  id              String         @id @default(uuid()) @db.Uuid
  name            String         // "Free", "Basic", "Pro", "Enterprise"
  slug            String         @unique
  price           Decimal        @db.Decimal(10, 2)
  billingInterval String         // "monthly", "annual"
  features        Json           // Feature flags: { properties: true, reports: true, api: false }
  limits          Json           // Usage limits: { properties: 10, tenants: 50, users: 5, storage: 1000 }
  stripePriceId   String?        @unique // Stripe Price ID
  isActive        Boolean        @default(true)
  displayOrder    Int            @default(0)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  subscriptions   Subscription[]
}

model Invoice {
  id              String         @id @default(uuid()) @db.Uuid
  subscriptionId  String         @db.Uuid
  amount          Decimal        @db.Decimal(10, 2)
  status          InvoiceStatus  // PENDING, PAID, FAILED, REFUNDED
  stripeInvoiceId String?        @unique
  dueDate         DateTime
  paidAt          DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  subscription    Subscription   @relation(fields: [subscriptionId], references: [id])
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}

enum InvoiceStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}
```

2. **API Routes** (`apps/api/src/routes/subscriptions.ts`):
   - `GET /subscriptions/plans` - List available plans
   - `GET /subscriptions/current` - Get current subscription
   - `POST /subscriptions/subscribe` - Create subscription (with trial)
   - `POST /subscriptions/upgrade` - Upgrade plan
   - `POST /subscriptions/downgrade` - Downgrade plan
   - `POST /subscriptions/cancel` - Cancel subscription
   - `GET /subscriptions/invoices` - List invoices
   - `POST /subscriptions/webhook` - Stripe subscription webhook

3. **Stripe Integration**:
   - Create Stripe Products and Prices
   - Create Stripe Subscriptions
   - Handle subscription webhooks (created, updated, deleted, payment_failed)
   - Sync subscription status

4. **Frontend UI**:
   - Pricing page (`/pricing`)
   - Subscription management page (`/settings/subscription`)
   - Plan comparison table
   - Upgrade/downgrade flows

**Estimated Time**: 2-3 weeks

---

### 2. Usage Limits & Quota Enforcement ⚠️ **BLOCKER**

**Why Critical**: Without limits, you can't enforce plan tiers or prevent abuse.

**What's Missing**:
- No property limits per plan
- No tenant limits per plan
- No user limits per plan
- No storage limits per plan
- No usage tracking
- No quota enforcement middleware

**Implementation Required**:

1. **Database Schema**:
```prisma
model UsageMetrics {
  id              String    @id @default(uuid()) @db.Uuid
  organizationId  String    @db.Uuid
  metricType      String    // "properties", "tenants", "users", "storage_bytes", "api_calls"
  count           Int       @default(0)
  limit           Int
  period          String    // "monthly", "annual"
  periodStart     DateTime
  periodEnd       DateTime
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, metricType, periodStart])
  @@index([organizationId, periodStart])
}
```

2. **Usage Tracking Middleware**:
   - Track property creation
   - Track tenant creation
   - Track user addition
   - Track storage usage
   - Track API calls

3. **Quota Enforcement Middleware**:
   - Check limits before operations
   - Return clear error messages
   - Suggest plan upgrade

4. **Usage Dashboard**:
   - Show current usage vs limits
   - Visual progress bars
   - Alerts when approaching limits

**Estimated Time**: 1-2 weeks

---

### 3. Organization Onboarding Flow ⚠️ **HIGH PRIORITY**

**Why Critical**: First impression matters. Need smooth signup and trial activation.

**What's Missing**:
- No public signup page
- No organization creation during signup
- No trial period activation
- No setup wizard
- No welcome email sequence

**Implementation Required**:

1. **Public Signup Flow**:
   - `/signup` page (public, no auth required)
   - Create user + organization in one flow
   - Activate trial subscription automatically
   - Send welcome email

2. **Setup Wizard**:
   - Step 1: Organization details
   - Step 2: Add first property
   - Step 3: Invite team members
   - Step 4: Payment method (for after trial)

3. **Trial Management**:
   - 14-day trial by default
   - Full feature access during trial
   - Email reminders (3 days before, 1 day before)
   - Auto-convert to paid or pause access

**Estimated Time**: 1 week

---

### 4. Admin Dashboard ⚠️ **HIGH PRIORITY**

**Why Critical**: Need to manage customers, monitor system, handle support.

**What's Missing**:
- No super admin role
- No admin authentication
- No organization management UI
- No system-wide analytics
- No customer support tools

**Implementation Required**:

1. **Super Admin Role**:
   - Add `SUPER_ADMIN` to user model
   - Admin authentication route
   - Admin-only middleware

2. **Admin Dashboard** (`/admin`):
   - Organization list with filters
   - Subscription status overview
   - System metrics (total orgs, users, properties)
   - Revenue metrics
   - Usage analytics
   - Recent activity log

3. **Organization Management**:
   - View/edit organization details
   - View subscription and invoices
   - View usage metrics
   - Impersonate organization (for support)
   - Suspend/activate organizations

**Estimated Time**: 1-2 weeks

---

### 5. API Rate Limiting ⚠️ **MEDIUM PRIORITY**

**Why Critical**: Prevents abuse and ensures fair resource usage.

**What's Missing**:
- No rate limiting per organization
- No rate limiting per user
- No plan-based rate limits

**Implementation Required**:

1. **Rate Limiting Middleware**:
   - Use `express-rate-limit` or `@upstash/ratelimit`
   - Per-organization limits based on plan
   - Per-user limits
   - Rate limit headers in responses

2. **Plan-Based Limits**:
   - Free: 100 requests/hour
   - Basic: 1,000 requests/hour
   - Pro: 10,000 requests/hour
   - Enterprise: Unlimited

**Estimated Time**: 3-5 days

---

### 6. Error Tracking & Monitoring ⚠️ **MEDIUM PRIORITY**

**Why Critical**: Need visibility into production issues.

**What's Missing**:
- No error tracking (Sentry)
- No structured logging
- No performance monitoring

**Implementation Required**:

1. **Error Tracking**:
   - Integrate Sentry
   - Capture errors with context
   - Alert on critical errors

2. **Structured Logging**:
   - Use Winston or Pino
   - Log levels (error, warn, info, debug)
   - Include organization/user context

3. **Performance Monitoring**:
   - Track API response times
   - Monitor database query performance
   - Set up alerts for slow queries

**Estimated Time**: 3-5 days

---

## 📋 Implementation Priority

### Phase 1: Launch Blockers (4-6 weeks)
1. ✅ Subscription & Billing (2-3 weeks)
2. ✅ Usage Limits & Quotas (1-2 weeks)
3. ✅ Organization Onboarding (1 week)
4. ✅ Admin Dashboard (1-2 weeks)

### Phase 2: Stability (1-2 weeks)
5. ✅ API Rate Limiting (3-5 days)
6. ✅ Error Tracking & Monitoring (3-5 days)

### Phase 3: Post-Launch (2-3 weeks)
7. Email Templates & Notifications
8. Data Export & Backup
9. Security Enhancements (2FA, SSO)
10. API Versioning

---

## 🎯 Minimum Viable SaaS (MVP) Checklist

To launch a basic SaaS, you MUST have:

- [ ] **Subscription Management**
  - [ ] Database schema for subscriptions
  - [ ] Stripe subscription integration
  - [ ] At least 2 plans (Free + Paid)
  - [ ] Trial period support
  - [ ] Subscription status tracking

- [ ] **Usage Limits**
  - [ ] Property limits per plan
  - [ ] Tenant limits per plan
  - [ ] User limits per plan
  - [ ] Quota enforcement middleware
  - [ ] Usage tracking

- [ ] **Onboarding**
  - [ ] Public signup page
  - [ ] Organization creation during signup
  - [ ] Trial activation
  - [ ] Welcome email

- [ ] **Admin Dashboard**
  - [ ] Super admin role
  - [ ] Organization list
  - [ ] Subscription overview
  - [ ] Basic analytics

- [ ] **Rate Limiting**
  - [ ] Per-organization limits
  - [ ] Plan-based limits

- [ ] **Error Tracking**
  - [ ] Sentry integration
  - [ ] Error alerts

**Total Estimated Time**: 4-6 weeks

---

## 💰 Revenue Model Considerations

### Recommended Pricing Tiers:

1. **Free Plan** (Lead Generation):
   - 1 property
   - 5 tenants
   - 2 users
   - Basic features
   - No API access

2. **Basic Plan** ($49/month):
   - 10 properties
   - 50 tenants
   - 5 users
   - All Phase 1 features
   - Email support

3. **Pro Plan** ($149/month):
   - 50 properties
   - 250 tenants
   - 15 users
   - API access
   - Priority support
   - Advanced reports

4. **Enterprise Plan** (Custom):
   - Unlimited properties
   - Unlimited tenants
   - Unlimited users
   - SSO support
   - Dedicated support
   - Custom integrations

---

## 🚀 Quick Start Guide

### Step 1: Add Subscription Schema (Day 1)
- Add models to `schema.prisma`
- Run migration
- Seed default plans

### Step 2: Stripe Integration (Week 1)
- Create Stripe products/prices
- Implement subscription API routes
- Handle webhooks

### Step 3: Usage Tracking (Week 2)
- Add usage metrics model
- Implement tracking middleware
- Add quota enforcement

### Step 4: Onboarding (Week 3)
- Create signup page
- Implement trial activation
- Add setup wizard

### Step 5: Admin Dashboard (Week 4)
- Add super admin role
- Create admin routes
- Build admin UI

### Step 6: Polish & Launch (Week 5-6)
- Rate limiting
- Error tracking
- Testing
- Documentation

---

## 📊 Success Metrics to Track

Once SaaS is launched, track:
- **MRR** (Monthly Recurring Revenue)
- **Churn Rate** (monthly)
- **Trial-to-Paid Conversion Rate**
- **Average Revenue Per User (ARPU)**
- **Customer Lifetime Value (LTV)**
- **CAC** (Customer Acquisition Cost)

---

## 🔗 Related Documentation

- `SAAS_READINESS_ASSESSMENT.md` - Full assessment
- `STRIPE_SETUP.md` - Stripe configuration
- `DEPLOYMENT.md` - Deployment guide

