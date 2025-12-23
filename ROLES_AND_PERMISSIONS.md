# Roles and Permissions System

## Overview

PropVestor uses a role-based access control (RBAC) system at the organization level. Each user has a role within each organization they belong to, and permissions are scoped to that organization.

## Key Design Principle: Unified Access

**The same user with the same role can access BOTH property management AND investment management features within the same organization.**

- A single `OrganizationMembership` with one role grants access to all features
- No separate accounts or roles needed for property vs investment management
- The role (OWNER, ADMIN, MANAGER, ACCOUNTANT, VIEWER) applies consistently across both domains
- Users can seamlessly work with properties, tenants, leases, AND investment entities, investors, and distributions using the same account

This unified approach means:
- An OWNER can manage properties AND create investment entities
- An ACCOUNTANT can record rent payments AND record capital contributions
- A MANAGER can manage leases AND view which properties belong to which investment entities
- A VIEWER can see property data AND investment structure

All within the same organization, using the same login credentials and role.

## Role Hierarchy

The roles are ordered from highest to lowest privilege:

1. **OWNER** - Full control, ultimate authority
2. **ADMIN** - Administrative control (nearly full access)
3. **MANAGER** - Operational management
4. **ACCOUNTANT** - Financial operations
5. **VIEWER** - Read-only access

## Role Definitions

### OWNER
**Purpose**: The ultimate authority for the organization. Typically the business owner or primary stakeholder.

**Phase 1 (Property Management) Permissions:**
- ✅ Full access to all property management features
- ✅ Manage users (create, add, remove, change roles)
- ✅ Cannot be removed if they are the last OWNER
- ✅ Can delete the organization (future feature)
- ✅ Can change organization settings (future feature)

**Phase 2 (Investment Management) Permissions:**
- ✅ Create and manage investment entities (LLCs, LPs, SPVs, Trusts)
- ✅ Manage investors (add, remove, update)
- ✅ Record capital contributions and distributions
- ✅ Update property valuations
- ✅ Manage ownership percentages
- ✅ View all financial reports and analytics
- ✅ Export data

**Use Cases:**
- Real estate investment fund manager
- Property portfolio owner
- Syndication sponsor

---

### ADMIN
**Purpose**: Administrative users who need near-full access but aren't the ultimate owner. Can manage day-to-day operations and users.

**Phase 1 (Property Management) Permissions:**
- ✅ Full access to all property management features
- ✅ Manage users (create, add, remove, change roles)
- ✅ Can be demoted or removed by OWNER
- ✅ Cannot remove the last OWNER

**Phase 2 (Investment Management) Permissions:**
- ✅ Create and manage investment entities
- ✅ Manage investors
- ✅ Record capital contributions and distributions
- ✅ Update property valuations
- ✅ Manage ownership percentages
- ✅ View all financial reports
- ❌ Cannot delete investment entities (OWNER only)
- ❌ Cannot modify critical financial settings (OWNER only)

**Use Cases:**
- Property management company operations manager
- Investment fund operations director
- Senior property manager with admin duties

---

### MANAGER
**Purpose**: Day-to-day operational management of properties and tenants. Focused on property management tasks.

**Phase 1 (Property Management) Permissions:**
- ✅ Create, edit, and manage properties
- ✅ Create, edit, and manage units
- ✅ Create, edit, and manage tenants
- ✅ Create, edit, and manage leases
- ✅ Create and manage work orders
- ✅ Create and manage vendors
- ✅ Upload documents
- ✅ View billing and rent roll
- ❌ Cannot manage users
- ❌ Cannot delete properties or critical records
- ❌ Limited access to financial reports

**Phase 2 (Investment Management) Permissions:**
- ✅ View investment entities and their structure
- ✅ View investor information
- ✅ View ownership percentages
- ✅ View capital contributions and distributions (read-only)
- ✅ View property valuations
- ❌ Cannot create or modify investment entities
- ❌ Cannot record contributions or distributions
- ❌ Cannot update valuations
- ❌ Cannot manage investors

**Use Cases:**
- Property manager
- Leasing agent
- Maintenance coordinator
- Regional property manager

---

### ACCOUNTANT
**Purpose**: Financial operations and record-keeping. Focused on billing, payments, and financial reporting.

**Phase 1 (Property Management) Permissions:**
- ✅ View all properties, units, tenants, and leases
- ✅ Create and manage charges (rent, fees, utilities)
- ✅ Record payments
- ✅ View and manage billing/rent roll
- ✅ View financial reports
- ✅ Export financial data
- ✅ Upload financial documents
- ❌ Cannot manage properties, units, tenants, or leases
- ❌ Cannot manage work orders
- ❌ Cannot manage users

**Phase 2 (Investment Management) Permissions:**
- ✅ View all investment entities and investors
- ✅ Record capital contributions
- ✅ Record distributions
- ✅ View ownership percentages
- ✅ View property valuations
- ✅ Generate financial reports for investors
- ✅ Export financial data
- ❌ Cannot create or modify investment entities
- ❌ Cannot manage investors
- ❌ Cannot update property valuations
- ❌ Cannot modify ownership percentages

**Use Cases:**
- Property accountant
- Bookkeeper
- Financial analyst
- Investor relations coordinator

---

### VIEWER
**Purpose**: Read-only access for stakeholders who need visibility but don't need to make changes.

**Phase 1 (Property Management) Permissions:**
- ✅ View all properties, units, tenants, and leases
- ✅ View work orders
- ✅ View billing and rent roll
- ✅ View reports (read-only)
- ✅ Download documents
- ❌ Cannot create, edit, or delete anything
- ❌ Cannot manage users

**Phase 2 (Investment Management) Permissions:**
- ✅ View investment entities and their structure
- ✅ View investor information
- ✅ View ownership percentages
- ✅ View capital contributions and distributions
- ✅ View property valuations
- ✅ View financial reports
- ✅ Download reports
- ❌ Cannot create, edit, or delete anything

**Use Cases:**
- Investor (passive stakeholder)
- Board member
- Auditor
- Consultant
- Legal counsel (read-only access)

---

## Role System Design for Investment Management

### Key Principles

1. **Unified Role System**: The same roles apply to both property management and investment management. This simplifies user management and ensures consistency.

2. **Property-Investment Linkage**: 
   - Properties can be owned by investment entities
   - Investment entities can have multiple investors with ownership percentages
   - This creates a clear hierarchy: Organization → Investment Entity → Property → Unit → Lease

3. **Financial Data Flow**:
   - Property revenue (rent) flows up to investment entities
   - Capital contributions come from investors into entities
   - Distributions flow from entities to investors
   - Valuations track property and entity values over time

4. **Role-Based Access to Investment Data**:
   - OWNER/ADMIN: Full control over investment structure
   - MANAGER: Operational view, can see how properties relate to entities
   - ACCOUNTANT: Can record financial transactions (contributions, distributions)
   - VIEWER: Can see investment structure and financial data

### Example Scenarios

**Scenario 1: Real Estate Syndication**
- **OWNER**: Fund sponsor who creates the LLC, adds investors, manages the structure
- **ADMIN**: Operations manager who helps manage investors and entities
- **ACCOUNTANT**: Records capital calls and distributions
- **MANAGER**: Manages the properties owned by the LLC
- **VIEWER**: Passive investors who want to see their ownership and distributions

**Scenario 2: Property Management Company**
- **OWNER**: Company owner
- **ADMIN**: Operations director
- **MANAGER**: Property managers managing different portfolios
- **ACCOUNTANT**: Handles all billing and payments
- **VIEWER**: Property owners who want visibility into their properties

**Scenario 3: Family Office**
- **OWNER**: Family office principal
- **ADMIN**: Family office manager
- **ACCOUNTANT**: Tracks all investments and distributions
- **VIEWER**: Family members who want to see portfolio performance

---

## Implementation Notes

### Current Implementation (Phase 1)
- ✅ Roles are defined in `OrganizationRole` enum
- ✅ Roles are stored in `OrganizationMembership` model
- ✅ User management endpoints check for OWNER/ADMIN
- ✅ Frontend conditionally shows User Management based on role

### Future Implementation (Phase 2)
- 🔄 Investment management endpoints will check roles for:
  - Creating entities: OWNER/ADMIN
  - Managing investors: OWNER/ADMIN
  - Recording contributions/distributions: OWNER/ADMIN/ACCOUNTANT
  - Viewing investment data: All roles (with different detail levels)
- 🔄 Property-Entity relationships will be visible to all roles
- 🔄 Financial reports will be filtered by role (e.g., VIEWER sees only their own data)

---

## Best Practices

1. **Start with VIEWER**: When in doubt, assign VIEWER role. Users can be promoted later.

2. **Limit OWNER roles**: Only assign OWNER to people who truly need ultimate control. Most organizations should have 1-2 OWNERs.

3. **Use ADMIN for operations**: ADMIN is perfect for operations managers who need user management but aren't the business owner.

4. **MANAGER for property operations**: Property managers should typically be MANAGER role.

5. **ACCOUNTANT for financial tasks**: Anyone handling billing, payments, or investor distributions should be ACCOUNTANT or higher.

6. **VIEWER for stakeholders**: Investors, board members, and consultants should be VIEWER unless they need to make changes.

---

## Questions to Consider

1. **Should MANAGER be able to see investment entity information?**
   - Current design: Yes, read-only. They need to understand which properties belong to which entities.

2. **Should ACCOUNTANT be able to create charges/payments?**
   - Current design: Yes. They handle all financial transactions.

3. **Should VIEWER see all investors or only their own data?**
   - Future consideration: May need to add investor-level permissions for VIEWER role.

4. **Should there be entity-level roles?**
   - Current design: No, roles are organization-level. This keeps it simple. If needed later, we can add entity-level permissions.

