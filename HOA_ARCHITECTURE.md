# HOA Management - Architecture Design

## Overview
This document outlines the architectural decisions and structure for adding HOA (Homeowners Association) management capabilities to PropVestor.

## Key Architectural Decisions

### 1. Organization vs Association Model

**Decision:** Separate Organization and Association models

**Rationale:**
- **Organization** = Property Management Company (existing)
- **Association** = HOA/Community (new)
- One Organization can manage multiple Associations
- Clear separation of concerns

**Implementation:**
```prisma
model Organization {
  // Existing property management company
  associations Association[] // New: can manage multiple HOAs
}

model Association {
  id             String   @id @default(uuid())
  organizationId String   @db.Uuid // Managed by which PM company
  name           String
  address        String?
  // ... other fields
  organization   Organization @relation(fields: [organizationId], references: [id])
  homeowners    Homeowner[]
  boardMembers   BoardMember[]
  // ... other relations
}
```

---

### 2. Tenant vs Homeowner Model

**Decision:** Separate Tenant and Homeowner models

**Rationale:**
- **Tenant** = Rents a property (existing)
- **Homeowner** = Owns a unit in an HOA (new)
- Different workflows, different data needs
- Homeowners pay HOA fees, tenants pay rent

**Implementation:**
```prisma
model Tenant {
  // Existing: for rental properties
  // Links to Property/Unit for rental
}

model Homeowner {
  id           String   @id @default(uuid())
  associationId String   @db.Uuid
  unitId       String?  @db.Uuid // Which unit they own
  name         String
  email        String
  phone        String?
  accountBalance Decimal @db.Decimal(12, 2) // HOA fee balance
  // ... other fields
  association  Association @relation(fields: [associationId], references: [id])
  unit         Unit?       @relation(fields: [unitId], references: [id])
}
```

---

### 3. Portal Architecture

**Decision:** Separate portal routes and components

**Rationale:**
- Different user experience for homeowners vs property managers
- Different permissions and features
- Clean separation of concerns

**Structure:**
```
apps/web/src/
  app/
    (main)/          # Existing: Property manager dashboard
      dashboard/
      properties/
      ...
    (portal)/        # New: Homeowner/Board portals
      homeowner/
        dashboard/
        payments/
        maintenance/
        violations/
      board/
        dashboard/
        approvals/
        financials/
```

---

### 4. Authentication Strategy

**Decision:** Email-based authentication for homeowners

**Rationale:**
- Homeowners don't need full user accounts initially
- Email + password or magic link
- Can upgrade to full user account if they become board members

**Implementation:**
- Separate `HomeownerAuth` middleware
- Homeowner sessions separate from user sessions
- Board members can have full user accounts with special role

---

### 5. Messaging System Architecture

**Decision:** Threaded conversation model

**Rationale:**
- Support multiple participants
- Link to various entities (architectural reviews, work orders)
- Scalable for future features

**Implementation:**
```prisma
model Conversation {
  id           String   @id @default(uuid())
  associationId String   @db.Uuid
  subject      String
  relatedToType String? // 'ARCHITECTURAL_REVIEW', 'WORK_ORDER', etc.
  relatedToId   String?  // ID of related entity
  participants ConversationParticipant[]
  messages     Message[]
}

model Message {
  id             String   @id @default(uuid())
  conversationId String   @db.Uuid
  senderId       String   // User ID or Homeowner ID
  senderType     String   // 'USER', 'HOMEOWNER'
  content        String
  attachments    Document[]
  readAt         DateTime?
  createdAt      DateTime @default(now())
}
```

---

### 6. Fund Accounting Architecture

**Decision:** Separate Fund and CostCenter models

**Rationale:**
- HOAs have multiple funds (Operating, Reserve, Special Assessment)
- Each fund can have multiple cost centers
- Need to track income/expenses by fund and cost center

**Implementation:**
```prisma
model Fund {
  id           String   @id @default(uuid())
  associationId String   @db.Uuid
  name         String
  type         FundType // OPERATING, RESERVE, SPECIAL_ASSESSMENT
  balance      Decimal  @db.Decimal(12, 2)
  budget       Decimal? @db.Decimal(12, 2)
  costCenters  CostCenter[]
  transactions FundTransaction[]
}

model CostCenter {
  id           String   @id @default(uuid())
  fundId       String   @db.Uuid
  name         String
  budget       Decimal? @db.Decimal(12, 2)
  actual       Decimal? @db.Decimal(12, 2)
}
```

---

### 7. Work Order Extension Strategy

**Decision:** Extend existing WorkOrder model, don't duplicate

**Rationale:**
- Work orders already exist for property managers
- Add homeowner submission capability
- Reuse existing vendor assignment, status tracking

**Implementation:**
- Add `submittedByHomeownerId` field (optional)
- Add `homeownerVisible` boolean
- Add status notifications for homeowners
- Portal view shows homeowner-submitted work orders

---

### 8. Payment System Extension

**Decision:** Reuse existing Payment model, add HOA-specific charges

**Rationale:**
- Payment processing already exists
- Stripe integration already in place
- Just need HOA fee/due model

**Implementation:**
```prisma
model HOAFee {
  id           String   @id @default(uuid())
  associationId String   @db.Uuid
  homeownerId   String   @db.Uuid
  amount       Decimal  @db.Decimal(12, 2)
  dueDate      DateTime
  period       String   // '2024-Q1', '2024-01', etc.
  status       FeeStatus // PENDING, PAID, OVERDUE, PARTIAL
  chargeId     String?   @db.Uuid // Links to Charge model
  payments     Payment[] // Multiple payments can pay one fee
}
```

---

## API Route Structure

### New Route Groups

```
/api/associations
  GET    /                    # List associations (for org)
  POST   /                    # Create association
  GET    /:id                 # Get association details
  PUT    /:id                 # Update association
  DELETE /:id                 # Delete association

/api/homeowners
  GET    /                    # List homeowners (for association)
  POST   /                    # Create homeowner
  GET    /:id                 # Get homeowner details
  PUT    /:id                 # Update homeowner
  DELETE /:id                 # Delete homeowner
  GET    /:id/balance         # Get account balance
  GET    /:id/payment-history # Get payment history

/api/board-members
  GET    /                    # List board members
  POST   /                    # Add board member
  PUT    /:id                 # Update board member
  DELETE /:id                 # Remove board member
  GET    /:id/tenure          # Get tenure history

/api/violations
  GET    /                    # List violations
  POST   /                    # Create violation
  GET    /:id                 # Get violation details
  PUT    /:id                 # Update violation
  POST   /:id/resolve         # Resolve violation
  POST   /:id/send-letter     # Send violation letter

/api/architectural-reviews
  GET    /                    # List reviews
  POST   /                    # Submit review request
  GET    /:id                 # Get review details
  PUT    /:id                 # Update review
  POST   /:id/approve         # Approve review
  POST   /:id/reject          # Reject review
  GET    /:id/messages        # Get review messages

/api/funds
  GET    /                    # List funds
  POST   /                    # Create fund
  GET    /:id                 # Get fund details
  PUT    /:id                 # Update fund
  GET    /:id/transactions    # Get fund transactions
  POST   /:id/transfer        # Transfer between funds

/api/hoa-fees
  GET    /                    # List fees
  POST   /                    # Create fee (bulk for association)
  GET    /:id                 # Get fee details
  POST   /:id/pay             # Process payment

/api/messages
  GET    /                    # List conversations
  POST   /                    # Create conversation
  GET    /:id                 # Get conversation
  POST   /:id/messages        # Send message
  PUT    /:id/read            # Mark as read

/api/approvals
  GET    /                    # List approval requests
  POST   /                    # Create approval request
  GET    /:id                 # Get approval details
  POST   /:id/vote            # Vote on approval
  POST   /:id/approve         # Approve (if single approver)
  POST   /:id/reject          # Reject
```

---

## Frontend Structure

### Portal Components

```
apps/web/src/
  components/
    portals/
      homeowner/
        HomeownerDashboard.tsx
        PaymentHistory.tsx
        MaintenanceRequestForm.tsx
        ViolationList.tsx
        ArchitecturalReviewForm.tsx
      board/
        BoardDashboard.tsx
        ApprovalQueue.tsx
        FinancialReports.tsx
        ViolationManagement.tsx
```

### Shared Components

- `AssociationSelector.tsx` - Select association (for PM companies managing multiple)
- `FundSelector.tsx` - Select fund for transactions
- `ViolationForm.tsx` - Create/edit violations
- `ArchitecturalReviewCard.tsx` - Display review request
- `MessageThread.tsx` - Display conversation

---

## Database Migration Strategy

### Phase 1: Add New Models
1. Create Association model
2. Create Homeowner model
3. Create BoardMember model
4. Add associations relation to Organization

### Phase 2: Extend Existing Models
1. Add homeowner fields to WorkOrder
2. Add fund/cost center to Charge
3. Add association context to existing models

### Phase 3: Add New Features
1. Violation models
2. Architectural review models
3. Fund accounting models
4. Messaging models

---

## Testing Strategy

### Unit Tests
- All new models
- Business logic (fee calculation, violation workflows)
- API endpoints
- Permission checks

### Integration Tests
- Portal authentication flows
- Payment processing
- Approval workflows
- Messaging system

### E2E Tests
- Homeowner submits maintenance request
- Homeowner pays HOA fee
- Board member approves architectural review
- Violation creation and letter sending

---

## Security Considerations

### Access Control
- Homeowners can only see their own data
- Board members can see association-wide data
- Property managers can see all associations they manage
- Role-based permissions for all actions

### Data Privacy
- Encrypt sensitive homeowner data
- Audit logging for financial transactions
- Compliance with FCRA for violations
- GDPR compliance for EU associations

### Payment Security
- PCI-DSS compliance (via Stripe)
- Secure payment method storage
- Payment confirmation emails
- Receipt generation

---

## Performance Considerations

### Database Indexing
- Index on `associationId` for all association-related models
- Index on `homeownerId` for homeowner-related queries
- Index on `status` fields for filtering
- Composite indexes for common query patterns

### Caching Strategy
- Cache association settings
- Cache homeowner account balances
- Cache fund balances
- Cache calendar events

### API Optimization
- Pagination for all list endpoints
- Eager loading for related data
- GraphQL or field selection for large objects

---

## Deployment Considerations

### Feature Flags
- Enable/disable HOA features per organization
- Gradual rollout to associations
- A/B testing for portal UI

### Backward Compatibility
- Existing property management features unaffected
- Organizations without associations work as before
- Gradual migration path for existing customers

---

## Monitoring & Analytics

### Key Metrics
- Homeowner portal login rate
- Payment processing success rate
- Maintenance request response time
- Violation resolution time
- Architectural review approval time

### Alerts
- Failed payment processing
- High violation rate
- Portal downtime
- Payment processing errors

---

**Last Updated:** 2024-12-24

