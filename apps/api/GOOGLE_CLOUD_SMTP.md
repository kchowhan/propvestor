# Google Cloud SMTP Configuration Guide

While Google Cloud doesn't offer a native SMTP service, there are several excellent options for sending emails from your PropVestor application running on Google Cloud.

## Recommended Options

### 1. **SendGrid** (Recommended)
**Best for**: Production applications, high volume, reliable delivery

**Why SendGrid**:
- Google Cloud Marketplace integration available
- Free tier: 100 emails/day
- Excellent deliverability rates
- Detailed analytics and tracking
- Easy API and SMTP integration

**Setup Steps**:
1. Sign up for SendGrid account: https://sendgrid.com
2. Create an API key in SendGrid dashboard
3. Verify your sender domain (recommended for production)
4. Configure in PropVestor:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key-here
SMTP_FROM=noreply@yourdomain.com
```

**Alternative: SendGrid API** (instead of SMTP):
- Can use SendGrid's REST API directly
- Better for high-volume sending
- More features (templates, tracking, etc.)

---

### 2. **Mailgun**
**Best for**: Developers, flexible pricing, good API

**Why Mailgun**:
- Free tier: 5,000 emails/month for 3 months, then 1,000/month
- Excellent API documentation
- Good deliverability
- Easy integration

**Setup Steps**:
1. Sign up for Mailgun: https://www.mailgun.com
2. Verify your domain
3. Get SMTP credentials from dashboard
4. Configure in PropVestor:

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

---

### 3. **Google Workspace SMTP Relay**
**Best for**: Organizations already using Google Workspace

**Why Google Workspace**:
- If you already have Google Workspace, use their SMTP relay
- No additional cost
- Reliable delivery
- Requires Google Workspace subscription

**Setup Steps**:
1. Ensure you have Google Workspace account
2. Enable "Less secure app access" or use OAuth2 (recommended)
3. Configure in PropVestor:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-app-password  # Use App Password, not regular password
SMTP_FROM=your-email@yourdomain.com
```

**Note**: For production, use OAuth2 instead of app passwords for better security.

---

### 4. **AWS SES** (via SMTP)
**Best for**: If already using AWS, cost-effective at scale

**Why AWS SES**:
- Very cost-effective ($0.10 per 1,000 emails)
- High deliverability
- Can use from GCP via SMTP
- Requires AWS account

**Setup Steps**:
1. Create AWS account and enable SES
2. Verify your email/domain in SES
3. Create SMTP credentials in SES
4. Configure in PropVestor:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Use your SES region
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=verified-email@yourdomain.com
```

---

## Quick Start: SendGrid (Recommended)

### Step 1: Create SendGrid Account
1. Go to https://sendgrid.com
2. Sign up for free account
3. Complete email verification

### Step 2: Create API Key
1. Navigate to **Settings** > **API Keys**
2. Click **Create API Key**
3. Name it "PropVestor Production"
4. Select **Full Access** or **Restricted Access** (Mail Send permission)
5. Copy the API key (you won't see it again!)

### Step 3: Verify Sender (Recommended for Production)
1. Navigate to **Settings** > **Sender Authentication**
2. Choose **Domain Authentication** (recommended) or **Single Sender Verification**
3. Follow the DNS setup instructions
4. Wait for verification (usually a few minutes)

### Step 4: Configure PropVestor
Add to `apps/api/.env`:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-actual-api-key-here
SMTP_FROM=noreply@yourdomain.com
APP_URL=https://yourdomain.com
```

### Step 5: Test
1. Start your API server
2. Create a test user or trigger an email
3. Check SendGrid dashboard for delivery status

---

## Cost Comparison

| Service | Free Tier | Paid Tier (per 1,000 emails) |
|---------|-----------|------------------------------|
| SendGrid | 100/day | $0.60 - $0.80 |
| Mailgun | 1,000/month | $0.80 |
| AWS SES | 62,000/month (if on EC2) | $0.10 |
| Google Workspace | Included | Included |

---

## Security Best Practices

1. **Use Environment Variables**: Never hardcode credentials
2. **Use App Passwords**: For Google Workspace, use app passwords, not regular passwords
3. **Verify Domains**: Always verify your sending domain for better deliverability
4. **Monitor Bounce Rates**: Set up alerts for high bounce rates
5. **Use SPF/DKIM**: Configure SPF and DKIM records for your domain
6. **Rate Limiting**: Implement rate limiting to prevent abuse

---

## Troubleshooting

### Emails Not Sending
1. Check SMTP credentials are correct
2. Verify sender email/domain is verified
3. Check firewall/security group allows outbound port 587
4. Review service provider's logs/dashboard

### Emails Going to Spam
1. Verify your domain (SPF, DKIM records)
2. Warm up your sending domain gradually
3. Avoid spam trigger words
4. Use proper email templates
5. Monitor bounce/complaint rates

### Port 25 Blocked
- Google Cloud blocks outbound port 25 by default
- Use port 587 (TLS) or 465 (SSL) instead
- Both are open and recommended

---

## Production Checklist

- [ ] Choose SMTP service provider
- [ ] Create account and verify domain
- [ ] Generate API key/SMTP credentials
- [ ] Configure environment variables
- [ ] Test email sending
- [ ] Set up SPF record for your domain
- [ ] Set up DKIM record for your domain
- [ ] Configure DMARC policy (optional but recommended)
- [ ] Set up bounce/complaint handling
- [ ] Monitor delivery rates
- [ ] Set up alerts for failures

---

## Additional Resources

- [SendGrid Documentation](https://docs.sendgrid.com)
- [Mailgun Documentation](https://documentation.mailgun.com)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses)
- [Google Workspace SMTP Settings](https://support.google.com/a/answer/176600)
- [SPF Record Setup](https://www.spfrecord.com)
- [DKIM Setup Guide](https://www.dmarcanalyzer.com/dkim/)

---

## Recommendation

For PropVestor, we recommend **SendGrid** because:
1. Easy Google Cloud integration
2. Generous free tier for development
3. Excellent deliverability
4. Great documentation and support
5. Scales well as you grow
6. Detailed analytics

Start with SendGrid's free tier, then upgrade as needed.

