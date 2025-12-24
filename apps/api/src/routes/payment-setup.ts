import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import {
  createPaymentSetupIntent,
  setDefaultPaymentMethod,
  getOrganizationPaymentMethods,
  removePaymentMethod,
} from '../lib/stripe-setup.js';
import { prisma } from '../lib/prisma.js';

export const paymentSetupRouter = Router();

// Create setup intent for payment method collection
paymentSetupRouter.post('/setup-intent', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: {
        memberships: {
          where: { organizationId: req.auth.organizationId },
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this organization.');
    }

    const membership = user.memberships[0];
    
    // Only OWNER can set up payment methods
    if (membership.role !== 'OWNER') {
      throw new AppError(403, 'FORBIDDEN', 'Only organization owners can set up payment methods.');
    }

    const result = await createPaymentSetupIntent(
      req.auth.organizationId,
      user.email,
      membership.organization.name
    );

    res.json({
      clientSecret: result.clientSecret,
      customerId: result.customerId,
    });
  } catch (err) {
    next(err);
  }
});

// Confirm payment method setup
paymentSetupRouter.post('/confirm-setup', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const confirmSchema = z.object({
      paymentMethodId: z.string().min(1),
    });
    const data = parseBody(confirmSchema, req.body);

    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.auth.userId,
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      throw new AppError(403, 'FORBIDDEN', 'Only organization owners can confirm payment setup.');
    }

    await setDefaultPaymentMethod(req.auth.organizationId, data.paymentMethodId);

    const organization = await prisma.organization.findUnique({
      where: { id: req.auth.organizationId },
    });

    res.json({
      message: 'Payment method set up successfully.',
      organization: {
        id: organization?.id,
        paymentMethodSetupComplete: organization?.paymentMethodSetupComplete,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get payment methods for organization
paymentSetupRouter.get('/payment-methods', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.auth.userId,
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new AppError(403, 'FORBIDDEN', 'Only organization owners and admins can view payment methods.');
    }

    const paymentMethods = await getOrganizationPaymentMethods(req.auth.organizationId);

    const organization = await prisma.organization.findUnique({
      where: { id: req.auth.organizationId },
    });

    res.json({
      data: paymentMethods.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            }
          : null,
        isDefault: pm.id === organization?.defaultPaymentMethodId,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Remove payment method
paymentSetupRouter.delete('/payment-methods/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.auth.userId,
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      throw new AppError(403, 'FORBIDDEN', 'Only organization owners can remove payment methods.');
    }

    await removePaymentMethod(req.params.id);

    res.json({ message: 'Payment method removed successfully.' });
  } catch (err) {
    next(err);
  }
});

