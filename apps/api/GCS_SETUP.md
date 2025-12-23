# Google Cloud Storage Setup

This document explains how to configure Google Cloud Storage for document storage in PropVestor.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with billing enabled
3. Google Cloud Storage API enabled

## Setup Steps

### 1. Create a Storage Bucket

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Cloud Storage** > **Buckets**
3. Click **Create Bucket**
4. Choose a unique bucket name (e.g., `propvestor-documents-prod`)
5. Select a location type and region
6. Choose **Uniform** access control
7. Click **Create**

### 2. Create a Service Account

1. Navigate to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Enter a name (e.g., `propvestor-storage`)
4. Click **Create and Continue**
5. Grant the role: **Storage Object Admin** (or **Storage Admin** for full access)
6. Click **Continue** and then **Done**

### 3. Generate Service Account Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Choose **JSON** format
5. Download the key file (keep it secure!)

### 4. Configure Environment Variables

Add the following to your `.env` file:

```env
# Google Cloud Storage Configuration
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket-name

# Option 1: Use key file path (recommended for local development)
GCS_KEY_FILENAME=/path/to/service-account-key.json

# Option 2: Use credentials JSON string (recommended for production/containers)
# GCS_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

**Note:** You can use either `GCS_KEY_FILENAME` (path to JSON file) or `GCS_CREDENTIALS` (JSON string), but not both.

### 5. Alternative: Use Application Default Credentials

If you're running on Google Cloud (Cloud Run, Compute Engine, etc.), you can use Application Default Credentials:

1. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of your service account key
2. Or use the default service account of the compute resource
3. Only set `GCS_PROJECT_ID` and `GCS_BUCKET_NAME` in your `.env`

## File Organization

Documents are organized in folders within the bucket:

- `leases/` - Lease agreements and related documents
- `properties/` - Property-related documents
- `tenants/` - Tenant-related documents
- `documents/` - General documents (default)

## API Endpoints

### Upload Document
```
POST /api/documents/upload
Content-Type: multipart/form-data

Form fields:
- file: The file to upload
- propertyId: (optional) UUID of associated property
- unitId: (optional) UUID of associated unit
- leaseId: (optional) UUID of associated lease
- tenantId: (optional) UUID of associated tenant
```

### Get Download URL
```
GET /api/documents/:id/download

Returns a signed URL valid for 1 hour
```

### Delete Document
```
DELETE /api/documents/:id

Deletes both the file from storage and the database record
```

## Security Notes

- Files are stored as **private** by default
- Download URLs are **signed URLs** that expire after 1 hour
- Access is controlled by organization membership
- Service account keys should be kept secure and never committed to version control

## Testing

To test the setup without a real GCS bucket, you can:

1. Use the [Google Cloud Storage Emulator](https://cloud.google.com/storage/docs/emulator)
2. Or create a test bucket in GCP (free tier includes 5GB storage)

## Troubleshooting

### Error: "GCS_BUCKET_NAME is not configured"
- Make sure `GCS_BUCKET_NAME` is set in your `.env` file

### Error: "Could not load the default credentials"
- Verify your service account key file path is correct
- Or ensure `GCS_CREDENTIALS` is a valid JSON string
- Or set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### Error: "Permission denied"
- Ensure the service account has **Storage Object Admin** role
- Check that the bucket name is correct

