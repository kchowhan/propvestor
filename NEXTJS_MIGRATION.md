# Next.js Migration Guide

This document outlines the migration from Vite/React Router to Next.js.

## What Changed

### 1. Package Dependencies
- **Removed**: `react-router-dom`, `vite`, `@vitejs/plugin-react`
- **Added**: `next` (includes routing, SSR, and build tools)
- **Updated**: Environment variables from `VITE_` to `NEXT_PUBLIC_`

### 2. Project Structure
```
apps/web/
├── src/
│   ├── app/              # Next.js App Router (NEW)
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page (redirects to /dashboard)
│   │   ├── login/        # Login page
│   │   └── dashboard/    # Dashboard page
│   ├── pages/            # Page components (keep existing)
│   ├── components/       # Components (keep existing)
│   └── context/          # Context providers (keep existing)
├── next.config.js         # Next.js config (NEW)
├── middleware.ts          # Route protection (NEW)
└── package.json          # Updated dependencies
```

### 3. Routing Changes

**Before (React Router)**:
```tsx
<Route path="/dashboard" element={<DashboardPage />} />
```

**After (Next.js)**:
```
src/app/dashboard/page.tsx  // Automatically becomes /dashboard route
```

### 4. Navigation Changes

**Before**:
```tsx
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/dashboard');
```

**After**:
```tsx
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/dashboard');
```

### 5. Environment Variables

**Before**:
```bash
VITE_API_URL=http://localhost:4000/api
```

**After**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Migration Status

### ✅ Completed
- [x] Next.js project setup
- [x] Package.json updated
- [x] Tailwind config updated
- [x] API client updated for Next.js
- [x] AuthContext updated (localStorage handling)
- [x] Root layout created
- [x] Providers setup
- [x] Middleware for route protection
- [x] Login page route

### 🔄 In Progress
- [ ] Convert all page routes to Next.js App Router
- [ ] Update navigation in components (useRouter instead of useNavigate)
- [ ] Update Layout component for Next.js
- [ ] Update Sidebar component for Next.js Link
- [ ] Test all routes

### 📝 To Do
- [ ] Update deployment documentation
- [ ] Update Dockerfile for Next.js
- [ ] Test build process
- [ ] Update .env.example

## Next Steps

1. **Convert remaining pages**:
   - Create `src/app/dashboard/page.tsx`
   - Create `src/app/properties/page.tsx` and `src/app/properties/[id]/page.tsx`
   - Create `src/app/tenants/page.tsx` and `src/app/tenants/[id]/page.tsx`
   - Create `src/app/leases/page.tsx` and `src/app/leases/[id]/page.tsx`
   - Create `src/app/billing/page.tsx`
   - Create `src/app/maintenance/page.tsx` and `src/app/maintenance/[id]/page.tsx`
   - Create `src/app/users/page.tsx`

2. **Update components**:
   - Replace `react-router-dom` imports with `next/navigation`
   - Replace `Link` from react-router with `Link` from `next/link`
   - Replace `useNavigate` with `useRouter`
   - Replace `useLocation` with `usePathname`

3. **Update Layout component**:
   - Remove `Outlet` (Next.js doesn't need it)
   - Use Next.js navigation

4. **Test and verify**:
   - All routes work
   - Authentication flow
   - Organization switching
   - All CRUD operations

## Benefits of Next.js

1. **Built-in Routing**: No need for react-router-dom
2. **Server-Side Rendering**: Better SEO and performance
3. **API Routes**: Can add API routes if needed
4. **Image Optimization**: Built-in image optimization
5. **Better Deployment**: Optimized for Vercel, but works everywhere
6. **TypeScript**: Better TypeScript support
7. **Middleware**: Built-in middleware for auth, redirects, etc.

## Running the App

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## Deployment

Next.js can be deployed to:
- **Vercel** (recommended - zero config)
- **Netlify**
- **AWS Amplify**
- **Railway**
- **Docker** (standalone output)
- Any Node.js hosting

See updated `DEPLOYMENT.md` for details.

