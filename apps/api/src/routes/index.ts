import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { authRouter } from './auth.js';
import { propertyRouter } from './properties.js';
import { unitRouter } from './units.js';
import { tenantRouter } from './tenants.js';
import { leaseRouter } from './leases.js';
import { chargeRouter } from './charges.js';
import { paymentRouter } from './payments.js';
import { workOrderRouter } from './work-orders.js';
import { documentRouter } from './documents.js';
import { billingRouter } from './billing.js';
import { reportRouter } from './reports.js';
import { vendorRouter } from './vendors.js';
import { userRouter } from './users.js';
import { organizationRouter } from './organizations.js';
import { docusignWebhookRouter } from './docusign-webhook.js';
import { paymentMethodRouter } from './payment-methods.js';
import { stripeWebhookRouter } from './stripe-webhook.js';
import { screeningRouter } from './screening.js';
import { rentspreeWebhookRouter } from './rentspree-webhook.js';
import { reconciliationRouter } from './reconciliation.js';
import { subscriptionRouter } from './subscriptions.js';
import { organizationFeesRouter } from './organization-fees.js';
import { adminRouter } from './admin.js';
import { applicantRouter } from './applicants.js';
import { paymentSetupRouter } from './payment-setup.js';
import { associationRouter } from './associations.js';
import { homeownerRouter } from './homeowners.js';

export const router = Router();

// Health check endpoint (no auth required)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRouter);
// Webhooks (no auth required - external services will call these)
router.use('/docusign', docusignWebhookRouter);
router.use('/stripe', stripeWebhookRouter);
router.use('/rentspree', rentspreeWebhookRouter);
// Subscriptions - webhook is public, other routes require auth (handled in subscriptionRouter)
router.use('/subscriptions', subscriptionRouter);
// Payment methods - publishable key endpoint (no auth required - safe to expose)
router.use('/payment-methods', paymentMethodRouter);
// Billing - can be called by scheduler (with secret) or authenticated user
router.use('/billing', optionalAuth, billingRouter);

router.use(requireAuth);

router.use('/properties', propertyRouter);
router.use(unitRouter);
router.use('/tenants', tenantRouter);
router.use('/screening', screeningRouter);
router.use('/leases', leaseRouter);
router.use('/charges', chargeRouter);
router.use('/payments', paymentRouter);
router.use('/reconciliation', reconciliationRouter);
router.use('/subscriptions', subscriptionRouter);
router.use('/work-orders', workOrderRouter);
router.use('/vendors', vendorRouter);
router.use('/documents', documentRouter);
router.use('/reports', reportRouter);
router.use('/users', userRouter);
router.use('/organizations', organizationRouter);
router.use('/organization-fees', organizationFeesRouter);
router.use('/admin', adminRouter);
router.use('/applicants', applicantRouter);
router.use('/payment-setup', paymentSetupRouter);
router.use('/associations', associationRouter);
router.use('/homeowners', homeownerRouter);
