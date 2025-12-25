# PropVestor Marketing Site

Customer-facing marketing website for PropVestor.

## Overview

This is the public-facing marketing site that showcases PropVestor's features, pricing, and company information. It's separate from the main application (`apps/web`) to allow independent scaling and deployment.

## Getting Started

### Development

```bash
# From the root of the monorepo
npm run dev:marketing

# Or directly
cd apps/marketing
npm run dev
```

The marketing site will be available at `http://localhost:3001`

### Build

```bash
cd apps/marketing
npm run build
npm start
```

## Pages

- **Home** (`/`) - Hero, features overview, pricing preview, CTAs
- **Features** (`/features`) - Detailed feature breakdown by category
- **Pricing** (`/pricing`) - Full pricing table with FAQ
- **About** (`/about`) - Company story, mission, team
- **Contact** (`/contact`) - Contact form and information

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS 3
- **TypeScript:** For type safety
- **Deployment:** Can be deployed independently to Vercel, Netlify, or any static hosting

## Integration with Main App

All "Get Started", "Sign Up", and "Log In" CTAs link to the main application at `http://localhost:3000/login` (or your production app URL).

In production, you would typically:
- Host marketing site at `propvestor.com`
- Host application at `app.propvestor.com` or `propvestor.com/app`

## Customization

### Colors

Colors are defined in `tailwind.config.js`:
- **Primary:** Blue gradient (customizable)
- **Ink:** Dark text color
- **Surface:** Light background

### Content

All content is directly in the page components. Update the following files to change content:
- `app/page.tsx` - Home page
- `app/features/page.tsx` - Features page
- `app/pricing/page.tsx` - Pricing page
- `app/about/page.tsx` - About page
- `app/contact/page.tsx` - Contact page

### Navigation & Footer

Navigation and footer are in `app/layout.tsx`. Update this file to modify the global layout.

## Production Considerations

### Environment Variables

Create `.env.local` for production:

```
NEXT_PUBLIC_APP_URL=https://app.propvestor.com
```

Then update all links from `http://localhost:3000` to use this environment variable.

### Contact Form

The contact form currently logs to console. Implement a proper backend endpoint or use a service like:
- Formspree
- SendGrid
- AWS SES
- Your own API endpoint

## Deployment

### Vercel (Recommended)

#### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in

3. **Click "Add New Project"**

4. **Import your repository**

5. **Configure the project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `apps/marketing`
   - **Build Command:** `cd ../.. && npm install && cd apps/marketing && npm run build`
   - **Output Directory:** `.next` (leave default)
   - **Install Command:** `cd ../.. && npm install`

6. **Add Environment Variables** (if needed):
   - `NEXT_PUBLIC_APP_URL` = `https://app.propvestor.com` (or your app URL)

7. **Click "Deploy"**

#### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Navigate to marketing app:**
   ```bash
   cd apps/marketing
   ```

4. **Deploy:**
   ```bash
   vercel
   ```
   - Follow the prompts
   - When asked for root directory, specify: `apps/marketing`
   - When asked for build command, use: `cd ../.. && npm install && cd apps/marketing && npm run build`

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

#### Monorepo Configuration

The `vercel.json` file in the root directory is configured for monorepo support. Vercel will automatically:
- Install dependencies from the root
- Build the marketing app
- Deploy it correctly

### Docker

```bash
docker build -t propvestor-marketing .
docker run -p 3001:3001 propvestor-marketing
```

### Static Export

```bash
npm run build
# Output will be in the `out` directory
```

## License

Proprietary - PropVestor © 2025
