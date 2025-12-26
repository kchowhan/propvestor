# Google Cloud Deployment Workflow Explained

This document explains the difference between **one-time setup commands** (gcloud) and **automated deployment** (Cloud Build files).

## Two Types of Commands

### 1. **One-Time Setup Commands (gcloud)** 🔧
**Purpose**: Create and configure infrastructure resources

**When to run**: Once, during initial setup

**Examples**:
- Create Cloud SQL database instance
- Create Redis (Memorystore) instance
- Create VPC connector
- Store secrets in Secret Manager
- Create service accounts
- Set up IAM permissions

**These commands create the "foundation"** - the infrastructure your app runs on.

```bash
# Example: One-time setup
gcloud sql instances create propvestor-db ...
gcloud redis instances create propvestor-redis ...
gcloud secrets create jwt-secret --data-file=-
```

### 2. **Cloud Build Files (cloudbuild-*.yaml)** 🚀
**Purpose**: Automate building and deploying your application code

**When they run**: Every time you deploy new code

**What they do**:
1. **Build** your Docker image from your code
2. **Push** the image to Google Container Registry
3. **Deploy** the image to Cloud Run with all configuration

**These files automate the "deployment pipeline"** - turning your code into a running service.

## How Cloud Build Files Work

### `cloudbuild-backend.yaml` - Backend Deployment

When triggered, it automatically:

```yaml
1. Build Docker image from apps/api/Dockerfile
   ↓
2. Tag image with commit SHA and "latest"
   ↓
3. Push image to Container Registry
   ↓
4. Deploy to Cloud Run with:
   - Environment variables (DATABASE_URL, etc.)
   - Secrets from Secret Manager (JWT_SECRET, REDIS_URL, etc.)
   - VPC connector for Redis access
   - Cloud SQL connection
   - Resource limits (memory, CPU, instances)
```

### `cloudbuild-frontend.yaml` - Frontend Deployment

Similar process for the Next.js frontend:
- Builds the Next.js app
- Creates Docker image
- Deploys to Cloud Run

## How to Trigger Deployments

### Option 1: Manual Deployment (One-time or Testing)

Run this command when you want to deploy:

```bash
# Deploy backend
gcloud builds submit --config=cloudbuild-backend.yaml

# Deploy frontend
gcloud builds submit --config=cloudbuild-frontend.yaml \
  --substitutions=_API_URL=https://your-backend-url/api
```

### Option 2: Automatic Deployment via GitHub Actions

You already have GitHub Actions workflows (`.github/workflows/deploy-*.yml`) that can trigger Cloud Build automatically.

**Currently disabled** (manual trigger only), but you can enable automatic deployments:

1. **Enable automatic triggers** in `.github/workflows/deploy-backend.yml`:
   ```yaml
   on:
     push:
       branches: [main]
       paths:
         - 'apps/api/**'
         - 'cloudbuild-backend.yaml'
   ```

2. **Set up GitHub secrets**:
   - `GCP_PROJECT_ID` - Your GCP project ID
   - `GCP_SA_KEY` - Service account JSON key with Cloud Build permissions

3. **Push to main branch** → Automatic deployment! 🎉

### Option 3: Cloud Build Triggers (Native GCP)

Set up triggers directly in Google Cloud Console:

```bash
# Create trigger that runs on git push
gcloud builds triggers create github \
  --name="deploy-backend" \
  --repo-name="PropVestor" \
  --repo-owner="YOUR_GITHUB_USERNAME" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild-backend.yaml"
```

Then every push to `main` branch automatically triggers a build and deployment.

## Complete Workflow Example

### Initial Setup (One-Time) ⚙️

```bash
# 1. Create infrastructure
gcloud sql instances create propvestor-db ...
gcloud redis instances create propvestor-redis ...
gcloud compute networks vpc-access connectors create propvestor-connector ...

# 2. Store secrets
gcloud secrets create jwt-secret --data-file=-
gcloud secrets create redis-url --data-file=-
# ... etc

# 3. Set up permissions
gcloud projects add-iam-policy-binding ... # Grant Cloud Build permissions
```

### Ongoing Deployments (Every Code Change) 🚀

**Option A: Manual**
```bash
git push origin main
gcloud builds submit --config=cloudbuild-backend.yaml
```

**Option B: Automatic (Recommended)**
```bash
git push origin main
# That's it! GitHub Actions or Cloud Build trigger handles the rest
```

## What Happens During Deployment

When Cloud Build runs `cloudbuild-backend.yaml`:

1. **Builds your code**:
   - Runs `docker build` using `apps/api/Dockerfile`
   - Installs dependencies, compiles TypeScript, generates Prisma client

2. **Tags the image**:
   - `gcr.io/PROJECT_ID/propvestor-api:abc123` (commit SHA)
   - `gcr.io/PROJECT_ID/propvestor-api:latest`

3. **Pushes to registry**:
   - Uploads Docker image to Google Container Registry

4. **Deploys to Cloud Run**:
   - Creates/updates Cloud Run service
   - Sets environment variables
   - Loads secrets from Secret Manager
   - Configures VPC connector, Cloud SQL connection
   - Sets resource limits and scaling

5. **Your app is live!** ✨

## Key Points

✅ **gcloud commands** = Infrastructure setup (one-time)
✅ **Cloud Build files** = Code deployment (every change)
✅ **You can automate** Cloud Build with GitHub Actions or Cloud Build triggers
✅ **Once set up**, you just push code and it deploys automatically

## Do You Need to Run gcloud Commands?

**Yes, but only once** for initial setup:
- Create Cloud SQL, Redis, VPC connector
- Store secrets
- Set up service accounts and permissions

**After that**, the Cloud Build files handle everything automatically when you deploy code.

## Troubleshooting

**"Do I need to run gcloud commands every time?"**
- No! Only for initial setup. After that, Cloud Build handles deployments.

**"How do I update infrastructure?"**
- Run gcloud commands to update resources (e.g., `gcloud redis instances update ...`)
- This is separate from code deployments

**"Can I skip Cloud Build and deploy manually?"**
- Yes, but not recommended. You'd need to:
  1. Build Docker image locally
  2. Push to registry
  3. Deploy to Cloud Run with all flags
  - Cloud Build automates all of this!

**"What if I change the Cloud Build file?"**
- The new configuration applies on the next deployment
- You can test with: `gcloud builds submit --config=cloudbuild-backend.yaml`

