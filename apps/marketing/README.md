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

```bash
vercel --prod
```

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
