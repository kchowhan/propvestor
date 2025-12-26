# GCP Deployment Quick Start Guide

This is a condensed version of the full deployment plan. Use this for quick reference during deployment.

## Prerequisites Checklist

- [ ] GCP account with billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] Domain name (optional but recommended)
- [ ] All third-party API keys ready (Stripe, DocuSign, RentSpree, etc.)

## Step-by-Step Deployment

### 1. Initial Setup (One-time)

```bash
# Set variables
export PROJECT_ID="propvestor-prod"
export REGION="us-central1"

# Create project and enable APIs
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID
gcloud services enable cloudbuild.googleapis.com run.googleapis.com \
  sqladmin.googleapis.com storage-component.googleapis.com \
  secretmanager.googleapis.com cloudscheduler.googleapis.com \
  servicenetworking.googleapis.com  # Required for VPC peering (Cloud SQL private IP, Memorystore)
```

### 2. Create Service Accounts

```bash
gcloud iam service-accounts create propvestor-backend \
  --display-name="PropVestor Backend"
gcloud iam service-accounts create propvestor-frontend \
  --display-name="PropVestor Frontend"
```

### 3. Set Up Cloud SQL

```bash
# Create instance
gcloud sql instances create propvestor-db \
  --database-version=POSTGRES_17 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=CHANGE_ME

# Create database and user
gcloud sql databases create propvestor --instance=propvestor-db
gcloud sql users create propvestor_user \
  --instance=propvestor-db \
  --password=CHANGE_ME

# Get connection name
gcloud sql instances describe propvestor-db \
  --format="value(connectionName)"
```

### 3.5 Set Up Redis (Memorystore)

```bash
# Enable APIs
gcloud services enable redis.googleapis.com vpcaccess.googleapis.com

# Create VPC connector
gcloud compute networks vpc-access connectors create propvestor-connector \
  --region=$REGION \
  --subnet-project=$PROJECT_ID \
  --subnet=default \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro

# Create Redis instance (Basic tier for dev/testing)
gcloud redis instances create propvestor-redis \
  --size=1 \
  --region=$REGION \
  --network=default \
  --redis-version=redis_7_0 \
  --tier=basic

# Get Redis connection details
REDIS_HOST=$(gcloud redis instances describe propvestor-redis \
  --region=$REGION \
  --format="value(host)")
REDIS_PORT=$(gcloud redis instances describe propvestor-redis \
  --region=$REGION \
  --format="value(port)")

# Store Redis URL as secret
echo -n "redis://${REDIS_HOST}:${REDIS_PORT}" | gcloud secrets create redis-url --data-file=-

# Grant access
gcloud secrets add-iam-policy-binding redis-url \
  --member="serviceAccount:propvestor-backend@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Store Secrets

```bash
# Required secrets
echo -n "YOUR_JWT_SECRET" | gcloud secrets create jwt-secret --data-file=-
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password --data-file=-
echo -n "https://your-frontend-domain.com" | gcloud secrets create cors-origin --data-file=-

# Optional secrets (add as needed)
echo -n "YOUR_STRIPE_SECRET_KEY" | gcloud secrets create stripe-secret-key --data-file=-
echo -n "YOUR_STRIPE_PUBLISHABLE_KEY" | gcloud secrets create stripe-publishable-key --data-file=-
# ... add other secrets

# Grant access to backend service account
for secret in jwt-secret db-password cors-origin stripe-secret-key stripe-publishable-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:propvestor-backend@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 5. Create Storage Bucket

```bash
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://propvestor-documents-prod
gsutil uniformbucketlevelaccess set on gs://propvestor-documents-prod
gsutil iam ch serviceAccount:propvestor-backend@${PROJECT_ID}.iam.gserviceaccount.com:objectAdmin \
  gs://propvestor-documents-prod
```

### 6. Grant Cloud Build Permissions

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 7. Deploy Backend

```bash
# Update cloudbuild-backend.yaml with your connection name
# Then deploy
gcloud builds submit --config=cloudbuild-backend.yaml \
  --substitutions=_REGION=$REGION,_CLOUDSQL_CONNECTION_NAME=${PROJECT_ID}:${REGION}:propvestor-db

# Get backend URL
BACKEND_URL=$(gcloud run services describe propvestor-api \
  --region=$REGION \
  --format="value(status.url)")
echo "Backend URL: $BACKEND_URL"
```

### 8. Run Database Migrations

```bash
# Option 1: Using Cloud SQL Proxy (local)
# Download and run Cloud SQL Proxy
# Then: cd apps/api && npm run prisma:migrate

# Option 2: Using Cloud Run Job (recommended)
# Create job (see full plan for details)
# Execute: gcloud run jobs execute propvestor-migrate --region=$REGION
```

### 9. Deploy Frontend

```bash
# Update cloudbuild-frontend.yaml with backend URL
gcloud builds submit --config=cloudbuild-frontend.yaml \
  --substitutions=_REGION=$REGION,_API_URL=${BACKEND_URL}/api

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe propvestor-web \
  --region=$REGION \
  --format="value(status.url)")
echo "Frontend URL: $FRONTEND_URL"
```

### 9.5 Deploy Marketing Site

```bash
# Deploy marketing site
gcloud builds submit --config=cloudbuild-marketing.yaml \
  --substitutions=_REGION=$REGION,_APP_URL=${FRONTEND_URL}

# Get marketing URL
MARKETING_URL=$(gcloud run services describe propvestor-marketing \
  --region=$REGION \
  --format="value(status.url)")
echo "Marketing URL: $MARKETING_URL"
```

### 10. Set Up Custom Domain (Optional)

```bash
# Map domains
gcloud run domain-mappings create \
  --service=propvestor-api \
  --domain=api.yourdomain.com \
  --region=$REGION

gcloud run domain-mappings create \
  --service=propvestor-web \
  --domain=app.yourdomain.com \
  --region=$REGION

gcloud run domain-mappings create \
  --service=propvestor-marketing \
  --domain=yourdomain.com \
  --region=$REGION

# Get DNS records and add to your DNS provider
gcloud run domain-mappings describe \
  --domain=api.yourdomain.com \
  --region=$REGION

gcloud run domain-mappings describe \
  --domain=yourdomain.com \
  --region=$REGION
```

## Required Secrets Checklist

Store these in Secret Manager:

### Required
- [ ] `jwt-secret` - JWT signing secret (generate with `openssl rand -base64 32`)
- [ ] `db-password` - Database password
- [ ] `cors-origin` - Frontend URL (e.g., `https://app.yourdomain.com`)
- [ ] `redis-url` - Redis connection URL (created automatically in step 3.5)

### Optional (based on your integrations)
- [ ] `stripe-secret-key` - Stripe secret key
- [ ] `stripe-publishable-key` - Stripe publishable key
- [ ] `stripe-webhook-secret` - Stripe webhook secret
- [ ] `docusign-integrator-key` - DocuSign integrator key
- [ ] `docusign-user-id` - DocuSign user ID
- [ ] `docusign-private-key` - DocuSign private key (base64 encoded)
- [ ] `rentspree-api-key` - RentSpree API key
- [ ] `rentspree-webhook-secret` - RentSpree webhook secret
- [ ] `scheduler-secret` - Secret for Cloud Scheduler authentication
- [ ] SMTP credentials (if using email)

## Environment Variables

These are set automatically via Cloud Build or Cloud Run:

### Backend (Cloud Run)
- `DATABASE_URL` - Set automatically from Cloud SQL connection
- `JWT_SECRET` - From Secret Manager
- `CORS_ORIGIN` - From Secret Manager
- `GCS_PROJECT_ID` - Set to `$PROJECT_ID`
- `GCS_BUCKET_NAME` - Set in Cloud Build substitutions
- Other secrets loaded from Secret Manager

### Frontend (Cloud Run)
- `NEXT_PUBLIC_API_URL` - Set during build (from Cloud Build substitutions)

### Marketing (Cloud Run)
- `NEXT_PUBLIC_APP_URL` - Set during build (from Cloud Build substitutions, points to frontend URL)

## Verification Commands

```bash
# Check backend health
curl https://YOUR_BACKEND_URL/api/health

# Check frontend
curl https://YOUR_FRONTEND_URL

# Check marketing site
curl https://YOUR_MARKETING_URL

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=propvestor-api" --limit=50

gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=propvestor-marketing" --limit=50

# Check service status
gcloud run services list --region=$REGION
```

## Common Issues

### "Permission denied" errors
- Check IAM roles for service accounts
- Verify secrets have correct access bindings

### Database connection errors
- Verify Cloud SQL connection name format: `PROJECT:REGION:INSTANCE`
- Check VPC connector if using private IP
- Verify database user and password

### CORS errors
- Ensure `cors-origin` secret matches frontend URL exactly
- Check backend allows the origin

### Build failures
- Check Cloud Build logs: `gcloud builds list --limit=5`
- Verify Dockerfile paths are correct
- Ensure all dependencies are in package.json

## Cost Estimation

**Development/Testing:**
- ~$63-135/month (includes Redis Basic tier and marketing site)

**Production:**
- ~$260-625/month (includes Redis Standard tier and marketing site, varies with usage)

## Next Steps

1. Review full deployment plan: `GCP_DEPLOYMENT_PLAN.md`
2. Set up monitoring and alerts
3. Configure backups
4. Set up CI/CD triggers
5. Perform security audit
6. Load testing

## Useful Commands

```bash
# View service details
gcloud run services describe propvestor-api --region=$REGION

# Update service
gcloud run services update propvestor-api --region=$REGION --memory=1Gi

# View logs in real-time
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=propvestor-api"

# Rollback to previous revision
gcloud run services update-traffic propvestor-api \
  --region=$REGION \
  --to-revisions=PREVIOUS_REVISION=100

# Scale service
gcloud run services update propvestor-api \
  --region=$REGION \
  --min-instances=2 \
  --max-instances=20
```

