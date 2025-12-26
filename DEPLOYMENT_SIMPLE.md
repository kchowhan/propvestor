# Simple Deployment Guide

This is a simplified deployment setup - one environment, auto-deploy on push to `main`.

## Overview

- **Single Environment**: Production
- **Auto-Deploy**: On push to `main` branch
- **Service Names**: `propvestor-api`, `propvestor-web`, `propvestor-marketing`
- **Image Tags**: `propvestor-api:<sha>`, `propvestor-api:latest`

## How It Works

### Automatic Deployment

1. **Push code to `main` branch**
   ```bash
   git push origin main
   ```

2. **GitHub Actions automatically triggers**:
   - Detects changed paths
   - Triggers appropriate workflow(s)
   - Deploys to Cloud Run

3. **Services are updated**:
   - `propvestor-api`
   - `propvestor-web`
   - `propvestor-marketing`

## Cloud Build Files

### `cloudbuild-backend.yaml`
- Builds and deploys API
- Service: `propvestor-api`
- Database: `propvestor-db`
- Bucket: `propvestor-documents`
- Min instances: 1 (always available)

### `cloudbuild-frontend.yaml`
- Builds and deploys web app
- Service: `propvestor-web`
- Auto-detects backend URL
- Min instances: 0 (scales to zero)

### `cloudbuild-marketing.yaml`
- Builds and deploys marketing site
- Service: `propvestor-marketing`
- Min instances: 0 (scales to zero)

## GitHub Actions Workflows

All workflows auto-deploy on push to `main`:

- `.github/workflows/deploy-backend.yml`
- `.github/workflows/deploy-frontend.yml`
- `.github/workflows/deploy-marketing.yml`

## Setup

### 1. One-Time Infrastructure Setup

```bash
# Set variables
export PROJECT_ID="propvestor-prod"
export REGION="us-central1"

# Create Cloud SQL instance
gcloud sql instances create propvestor-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=CHANGE_ME

# Create database and user
gcloud sql databases create propvestor --instance=propvestor-db
gcloud sql users create propvestor_user \
  --instance=propvestor-db \
  --password=CHANGE_ME

# Create storage bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://propvestor-documents

# Store secrets
echo -n "YOUR_JWT_SECRET" | gcloud secrets create jwt-secret --data-file=-
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password --data-file=-
# ... add other secrets

# Create VPC connector (if using Redis)
gcloud compute networks vpc-access connectors create propvestor-connector \
  --region=$REGION \
  --subnet-project=$PROJECT_ID \
  --subnet=default \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro
```

### 2. Set GitHub Secrets

In GitHub repository settings → Secrets:
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SA_KEY`: Service account JSON key with Cloud Build permissions

### 3. Deploy

Just push to `main`:
```bash
git push origin main
```

## Manual Deployment

If you need to deploy manually:

```bash
# Backend
gcloud builds submit --config=cloudbuild-backend.yaml

# Frontend
gcloud builds submit --config=cloudbuild-frontend.yaml \
  --substitutions=_API_URL=https://propvestor-api-XXXXX.run.app/api

# Marketing
gcloud builds submit --config=cloudbuild-marketing.yaml \
  --substitutions=_APP_URL=https://app.propvestor.com
```

## Cost Estimate

**Monthly costs:**
- Cloud SQL (db-f1-micro): ~$7-10/month
- Cloud Run (backend): ~$15-30/month (min-instances=1)
- Cloud Run (frontend): ~$5-15/month (min-instances=0)
- Cloud Run (marketing): ~$5-15/month (min-instances=0)
- Storage: ~$1-5/month
- **Total: ~$35-75/month**

## Monitoring

### View Services

```bash
gcloud run services list --region=us-central1
```

### View Logs

```bash
# Backend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=propvestor-api" --limit=50

# Frontend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=propvestor-web" --limit=50
```

### View Deployment Status

Check GitHub Actions tab for deployment status and logs.

## Troubleshooting

### Deployment Not Triggering

1. Check GitHub Actions tab for failed workflows
2. Verify secrets are set: `GCP_PROJECT_ID`, `GCP_SA_KEY`
3. Check branch name (must be `main`)
4. Verify file paths match workflow `paths` filter

### Build Fails

1. Check Cloud Build logs in GCP Console
2. Verify resources exist (database, secrets, buckets)
3. Check service account permissions

### Service Not Found

If frontend can't find backend:
- Ensure backend is deployed first
- Check service name: `propvestor-api`
- Verify region matches

## Next Steps

1. **Set up GitHub Secrets** (required)
2. **Create infrastructure** (one-time)
3. **Push to main** → Auto-deploys! 🚀

That's it! Simple and straightforward.

