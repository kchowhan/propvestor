# New Organization Flow & UI Navigation Guide

This document walks you through the complete user journey for a new organization, from registration to using the platform.

---

## 🚀 Step 1: Registration & Organization Creation

### Initial Registration

1. **Navigate to Login Page** (`/login`)
   - User sees a login form with a "Sign up" toggle
   - Click "Sign up" to switch to registration mode

2. **Fill Registration Form**
   - **Name**: Your full name
   - **Email**: Your email address
   - **Password**: Minimum 8 characters
   - **Organization Name**: The name of your property management company/org
     - Example: "ABC Property Management"
     - This will be auto-converted to a slug (e.g., `abc-property-management-123456`)

3. **Submit Registration**
   - Backend automatically:
     - Creates a new `User` account
     - Creates a new `Organization` with the provided name
     - Creates an `OrganizationMembership` linking you as **OWNER**
     - Generates a JWT token
   - You are automatically logged in and redirected to `/dashboard`

### What Happens Behind the Scenes

```typescript
// Registration creates:
1. User account (with hashed password)
2. Organization (with unique slug)
3. OrganizationMembership (role: OWNER)
4. JWT token (valid for the organization)
```

**Important**: At this point, **NO subscription is created**. The organization starts with:
- Default "Free" plan limits (1 property, 5 tenants, 2 users, 100 MB storage)
- No active subscription record
- Can use the platform immediately within free tier limits

---

## 📍 Step 2: Dashboard & Initial Navigation

### After Registration

1. **Dashboard** (`/dashboard`)
   - Welcome screen showing organization overview
   - Quick stats (if you have data)
   - Navigation sidebar on the left

2. **Sidebar Navigation** (Always visible)
   ```
   ┌─────────────────────────┐
   │  [Logo] PropVestor       │
   ├─────────────────────────┤
   │  📊 Dashboard            │
   │  🏠 Properties           │
   │  👥 Tenants & Applicants │
   │  📄 Leases              │
   │  💰 Billing / Rent Roll │
   │  🔧 Maintenance         │
   │  💳 Subscription        │ ← NEW!
   │  👤 User Management     │ (if OWNER/ADMIN)
   └─────────────────────────┘
   ```

3. **Top Bar** (Organization Context)
   - Shows current organization name
   - If you belong to multiple orgs, dropdown to switch
   - "Create Organization" button (if you're OWNER in at least one org)
   - User menu (logout, etc.)

---

## 💳 Step 3: Subscription Selection (Optional but Recommended)

### Navigate to Subscription Page

1. **Click "Subscription" in Sidebar**
   - Route: `/subscription`
   - Shows current subscription status

2. **Initial State (No Subscription)**
   ```
   ┌─────────────────────────────────────┐
   │  Current Subscription              │
   ├─────────────────────────────────────┤
   │  You don't have an active          │
   │  subscription.                     │
   │                                     │
   │  [View Plans] button                │
   └─────────────────────────────────────┘
   ```

3. **Click "View Plans" or Navigate to `/pricing`**
   - Shows all available plans:
     - **Free**: $0/month (1 property, 5 tenants, 2 users)
     - **Basic**: $49/month (10 properties, 50 tenants, 5 users)
     - **Pro**: $149/month (50 properties, 250 tenants, 15 users) ⭐ Most Popular
     - **Enterprise**: $499/month (Unlimited everything)

4. **Select a Plan**
   - Click "Subscribe" on desired plan
   - If paid plan:
     - Stripe checkout flow (if payment method needed)
     - 14-day free trial starts automatically
   - Subscription is created with status `TRIAL` or `ACTIVE`

5. **Return to Subscription Page**
   - Now shows:
     - Current plan details
     - Trial end date (if in trial)
     - Current period dates
     - Usage statistics
     - Upgrade options
     - Cancel button

---

## 🏠 Step 4: Using the Platform (With Limits)

### Creating Resources

#### **Properties** (`/properties`)

1. **Navigate**: Click "Properties" in sidebar
2. **Create Property**:
   - Click "Create Property" button
   - Fill form (name, address, type, etc.)
   - **Limit Check**: Middleware checks if you've reached your property limit
     - Free plan: 1 property max
     - If at limit: Error message "You have reached your Properties limit (1). Please upgrade your plan..."
   - Submit → Property created

#### **Tenants** (`/tenants`)

1. **Navigate**: Click "Tenants & Applicants" in sidebar
2. **Create Tenant/Prospect**:
   - Click "Add New Prospect" (in "Prospects & Applicants" tab)
   - Fill form (name, email, phone, property, unit)
   - **Limit Check**: Middleware checks tenant limit
     - Free plan: 5 tenants max
     - If at limit: Error message with upgrade prompt
   - Submit → Tenant created

#### **Users** (`/users`)

1. **Navigate**: Click "User Management" in sidebar (OWNER/ADMIN only)
2. **Create User**:
   - Fill form (name, email, role)
   - **Limit Check**: Middleware checks user limit
     - Free plan: 2 users max (including yourself)
     - If at limit: Error message
   - Submit → User created, password emailed

---

## 🔄 Step 5: Understanding Subscription Limits

### How Limits Work

1. **No Subscription = Free Tier**
   ```typescript
   // Default limits (hardcoded in getSubscriptionLimits)
   {
     properties: 1,
     tenants: 5,
     users: 2,
     storage: 100 MB,
     apiCalls: 100/hour
   }
   ```

2. **With Subscription = Plan Limits**
   ```typescript
   // Retrieved from SubscriptionPlan.limits JSON field
   {
     properties: 10,  // Basic plan
     tenants: 50,
     users: 5,
     storage: 1000 MB,
     apiCalls: 1000/hour
   }
   ```

3. **Limit Enforcement**
   - Middleware (`requireLimit`) runs on:
     - `POST /api/properties` → checks `properties` limit
     - `POST /api/tenants` → checks `tenants` limit
     - `POST /api/users` → checks `users` limit
   - If limit exceeded: Returns `403 LIMIT_EXCEEDED` error
   - Frontend shows error message with upgrade prompt

### Viewing Current Usage

1. **Go to Subscription Page** (`/subscription`)
2. **See "Current Usage" Section**:
   ```
   Properties:  1 / 1    (Free plan)
   Tenants:     3 / 5
   Users:       2 / 2    (at limit!)
   Storage:     0 MB / 100 MB
   ```

---

## 🎯 Step 6: Common Navigation Patterns

### Scenario 1: New User, First Time Setup

```
1. Register → Dashboard
2. Go to Subscription → View Plans → Subscribe to Basic ($49/month)
3. Go to Properties → Create first property
4. Go to Tenants → Add prospects/applicants
5. Go to Leases → Create lease for approved tenant
6. Go to Billing → Generate rent roll
```

### Scenario 2: Hitting a Limit

```
1. Try to create 2nd property (on Free plan)
2. Error: "You have reached your Properties limit (1). Please upgrade..."
3. Click link or go to Subscription page
4. View plans, upgrade to Basic
5. Return to Properties, create property successfully
```

### Scenario 3: Managing Multiple Organizations

```
1. Top bar shows current org name
2. Click dropdown → See all organizations you belong to
3. Click different org → Switches context
4. All data, limits, subscription are org-specific
5. Can create new org (if OWNER in at least one)
```

---

## 📱 UI Components Overview

### **Dashboard** (`/dashboard`)
- Overview cards (properties, tenants, leases, revenue)
- Recent activity
- Quick actions

### **Properties** (`/properties`)
- List view with filters
- Create/Edit property forms
- Property detail page with units

### **Tenants & Applicants** (`/tenants`)
- **Tab 1: Tenants** - Active tenants with leases
- **Tab 2: Prospects & Applicants** - Screening candidates
- Create prospect form
- Tenant detail page (payment methods, leases, history)

### **Leases** (`/leases`)
- **Tab 1: Create Lease** - New lease form
- **Tab 2: Leases** - List of all leases
- Lease detail page (charges, payments, documents)

### **Billing / Rent Roll** (`/billing`)
- **Tab 1: Rent Roll** - Monthly rent charges
- **Tab 2: Payments** - Record and view payments
- **Tab 3: Reconciliation** - Bank reconciliation

### **Maintenance** (`/maintenance`)
- **Tab 1: Vendors** - Vendor directory
- **Tab 2: Create Work Order** - New work order form
- **Tab 3: Work Orders** - List of work orders

### **Subscription** (`/subscription`) ⭐ NEW
- Current subscription status
- Usage statistics
- Plan upgrade options
- Invoice history
- Cancel subscription

### **User Management** (`/users`) (OWNER/ADMIN only)
- **Tab 1: Create User** - New user form
- **Tab 2: Add Existing User** - Add user by email
- **Tab 3: Users** - List of all users in org

---

## 🔐 Role-Based Access

### **OWNER**
- Full access to everything
- Can create organizations
- Can manage users (all roles)
- Can manage subscription

### **ADMIN**
- Full access to property management
- Can manage users (except OWNER role)
- Cannot create organizations
- Can view subscription

### **MANAGER**
- Can manage properties, tenants, leases, work orders
- Cannot manage users
- Cannot manage subscription

### **ACCOUNTANT**
- Can view billing, payments, reconciliation
- Limited property/tenant access

### **VIEWER**
- Read-only access to most features
- Cannot create/edit anything

---

## 🚨 Important Notes

1. **Subscription is Optional**
   - You can use the platform on the Free tier
   - Limits are enforced, but you can work within them

2. **Trial Period**
   - Paid plans get 14-day free trial
   - Trial ends automatically, then charges begin
   - Can cancel anytime during trial

3. **Organization Switching**
   - Each organization has its own:
     - Subscription
     - Properties, tenants, leases
     - Users and roles
     - Limits and usage

4. **Limit Enforcement**
   - Real-time checks on resource creation
   - Clear error messages with upgrade prompts
   - Usage visible on subscription page

5. **Payment Methods**
   - Stripe integration for subscriptions
   - Payment methods stored securely
   - Invoices tracked automatically

---

## 🎬 Quick Start Checklist

For a new organization owner:

- [ ] Register account with organization name
- [ ] Review dashboard
- [ ] Go to Subscription → Subscribe to a plan (or stay on Free)
- [ ] Create first property
- [ ] Add prospects/applicants
- [ ] Request screening (if using RentSpree)
- [ ] Create lease for approved tenant
- [ ] Set up payment method for tenant
- [ ] Generate monthly rent charges
- [ ] Record payments
- [ ] Invite team members (if needed)

---

This flow ensures a smooth onboarding experience while enforcing subscription limits and providing clear upgrade paths when needed.

