# GitHub Actions Setup for GCP Deployment

This guide explains how to set up GitHub Actions to automatically deploy to Google Cloud Platform.

## Required GitHub Secrets

You need to add **3 secrets** to your GitHub repository:

### 1. `GCP_PROJECT_ID`
- **What it is**: Your Google Cloud Project ID (e.g., `propvestor`)
- **How to get it**: 
  ```bash
  gcloud config get-value project
  ```
  Or check in the [GCP Console](https://console.cloud.google.com/)

### 2. `WIF_PROVIDER` (Workload Identity Provider)
- **What it is**: The full resource name of the Workload Identity Pool provider
- **Format**: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID`
- **How to create it**: Follow the steps below

### 3. `WIF_SERVICE_ACCOUNT` (Service Account Email)
- **What it is**: The email of the service account to impersonate
- **Format**: `github-actions@PROJECT_ID.iam.gserviceaccount.com`
- **How to create it**: Follow the steps below

## Why Workload Identity Federation?

If you see the error `Key creation is not allowed on this service account`, your organization has disabled service account key creation (a security best practice). Workload Identity Federation is the recommended alternative that:
- ✅ Doesn't require long-lived credentials
- ✅ More secure (no keys to manage)
- ✅ Works with organization policies that disable key creation

## Step-by-Step Setup

### Step 1: Create a Service Account for GitHub Actions

```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Create a service account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account" \
  --project=$PROJECT_ID

# Get the service account email
export SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
```

### Step 1.5: Enable Required APIs

```bash
# Enable IAM Credentials API (required for Workload Identity)
gcloud services enable iamcredentials.googleapis.com --project=$PROJECT_ID
```

### Step 2: Grant Required Permissions

The service account needs permissions to:
- Submit builds to Cloud Build
- Access Secret Manager (to read secrets like `db-password`)
- Deploy to Cloud Run (via Cloud Build)

```bash
# Grant Cloud Build permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

# Grant Secret Manager access (to read db-password and other secrets)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Grant Cloud Build service account user (to impersonate Cloud Build)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Optional: Grant Cloud Run viewer (to check deployment status)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.viewer"
```

### Step 3: Create Workload Identity Pool and Provider

```bash
# Get your project number
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Create a Workload Identity Pool
gcloud iam workload-identity-pools create github-actions-pool \
  --project=$PROJECT_ID \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create a Workload Identity Provider for GitHub
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get the provider resource name (you'll need this for GitHub secret)
export WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider"

# Display it for easy copying
echo "WIF_PROVIDER: ${WIF_PROVIDER}"
```

### Step 4: Grant Service Account Access

```bash
# Allow GitHub Actions to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding ${SA_EMAIL} \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"

# Replace YOUR_GITHUB_USERNAME and YOUR_REPO_NAME with your actual values
# Example: kchowhan/propvestor
```

### Step 5: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

#### Add `GCP_PROJECT_ID`:
- **Name**: `GCP_PROJECT_ID`
- **Value**: Your GCP project ID (e.g., `propvestor`)

#### Add `WIF_PROVIDER`:
- **Name**: `WIF_PROVIDER`
- **Value**: The full provider resource name from Step 3
  - Format: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider`
  - Example: `projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider`

#### Add `WIF_SERVICE_ACCOUNT`:
- **Name**: `WIF_SERVICE_ACCOUNT`
- **Value**: The service account email (e.g., `github-actions@propvestor.iam.gserviceaccount.com`)

### Step 6: Verify the Workflow

The workflow is already configured in `.github/workflows/deploy-backend.yml`. It will automatically trigger when you:

1. Push to the `main` branch
2. Modify files in `apps/api/**`
3. Modify `cloudbuild-backend.yaml` or the workflow file itself

To test it:
```bash
# Make a small change to trigger the workflow
git commit --allow-empty -m "Test GitHub Actions deployment"
git push origin main
```

Then check the **Actions** tab in your GitHub repository to see the deployment progress.

## How It Works

1. **GitHub Actions** detects a push to `main` branch
2. **Authenticates** to GCP using the service account key
3. **Submits** a build to Cloud Build using `gcloud builds submit`
4. **Cloud Build** builds the Docker image and deploys to Cloud Run
5. **Deployment** completes automatically

## Troubleshooting

### Error: "Permission denied" or "Access denied"
- Verify the service account has all required roles
- Check that the Workload Identity binding is correct (repository name must match exactly)
- Ensure `WIF_PROVIDER` and `WIF_SERVICE_ACCOUNT` are set correctly

### Error: "Secret not found"
- Verify `GCP_PROJECT_ID`, `WIF_PROVIDER`, and `WIF_SERVICE_ACCOUNT` are set in GitHub Secrets
- Check the secret names match exactly (case-sensitive)

### Error: "Principal not found" or "Workload Identity binding failed"
- Verify the repository name in the IAM binding matches your GitHub repo exactly
- Format: `YOUR_GITHUB_USERNAME/YOUR_REPO_NAME` (e.g., `kchowhan/propvestor`)
- Check that the Workload Identity Pool and Provider were created successfully

### Error: "Could not resolve source"
- Ensure the Cloud Build service account has storage permissions
- See `GCP_DEPLOYMENT_PLAN.md` section 5.4 for storage permissions setup

### Build fails with "INVALID_ARGUMENT"
- Check that all required secrets exist in Secret Manager
- Verify the `_DB_PASSWORD` substitution is working (it reads from Secret Manager)

## Security Best Practices

1. **Use Workload Identity Federation** - No long-lived credentials to manage
2. **Use least privilege** - only grant the minimum permissions needed
3. **Monitor** the service account usage in GCP Console → IAM & Admin → Service Accounts
4. **Restrict by repository** - The IAM binding ensures only your specific repository can use the service account

## Alternative: Using Service Account Keys (If Policy Allows)

If your organization policy allows service account key creation, you can use the simpler key-based approach:

1. Create a service account key:
   ```bash
   gcloud iam service-accounts keys create github-actions-key.json \
     --iam-account=${SA_EMAIL}
   ```

2. Add `GCP_SA_KEY` secret to GitHub with the JSON key content

3. Update the workflow to use `credentials_json` instead of Workload Identity

However, Workload Identity Federation is recommended as it's more secure and works with organization policies that disable key creation.

## Summary

**What you need to provide to GitHub:**
1. ✅ `GCP_PROJECT_ID` - Your GCP project ID
2. ✅ `WIF_PROVIDER` - Workload Identity Provider resource name
3. ✅ `WIF_SERVICE_ACCOUNT` - Service account email to impersonate

**That's it!** Once these secrets are configured, your GitHub Actions workflow will automatically deploy to GCP on every push to `main`.

**Quick Setup Commands:**
```bash
# 1. Set variables
export PROJECT_ID="propvestor"
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export GITHUB_USER="kchowhan"  # Replace with your GitHub username
export REPO_NAME="propvestor"  # Replace with your repo name

# 2. Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account" \
  --project=$PROJECT_ID

export SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# 3. Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# 4. Enable IAM Credentials API
gcloud services enable iamcredentials.googleapis.com --project=$PROJECT_ID

# 5. Create Workload Identity Pool
gcloud iam workload-identity-pools create github-actions-pool \
  --project=$PROJECT_ID \
  --location="global" \
  --display-name="GitHub Actions Pool"

# 6. Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 7. Grant Workload Identity binding
gcloud iam service-accounts add-iam-policy-binding ${SA_EMAIL} \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/${GITHUB_USER}/${REPO_NAME}"

# 8. Display values for GitHub secrets
echo "=== Add these to GitHub Secrets ==="
echo "GCP_PROJECT_ID: ${PROJECT_ID}"
echo "WIF_PROVIDER: projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider"
echo "WIF_SERVICE_ACCOUNT: ${SA_EMAIL}"
```

