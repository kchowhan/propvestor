# Subdomain Architecture & Homeowner Portal Access

## Current Architecture

### How It Works Now

**Current Setup:**
- **Single Next.js App** (`apps/web`) serves both:
  - Property Manager Portal: `/login`, `/dashboard`, `/properties`, etc.
  - Homeowner Portal: `/homeowner/login`, `/homeowner/dashboard`, etc.

**API Endpoints:**
- Property Manager Auth: `/api/auth/login`
- Homeowner Auth: `/api/homeowner-auth/login` (public, no auth required)
- Homeowner Portal: `/api/homeowner-portal/*` (requires homeowner JWT token)

**Authentication Flow:**
1. **Property Managers**: Login at `/login` → Get JWT with `userId` + `organizationId`
2. **Homeowners**: Login at `/homeowner/login` → Get JWT with `homeownerId` + `associationId`

**Key Point**: Homeowners authenticate **independently** from property managers. They don't need a property manager account.

---

## How HOA-Only Organizations Work

### Current Model

**Organization Structure:**
- An `Organization` can have:
  - **Property Management**: Properties, Tenants, Leases (existing)
  - **HOA Management**: Associations, Homeowners, Board Members (new)
  - **Both**: Can do both property management AND HOA management

**HOA-Only Scenario:**
1. Organization signs up (e.g., "Sunset HOA Management")
2. Property manager creates an `Association` (e.g., "Sunset Villas HOA")
3. Property manager adds `Homeowner` records to the Association
4. Homeowners get login credentials (email + password)
5. Homeowners access portal at `/homeowner/login` with their credentials
6. Homeowners see only their HOA data (fees, violations, maintenance requests)

**Important**: The Organization still exists and has property manager users, but they may only use HOA features. The homeowner portal is separate.

---

## Proposed Subdomain Architecture

### Option 1: Single App with Subdomain Routing (Recommended)

**Structure:**
- `propvestor.io` → Marketing site (`apps/marketing`)
- `app.propvestor.io` → Main app (`apps/web`)
  - Property managers: `/login`, `/dashboard`
  - Homeowners: `/homeowner/login`, `/homeowner/dashboard`
- API: `api.propvestor.io` → API server (`apps/api`)

**Implementation:**
- Use Next.js middleware to detect subdomain
- Route based on subdomain:
  ```typescript
  // middleware.ts
  if (hostname === 'propvestor.io') {
    // Serve marketing app
  } else if (hostname === 'app.propvestor.io') {
    // Serve main app (property + homeowner portals)
  }
  ```

**Pros:**
- ✅ Single codebase for property + homeowner portals
- ✅ Shared components and utilities
- ✅ Easier maintenance
- ✅ Homeowners can still access via `app.propvestor.io/homeowner/login`

**Cons:**
- ❌ Homeowners see property management routes in URL structure (but can't access them)

---

### Option 2: Separate Homeowner Subdomain

**Structure:**
- `propvestor.io` → Marketing site
- `app.propvestor.io` → Property Manager Portal
- `homeowner.propvestor.io` → Homeowner Portal (separate Next.js app or route)
- `api.propvestor.io` → API server

**Implementation:**
- Create separate Next.js app for homeowners OR
- Use subdomain routing in middleware to serve different layouts

**Pros:**
- ✅ Clean separation
- ✅ Homeowners have dedicated subdomain
- ✅ Can customize homeowner experience completely

**Cons:**
- ❌ More complex deployment
- ❌ Code duplication if separate apps
- ❌ More infrastructure to manage

---

### Option 3: Association-Specific Subdomains (Advanced)

**Structure:**
- `propvestor.io` → Marketing
- `app.propvestor.io` → Property Manager Portal
- `{association-slug}.propvestor.io` → Homeowner Portal for specific HOA
- `api.propvestor.io` → API server

**Example:**
- `sunset-villas.propvestor.io` → Homeowners for "Sunset Villas HOA"
- `oak-ridge.propvestor.io` → Homeowners for "Oak Ridge HOA"

**Implementation:**
- Dynamic subdomain routing
- Lookup association by subdomain
- Auto-redirect to correct association context

**Pros:**
- ✅ Branded experience per HOA
- ✅ Clean URLs for homeowners
- ✅ Can customize per association

**Cons:**
- ❌ Complex DNS and routing setup
- ❌ Requires wildcard SSL certificate
- ❌ More infrastructure complexity

---

## Recommended Approach

### Phase 1: Current Setup (Keep As-Is)
- Keep single app with `/homeowner/*` routes
- Works for both property management and HOA-only organizations
- Homeowners access via `app.propvestor.io/homeowner/login`

### Phase 2: Add Subdomain Routing (If Needed)
- Add Next.js middleware to detect subdomain
- Route marketing to separate app
- Keep property + homeowner portals in same app
- Homeowners still use `/homeowner/*` routes

### Phase 3: Association Subdomains (Future)
- Only if there's demand for branded homeowner portals
- Requires significant infrastructure changes

---

## Current Homeowner Access Flow

### For HOA-Only Organizations:

1. **Property Manager Setup:**
   - Property manager logs into `app.propvestor.io`
   - Creates Association
   - Adds Homeowners
   - Sets up HOA fees

2. **Homeowner Access:**
   - Homeowner goes to `app.propvestor.io/homeowner/login`
   - Enters email + password (set by property manager)
   - Optionally enters Association ID (or system finds by email)
   - Gets JWT token with `homeownerId` + `associationId`
   - Redirected to `/homeowner/dashboard`

3. **Homeowner Portal Features:**
   - View HOA fees and balance
   - Make payments
   - View violations
   - Submit maintenance requests
   - View documents

**Key Point**: Homeowners don't need to know about the property manager portal. They just access `/homeowner/*` routes.

---

## API Endpoint Structure

### Current Endpoints:

```
/api/homeowner-auth/login          # Public - homeowner login
/api/homeowner-auth/register       # Public - homeowner registration
/api/homeowner-portal/dashboard    # Protected - requires homeowner JWT
/api/homeowner-portal/balance      # Protected
/api/homeowner-portal/documents    # Protected
/api/homeowner-payments/*          # Protected - payment processing
/api/hoa-fees/*                    # Protected - property manager only
/api/violations/*                  # Protected - both property manager and homeowner
```

**Authentication:**
- Property Manager routes: Require `requireAuth` middleware (JWT with `userId` + `organizationId`)
- Homeowner routes: Require `requireHomeownerAuth` middleware (JWT with `homeownerId` + `associationId`)

---

## Recommendations

1. **Keep Current Structure** for now:
   - Single app works well
   - Homeowners access via `/homeowner/*` routes
   - Clear separation in code and routes

2. **Add Subdomain for Marketing**:
   - Deploy marketing app to `propvestor.io`
   - Keep main app at `app.propvestor.io`
   - Use Next.js middleware or separate deployment

3. **Consider Association Subdomains Later**:
   - Only if there's strong demand
   - Requires significant infrastructure investment
   - Can be added incrementally

4. **Current Setup Handles HOA-Only Orgs Well**:
   - Property managers can create organizations that only use HOA features
   - Homeowners authenticate independently
   - No confusion about access levels

---

## Questions to Consider

1. **Do homeowners need a separate subdomain?**
   - Current: `app.propvestor.io/homeowner/login`
   - Alternative: `homeowner.propvestor.io`
   - **Recommendation**: Keep current unless there's a strong branding need

2. **Should HOA-only orgs have different signup flow?**
   - Current: Same signup, just don't use property management features
   - Alternative: Separate "HOA Management" signup flow
   - **Recommendation**: Keep unified, but add feature flags/onboarding

3. **Do associations need branded subdomains?**
   - Current: All homeowners use same portal
   - Alternative: `{association}.propvestor.io`
   - **Recommendation**: Only if there's demand and budget for infrastructure

