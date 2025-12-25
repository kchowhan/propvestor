# Deploying Marketing App to Vercel

This guide walks you through deploying the PropVestor marketing site to Vercel.

## Prerequisites

- A GitHub, GitLab, or Bitbucket account
- Your code pushed to a repository
- A Vercel account (free tier works)

## Method 1: Deploy via Vercel Dashboard (Recommended)

### Step 1: Push Code to Repository

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your repository (GitHub/GitLab/Bitbucket)

### Step 3: Configure Project Settings

Since this is a monorepo, you need to configure:

- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** `apps/marketing` ⚠️ **Important!**
- **Build Command:** `cd ../.. && npm install && cd apps/marketing && npm run build`
- **Output Directory:** `.next` (default)
- **Install Command:** `cd ../.. && npm install`

### Step 4: Environment Variables (Optional)

If your marketing site needs to link to your production app:

- **Variable Name:** `NEXT_PUBLIC_APP_URL`
- **Value:** `https://app.propvestor.com` (or your app URL)

Then update links in `apps/marketing/app/layout.tsx` and other pages to use:
```typescript
process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
```

### Step 5: Deploy

Click **"Deploy"** and wait for the build to complete!

## Method 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Navigate to Marketing App

```bash
cd apps/marketing
```

### Step 4: Deploy

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No (first time) or Yes (if updating)
- **Project name?** `propvestor-marketing` (or your choice)
- **In which directory is your code located?** `apps/marketing`
- **Want to override settings?** Yes
  - **Root Directory:** `apps/marketing`
  - **Build Command:** `cd ../.. && npm install && cd apps/marketing && npm run build`
  - **Output Directory:** `.next`

### Step 5: Deploy to Production

```bash
vercel --prod
```

## Updating Links for Production

Before deploying, update hardcoded localhost URLs:

1. **Search for localhost references:**
   ```bash
   grep -r "localhost:3000" apps/marketing/app
   ```

2. **Replace with environment variable:**
   ```typescript
   // Before
   href="http://localhost:3000/login"
   
   // After
   href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`}
   ```

3. **Or create a constant:**
   ```typescript
   // apps/marketing/lib/constants.ts
   export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
   ```

## Custom Domain

1. Go to your project in Vercel dashboard
2. Click **Settings** → **Domains**
3. Add your domain (e.g., `propvestor.com`)
4. Follow DNS configuration instructions

## Troubleshooting

### Build Fails

**Error:** "Cannot find module"
- **Solution:** Make sure `Root Directory` is set to `apps/marketing`
- **Solution:** Ensure `Install Command` runs from root: `cd ../.. && npm install`

**Error:** "Build command failed"
- **Solution:** Check that all dependencies are in `package.json`
- **Solution:** Verify Node.js version (should be >= 20.9.0)

### Monorepo Issues

If Vercel doesn't detect the monorepo correctly:
1. Ensure `vercel.json` exists in the root
2. Set Root Directory to `apps/marketing` in project settings
3. Use the custom build command: `cd ../.. && npm install && cd apps/marketing && npm run build`

### Environment Variables Not Working

- Make sure variable names start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

## Continuous Deployment

Once connected, Vercel automatically deploys:
- **Production:** Every push to `main` branch
- **Preview:** Every push to other branches (creates preview URLs)

## Next Steps

After deployment:
1. Update DNS if using custom domain
2. Test all links and forms
3. Set up analytics (Vercel Analytics or Google Analytics)
4. Configure preview deployments for pull requests
