# RentSpree Integration Setup Guide

This guide explains how to set up RentSpree integration for tenant screening in PropVestor.

## Overview

RentSpree provides tenant screening services including credit checks, background checks, and income verification. PropVestor integrates with RentSpree to:

1. Create screening applications
2. Receive status updates via webhooks
3. Display screening results
4. Handle FCRA-compliant adverse action notices

## Prerequisites

1. RentSpree account (https://rentspree.com)
2. API access enabled in your RentSpree account
3. Webhook endpoint configured

## Step 1: Get RentSpree API Credentials

1. Log in to your RentSpree account
2. Navigate to **Settings** > **API** or **Developer Settings**
3. Generate or copy your **API Key**
4. Note your **Webhook Secret** (if provided)

## Step 2: Configure Environment Variables

Add to your `apps/api/.env` file:

```env
# RentSpree Configuration
RENTSPREE_API_KEY=your-api-key-here
RENTSPREE_WEBHOOK_SECRET=your-webhook-secret-here
RENTSPREE_BASE_URL=https://api.rentspree.com/v1  # Update if different
```

## Step 3: Configure Webhook

1. In RentSpree dashboard, go to **Settings** > **Webhooks**
2. Add webhook URL: `https://your-domain.com/api/rentspree/webhook`
3. Select events to listen for:
   - Application Status Updates
   - Screening Completed
   - Report Generated
4. Copy the webhook secret

## Step 4: Update RentSpree Integration Code

**Important:** The current implementation in `apps/api/src/lib/rentspree.ts` is a placeholder. You need to:

1. Review RentSpree API documentation
2. Update API endpoints to match their actual endpoints
3. Update request/response formats
4. Implement proper webhook signature verification

### Example API Endpoints (verify with RentSpree docs):

```typescript
// Create application
POST https://api.rentspree.com/v1/applications
Headers: { Authorization: 'Bearer YOUR_API_KEY' }
Body: {
  applicant: { firstName, lastName, email, phone },
  property: { address, unit },
  rentAmount: number
}

// Get application status
GET https://api.rentspree.com/v1/applications/:id
Headers: { Authorization: 'Bearer YOUR_API_KEY' }
```

## Step 5: Test the Integration

1. Create an applicant in PropVestor
2. Click "Request Screening"
3. Verify the application link is generated
4. Complete the screening in RentSpree
5. Verify webhook updates the status in PropVestor

## API Endpoints

### Applicants

**List Applicants:**
```
GET /api/applicants
```

**Create Applicant:**
```
POST /api/applicants
Body: {
  firstName: string,
  lastName: string,
  email: string,
  phone?: string,
  propertyId?: string,
  unitId?: string,
  notes?: string
}
```

**Get Applicant:**
```
GET /api/applicants/:id
```

**Convert to Tenant:**
```
POST /api/applicants/:id/convert-to-tenant
```

### Screening

**Request Screening:**
```
POST /api/screening/request
Body: {
  applicantId?: string,
  tenantId?: string,
  propertyId?: string,
  unitId?: string,
  rentAmount?: number
}
```

**Get Screening Status:**
```
GET /api/screening/:id
```

**List Screening Requests:**
```
GET /api/screening?status=COMPLETED&applicantId=...
```

**Send Adverse Action Notice:**
```
POST /api/screening/:id/adverse-action
```

## Workflow

### 1. Add Applicant
- Navigate to Applicants page
- Click "Add Applicant" tab
- Fill in applicant information
- Submit form

### 2. Request Screening
- Find applicant in list
- Click "Request Screening"
- System calls RentSpree API
- Application link is generated and stored

### 3. Applicant Completes Screening
- Applicant receives email from RentSpree (or you send them the link)
- Applicant completes screening on RentSpree platform
- RentSpree processes the screening

### 4. Webhook Updates Status
- RentSpree sends webhook when screening completes
- PropVestor updates screening request with:
  - Status (APPROVED/BORDERLINE/DECLINED)
  - Credit score
  - Income verification status
  - Eviction/criminal history flags
  - PDF report URL

### 5. Review Results
- View screening results in "Screening" tab on tenant/applicant page
- Review key metrics and flags
- Access full PDF report if needed

### 6. Adverse Action (if declined)
- If recommendation is DECLINED or BORDERLINE
- Click "Send Adverse Action Notice"
- System sends FCRA-compliant notice
- Records the action for compliance

## Frontend UI

### Tenant Detail Page - Screening Tab

The Screening tab shows:
- All screening requests for the tenant
- Status and recommendation
- Key metrics (credit score, income verified, etc.)
- Flags and warnings
- Links to application and PDF report
- Adverse action notice button (if applicable)

### Applicants Page

- List of all applicants
- Status of each applicant
- Quick action to request screening
- Link to view application (if screening requested)

## FCRA Compliance

See `FCRA_COMPLIANCE.md` for detailed compliance requirements. Key points:

1. **Adverse Action Notices:** Required when denying based on screening
2. **Timing:** Must be sent within 3-5 business days
3. **Content:** Must include agency info, rights, and decision factors
4. **Documentation:** Keep records of all notices sent

## Troubleshooting

### Application Link Not Generated
- Check RentSpree API key is correct
- Verify API endpoint URL
- Check API response for errors
- Review RentSpree API documentation

### Webhook Not Receiving Updates
- Verify webhook URL is publicly accessible
- Check webhook secret matches
- Review RentSpree webhook logs
- Verify webhook signature verification

### Status Not Updating
- Check webhook is configured correctly
- Verify webhook handler is processing events
- Review API logs for errors
- Manually refresh status using GET endpoint

## Production Checklist

- [ ] Update RentSpree API endpoints to production URLs
- [ ] Configure production webhook URL
- [ ] Test end-to-end screening flow
- [ ] Verify FCRA compliance procedures
- [ ] Set up monitoring/alerts for webhook failures
- [ ] Review adverse action notice templates with legal counsel
- [ ] Train staff on screening workflow
- [ ] Document organization-specific screening criteria

## Support

- RentSpree Support: Check their website for support channels
- API Documentation: https://docs.rentspree.com (verify URL)
- Compliance Questions: Consult with legal counsel

