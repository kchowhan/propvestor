import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createSetupIntent,
  attachPaymentMethod,
  deletePaymentMethod,
  listPaymentMethods,
} from '../lib/stripe.js';

export const paymentMethodRouter = Router();

// Get Stripe publishable key for frontend (no auth required - this is safe to expose)
paymentMethodRouter.get('/publishable-key', async (req, res, next) => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY?.trim();
    if (!publishableKey) {
      throw new AppError(500, 'CONFIG_ERROR', 'Stripe publishable key not configured. Please add STRIPE_PUBLISHABLE_KEY to your apps/api/.env file and restart the API server.');
    }
    res.json({ data: { publishableKey } });
  } catch (err) {
    next(err);
  }
});

// Create setup intent for adding payment method (requires auth)
paymentMethodRouter.post('/setup-intent', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const schema = z.object({
      tenantId: z.string().uuid(),
    });
    const data = parseBody(schema, req.body);

    // Verify tenant belongs to organization
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: data.tenantId,
        organizationId: req.auth.organizationId,
      },
    });

    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found.');
    }

    const { clientSecret, setupIntentId } = await createSetupIntent(data.tenantId);

    res.json({
      data: {
        clientSecret,
        setupIntentId,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Attach payment method after setup intent completes (requires auth)
paymentMethodRouter.post('/attach', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const schema = z.object({
      tenantId: z.string().uuid(),
      setupIntentId: z.string(),
      isDefault: z.boolean().optional().default(false),
    });
    const data = parseBody(schema, req.body);

    // Verify tenant belongs to organization
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: data.tenantId,
        organizationId: req.auth.organizationId,
      },
    });

    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found.');
    }

    const paymentMethod = await attachPaymentMethod(data.tenantId, data.setupIntentId, data.isDefault);

    res.status(201).json({ data: paymentMethod });
  } catch (err) {
    next(err);
  }
});

// List payment methods for a tenant (requires auth)
paymentMethodRouter.get('/tenant/:tenantId', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify tenant belongs to organization
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: req.params.tenantId,
        organizationId: req.auth.organizationId,
      },
    });

    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found.');
    }

    const methods = await listPaymentMethods(req.params.tenantId);

    res.json({ data: methods });
  } catch (err) {
    next(err);
  }
});

// Delete payment method (requires auth)
paymentMethodRouter.delete('/:paymentMethodId', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify payment method belongs to organization
    const paymentMethod = await prisma.tenantPaymentMethod.findFirst({
      where: {
        stripePaymentMethodId: req.params.paymentMethodId,
        organizationId: req.auth.organizationId,
      },
    });

    if (!paymentMethod) {
      throw new AppError(404, 'NOT_FOUND', 'Payment method not found.');
    }

    await deletePaymentMethod(req.params.paymentMethodId);

    res.json({ data: { message: 'Payment method deleted successfully' } });
  } catch (err) {
    next(err);
  }
});

