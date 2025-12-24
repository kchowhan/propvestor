# Google Cloud Platform (GCP) Production Deployment Plan

This document provides a comprehensive plan for deploying PropVestor to Google Cloud Platform with separate frontend and backend deployments, using Cloud SQL for PostgreSQL.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   Frontend       │         │    Backend       │          │
│  │  (Cloud Run)     │ ──────> │  (Cloud Run)     │          │
│  │  Next.js App     │  HTTP   │  Express API     │          │
│  └──────────────────┘         └────────┬─────────┘          │
│                                         │                    │
│                                         ▼                    │
│                              ┌──────────────────┐           │
│                              │   Cloud SQL       │           │
│                              │   (PostgreSQL)    │           │
│                              └──────────────────┘           │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Cloud Storage   │         │  Cloud Scheduler │          │
│  │  (Documents)    │         │  (Cron Jobs)     │          │
│  └──────────────────┘         └──────────────────┘          │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Cloud Build     │         │  Secret Manager  │          │
│  │  (CI/CD)         │         │  (Secrets)       │          │
│  └──────────────────┘         └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Google Cloud Account**
   - Active GCP account with billing enabled
   - Owner or Editor role on the project

2. **Local Tools**
   - `gcloud` CLI installed and configured
   - Docker installed (for local testing)
   - Git for version control

3. **Domain Setup** (Optional but Recommended)
   - Domain name registered
   - DNS access for configuration

## Phase 1: GCP Project Setup

### 1.1 Create GCP Project

```bash
# Set project variables
export PROJECT_ID="propvestor-prod"
export REGION="us-central1"  # or your preferred region
export ZONE="us-central1-a"

# Create new project
gcloud projects create $PROJECT_ID --name="PropVestor Production"

# Set as current project
gcloud config set project $PROJECT_ID

# Enable billing (requires billing account ID)
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### 1.2 Enable Required APIs

```bash
# Enable all required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage-component.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  compute.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com
```

### 1.3 Set Up Service Accounts

```bash
# Create service account for Cloud Run backend
gcloud iam service-accounts create propvestor-backend \
  --display-name="PropVestor Backend Service Account"

# Create service account for Cloud Run frontend
gcloud iam service-accounts create propvestor-frontend \
  --display-name="PropVestor Frontend Service Account"

# Create service account for Cloud Build
gcloud iam service-accounts create propvestor-build \
  --display-name="PropVestor Cloud Build Service Account"
```

## Phase 2: Cloud SQL (PostgreSQL) Setup

### 2.1 Create Cloud SQL Instance

```bash
# Create Cloud SQL PostgreSQL instance
gcloud sql instances create propvestor-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=CHANGE_ME_STRONG_PASSWORD \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --availability-type=ZONAL \
  --network=default
```

**Note**: Start with `db-f1-micro` for development/testing. For production, consider:
- `db-n1-standard-1` (1 vCPU, 3.75GB RAM) - minimum for production
- `db-n1-standard-2` (2 vCPU, 7.5GB RAM) - recommended for moderate load
- `db-n1-standard-4` (4 vCPU, 15GB RAM) - for high load

### 2.2 Create Database

```bash
# Create database
gcloud sql databases create propvestor \
  --instance=propvestor-db

# Create database user
gcloud sql users create propvestor_user \
  --instance=propvestor-db \
  --password=CHANGE_ME_STRONG_PASSWORD
```

### 2.3 Configure Database Access

```bash
# Get Cloud SQL instance connection name
gcloud sql instances describe propvestor-db \
  --format="value(connectionName)"

# This will be used in Cloud Run configuration
# Format: PROJECT_ID:REGION:INSTANCE_NAME
```

### 2.4 Set Up Private IP (Recommended for Production)

```bash
# Allocate IP range for private services
gcloud compute addresses create google-managed-services-default \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=default

# Create private service connection
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-default \
  --network=default

# Update Cloud SQL instance to use private IP
gcloud sql instances patch propvestor-db \
  --network=default \
  --no-assign-ip
```

## Phase 3: Secret Manager Setup

### 3.1 Store Secrets

```bash
# Store JWT secret
echo -n "YOUR_JWT_SECRET_HERE" | gcloud secrets create jwt-secret \
  --data-file=- \
  --replication-policy="automatic"

# Store database password
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password \
  --data-file=- \
  --replication-policy="automatic"

# Store Stripe keys
echo -n "YOUR_STRIPE_SECRET_KEY" | gcloud secrets create stripe-secret-key \
  --data-file=- \
  --replication-policy="automatic"

echo -n "YOUR_STRIPE_PUBLISHABLE_KEY" | gcloud secrets create stripe-publishable-key \
  --data-file=- \
  --replication-policy="automatic"

# Store DocuSign credentials
echo -n "YOUR_DOCUSIGN_INTEGRATOR_KEY" | gcloud secrets create docusign-integrator-key \
  --data-file=- \
  --replication-policy="automatic"

# Store other secrets as needed
# SMTP credentials, RentSpree API key, etc.
```

### 3.2 Grant Secret Access

```bash
# Grant backend service account access to secrets
gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:propvestor-backend@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for all secrets
for secret in jwt-secret db-password stripe-secret-key stripe-publishable-key \
              docusign-integrator-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:propvestor-backend@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

## Phase 4: Cloud Storage Setup

### 4.1 Create Storage Bucket

```bash
# Create bucket for document storage
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://propvestor-documents-prod

# Set uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://propvestor-documents-prod

# Set lifecycle policy (optional - delete old files after 7 years)
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 2555}
      }
    ]
  }
}
EOF
gsutil lifecycle set lifecycle.json gs://propvestor-documents-prod
```

### 4.2 Grant Storage Access

```bash
# Grant backend service account access to storage
gsutil iam ch serviceAccount:propvestor-backend@${PROJECT_ID}.iam.gserviceaccount.com:objectAdmin \
  gs://propvestor-documents-prod
```

## Phase 5: Backend Deployment (Cloud Run)

### 5.1 Prepare Dockerfile

The existing Dockerfile at `apps/api/Dockerfile` should work, but ensure it:
- Uses multi-stage builds (already done)
- Has health check endpoint (already included)
- Exposes port 4000 (already done)

### 5.2 Create Cloud Build Configuration

Create `cloudbuild-backend.yaml`:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'apps/api/Dockerfile'
      - '-t'
      - 'gcr.io/$PROJECT_ID/propvestor-api:$SHORT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/propvestor-api:latest'
      - '.'

  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/propvestor-api:$SHORT_SHA'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/propvestor-api:latest'

  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'propvestor-api'
      - '--image'
      - 'gcr.io/$PROJECT_ID/propvestor-api:$SHORT_SHA'
      - '--region'
      - '${_REGION}'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--service-account'
      - 'propvestor-backend@$PROJECT_ID.iam.gserviceaccount.com'
      - '--add-cloudsql-instances'
      - '${_CLOUDSQL_CONNECTION_NAME}'
      - '--set-env-vars'
      - 'DATABASE_URL=postgresql://propvestor_user:$${_DB_PASSWORD}@/${_CLOUDSQL_CONNECTION_NAME}/propvestor?host=/cloudsql/${_CLOUDSQL_CONNECTION_NAME}'
      - '--set-secrets'
      - 'JWT_SECRET=jwt-secret:latest,CORS_ORIGIN=cors-origin:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest'
      - '--memory'
      - '512Mi'
      - '--cpu'
      - '1'
      - '--min-instances'
      - '1'
      - '--max-instances'
      - '10'
      - '--timeout'
      - '300'
      - '--port'
      - '4000'

substitutions:
  _REGION: us-central1
  _CLOUDSQL_CONNECTION_NAME: ${PROJECT_ID}:${REGION}:propvestor-db
  _DB_PASSWORD: '$(gcloud secrets versions access latest --secret=db-password)'

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

images:
  - 'gcr.io/$PROJECT_ID/propvestor-api:$SHORT_SHA'
  - 'gcr.io/$PROJECT_ID/propvestor-api:latest'
```

### 5.3 Store Additional Secrets

```bash
# Store CORS origin
echo -n "https://your-frontend-domain.com" | gcloud secrets create cors-origin \
  --data-file=- \
  --replication-policy="automatic"

# Grant access
gcloud secrets add-iam-policy-binding cors-origin \
  --member="serviceAccount:propvestor-backend@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 5.4 Grant Cloud Build Permissions

```bash
# Grant Cloud Build service account necessary permissions
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

### 5.5 Deploy Backend

```bash
# Manual deployment (for testing)
gcloud builds submit --config=cloudbuild-backend.yaml

# Or set up trigger for automatic deployment on git push
gcloud builds triggers create github \
  --name="deploy-backend" \
  --repo-name="PropVestor" \
  --repo-owner="YOUR_GITHUB_USERNAME" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild-backend.yaml" \
  --substitutions="_REGION=us-central1,_CLOUDSQL_CONNECTION_NAME=${PROJECT_ID}:us-central1:propvestor-db"
```

### 5.6 Run Database Migrations

```bash
# Get the Cloud Run service URL
BACKEND_URL=$(gcloud run services describe propvestor-api \
  --region=us-central1 \
  --format="value(status.url)")

# Option 1: Run migrations from local machine (requires Cloud SQL Proxy)
# Install Cloud SQL Proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# Start proxy
./cloud_sql_proxy -instances=${PROJECT_ID}:us-central1:propvestor-db=tcp:5432 &

# Set DATABASE_URL and run migrations
export DATABASE_URL="postgresql://propvestor_user:PASSWORD@localhost:5432/propvestor"
cd apps/api
npm run prisma:migrate

# Option 2: Run migrations in Cloud Run job (recommended)
# Create a Cloud Run job for migrations
gcloud run jobs create propvestor-migrate \
  --image=gcr.io/$PROJECT_ID/propvestor-api:latest \
  --region=us-central1 \
  --service-account=propvestor-backend@${PROJECT_ID}.iam.gserviceaccount.com \
  --add-cloudsql-instances=${PROJECT_ID}:us-central1:propvestor-db \
  --set-env-vars="DATABASE_URL=postgresql://propvestor_user:$$(gcloud secrets versions access latest --secret=db-password)@/${PROJECT_ID}:us-central1:propvestor-db/propvestor?host=/cloudsql/${PROJECT_ID}:us-central1:propvestor-db" \
  --command="npm" \
  --args="run,prisma:migrate"

# Execute the job
gcloud run jobs execute propvestor-migrate --region=us-central1
```

## Phase 6: Frontend Deployment (Cloud Run)

### 6.1 Update Next.js Configuration

Ensure `apps/web/next.config.js` has standalone output (already configured).

### 6.2 Create Cloud Build Configuration

Create `cloudbuild-frontend.yaml`:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'apps/web/Dockerfile'
      - '--build-arg'
      - 'NEXT_PUBLIC_API_URL=${_API_URL}'
      - '-t'
      - 'gcr.io/$PROJECT_ID/propvestor-web:$SHORT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/propvestor-web:latest'
      - '.'

  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/propvestor-web:$SHORT_SHA'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/propvestor-web:latest'

  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'propvestor-web'
      - '--image'
      - 'gcr.io/$PROJECT_ID/propvestor-web:$SHORT_SHA'
      - '--region'
      - '${_REGION}'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--service-account'
      - 'propvestor-frontend@$PROJECT_ID.iam.gserviceaccount.com'
      - '--memory'
      - '512Mi'
      - '--cpu'
      - '1'
      - '--min-instances'
      - '0'
      - '--max-instances'
      - '10'
      - '--timeout'
      - '300'
      - '--port'
      - '3000'
      - '--set-env-vars'
      - 'NEXT_PUBLIC_API_URL=${_API_URL}'

substitutions:
  _REGION: us-central1
  _API_URL: https://propvestor-api-XXXXX.run.app/api

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

images:
  - 'gcr.io/$PROJECT_ID/propvestor-web:$SHORT_SHA'
  - 'gcr.io/$PROJECT_ID/propvestor-web:latest'
```

**Note**: Update `_API_URL` with your actual backend URL after backend deployment.

### 6.3 Deploy Frontend

```bash
# Get backend URL first
BACKEND_URL=$(gcloud run services describe propvestor-api \
  --region=us-central1 \
  --format="value(status.url)")

# Deploy frontend
gcloud builds submit --config=cloudbuild-frontend.yaml \
  --substitutions="_API_URL=${BACKEND_URL}/api"

# Or set up trigger
gcloud builds triggers create github \
  --name="deploy-frontend" \
  --repo-name="PropVestor" \
  --repo-owner="YOUR_GITHUB_USERNAME" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild-frontend.yaml" \
  --substitutions="_REGION=us-central1,_API_URL=${BACKEND_URL}/api"
```

## Phase 7: Custom Domain Setup (Optional)

### 7.1 Map Custom Domain to Cloud Run

```bash
# Map domain to backend
gcloud run domain-mappings create \
  --service=propvestor-api \
  --domain=api.yourdomain.com \
  --region=us-central1

# Map domain to frontend
gcloud run domain-mappings create \
  --service=propvestor-web \
  --domain=app.yourdomain.com \
  --region=us-central1

# Get DNS records to add
gcloud run domain-mappings describe \
  --domain=api.yourdomain.com \
  --region=us-central1

gcloud run domain-mappings describe \
  --domain=app.yourdomain.com \
  --region=us-central1
```

### 7.2 Update DNS Records

Add the provided DNS records to your domain registrar.

### 7.3 Update CORS and API URL

```bash
# Update CORS origin secret
echo -n "https://app.yourdomain.com" | gcloud secrets versions add cors-origin \
  --data-file=-

# Redeploy backend with new CORS origin
gcloud builds submit --config=cloudbuild-backend.yaml
```

## Phase 8: Cloud Scheduler Setup

### 8.1 Create Scheduler Job

```bash
# Get backend URL
BACKEND_URL=$(gcloud run services describe propvestor-api \
  --region=us-central1 \
  --format="value(status.url)")

# Store scheduler secret
echo -n "YOUR_SCHEDULER_SECRET" | gcloud secrets create scheduler-secret \
  --data-file=- \
  --replication-policy="automatic"

# Create Cloud Scheduler job (example: daily at 2 AM)
gcloud scheduler jobs create http propvestor-daily-tasks \
  --location=us-central1 \
  --schedule="0 2 * * *" \
  --uri="${BACKEND_URL}/api/scheduler/daily" \
  --http-method=POST \
  --headers="Authorization=Bearer $(gcloud secrets versions access latest --secret=scheduler-secret)" \
  --oidc-service-account-email=propvestor-backend@${PROJECT_ID}.iam.gserviceaccount.com \
  --oidc-token-audience=${BACKEND_URL}
```

## Phase 9: Monitoring and Logging

### 9.1 Set Up Cloud Monitoring

```bash
# Enable monitoring API
gcloud services enable monitoring.googleapis.com

# Create alerting policy (example: high error rate)
# Use Cloud Console UI or gcloud commands
```

### 9.2 Set Up Logging

Logs are automatically collected. View them:

```bash
# View backend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=propvestor-api" \
  --limit=50 \
  --format=json

# View frontend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=propvestor-web" \
  --limit=50 \
  --format=json
```

### 9.3 Set Up Uptime Checks

```bash
# Create uptime check for backend
gcloud monitoring uptime-checks create propvestor-api-health \
  --display-name="PropVestor API Health Check" \
  --http-check-path="/api/health" \
  --http-check-service-path="" \
  --http-check-port=443 \
  --http-check-use-ssl \
  --resource-type=uptime-url \
  --resource-labels=host=${BACKEND_URL#https://}

# Create uptime check for frontend
gcloud monitoring uptime-checks create propvestor-web-health \
  --display-name="PropVestor Web Health Check" \
  --http-check-path="/" \
  --http-check-service-path="" \
  --http-check-port=443 \
  --http-check-use-ssl \
  --resource-type=uptime-url \
  --resource-labels=host=${FRONTEND_URL#https://}
```

## Phase 10: Security Hardening

### 10.1 Enable VPC Connector (for Private Cloud SQL)

```bash
# Create VPC connector
gcloud compute networks vpc-access connectors create propvestor-connector \
  --region=us-central1 \
  --subnet-project=$PROJECT_ID \
  --subnet=default \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro

# Update Cloud Run services to use VPC connector
gcloud run services update propvestor-api \
  --region=us-central1 \
  --vpc-connector=propvestor-connector \
  --vpc-egress=private-ranges-only
```

### 10.2 Set Up IAM Policies

```bash
# Remove public access if needed (use IAM for authentication)
gcloud run services update propvestor-api \
  --region=us-central1 \
  --no-allow-unauthenticated

# Add IAM bindings for specific users
gcloud run services add-iam-policy-binding propvestor-api \
  --region=us-central1 \
  --member="user:admin@example.com" \
  --role="roles/run.invoker"
```

### 10.3 Enable Cloud Armor (DDoS Protection)

```bash
# Create Cloud Armor security policy
gcloud compute security-policies create propvestor-security-policy \
  --description="Security policy for PropVestor"

# Add rate limiting rule
gcloud compute security-policies rules create 1000 \
  --security-policy=propvestor-security-policy \
  --expression="true" \
  --action=rate-based-ban \
  --rate-limit-threshold-count=100 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=600 \
  --conform-action=allow \
  --exceed-action=deny-403 \
  --enforce-on-key=IP
```

## Phase 11: Backup and Disaster Recovery

### 11.1 Database Backups

Cloud SQL automatically creates backups. Configure:

```bash
# Enable point-in-time recovery
gcloud sql instances patch propvestor-db \
  --enable-bin-log \
  --backup-start-time=03:00

# Create manual backup
gcloud sql backups create \
  --instance=propvestor-db \
  --description="Manual backup before migration"
```

### 11.2 Export/Import Strategy

```bash
# Export database
gcloud sql export sql propvestor-db \
  gs://propvestor-backups/db-export-$(date +%Y%m%d).sql \
  --database=propvestor

# Import database (for disaster recovery)
gcloud sql import sql propvestor-db \
  gs://propvestor-backups/db-export-YYYYMMDD.sql \
  --database=propvestor
```

## Phase 12: Cost Optimization

### 12.1 Resource Sizing

- **Cloud SQL**: Start with `db-f1-micro` for dev, scale to `db-n1-standard-1` for production
- **Cloud Run**: 
  - Backend: 512Mi-1Gi memory, 1-2 CPU
  - Frontend: 512Mi memory, 1 CPU
  - Use min-instances=0 for frontend (cost savings)
  - Use min-instances=1 for backend (faster cold starts)

### 12.2 Enable Committed Use Discounts

For predictable workloads, consider committed use discounts for Cloud SQL.

### 12.3 Monitor Costs

```bash
# Set up billing alerts
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="PropVestor Monthly Budget" \
  --budget-amount=500USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

## Phase 13: CI/CD Pipeline Setup

### 13.1 GitHub Actions Alternative

If not using Cloud Build triggers, set up GitHub Actions:

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - id: 'auth'
        uses: 'google-github-actions/auth@v1'
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY }}'
      
      - name: 'Set up Cloud SDK'
        uses: 'google-github-actions/setup-gcloud@v1'
      
      - name: 'Submit to Cloud Build'
        run: |
          gcloud builds submit --config=cloudbuild-backend.yaml
```

### 13.2 Environment-Specific Deployments

Create separate Cloud Build configs for staging and production:

- `cloudbuild-backend-staging.yaml`
- `cloudbuild-backend-prod.yaml`

Use different Cloud SQL instances and secrets for each environment.

## Phase 14: Post-Deployment Checklist

### 14.1 Verification Steps

- [ ] Backend health check endpoint responds: `curl https://api.yourdomain.com/api/health`
- [ ] Frontend loads correctly
- [ ] Database migrations completed
- [ ] API authentication works
- [ ] File uploads to Cloud Storage work
- [ ] Email sending works (if configured)
- [ ] Stripe webhooks are configured
- [ ] DocuSign integration works
- [ ] Scheduled jobs run correctly
- [ ] Logs are being collected
- [ ] Monitoring alerts are configured
- [ ] Backups are running

### 14.2 Performance Testing

```bash
# Test backend response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.yourdomain.com/api/health

# Load testing (use tools like Apache Bench or k6)
ab -n 1000 -c 10 https://api.yourdomain.com/api/health
```

### 14.3 Security Audit

- [ ] All secrets stored in Secret Manager
- [ ] No secrets in code or environment variables
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Database access restricted
- [ ] IAM roles follow least privilege
- [ ] Cloud Armor rules configured
- [ ] Regular security updates scheduled

## Phase 15: Maintenance and Updates

### 15.1 Update Process

1. **Code Updates**:
   ```bash
   # Push to main branch triggers automatic deployment
   git push origin main
   ```

2. **Database Migrations**:
   ```bash
   # Run migrations via Cloud Run job
   gcloud run jobs execute propvestor-migrate --region=us-central1
   ```

3. **Rollback**:
   ```bash
   # Rollback to previous revision
   gcloud run services update-traffic propvestor-api \
     --region=us-central1 \
     --to-revisions=PREVIOUS_REVISION=100
   ```

### 15.2 Monitoring

- Set up alerts for:
  - High error rates
  - Slow response times
  - High memory/CPU usage
  - Database connection issues
  - Failed scheduled jobs

## Estimated Costs (Monthly)

**Development/Testing Environment:**
- Cloud SQL (db-f1-micro): ~$7-10/month
- Cloud Run (backend): ~$5-15/month (with min-instances=0)
- Cloud Run (frontend): ~$5-15/month (with min-instances=0)
- Cloud Storage: ~$1-5/month (5GB storage)
- Cloud Build: ~$0-10/month (depending on builds)
- **Total: ~$20-55/month**

**Production Environment:**
- Cloud SQL (db-n1-standard-1): ~$50-100/month
- Cloud Run (backend): ~$30-100/month
- Cloud Run (frontend): ~$20-50/month
- Cloud Storage: ~$10-50/month (depending on usage)
- Cloud Build: ~$10-30/month
- Networking: ~$10-30/month
- **Total: ~$130-360/month**

*Note: Costs vary based on traffic, storage, and compute usage. Use GCP Pricing Calculator for accurate estimates.*

## Troubleshooting

### Common Issues

1. **Cloud SQL Connection Issues**
   - Verify Cloud SQL instance connection name
   - Check VPC connector configuration
   - Verify service account has Cloud SQL Client role

2. **Secret Access Denied**
   - Verify service account has Secret Manager Secret Accessor role
   - Check secret name matches exactly

3. **CORS Errors**
   - Verify CORS_ORIGIN secret matches frontend URL exactly
   - Check backend allows the origin

4. **Build Failures**
   - Check Cloud Build logs
   - Verify Dockerfile syntax
   - Ensure all dependencies are in package.json

5. **Cold Start Issues**
   - Increase min-instances for backend
   - Optimize Docker image size
   - Use Cloud CDN for frontend

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)

## Support

For issues or questions:
1. Check GCP Console logs
2. Review Cloud Build build logs
3. Check Cloud Run service logs
4. Verify IAM permissions
5. Review this deployment plan

---

**Last Updated**: 2024
**Version**: 1.0

