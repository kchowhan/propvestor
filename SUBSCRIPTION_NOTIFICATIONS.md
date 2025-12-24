# Subscription Limit Notifications & Restrictions

## Current State

### ✅ What's Implemented

1. **Limit Enforcement**
   - Properties: `requireLimit('properties')` middleware blocks creation when limit is reached
   - Tenants: `requireLimit('tenants')` middleware blocks creation when limit is reached
   - Users: `requireLimit('users')` middleware blocks creation when limit is reached
   - Error message: "You have reached your [Resource] limit ([limit]). Please upgrade your plan to add more [resource]."

2. **Subscription Page Shows Usage**
   - Displays current usage vs limits (e.g., "1 / 1" for properties)
   - Shows for all resources: properties, tenants, users, storage
   - Located at `/subscription` page

3. **Free Plan Limits**
   - Properties: 1
   - Tenants: 5
   - Users: 2
   - Storage: 100 MB
   - API Calls: 100/hour

### ❌ What's Missing

1. **Proactive Notifications**
   - No warnings when approaching limits (e.g., at 80% usage)
   - No dashboard alerts/banners
   - No email notifications
   - Users only find out when they hit the limit

2. **Visual Indicators**
   - No progress bars showing usage percentage
   - No color-coded warnings (yellow at 80%, red at 95%)
   - No "Upgrade" buttons when approaching limits

3. **Better Error Messages**
   - Error messages don't link to pricing/upgrade page
   - No suggestions for which plan to upgrade to

---

## Recommendations

### 1. Add Proactive Warnings (80% threshold)

**Backend:**
- Add `/api/subscriptions/limits-with-usage` endpoint that returns:
  - Current limits
  - Current usage
  - Warnings array (when usage >= 80% or >= 95%)
  - Percentage calculations

**Frontend:**
- Add warning banners to Dashboard when approaching limits
- Add progress bars with color coding:
  - Green: < 80%
  - Yellow: 80-95%
  - Red: >= 95%
- Add "Upgrade" CTA buttons in warnings

### 2. Dashboard Alerts

Add a banner at the top of the Dashboard showing:
- "You're using 80% of your properties limit (1/1). Upgrade to add more properties."
- Link to `/pricing` page
- Dismissible (store in localStorage)

### 3. Enhanced Error Messages

When limit is hit:
- Show error message with link to pricing page
- Suggest specific plan based on current usage
- Example: "You've reached your property limit. Upgrade to Basic ($49/mo) to add up to 10 properties."

### 4. Subscription Page Enhancements

- Add progress bars for each resource
- Show warning badges when approaching limits
- Add "Upgrade" buttons next to resources at limit

---

## Implementation Priority

1. **High Priority**: Add `/api/subscriptions/limits-with-usage` endpoint
2. **High Priority**: Add dashboard warning banners
3. **Medium Priority**: Add progress bars to subscription page
4. **Medium Priority**: Enhance error messages with upgrade links
5. **Low Priority**: Email notifications for limit warnings

---

## Answer to User's Questions

### Q: When does a new org on free plan get notified they need to upgrade?

**Current Answer**: They are NOT proactively notified. They only find out when they try to create a resource and hit the limit.

**Recommended**: Add warnings at 80% usage and dashboard alerts.

### Q: Does the property plan restrict them based on the plan they're in?

**Current Answer**: YES. The `requireLimit('properties')` middleware is applied to the `POST /api/properties` route. When they try to create a property and have reached their limit (1 for free plan), they get a 403 error with message: "You have reached your Properties limit (1). Please upgrade your plan to add more properties."

**How it works:**
1. Free plan: 1 property limit
2. User tries to create 2nd property
3. Middleware checks: `currentUsage (1) >= limit (1)` → TRUE
4. Returns 403 error with upgrade message
5. Property creation is blocked

---

## Next Steps

1. Fix corrupted `subscriptions.ts` file
2. Add `/api/subscriptions/limits-with-usage` endpoint
3. Add dashboard warning component
4. Add progress bars to subscription page
5. Enhance error messages with upgrade links

