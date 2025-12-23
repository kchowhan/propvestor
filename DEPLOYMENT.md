# Deployment Guide

PropVestor is designed to be deployed with the backend and frontend as separate services. This allows for:
- Independent scaling
- Different hosting providers
- Separate CI/CD pipelines
- Better security isolation

## Architecture

```
┌─────────────┐         ┌─────────────┐
│   Frontend  │ ──────> │   Backend   │
│  (Static)   │  HTTP   │   (API)     │
│             │         │             │
└─────────────┘         └──────┬──────┘
                               │
                               ▼
                         ┌─────────────┐
                         │  PostgreSQL │
                         │  Database   │
                         └─────────────┘
```

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 16+
- (Optional) Docker and Docker Compose
- (Optional) Cloud provider accounts (AWS, GCP, Azure, etc.)

## Environment Variables

### Backend (`apps/api/.env`)

See `apps/api/.env.example` for all available variables. Key variables:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/propvestor
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://your-frontend-domain.com

# Optional (for integrations)
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
GCS_BUCKET_NAME=...
DOCUSIGN_INTEGRATOR_KEY=...
```

**Important**: For production, set `CORS_ORIGIN` to your frontend URL(s). Multiple origins can be comma-separated:
```
CORS_ORIGIN=https://app.example.com,https://www.example.com
```

### Frontend (`apps/web/.env`)

See `apps/web/.env.example` for all available variables. Key variable:

```bash
# Required - Backend API URL
VITE_API_URL=https://api.yourdomain.com/api
```

**Note**: Vite environment variables must be prefixed with `VITE_` to be accessible in the browser.

## Deployment Options

### Option 1: Docker Compose (Recommended for Quick Setup)

1. **Clone and configure**:
   ```bash
   git clone <repository>
   cd PropVestor
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   # Edit .env files with your configuration
   ```

2. **Build and run**:
   ```bash
   docker-compose up -d
   ```

3. **Run migrations**:
   ```bash
   docker-compose exec api npm run prisma:migrate
   ```

4. **Seed data** (optional):
   ```bash
   docker-compose exec api npm run seed
   ```

The services will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:4000/api

### Option 2: Separate Deployment

#### Backend Deployment

1. **Build the backend**:
   ```bash
   cd apps/api
   npm install
   npm run build
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

3. **Run migrations**:
   ```bash
   npm run prisma:migrate
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

**Using Docker**:
```bash
docker build -f apps/api/Dockerfile -t propvestor-api .
docker run -p 4000:4000 --env-file apps/api/.env propvestor-api
```

**Using PM2** (process manager):
```bash
npm install -g pm2
pm2 start dist/index.js --name propvestor-api
pm2 save
pm2 startup
```

**Platform-specific guides**:
- **Heroku**: Use Node.js buildpack, set `DATABASE_URL` and other env vars
- **Railway**: Connect GitHub repo, set environment variables
- **AWS Elastic Beanstalk**: Deploy Node.js app, configure environment
- **Google Cloud Run**: Build container, deploy with Cloud Run
- **DigitalOcean App Platform**: Connect repo, configure services

#### Frontend Deployment (Next.js)

**Important**: PropVestor uses Next.js, which supports multiple deployment modes:
- **Standalone** (recommended for Docker): Self-contained Node.js server
- **Static Export**: Pre-rendered static files (if you don't need SSR)
- **Serverless**: Deploy to Vercel, Netlify, AWS Lambda, etc.

You can serve it with:
- **Static hosting platforms** (recommended): Vercel, Netlify, Cloudflare Pages - no server needed
- **CDN**: AWS S3 + CloudFront, Google Cloud Storage + CDN
- **Web servers**: Nginx, Apache, Caddy
- **Simple Node.js server**: `serve` package or Express static middleware
- **Docker**: With nginx or simple Node.js server

1. **Build the frontend**:
   ```bash
   cd apps/web
   npm install
   # Set NEXT_PUBLIC_API_URL environment variable
   export NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
   npm run build
   ```

2. **Deploy the `dist` folder**:

**Option A: Vercel (Recommended - Zero Config)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/web
vercel

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL
```

Or connect your GitHub repo to Vercel - it auto-detects Next.js and deploys automatically.

**Option B: Docker (Standalone Mode)**:
```bash
docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api -t propvestor-web .
docker run -p 3000:3000 propvestor-web
```

**Option C: Netlify**:
- Connect GitHub repo
- Set build command: `cd apps/web && npm install && npm run build`
- Set publish directory: `apps/web/.next`
- Set `NEXT_PUBLIC_API_URL` in environment variables

**Option D: AWS Amplify / Railway / Render**:
- Connect GitHub repo
- Set `NEXT_PUBLIC_API_URL` environment variable
- Build command: `cd apps/web && npm install && npm run build`
- Start command: `cd apps/web && npm start`

**Option E: Self-hosted Node.js**:
```bash
cd apps/web
npm install
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api npm run build
npm start
```

**Platform-specific guides**:
- **Vercel**: Connect GitHub repo, set `NEXT_PUBLIC_API_URL` in environment variables (recommended for Next.js)
- **Netlify**: Connect repo, set build command and `NEXT_PUBLIC_API_URL`
- **AWS Amplify**: Connect repo, set `NEXT_PUBLIC_API_URL` in environment variables
- **Railway**: Connect repo, set `NEXT_PUBLIC_API_URL` and build command
- **Render**: Connect repo, set `NEXT_PUBLIC_API_URL` and build/start commands

## Production Checklist

### Backend
- [ ] Set strong `JWT_SECRET` (use `openssl rand -base64 32`)
- [ ] Set `CORS_ORIGIN` to your frontend domain(s)
- [ ] Use production database (not localhost)
- [ ] Enable HTTPS (use reverse proxy like nginx or cloud load balancer)
- [ ] Set up database backups
- [ ] Configure logging and monitoring
- [ ] Set up health check endpoint
- [ ] Configure rate limiting
- [ ] Set up error tracking (Sentry, etc.)

### Frontend
- [ ] Set `NEXT_PUBLIC_API_URL` to production API URL
- [ ] Build with production optimizations (`npm run build`)
- [ ] Enable HTTPS
- [ ] Configure CDN for static assets (Next.js handles this automatically on Vercel)
- [ ] Set up error tracking
- [ ] Test all API connections
- [ ] Verify SSR/SSG is working correctly (if using)

### Database
- [ ] Run migrations in production
- [ ] Set up automated backups
- [ ] Configure connection pooling
- [ ] Monitor database performance
- [ ] Set up read replicas (if needed)

## Health Checks

### Backend Health Check
Add a health check endpoint to `apps/api/src/routes/index.ts`:
```typescript
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### Frontend Health Check
The nginx configuration includes a `/health` endpoint that returns "healthy".

## Scaling

### Horizontal Scaling (Backend)
- Use a load balancer (nginx, AWS ALB, etc.)
- Deploy multiple API instances
- Use shared session storage (Redis) if needed
- Ensure database connection pooling

### Frontend Scaling
- Use CDN for static assets
- Enable caching headers
- Use multiple edge locations

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **CORS**: Restrict `CORS_ORIGIN` to your frontend domain(s)
3. **Environment Variables**: Never commit `.env` files
4. **Database**: Use strong passwords and restrict network access
5. **JWT Secret**: Use a strong, random secret
6. **Rate Limiting**: Implement rate limiting on API endpoints
7. **Input Validation**: All inputs are validated via Zod schemas
8. **SQL Injection**: Prisma ORM prevents SQL injection

## Monitoring

Recommended tools:
- **Application**: Sentry, LogRocket
- **Infrastructure**: Datadog, New Relic, AWS CloudWatch
- **Uptime**: UptimeRobot, Pingdom
- **Analytics**: Google Analytics, Plausible

## Troubleshooting

### CORS Errors
- Check `CORS_ORIGIN` matches your frontend URL exactly
- Ensure credentials are enabled (already configured)
- Check browser console for specific error messages

### API Connection Errors
- Verify `NEXT_PUBLIC_API_URL` is set correctly (must be prefixed with `NEXT_PUBLIC_`)
- Check backend is running and accessible
- Verify network/firewall rules allow connections
- For Next.js: Ensure env var is set at build time, not just runtime

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check database is accessible from backend server
- Verify network security groups/firewall rules

## CI/CD Examples

### GitHub Actions (Backend)
```yaml
name: Deploy API
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build --workspace apps/api
      - # Add deployment steps
```

### GitHub Actions (Frontend)
```yaml
name: Deploy Web
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build --workspace apps/web
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      - # Add deployment steps
```

## Support

For issues or questions, please refer to:
- README.md for setup instructions
- Individual setup guides in `apps/api/` for integration configuration
- GitHub Issues for bug reports

