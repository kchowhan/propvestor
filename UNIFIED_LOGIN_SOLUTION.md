# Unified Login Solution

## Problem
Homeowners had to know to go to `/homeowner/login` specifically, which is not intuitive. Telling homeowners "go to app.propvestor.io/homeowner/login" is confusing and unprofessional.

## Solution: Unified Login Page

### What Changed

1. **Unified Login at `/login`**
   - Single login page that handles both property managers and homeowners
   - Three options:
     - **Auto** (default): Automatically tries homeowner login first, then property manager
     - **Manager**: Property manager login only
     - **Homeowner**: Homeowner login only

2. **Smart Auto-Detection**
   - When "Auto" is selected, the system tries homeowner login first (most common for end-users)
   - If homeowner login fails, it automatically tries property manager login
   - Users don't need to know which type they are

3. **Updated Root Page**
   - Root page (`/`) now checks both property manager and homeowner auth contexts
   - Redirects to appropriate dashboard based on which token exists

4. **Provider Updates**
   - Added `HomeownerAuthProvider` to root providers
   - Both auth contexts available throughout the app

### User Experience

**For Homeowners:**
1. Go to `app.propvestor.io` or `app.propvestor.io/login`
2. See three buttons: "Auto", "Manager", "Homeowner"
3. Can select "Homeowner" explicitly, or use "Auto" (default)
4. Enter email + password (optionally Association ID)
5. Automatically redirected to `/homeowner/dashboard`

**For Property Managers:**
1. Go to `app.propvestor.io` or `app.propvestor.io/login`
2. Select "Manager" or use "Auto"
3. Enter email + password
4. Automatically redirected to `/dashboard`

**Auto Mode:**
- Tries homeowner login first (most common for end-users)
- Falls back to property manager if homeowner login fails
- No need to know account type

### Benefits

✅ **Intuitive**: Homeowners just go to the main login page
✅ **No Confusion**: Don't need to explain `/homeowner/login` path
✅ **Smart Detection**: Auto mode handles most cases
✅ **Flexible**: Users can still select their type explicitly
✅ **Professional**: Single entry point for all users

### Technical Details

**Files Changed:**
- `apps/web/src/app/login/page.tsx` - Unified login page
- `apps/web/src/app/page.tsx` - Root page checks both auth contexts
- `apps/web/src/app/providers.tsx` - Added HomeownerAuthProvider

**Login Flow:**
1. User selects account type (or uses Auto)
2. Submits email + password
3. System tries appropriate login(s)
4. Redirects to correct dashboard

**API Endpoints Used:**
- `/api/homeowner-auth/login` - Homeowner authentication
- `/api/auth/login` - Property manager authentication

### Migration Notes

- Old `/homeowner/login` route still works (for backward compatibility)
- Old `/login` route now serves unified login
- Both routes redirect appropriately after authentication

### Future Enhancements

1. **Email Domain Detection**: Could pre-select user type based on email domain
2. **Remember User Type**: Store user's last selection in localStorage
3. **Association Auto-Detection**: If email matches single association, auto-fill Association ID
4. **Magic Links**: Send login links via email (no password needed)

