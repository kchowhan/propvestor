import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { requireHomeownerAuth } from '../middleware/homeowner-auth.js';
import {
  createHomeownerSetupIntent,
  attachHomeownerPaymentMethod,
  deleteHomeownerPaymentMethod,
  listHomeownerPaymentMethods,
} from '../lib/homeowner-stripe.js';

export const homeownerPaymentMethodRouter = Router();

// Get Stripe publishable key for frontend (no auth required - this is safe to expose)
homeownerPaymentMethodRouter.get('/publishable-key', async (req, res, next) => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY?.trim();
    if (!publishableKey) {
      throw new AppError(500, 'CONFIG_ERROR', 'Stripe publishable key not configured.');
    }
    res.json({ data: { publishableKey } });
  } catch (err) {
    next(err);
  }
});

// Create setup intent for adding payment method (requires homeowner auth)
homeownerPaymentMethodRouter.post('/setup-intent', requireHomeownerAuth, async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const { clientSecret, setupIntentId } = await createHomeownerSetupIntent(req.homeownerAuth.homeownerId);

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

// Attach payment method after setup intent completes (requires homeowner auth)
homeownerPaymentMethodRouter.post('/attach', requireHomeownerAuth, async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const schema = z.object({
      setupIntentId: z.string(),
      isDefault: z.boolean().optional().default(false),
    });
    const data = parseBody(schema, req.body);

    // Get homeowner to get associationId
    const homeowner = await prisma.homeowner.findUnique({
      where: { id: req.homeownerAuth.homeownerId },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    const paymentMethod = await attachHomeownerPaymentMethod(
      req.homeownerAuth.homeownerId,
      homeowner.associationId,
      data.setupIntentId,
      data.isDefault
    );

    res.status(201).json({ data: paymentMethod });
  } catch (err) {
    next(err);
  }
});

// List payment methods for homeowner (requires homeowner auth)
homeownerPaymentMethodRouter.get('/', requireHomeownerAuth, async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const methods = await listHomeownerPaymentMethods(req.homeownerAuth.homeownerId);

    res.json({ data: methods });
  } catch (err) {
    next(err);
  }
});

// Delete payment method (requires homeowner auth)
homeownerPaymentMethodRouter.delete('/:paymentMethodId', requireHomeownerAuth, async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify payment method belongs to homeowner
    const paymentMethod = await prisma.homeownerPaymentMethod.findFirst({
      where: {
        stripePaymentMethodId: req.params.paymentMethodId,
        homeownerId: req.homeownerAuth.homeownerId,
      },
    });

    if (!paymentMethod) {
      throw new AppError(404, 'NOT_FOUND', 'Payment method not found.');
    }

    await deleteHomeownerPaymentMethod(req.params.paymentMethodId);

    res.json({ data: { message: 'Payment method deleted successfully' } });
  } catch (err) {
    next(err);
  }
});

