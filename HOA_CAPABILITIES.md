# HOA Management Capabilities - Tracking & Roadmap

## Overview
This document tracks HOA (Homeowners Association) management capabilities for PropVestor. The goal is to build a comprehensive HOA management platform that handles community management, financials, and communication.

## Current Architecture Assessment

### ✅ Already Built (Can Be Leveraged)
- **Work Orders** - Can be extended for maintenance requests
- **Payments** - Stripe integration for online payments
- **Documents** - File storage and management
- **Organizations** - Multi-tenant architecture
- **Users & Roles** - Role-based access control
- **Properties & Units** - Property management foundation
- **Vendors** - Vendor management
- **Email** - Email sending infrastructure

### 🏗️ Architecture Foundation Needed
- **Association Model** - HOA/Community associations (separate from properties)
- **Homeowner Model** - Homeowners (different from tenants)
- **Board Member Management** - Roles, tenure, permissions
- **Messaging System** - In-app messaging infrastructure
- **Portal System** - Homeowner/Board member portals
- **Fund Accounting** - Multiple funds and cost centers
- **Violation Management** - Violation tracking and letters
- **Architectural Review** - Review workflow system
- **Calendar System** - Association calendar
- **Committee Management** - Committee setup and tracking

---

## Capability Categories

### 1. Community Management & Efficiency

#### 1.1 Online Maintenance Requests and Work Orders
**Status:** ✅ Complete  
**Priority:** HIGH  
**Dependencies:** None (work orders exist, need homeowner portal)

**Current State:**
- ✅ Work orders exist for property managers
- ✅ Homeowners can submit requests via homeowner portal
- ✅ Homeowner portal with authentication
- ✅ Email notifications for property managers when requests are submitted
- ✅ Email notifications for homeowners when status changes
- ✅ Status tracking visible to homeowners
- ✅ Property/unit auto-detection from homeowner account

**What's Needed:**
- ⏳ Photo attachments to maintenance requests (Document model supports this, UI pending)

**Estimated Effort:** Complete (Photo attachments: 1 week)

---

#### 1.2 Online Architectural Reviews with In-App Messaging
**Status:** 🔴 Not Started  
**Priority:** HIGH  
**Dependencies:** Messaging system, Document uploads, Board approval workflow

**What's Needed:**
- Architectural review request model
- Document upload for plans/specs
- In-app messaging between homeowner and board
- Approval workflow (submit → review → approve/reject)
- Email notifications
- Status tracking

**Estimated Effort:** High (4-6 weeks)

---

#### 1.3 Mobile Violations & Tracking
**Status:** 🔴 Not Started  
**Priority:** MEDIUM  
**Dependencies:** Association model, Property/Unit linking

**What's Needed:**
- Violation model (type, severity, status)
- Violation creation (by property managers/board)
- Mobile-friendly violation entry
- Photo attachments
- Violation history per property/unit
- Status tracking (open, in-progress, resolved, appealed)

**Estimated Effort:** Medium (2-3 weeks)

---

#### 1.4 Violation Letters
**Status:** 🔴 Not Started  
**Priority:** MEDIUM  
**Dependencies:** Violation management, Email system, PDF generation

**What's Needed:**
- Letter template system
- PDF generation for violation letters
- Email delivery to homeowners
- Letter history tracking
- Compliance tracking

**Estimated Effort:** Medium (2-3 weeks)

---

#### 1.5 Association Calendar
**Status:** 🔴 Not Started  
**Priority:** MEDIUM  
**Dependencies:** Association model, Event model

**Current State:**
- ❌ No calendar system
- ❌ No event model

**What's Needed:**
- Calendar/Event model
- Association-level events
- Board meetings, committee meetings
- Public events (community events)
- Calendar views (month, week, day)
- Email reminders
- iCal export

**Estimated Effort:** Medium (2-3 weeks)

---

#### 1.6 Add Rules & Regulations
**Status:** 🔴 Not Started  
**Priority:** LOW  
**Dependencies:** Association model, Document system

**What's Needed:**
- Rules & regulations document management
- Version control
- Categories (CC&Rs, bylaws, policies)
- Public visibility in homeowner portal
- Search functionality

**Estimated Effort:** Low (1 week)

---

#### 1.7 Board Member Roles & Tenure Tracking
**Status:** ✅ Complete  
**Priority:** HIGH  
**Dependencies:** Association model, User roles extension

**Current State:**
- ✅ Board member model created with roles (President, Vice President, Secretary, Treasurer, Member-at-Large)
- ✅ Tenure tracking (start date, end date)
- ✅ Board member can be linked to User (property manager) or Homeowner
- ✅ Historical board member tracking (via endDate)
- ✅ Board member CRUD operations
- ✅ Filtering by association, role, active status

**What's Needed:**
- ⏳ Board member portal access (separate from homeowner portal)
- ⏳ Board member-specific permissions

**Estimated Effort:** Complete (Portal access: 2 weeks)

---

#### 1.8 Committees Set Up
**Status:** 🔴 Not Started  
**Priority:** MEDIUM  
**Dependencies:** Association model, Board members, User management

**What's Needed:**
- Committee model
- Committee members (can be board or homeowners)
- Committee roles (Chair, Member)
- Committee meetings
- Committee documents
- Committee-specific permissions

**Estimated Effort:** Medium (2 weeks)

---

### 2. Association Financials

#### 2.1 Bank Integrations
**Status:** 🔴 Not Started  
**Priority:** HIGH  
**Dependencies:** Fund accounting, Bank account model

**What's Needed:**
- Bank account model (per association, per fund)
- Bank API integrations (Plaid, Yodlee, or manual import)
- Transaction import
- Account reconciliation (we have this for payments, need for HOA fees)
- Multi-account support

**Estimated Effort:** High (4-6 weeks)

---

#### 2.2 Online Payments
**Status:** ✅ Complete  
**Priority:** HIGH  
**Dependencies:** Homeowner portal, Payment system (exists)

**Current State:**
- ✅ Stripe payment processing for homeowner payments
- ✅ Payment methods management (add/delete payment methods)
- ✅ Homeowner portal payment interface
- ✅ HOA fee/due payment flow with Stripe
- ✅ Payment history for homeowners
- ✅ Late fee calculation and automation
- ✅ Automatic fee status updates based on payments
- ✅ Account balance tracking
- ✅ Recurring fee support (monthly, quarterly, annually)
- ✅ Payment method setup with Stripe SetupIntents

**What's Needed:**
- ⏳ Payment reminders (email notifications)
- ⏳ Recurring payment setup (auto-pay for recurring fees)

**Estimated Effort:** Complete (Reminders & auto-pay: 1-2 weeks)

---

#### 2.3 Automated AP (Accounts Payable)
**Status:** 🔴 Not Started  
**Priority:** MEDIUM  
**Dependencies:** Vendor management (exists), Approval workflow, Bank integration

**What's Needed:**
- Bill entry system
- Vendor bill management
- Approval workflow (board approval)
- Automated payment scheduling
- Payment method selection (check, ACH, wire)
- Payment history

**Estimated Effort:** High (4-5 weeks)

---

#### 2.4 Smart Bill Entry
**Status:** 🔴 Not Started  
**Priority:** LOW  
**Dependencies:** Automated AP, OCR/document processing

**What's Needed:**
- OCR for bill scanning
- Automatic field extraction (vendor, amount, due date)
- Bill categorization
- Duplicate detection
- Smart matching to vendors

**Estimated Effort:** High (6-8 weeks)

---

#### 2.5 Customized Reports
**Status:** 🔴 Not Started  
**Priority:** MEDIUM  
**Dependencies:** Fund accounting, Financial data

**What's Needed:**
- Report builder/configuration
- Financial reports (income statement, balance sheet, cash flow)
- Budget vs actual reports
- Delinquency reports
- Vendor payment reports
- Export (PDF, Excel, CSV)

**Estimated Effort:** Medium (3-4 weeks)

---

#### 2.6 Corporate Accounting
**Status:** 🔴 Not Started  
**Priority:** LOW  
**Dependencies:** Fund accounting, Multi-entity support

**What's Needed:**
- Multi-entity accounting
- Inter-entity transactions
- Consolidated reporting
- Entity-level financials

**Estimated Effort:** High (6-8 weeks)

---

#### 2.7 Multiple Fund Accounting and Cost Centers
**Status:** 🔴 Not Started  
**Priority:** HIGH  
**Dependencies:** Association model, Financial tracking

**What's Needed:**
- Fund model (Operating, Reserve, Special Assessment, etc.)
- Cost center model
- Fund-specific accounts
- Fund transfers
- Fund-level reporting
- Budget by fund

**Estimated Effort:** High (4-6 weeks)

---

#### 2.8 Vendor eCheck and Bill Pay
**Status:** 🔴 Not Started  
**Priority:** MEDIUM  
**Dependencies:** Automated AP, Bank integration, Vendor management

**What's Needed:**
- eCheck generation
- ACH payment processing
- Vendor payment method management
- Payment scheduling
- Payment confirmation

**Estimated Effort:** Medium (3-4 weeks)

---

### 3. Customer Service & Community Communication

#### 3.1 Online Portals for Homeowners & Board Members
**Status:** ✅ Complete (Homeowners) / 🟡 Partially Complete (Board Members)  
**Priority:** HIGH  
**Dependencies:** Authentication, Role-based access, Association model

**Current State:**
- ✅ Homeowner portal with authentication
- ✅ Homeowner dashboard with account balance, fees, payments
- ✅ Homeowner can view and pay HOA fees
- ✅ Homeowner can submit maintenance requests
- ✅ Homeowner can view payment history
- ✅ Homeowner can manage payment methods
- ✅ Homeowner can view documents
- ✅ Superadmin can impersonate homeowners
- ✅ Email verification for homeowners
- ⏳ Board member portal (pending - board members can use property manager portal for now)
- ⏳ Architectural reviews (pending)
- ⏳ Violations viewing (pending)
- ⏳ Calendar viewing (pending)

**What's Needed:**
- ⏳ Dedicated board member portal with board-specific features
- ⏳ Board member dashboard with approval workflows
- ⏳ Architectural review submission and approval
- ⏳ Violation viewing and management
- ⏳ Association calendar integration

**Estimated Effort:** Homeowner Portal Complete (Board Portal & Additional Features: 4-6 weeks)

---

#### 3.2 Association Calendar
**Status:** 🔴 Not Started  
**Priority:** MEDIUM  
**Dependencies:** Association model, Event model (same as 1.5)

**Note:** Duplicate of 1.5 - same feature

---

#### 3.3 Text & Email
**Status:** 🟡 Partially Complete  
**Priority:** MEDIUM  
**Dependencies:** Email system (exists), SMS integration

**Current State:**
- ✅ Email sending exists
- ❌ No SMS/text messaging
- ❌ No bulk messaging
- ❌ No message templates
- ❌ No message history

**What's Needed:**
- SMS integration (Twilio, etc.)
- Bulk messaging (email + SMS)
- Message templates
- Message history
- Opt-in/opt-out management
- Scheduled messages

**Estimated Effort:** Medium (3-4 weeks)

---

#### 3.4 AppFolio Mailing Service
**Status:** 🔴 Not Started  
**Priority:** LOW  
**Dependencies:** Document system, Mailing service integration

**What's Needed:**
- Integration with mailing service
- Bulk document mailing
- Address verification
- Mailing history

**Estimated Effort:** Medium (2-3 weeks)

---

#### 3.5 Shared Folders and Documents
**Status:** 🟡 Partially Complete  
**Priority:** MEDIUM  
**Dependencies:** Document system (exists), Folder organization

**Current State:**
- ✅ Document upload/storage exists
- ❌ No folder organization
- ❌ No document sharing/permissions
- ❌ No document categories

**What's Needed:**
- Folder structure
- Document categories
- Permission-based access
- Document search
- Version control

**Estimated Effort:** Medium (2-3 weeks)

---

#### 3.6 In-App Messaging for Architectural Reviews
**Status:** 🔴 Not Started  
**Priority:** MEDIUM  
**Dependencies:** Messaging system, Architectural reviews

**What's Needed:**
- Threaded messaging
- Message attachments
- Read receipts
- Email notifications
- Message history

**Estimated Effort:** Medium (2-3 weeks)

---

#### 3.7 Board Approvals
**Status:** 🔴 Not Started  
**Priority:** HIGH  
**Dependencies:** Board members, Approval workflow

**What's Needed:**
- Approval request model
- Approval workflow (who can approve what)
- Voting system (if needed)
- Approval history
- Email notifications
- Dashboard for pending approvals

**Estimated Effort:** Medium (3-4 weeks)

---

#### 3.8 Online Portal for Vendors
**Status:** 🔴 Not Started  
**Priority:** LOW  
**Dependencies:** Vendor management (exists), Portal system

**What's Needed:**
- Vendor portal access
- View assigned work orders
- Update work order status
- Submit invoices
- View payment history

**Estimated Effort:** Medium (2-3 weeks)

---

#### 3.9 Mobile Apps
**Status:** 🔴 Not Started  
**Priority:** LOW  
**Dependencies:** API (exists), Mobile app development

**What's Needed:**
- React Native or native mobile app
- Homeowner app
- Property manager app
- Push notifications
- Offline support

**Estimated Effort:** Very High (12+ weeks)

---

## Recommended Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
**Goal:** Build core HOA data models and basic functionality

1. **Association Model & Homeowner Model** (Week 1-2)
   - Create Association model (separate from Organization)
   - Create Homeowner model (different from Tenant)
   - Link homeowners to units/properties
   - Migration strategy

2. **Board Member Management** (Week 2-3)
   - Board member roles
   - Tenure tracking
   - Permissions

3. **Basic Homeowner Portal** (Week 3-4)
   - Authentication for homeowners
   - Basic dashboard
   - View account balance
   - View documents

**Dependencies:** None  
**Estimated Total:** 4 weeks

---

### Phase 2: Core Features (Weeks 5-10)
**Goal:** Enable homeowners to interact with the system

4. **Online Maintenance Requests** (Week 5-6)
   - Extend work orders for homeowner submission
   - Homeowner portal integration
   - Email notifications

5. **Online Payments for HOA Fees** (Week 6-7)
   - HOA fee/due model
   - Payment flow in homeowner portal
   - Recurring payment setup

6. **Violation Management** (Week 7-8)
   - Violation model
   - Violation creation
   - Violation letters (PDF generation)

7. **Association Calendar** (Week 8-9)
   - Calendar/Event model
   - Calendar views
   - Public events

8. **Messaging System** (Week 9-10)
   - In-app messaging infrastructure
   - Threaded conversations
   - Email notifications

**Dependencies:** Phase 1  
**Estimated Total:** 6 weeks

---

### Phase 3: Advanced Features (Weeks 11-18)
**Goal:** Advanced financial and management features

9. **Fund Accounting** (Week 11-13)
   - Multiple funds
   - Cost centers
   - Fund transfers
   - Fund-level reporting

10. **Architectural Reviews** (Week 13-15)
    - Review request model
    - Document upload
    - In-app messaging integration
    - Approval workflow

11. **Board Approvals** (Week 15-16)
    - Approval workflow
    - Voting system
    - Dashboard

12. **Automated AP** (Week 16-18)
    - Bill entry
    - Approval workflow
    - Payment scheduling

**Dependencies:** Phase 1, Phase 2  
**Estimated Total:** 8 weeks

---

### Phase 4: Enhancements (Weeks 19+)
**Goal:** Polish and advanced features

13. **Bank Integrations**
14. **Customized Reports**
15. **Committees**
16. **Rules & Regulations Management**
17. **Enhanced Communication (SMS, bulk messaging)**
18. **Vendor Portal**
19. **Mobile Apps** (if needed)

---

## Database Schema Changes Needed

### New Models Required:

1. **Association**
   - id, name, address, contact info
   - organizationId (links to PropVestor org)
   - settings, rules

2. **Homeowner**
   - id, name, email, phone
   - associationId
   - unitId/propertyId (which unit they own)
   - accountBalance, paymentMethod
   - status (active, inactive, delinquent)

3. **BoardMember**
   - id, userId, associationId
   - role (PRESIDENT, VICE_PRESIDENT, SECRETARY, TREASURER, MEMBER_AT_LARGE)
   - startDate, endDate
   - isActive

4. **Violation**
   - id, associationId, homeownerId, unitId
   - type, severity, description
   - status, violationDate, resolvedDate
   - photos, documents

5. **ViolationLetter**
   - id, violationId
   - letterType, content
   - sentDate, pdfUrl

6. **ArchitecturalReview**
   - id, associationId, homeownerId, unitId
   - requestType, description
   - status (PENDING, UNDER_REVIEW, APPROVED, REJECTED)
   - submittedDate, reviewedDate
   - documents, messages

7. **AssociationEvent**
   - id, associationId
   - title, description, eventType
   - startDate, endDate
   - location, isPublic

8. **Committee**
   - id, associationId, name, description
   - members (many-to-many with users)
   - isActive

9. **Fund**
   - id, associationId, name, type
   - balance, budget

10. **CostCenter**
    - id, associationId, fundId, name
    - budget, actual

11. **HOAFee/Due**
    - id, associationId, homeownerId
    - amount, dueDate, period
    - status, paidDate

12. **Message/Conversation**
    - id, associationId
    - participants (many-to-many with users)
    - subject, messages (nested)
    - relatedTo (architectural review, work order, etc.)

13. **ApprovalRequest**
    - id, associationId, requestType
    - requesterId, approvers (many-to-many with board members)
    - status, votes, decision

---

## API Architecture Considerations

### New Route Groups Needed:
- `/api/associations` - Association management
- `/api/homeowners` - Homeowner management
- `/api/board-members` - Board member management
- `/api/violations` - Violation management
- `/api/architectural-reviews` - Review requests
- `/api/committees` - Committee management
- `/api/association-events` - Calendar/events
- `/api/funds` - Fund accounting
- `/api/hoa-fees` - HOA fee management
- `/api/messages` - In-app messaging
- `/api/approvals` - Board approvals

### Portal Routes:
- `/portal/homeowner` - Homeowner portal routes
- `/portal/board` - Board member portal routes
- `/portal/vendor` - Vendor portal routes (future)

---

## Testing Strategy

### Unit Tests:
- All new models and business logic
- API endpoints
- Permission checks

### Integration Tests:
- Portal authentication flows
- Payment processing
- Approval workflows
- Messaging system

### E2E Tests:
- Homeowner submits maintenance request
- Homeowner pays HOA fee
- Board member approves architectural review
- Violation creation and letter sending

---

## Security Considerations

1. **Homeowner Portal Access:**
   - Separate authentication (email-based)
   - Limited permissions
   - No access to other homeowners' data

2. **Board Member Permissions:**
   - Role-based access control
   - Audit logging for sensitive actions

3. **Financial Data:**
   - Encrypted storage
   - Access logging
   - Compliance (PCI-DSS for payments)

4. **Document Access:**
   - Permission-based document access
   - Secure file storage

---

## Next Steps

1. ✅ Create this tracking document
2. ⏳ Review and prioritize with stakeholders
3. ⏳ Design database schema for Phase 1
4. ⏳ Create migration plan
5. ⏳ Begin Phase 1 implementation

---

## Notes

- **Organization vs Association:** Organizations in PropVestor are property management companies. Associations are HOAs/communities. An organization can manage multiple associations.
- **Tenant vs Homeowner:** Tenants rent properties. Homeowners own units in associations. Different models, different workflows.
- **Reuse Existing Infrastructure:** Leverage work orders, payments, documents, email where possible.
- **Incremental Development:** Build in phases, test thoroughly, deploy incrementally.

---

**Last Updated:** 2024-12-24  
**Status:** Planning Phase

