import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getCurrentSubscription,
  getSubscriptionLimits,
  createStripeSubscription,
  updateSubscriptionPlan,
  cancelSubscription,
} from '../lib/subscriptions.js';

export const subscriptionRouter = Router();

// Get all available subscription plans (public endpoint)
subscriptionRouter.get('/plans', async (_req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({ data: plans });
  } catch (err) {
    next(err);
  }
});

// Get current subscription for organization (requires auth)
subscriptionRouter.get('/current', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const subscription = await getCurrentSubscription(req.auth.organizationId);

    if (!subscription) {
      return res.json({ data: null });
    }

    // Include plan details
    const subscriptionWithPlan = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: { plan: true },
    });

    res.json({ data: subscriptionWithPlan });
  } catch (err) {
    next(err);
  }
});

// Get subscription limits for current organization (requires auth)
subscriptionRouter.get('/limits', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const limits = await getSubscriptionLimits(req.auth.organizationId);

    res.json({ data: limits });
  } catch (err) {
    next(err);
  }
});

// Get subscription limits with usage and warnings (requires auth)
subscriptionRouter.get('/limits-with-usage', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const limits = await getSubscriptionLimits(req.auth.organizationId);
    
    // Get current usage
    const [propertiesCount, tenantsCount, usersCount] = await Promise.all([
      prisma.property.count({
        where: { organizationId: req.auth.organizationId },
      }),
      prisma.tenant.count({
        where: { organizationId: req.auth.organizationId },
      }),
      prisma.organizationMembership.count({
        where: { organizationId: req.auth.organizationId },
      }),
    ]);

    // Calculate storage usage (estimate 1 MB per document since fileSize is not tracked)
    const documentsCount = await prisma.document.count({
      where: { organizationId: req.auth.organizationId },
    });
    const storageUsedMB = documentsCount; // Estimate 1 MB per document

    const usage = {
      properties: propertiesCount,
      tenants: tenantsCount,
      users: usersCount,
      storage: storageUsedMB,
      apiCalls: 0, // Would need to track this separately
    };

    // Calculate percentages and warnings
    const warnings: Array<{ resource: string; percentage: number; message: string }> = [];
    const WARNING_THRESHOLD = 80; // Warn at 80% usage
    const CRITICAL_THRESHOLD = 95; // Critical at 95% usage

    const checkLimit = (resource: string, used: number, limit: number) => {
      if (limit >= 999999) return; // Unlimited, no warning
      
      const percentage = (used / limit) * 100;
      if (percentage >= CRITICAL_THRESHOLD) {
        warnings.push({
          resource,
          percentage: Math.round(percentage),
          message: `You've used ${Math.round(percentage)}% of your ${resource} limit. Upgrade now to avoid restrictions.`,
        });
      } else if (percentage >= WARNING_THRESHOLD) {
        warnings.push({
          resource,
          percentage: Math.round(percentage),
          message: `You're using ${Math.round(percentage)}% of your ${resource} limit. Consider upgrading soon.`,
        });
      }
    };

    checkLimit('properties', usage.properties, limits.properties);
    checkLimit('tenants', usage.tenants, limits.tenants);
    checkLimit('users', usage.users, limits.users);
    checkLimit('storage', usage.storage, limits.storage);

    res.json({
      data: {
        limits,
        usage,
        warnings,
        hasWarnings: warnings.length > 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Subscribe to a plan (requires auth)
const subscribeSchema = z.object({
  planId: z.string().uuid(),
  paymentMethodId: z.string().optional(),
});

subscriptionRouter.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const { planId, paymentMethodId } = parseBody(subscribeSchema, req.body);

    const result = await createStripeSubscription(req.auth.organizationId, planId, paymentMethodId);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// Upgrade subscription plan (requires auth)
const upgradeSchema = z.object({
  planId: z.string().uuid(),
});

subscriptionRouter.post('/upgrade', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const { planId } = parseBody(upgradeSchema, req.body);

    const result = await updateSubscriptionPlan(req.auth.organizationId, planId);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// Cancel subscription (requires auth)
const cancelSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional().default(true),
});

subscriptionRouter.post('/cancel', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const { cancelAtPeriodEnd } = parseBody(cancelSchema, req.body);

    const result = await cancelSubscription(req.auth.organizationId, cancelAtPeriodEnd);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// Get subscription invoices (requires auth)
subscriptionRouter.get('/invoices', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const subscription = await getCurrentSubscription(req.auth.organizationId);
    
    if (!subscription) {
      return res.json({ data: [] });
    }

    const invoices = await prisma.invoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: invoices });
  } catch (err) {
    next(err);
  }
});
