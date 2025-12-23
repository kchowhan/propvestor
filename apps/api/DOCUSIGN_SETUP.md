# DocuSign Integration Setup

This guide explains how to set up DocuSign integration for lease agreement signing.

## Prerequisites

1. A DocuSign Developer Account (free at https://developers.docusign.com/)
2. A DocuSign Integration Key (created in your DocuSign account)
3. A DocuSign RSA key pair for JWT authentication

## Step 1: Create DocuSign Integration

1. Go to https://developers.docusign.com/
2. Log in or create a free developer account
3. Create a new Integration (API)
4. Note your **Integration Key** (also called Client ID)

## Step 2: Generate RSA Key Pair

1. In your DocuSign account, go to **Settings** > **Apps and Keys**
2. Find your Integration Key
3. Click **Generate RSA** to create a key pair
4. Download the **private key** (you'll need this)
5. Copy the **public key** and add it to your Integration settings

## Step 3: Get User ID

1. In DocuSign, go to **Settings** > **My Account**
2. Copy your **User ID** (API Username)

## Step 4: Configure Environment Variables

Add the following to your `apps/api/.env` file:

```env
# DocuSign Configuration
DOCUSIGN_INTEGRATOR_KEY=your-integration-key-here
DOCUSIGN_USER_ID=your-user-id-here
DOCUSIGN_PRIVATE_KEY=base64-encoded-private-key
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi  # Use 'https://www.docusign.net/restapi' for production
DOCUSIGN_AUTH_SERVER=account.docusign.com  # Use 'account-d.docusign.com' for demo
```

### Encoding the Private Key

The private key needs to be base64 encoded. You can do this with:

```bash
# On macOS/Linux
base64 -i private_key.pem | tr -d '\n' > private_key_base64.txt

# Or use an online tool, or in Node.js:
# Buffer.from(privateKeyString).toString('base64')
```

## Step 5: Configure Webhook (Optional but Recommended)

1. In DocuSign, go to **Settings** > **Connect**
2. Create a new Connect configuration
3. Set the **URL** to: `https://your-domain.com/api/docusign/webhook`
4. Select events to listen for:
   - Envelope Sent
   - Envelope Delivered
   - Envelope Signed/Completed
   - Envelope Declined
   - Envelope Voided
5. Save the configuration

## Step 6: Test the Integration

1. Start your API server
2. Create a lease in the system
3. Use the API endpoint `POST /api/leases/:id/send-for-signature` to send a lease for signing
4. Check the DocuSign dashboard to see if the envelope was created
5. Sign the document in DocuSign
6. The webhook should update the lease status automatically

## API Endpoints

### Generate PDF
```
POST /api/leases/:id/generate-pdf
```
Generates a PDF of the lease agreement and stores it in GCS. Returns the document ID and download URL.

### Send for Signature
```
POST /api/leases/:id/send-for-signature
Body: {
  emailSubject?: string,
  emailBlurb?: string
}
```
Generates a PDF, sends it to DocuSign, and emails all tenants with email addresses for signing.

### Check Status
```
POST /api/docusign/check-status/:leaseId
```
Manually check the status of a DocuSign envelope (useful if webhook fails).

## Webhook Endpoint

```
POST /api/docusign/webhook
```
This endpoint is called by DocuSign when envelope status changes. It automatically:
- Updates the lease signature status
- Downloads the signed PDF when completed
- Stores it in GCS
- Creates a document record

## Troubleshooting

### "Failed to authenticate with DocuSign"
- Check that your Integration Key, User ID, and Private Key are correct
- Ensure the private key is base64 encoded
- Verify you're using the correct base path (demo vs production)

### "Webhook not receiving updates"
- Verify the webhook URL is publicly accessible
- Check DocuSign Connect logs in your account
- Ensure the webhook is enabled and configured correctly

### "Failed to download signed document"
- Check that the envelope is actually completed
- Verify GCS credentials are configured
- Check API logs for detailed error messages

## Production Considerations

1. **Switch to Production Environment**: Change `DOCUSIGN_BASE_PATH` to `https://www.docusign.net/restapi`
2. **Use Production Auth Server**: Change `DOCUSIGN_AUTH_SERVER` to `account-d.docusign.com` (or remove for auto-detection)
3. **Secure Webhook**: Consider adding webhook signature verification
4. **Error Handling**: Implement retry logic for failed webhook deliveries
5. **Monitoring**: Set up alerts for failed DocuSign operations

## Template Customization

Lease agreement templates are stored in `apps/api/src/templates/lease-agreement.hbs`. You can:
- Modify the HTML/CSS to match your branding
- Add or remove sections
- Customize the layout
- Add your organization logo

The template uses Handlebars for variable substitution. Available variables are documented in `apps/api/src/lib/pdf.ts`.

