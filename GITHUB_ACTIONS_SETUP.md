# GitHub Actions Setup for GCP Deployment

This guide explains how to set up GitHub Actions to automatically deploy to Google Cloud Platform.

## Required GitHub Secrets

You need to add **2 secrets** to your GitHub repository:

### 1. `GCP_PROJECT_ID`
- **What it is**: Your Google Cloud Project ID (e.g., `propvestor`)
- **How to get it**: 
  ```bash
  gcloud config get-value project
  ```
  Or check in the [GCP Console](https://console.cloud.google.com/)

### 2. `GCP_SA_KEY`
- **What it is**: A JSON key file for a service account with Cloud Build permissions
- **How to create it**: Follow the steps below

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

### Step 3: Create and Download the Service Account Key

```bash
# Create a key for the service account
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=${SA_EMAIL} \
  --project=$PROJECT_ID

# The key file will be saved as github-actions-key.json
# This file contains sensitive credentials - keep it secure!
```

### Step 4: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

#### Add `GCP_PROJECT_ID`:
- **Name**: `GCP_PROJECT_ID`
- **Value**: Your GCP project ID (e.g., `propvestor`)

#### Add `GCP_SA_KEY`:
- **Name**: `GCP_SA_KEY`
- **Value**: Copy the **entire contents** of `github-actions-key.json`
  ```bash
  # View the key file contents
  cat github-actions-key.json
  ```
  Copy everything from `{` to `}` including all the JSON content.

### Step 5: Clean Up the Key File

**Important**: After adding the secret to GitHub, delete the local key file for security:

```bash
# Delete the local key file
rm github-actions-key.json

# Or if you want to keep it temporarily, store it securely
# Never commit this file to git!
```

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
- Check that `GCP_SA_KEY` contains valid JSON
- Ensure the service account email matches the one you created

### Error: "Secret not found"
- Verify `GCP_PROJECT_ID` and `GCP_SA_KEY` are set in GitHub Secrets
- Check the secret names match exactly (case-sensitive)

### Error: "Could not resolve source"
- Ensure the Cloud Build service account has storage permissions
- See `GCP_DEPLOYMENT_PLAN.md` section 5.4 for storage permissions setup

### Build fails with "INVALID_ARGUMENT"
- Check that all required secrets exist in Secret Manager
- Verify the `_DB_PASSWORD` substitution is working (it reads from Secret Manager)

## Security Best Practices

1. **Never commit** the service account key file to git
2. **Rotate keys** periodically (create new key, update GitHub secret, delete old key)
3. **Use least privilege** - only grant the minimum permissions needed
4. **Monitor** the service account usage in GCP Console → IAM & Admin → Service Accounts

## Alternative: Using Workload Identity Federation (More Secure)

For production, consider using [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) instead of service account keys. This eliminates the need to store long-lived credentials.

However, the service account key approach is simpler and sufficient for most use cases.

## Summary

**What you need to provide to GitHub:**
1. ✅ `GCP_PROJECT_ID` - Your GCP project ID
2. ✅ `GCP_SA_KEY` - Service account JSON key with Cloud Build permissions

**That's it!** Once these secrets are configured, your GitHub Actions workflow will automatically deploy to GCP on every push to `main`.

