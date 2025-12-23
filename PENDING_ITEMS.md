# Pending Implementations & Configurations

This document lists all pending items that need to be implemented or configured in PropVestor.

## 🔴 Critical - Core Functionality

### 1. RentSpree Integration (Improved Structure, Needs API Verification)
**Location**: `apps/api/src/lib/rentspree.ts`

**Status**: ✅ Improved structure with better error handling and field mappings
**Remaining**: Needs verification against actual RentSpree API documentation

**What's Needed**:
- [x] Improved error handling and field mappings
- [x] Webhook signature verification structure (HMAC-SHA256)
- [ ] Review RentSpree API documentation (https://docs.rentspree.com)
- [ ] Verify API endpoints match actual RentSpree endpoints
- [ ] Verify request/response formats match actual API
- [ ] Verify webhook signature method (HMAC algorithm, payload format)
- [ ] Test end-to-end screening flow with RentSpree sandbox

**Configuration Required**:
- [ ] Get RentSpree API key
- [ ] Configure webhook URL in RentSpree dashboard
- [ ] Set `RENTSPREE_API_KEY` in environment variables
- [ ] Set `RENTSPREE_WEBHOOK_SECRET` in environment variables
- [ ] Set `RENTSPREE_BASE_URL` if different from default

**See**: `apps/api/RENTSPREE_SETUP.md` for detailed setup instructions

---

### 2. Adverse Action Notice Email (FCRA Compliance)
**Location**: `apps/api/src/routes/screening.ts`, `apps/api/src/lib/email.ts`

**Status**: ✅ Fully implemented

**What's Implemented**:
- [x] `sendAdverseActionNotice` function in email service
- [x] FCRA-compliant email template (HTML and text versions)
- [x] Required FCRA language:
  - Contact information for credit reporting agencies
  - Right to dispute information
  - Right to obtain free report within 60 days
  - Decision factors clearly listed
- [x] Integration with screening route
- [x] Error handling (continues even if email fails)
- [ ] Test email delivery (requires SMTP configuration)

**See**: `apps/api/FCRA_COMPLIANCE.md` for compliance requirements

---

## 🟡 Important - External Services Configuration

### 3. Google Cloud Storage (GCS)
**Status**: Code implemented, needs configuration

**Configuration Required**:
- [ ] Create GCS bucket
- [ ] Create service account with storage permissions
- [ ] Download service account key file
- [ ] Set `GCS_PROJECT_ID` in environment variables
- [ ] Set `GCS_BUCKET_NAME` in environment variables
- [ ] Set `GCS_KEY_FILENAME` or `GCS_CREDENTIALS` in environment variables
- [ ] Test file upload/download

**See**: `apps/api/GCS_SETUP.md` for detailed setup instructions

---

### 4. DocuSign Integration
**Status**: Code implemented, needs configuration

**Configuration Required**:
- [ ] Create DocuSign developer account
- [ ] Create integration (JWT authentication)
- [ ] Generate RSA key pair
- [ ] Set `DOCUSIGN_INTEGRATOR_KEY` in environment variables
- [ ] Set `DOCUSIGN_USER_ID` in environment variables
- [ ] Set `DOCUSIGN_PRIVATE_KEY` in environment variables
- [ ] Set `DOCUSIGN_BASE_PATH` (sandbox or production)
- [ ] Set `DOCUSIGN_AUTH_SERVER` in environment variables
- [ ] Configure webhook URL in DocuSign dashboard
- [ ] Test envelope creation and signing flow

**See**: `apps/api/DOCUSIGN_SETUP.md` for detailed setup instructions

---

### 5. Stripe Payment Processing
**Status**: Code implemented, needs configuration

**Configuration Required**:
- [ ] Create Stripe account
- [ ] Get API keys (test and production)
- [ ] Set `STRIPE_SECRET_KEY` in environment variables
- [ ] Set `STRIPE_PUBLISHABLE_KEY` in environment variables
- [ ] Set `STRIPE_WEBHOOK_SECRET` in environment variables
- [ ] Configure webhook URL in Stripe dashboard
- [ ] Test payment method setup
- [ ] Test payment processing
- [ ] Test webhook handling

**See**: `apps/api/PAYMENT_PROCESSING_SETUP.md` for detailed setup instructions

---

### 6. Google Cloud Scheduler
**Status**: Code implemented, needs configuration

**Configuration Required**:
- [ ] Enable Cloud Scheduler API in GCP
- [ ] Create service account for scheduler
- [ ] Set `GCS_SCHEDULER_LOCATION` in environment variables
- [ ] Set `GCS_SCHEDULER_SERVICE_ACCOUNT` in environment variables
- [ ] Set `SCHEDULER_SECRET` in environment variables
- [ ] Create scheduled job for monthly rent generation
- [ ] Test scheduler execution

**See**: `apps/api/PAYMENT_PROCESSING_SETUP.md` for detailed setup instructions

---

### 7. Email Service (SMTP)
**Status**: Code implemented, needs configuration

**Configuration Required**:
- [ ] Set up SMTP server (or use service like SendGrid, AWS SES, etc.)
- [ ] Set `SMTP_HOST` in environment variables
- [ ] Set `SMTP_PORT` in environment variables
- [ ] Set `SMTP_USER` in environment variables
- [ ] Set `SMTP_PASS` in environment variables
- [ ] Set `SMTP_SECURE` (true/false) in environment variables
- [ ] Set `SMTP_FROM` in environment variables
- [ ] Set `APP_URL` in environment variables
- [ ] Test email sending (welcome emails, adverse action notices)

**Note**: Currently logs to console in development if SMTP is not configured

---

## 🟢 Nice to Have - Missing Features

### 8. Bank Reconciliation API Endpoints
**Status**: Library functions exist, but no API routes

**Location**: `apps/api/src/lib/reconciliation.ts` exists, but no route file

**What's Needed**:
- [ ] Create `apps/api/src/routes/reconciliation.ts`
- [ ] Add endpoints:
  - `POST /reconciliation/import` - Import bank transactions
  - `POST /reconciliation/create` - Create reconciliation
  - `POST /reconciliation/match` - Manual match
  - `GET /reconciliation/:id` - Get reconciliation details
  - `GET /reconciliation` - List reconciliations
- [ ] Add route to `apps/api/src/routes/index.ts`
- [ ] Create frontend UI for reconciliation

---

### 9. Phase 2 - Investment Management
**Status**: Schema exists, no API or UI

**Location**: `apps/api/prisma/schema.prisma` (Phase 2 models)

**What's Needed**:
- [ ] Create API routes for:
  - Investment entities
  - Investors
  - Contributions
  - Distributions
  - Valuations
- [ ] Create frontend UI for investment management
- [ ] Implement role-based access control for investment features
- [ ] Create reports for investment performance

**See**: `ROLES_AND_PERMISSIONS.md` for role definitions

---

## 📋 Configuration Checklist

### Environment Variables Needed

**Backend** (`apps/api/.env`):
```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=...

# CORS
CORS_ORIGIN=http://localhost:3000

# Email (SMTP)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_SECURE=true
SMTP_FROM=...
APP_URL=...

# Google Cloud Storage
GCS_PROJECT_ID=...
GCS_BUCKET_NAME=...
GCS_KEY_FILENAME=... # OR GCS_CREDENTIALS=...

# DocuSign
DOCUSIGN_INTEGRATOR_KEY=...
DOCUSIGN_USER_ID=...
DOCUSIGN_PRIVATE_KEY=...
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_AUTH_SERVER=account-d.docusign.com

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Google Cloud Scheduler
GCS_SCHEDULER_LOCATION=us-central1
GCS_SCHEDULER_SERVICE_ACCOUNT=...
SCHEDULER_SECRET=...

# RentSpree
RENTSPREE_API_KEY=...
RENTSPREE_WEBHOOK_SECRET=...
RENTSPREE_BASE_URL=https://api.rentspree.com/v1
```

**Frontend** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🚀 Deployment Checklist

### Production Setup
- [ ] Set all environment variables in production
- [ ] Configure production database
- [ ] Set up production GCS bucket
- [ ] Configure production DocuSign integration
- [ ] Set up production Stripe account
- [ ] Configure production webhook URLs
- [ ] Set up production email service
- [ ] Configure Google Cloud Scheduler for production
- [ ] Set up monitoring and logging
- [ ] Configure SSL certificates
- [ ] Set up backup strategy
- [ ] Review security settings
- [ ] Test all integrations in production

**See**: `DEPLOYMENT.md` for comprehensive deployment guide

---

## 📝 Documentation Updates Needed

- [ ] Update API documentation with actual RentSpree endpoints
- [ ] Add reconciliation API documentation
- [ ] Add investment management API documentation (when implemented)
- [ ] Update deployment guide with production checklist
- [ ] Add troubleshooting guides for each integration

---

## Summary

**Critical (Must Have)**:
- RentSpree API integration (placeholder needs replacement)
- Adverse action notice email implementation

**Important (Should Have)**:
- GCS configuration
- DocuSign configuration
- Stripe configuration
- Google Cloud Scheduler configuration
- SMTP configuration

**Nice to Have**:
- Bank reconciliation API endpoints
- Phase 2 investment management features

**Total Pending Items**: 9 major items + configuration for 7 external services

