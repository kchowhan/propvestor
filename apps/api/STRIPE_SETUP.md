# Stripe Configuration Guide

This guide walks you through setting up Stripe for PropVestor payment processing.

## What You Need from Stripe

You need **3 pieces of information** from Stripe:

1. **Secret Key** (starts with `sk_test_` or `sk_live_`)
2. **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. **Webhook Signing Secret** (starts with `whsec_`)

---

## Step-by-Step Setup

### Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Click **Sign up** and create an account
3. Complete account verification (if required)

### Step 2: Get API Keys

1. Log in to Stripe Dashboard: https://dashboard.stripe.com
2. Make sure you're in **Test mode** (toggle in top right) for development
3. Go to **Developers** → **API keys** (or visit https://dashboard.stripe.com/apikeys)
4. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`) - Copy this
   - **Secret key** (starts with `sk_test_...`) - Click **Reveal test key** and copy it

**Important**: 
- Use **Test mode** keys (`pk_test_...` and `sk_test_...`) for development/testing
- Use **Live mode** keys (`pk_live_...` and `sk_live_...`) only for production
- **Live keys require HTTPS** - you cannot use live keys with HTTP (localhost)
- **Test keys work with HTTP** - perfect for local development
- Never share your secret key publicly

### Step 3: Configure Webhook

1. In Stripe Dashboard, go to **Developers** → **Webhooks** (or visit https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set the endpoint URL:
   - **Development**: `http://localhost:4000/api/stripe/webhook` (use Stripe CLI - see below)
   - **Production**: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_method.attached` (optional)
   - ✅ `payment_method.detached` (optional)
5. Click **Add endpoint**
6. After creating, click on the endpoint to view details
7. Click **Reveal** next to "Signing secret" and copy it (starts with `whsec_`)

### Step 4: Configure Environment Variables

Add these to your `apps/api/.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51AbCdEf...  # Your secret key from Step 2
STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEf...  # Your publishable key from Step 2
STRIPE_WEBHOOK_SECRET=whsec_...  # Your webhook signing secret from Step 3
```

**Example**:
```env
STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

### Step 5: Restart Your API Server

After adding environment variables, restart your API server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm --workspace apps/api run dev
```

---

## Testing Webhooks Locally (Development)

For local development, you need to use Stripe CLI to forward webhooks to your local server.

### Install Stripe CLI

**macOS**:
```bash
brew install stripe/stripe-cli/stripe
```

**Linux/Windows**: See https://stripe.com/docs/stripe-cli

### Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate.

### Forward Webhooks to Local Server

```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

This will:
- Show a webhook signing secret (different from dashboard)
- Forward all Stripe events to your local server
- Display events in real-time

**Important**: Use the signing secret shown by Stripe CLI in your `.env` file for local development, or use the `--forward-connect-to` flag to use your dashboard webhook secret.

### Trigger Test Events

In another terminal, trigger test events:

```bash
# Trigger a test payment
stripe trigger payment_intent.succeeded

# Trigger a failed payment
stripe trigger payment_intent.payment_failed
```

---

## Testing Payment Methods

### Test Cards

Stripe provides test cards for testing:

**Successful Payment**:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Declined Payment**:
- Card: `4000 0000 0000 0002`

**3D Secure Authentication**:
- Card: `4000 0025 0000 3155`

**ACH/Bank Account** (US):
- Account: `000123456789`
- Routing: `110000000`

See full list: https://stripe.com/docs/testing

---

## Production Setup

### Switch to Live Mode

1. In Stripe Dashboard, toggle **Test mode** to **Live mode**
2. Get your **Live** API keys (different from test keys)
3. Create a **Live** webhook endpoint
4. Update your `.env` file with live keys:

```env
STRIPE_SECRET_KEY=sk_live_...  # Live secret key
STRIPE_PUBLISHABLE_KEY=pk_live_...  # Live publishable key
STRIPE_WEBHOOK_SECRET=whsec_...  # Live webhook secret
```

### Test vs Live Keys

**For Local Development (HTTP):**
- ✅ Use **Test keys** (`pk_test_...` and `sk_test_...`)
- ✅ Test keys work over HTTP (localhost)
- ✅ Safe to use in development

**For Production (HTTPS):**
- ✅ Use **Live keys** (`pk_live_...` and `sk_live_...`)
- ⚠️ **Live keys require HTTPS** - Stripe will block live keys on HTTP
- ⚠️ Make sure your production site uses HTTPS

**Common Error:**
> "You may test your Stripe.js integration over HTTP. However, live Stripe.js integrations must use HTTPS."

**Solution:** Switch to test keys (`pk_test_...`) for local development. Only use live keys in production with HTTPS.

### Production Checklist

- [ ] Switch to live API keys (only in production with HTTPS)
- [ ] Create production webhook endpoint
- [ ] Update webhook URL to production domain
- [ ] Test payment flow in production
- [ ] Set up monitoring/alerts
- [ ] Configure email notifications for failed payments
- [ ] Review Stripe dashboard regularly

---

## Where Configuration is Used

### Backend (`apps/api/`)

**Environment Variables** (`apps/api/.env`):
- `STRIPE_SECRET_KEY` - Used by Stripe SDK for API calls
- `STRIPE_PUBLISHABLE_KEY` - Exposed via API endpoint for frontend
- `STRIPE_WEBHOOK_SECRET` - Used to verify webhook signatures

**Code Locations**:
- `apps/api/src/lib/stripe.ts` - Stripe client and functions
- `apps/api/src/routes/payment-methods.ts` - Payment method management
- `apps/api/src/routes/payments.ts` - Payment processing
- `apps/api/src/routes/stripe-webhook.ts` - Webhook handler
- `apps/api/src/config/env.ts` - Environment variable validation

### Frontend (`apps/web/`)

The frontend gets the publishable key from the API endpoint:
- `GET /api/payment-methods/publishable-key` - Returns publishable key

The frontend uses Stripe.js to collect payment methods securely.

---

## Verification

### Check Configuration

1. **API Keys**: Your API should start without errors about missing Stripe keys
2. **Webhook**: Check Stripe Dashboard → Webhooks → Your endpoint → Recent events
3. **Test Payment**: Try adding a payment method in the UI

### Common Issues

**"Stripe secret key not configured"**
- Check `STRIPE_SECRET_KEY` is set in `.env`
- Restart API server after adding

**"Stripe publishable key not configured"**
- Check `STRIPE_PUBLISHABLE_KEY` is set in `.env`
- Restart API server

**"You may test your Stripe.js integration over HTTP. However, live Stripe.js integrations must use HTTPS."**
- You're using a **live key** (`pk_live_...`) over HTTP
- **Solution:** Switch to a **test key** (`pk_test_...`) for local development
- Live keys only work with HTTPS (production)
- Test keys work with HTTP (local development)

**Webhook not receiving events**
- Verify webhook URL is correct
- Check webhook secret matches
- For local: Make sure Stripe CLI is running
- Check API server logs for errors

**Payment fails**
- Check Stripe Dashboard → Payments for error details
- Verify payment method is attached to customer
- Check test card numbers are correct

---

## Security Best Practices

1. **Never commit secrets**: Keep `.env` in `.gitignore`
2. **Use environment variables**: Never hardcode keys in code
3. **Rotate keys**: Regularly rotate API keys
4. **Use test mode**: Always test in test mode first
5. **Verify webhooks**: Always verify webhook signatures
6. **Monitor dashboard**: Regularly check Stripe dashboard for suspicious activity
7. **HTTPS only**: Always use HTTPS in production

---

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

## Quick Reference

**Environment Variables**:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Where to Configure**: `apps/api/.env`

**Test Cards**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

**Webhook URL**:
- Local: Use Stripe CLI forwarding
- Production: `https://your-domain.com/api/stripe/webhook`

