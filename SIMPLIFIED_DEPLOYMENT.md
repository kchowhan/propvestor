# Simplified Deployment Options

If the current dev/prod setup feels too heavy, here are lighter alternatives.

## Current Setup Complexity

**What we have:**
- 3 Cloud Build files (backend, frontend, marketing)
- 6 GitHub Actions workflows (dev + prod for each)
- Separate dev/prod environments
- VPC connectors, Redis, separate databases
- Environment-specific secrets and buckets

**Potential concerns:**
- Too many moving parts
- Higher cost (separate dev/prod resources)
- More maintenance overhead
- Overkill for early stage

## Option 1: Single Environment (Simplest) ⭐ Recommended for Start

**What it is:**
- One environment (production)
- Auto-deploy on push to `main`
- Manual deploy for critical releases

**Setup:**
```yaml
# Single cloudbuild-backend.yaml (no _ENV)
# Single GitHub Actions workflow (auto-deploy on push)
```

**Pros:**
- ✅ Simplest setup
- ✅ Lowest cost (one set of resources)
- ✅ Easy to maintain
- ✅ Fast to set up

**Cons:**
- ❌ No separate dev environment
- ❌ Risk of breaking production
- ❌ Harder to test before deploy

**Best for:** Early stage, solo developer, MVP

## Option 2: Dev Only (Auto) + Prod (Manual)

**What it is:**
- Dev environment auto-deploys
- Prod environment manual only
- Share some resources (database, Redis)

**Setup:**
- Keep dev workflows (auto)
- Keep prod workflows (manual)
- Use same database/bucket for both (or separate)

**Pros:**
- ✅ Safe testing in dev
- ✅ Controlled prod releases
- ✅ Can share resources to save cost

**Cons:**
- ⚠️ Still two environments
- ⚠️ Need to manage two sets of services

**Best for:** Small team, need testing environment

## Option 3: Preview Deployments (Lightweight)

**What it is:**
- Production environment only
- Preview deployments for PRs
- Use Cloud Run revisions for rollback

**Setup:**
- Single production environment
- Deploy PRs as preview services
- Use Cloud Run traffic splitting for testing

**Pros:**
- ✅ One production environment
- ✅ Test changes before merging
- ✅ Easy rollback with revisions

**Cons:**
- ⚠️ Preview services cost money
- ⚠️ Need to clean up previews

**Best for:** Teams that want testing without full dev environment

## Option 4: Keep Current, But Simplify

**What to keep:**
- Dev/prod separation
- Auto-deploy for dev
- Manual for prod

**What to simplify:**
1. **Share resources:**
   - Same database for dev/prod (use different schemas)
   - Same Redis instance (use different databases)
   - Same storage bucket (use prefixes)

2. **Reduce workflows:**
   - Combine into single workflow with environment parameter
   - Use matrix strategy instead of separate files

3. **Skip VPC connector initially:**
   - Use public IP for Cloud SQL (less secure but simpler)
   - Skip Redis initially (use in-memory rate limiting)

## Recommended: Start Simple, Scale Up

### Phase 1: Single Environment (Now)
```yaml
# One Cloud Build file per app
# One GitHub Actions workflow (auto-deploy)
# One set of resources
```

### Phase 2: Add Dev Environment (When Needed)
```yaml
# Add dev workflows
# Share resources (database, Redis)
# Separate services only
```

### Phase 3: Full Dev/Prod (Current Setup)
```yaml
# Separate everything
# Full isolation
# Production-grade setup
```

## Cost Comparison

### Single Environment
- Cloud SQL: ~$50/month
- Cloud Run: ~$30/month
- Storage: ~$5/month
- **Total: ~$85/month**

### Dev + Prod (Shared Resources)
- Cloud SQL: ~$50/month (shared)
- Cloud Run: ~$50/month (dev + prod)
- Storage: ~$10/month (shared)
- **Total: ~$110/month**

### Dev + Prod (Separate Resources)
- Cloud SQL: ~$100/month (2 instances)
- Cloud Run: ~$80/month
- Storage: ~$20/month
- Redis: ~$60/month
- **Total: ~$260/month**

## Quick Simplification Steps

### 1. Remove Dev Environment (Temporarily)

**Keep only:**
- `cloudbuild-backend.yaml` (remove `_ENV`)
- `cloudbuild-frontend.yaml` (remove `_ENV`)
- `cloudbuild-marketing.yaml` (remove `_ENV`)
- One workflow per app (auto-deploy on push)

**Remove:**
- All `-dev.yml` workflows
- All `-prod.yml` workflows
- Environment substitutions

### 2. Share Resources

**Instead of:**
```yaml
propvestor-db-dev
propvestor-db-prod
```

**Use:**
```yaml
propvestor-db  # Shared
# Use different schemas or prefixes
```

### 3. Skip Optional Features

**Skip initially:**
- Redis (use in-memory rate limiting)
- VPC connector (use public IP)
- Separate buckets (use prefixes)

**Add later when needed**

## What I Recommend

**For now (if too heavy):**
1. **Single environment** - production only
2. **Auto-deploy on push** to main
3. **Manual deploy option** for critical releases
4. **Share resources** - one database, one bucket

**When to add dev/prod:**
- When you have a team
- When you need to test before production
- When you have budget for separate resources
- When you're ready for the complexity

## Quick Start: Simplified Setup

Want me to create a simplified version? I can:
1. Remove environment support from Cloud Build files
2. Create single workflows (auto-deploy)
3. Update documentation for single environment
4. Keep it simple and easy to maintain

Let me know if you want the simplified version!

