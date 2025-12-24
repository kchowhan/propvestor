# Organization Creation Controls

## Overview

Organization creation is now **restricted** to prevent abuse and ensure proper billing. The system supports multiple organizations but limits who can create them.

---

## Current Restrictions

### 1. **Role Requirement**
- ✅ User must have **OWNER** role in at least one organization
- ❌ ADMIN, MANAGER, ACCOUNTANT, VIEWER cannot create organizations

### 2. **Feature Flag** (New)
- Environment variable: `ALLOW_ORG_CREATION`
- Default: `true` (enabled)
- Set to `false` to completely disable org creation
- Use case: Temporarily disable during maintenance or abuse

### 3. **Subscription Plan Requirement** (New)
- Environment variable: `ORG_CREATION_REQUIRES_ENTERPRISE`
- Default: `true` (requires Enterprise plan)
- If `true`: Only Enterprise plan users can create additional orgs
- If `false`: Any paid plan can create additional orgs
- **Exception**: First org creation (during registration) is always allowed

### 4. **Organization Limit** (New)
- Environment variable: `MAX_ORGS_PER_USER`
- Default: `null` (unlimited)
- Set to a number (e.g., `5`) to limit orgs per user
- Use case: Prevent abuse, control resource usage

---

## Configuration Examples

### Scenario 1: Enterprise Only (Recommended)
```bash
# .env
ALLOW_ORG_CREATION=true
ORG_CREATION_REQUIRES_ENTERPRISE=true
MAX_ORGS_PER_USER=10
```
**Result**: Only Enterprise plan users can create up to 10 organizations

### Scenario 2: Any Paid Plan
```bash
# .env
ALLOW_ORG_CREATION=true
ORG_CREATION_REQUIRES_ENTERPRISE=false
MAX_ORGS_PER_USER=5
```
**Result**: Any paid plan (Basic, Pro, Enterprise) can create up to 5 organizations

### Scenario 3: Completely Disabled
```bash
# .env
ALLOW_ORG_CREATION=false
```
**Result**: No one can create organizations (except during registration)

### Scenario 4: Unlimited for Enterprise
```bash
# .env
ALLOW_ORG_CREATION=true
ORG_CREATION_REQUIRES_ENTERPRISE=true
MAX_ORGS_PER_USER=
```
**Result**: Enterprise users can create unlimited organizations

---

## User Flow

### First Organization (Registration)
1. User registers → Organization automatically created
2. ✅ **Always allowed** (no restrictions)
3. User becomes OWNER of that org

### Additional Organizations
1. User must be OWNER in at least one org
2. Check feature flag (`ALLOW_ORG_CREATION`)
3. Check subscription plan (if `ORG_CREATION_REQUIRES_ENTERPRISE=true`)
4. Check org limit (if `MAX_ORGS_PER_USER` is set)
5. If all pass → Organization created
6. User becomes OWNER of new org

---

## Error Messages

### Feature Disabled
```
403 FORBIDDEN
"Organization creation is currently disabled. Please contact support."
```

### Not Enterprise Plan
```
403 SUBSCRIPTION_REQUIRED
"Creating additional organizations requires an Enterprise plan. Please upgrade your subscription or contact support."
```

### Limit Exceeded
```
403 LIMIT_EXCEEDED
"You have reached the maximum number of organizations (5). Please contact support to create additional organizations."
```

### Not OWNER
```
403 FORBIDDEN
"Only users with OWNER role can create new organizations."
```

---

## UI Behavior

### Frontend Changes
- "Create New Organization" button only shows if:
  1. User is OWNER in at least one org
  2. Feature is enabled (backend check)
  3. User has appropriate subscription (backend check)

### Current Implementation
- Button is shown if `canCreateOrganization` is true
- `canCreateOrganization` = user has OWNER role in at least one org
- **Note**: Backend will still enforce subscription/limit checks
- Frontend can be enhanced to check subscription before showing button

---

## Recommended Settings for Production

```bash
# Production .env
ALLOW_ORG_CREATION=true
ORG_CREATION_REQUIRES_ENTERPRISE=true
MAX_ORGS_PER_USER=10
```

**Rationale**:
- ✅ Allows multi-org for Enterprise customers (premium feature)
- ✅ Prevents abuse from free/basic users
- ✅ Limits resource usage (10 orgs per user)
- ✅ Still allows first org during registration

---

## Future Enhancements

### Option 1: Admin Approval Flow
- User requests new organization
- Admin reviews and approves
- Organization created after approval

### Option 2: Per-Organization Billing
- Each organization requires separate subscription
- Prevents "free" additional orgs
- Clearer billing model

### Option 3: Organization Templates
- Pre-configured organization types
- Faster setup for common use cases
- Better onboarding

### Option 4: Organization Marketplace
- Users can "join" existing organizations
- Organization owners can invite users
- Better collaboration model

---

## Testing

### Test Cases

1. **Registration** (First Org)
   - ✅ Should always work
   - ✅ No subscription required

2. **Enterprise User Creating Org**
   - ✅ Should work if feature enabled
   - ✅ Should respect MAX_ORGS_PER_USER

3. **Basic/Pro User Creating Org**
   - ❌ Should fail if `ORG_CREATION_REQUIRES_ENTERPRISE=true`
   - ✅ Should work if `ORG_CREATION_REQUIRES_ENTERPRISE=false`

4. **Feature Disabled**
   - ❌ Should fail for everyone (except registration)

5. **Limit Exceeded**
   - ❌ Should fail if user has reached MAX_ORGS_PER_USER

---

## Migration Notes

- **Existing users**: Not affected (grandfathered)
- **New restrictions**: Apply only to new org creation
- **Registration**: Always allowed (first org)
- **Backward compatible**: Existing orgs continue to work

---

This controlled approach allows multi-organization support while preventing abuse and ensuring proper billing.

