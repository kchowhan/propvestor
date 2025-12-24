import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { getCurrentSubscription, getSubscriptionLimits } from '../lib/subscriptions.js';
import { prisma } from '../lib/prisma.js';

/**
 * Middleware to check if organization has an active subscription
 * Blocks access if subscription is expired, cancelled, or past due
 */
export const requireActiveSubscription = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.auth) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing auth context.'));
  }

  try {
    const subscription = await getCurrentSubscription(req.auth.organizationId);

    // If no subscription, allow access (they're on free tier)
    if (!subscription) {
      return next();
    }

    // Check subscription status
    if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
      return next(
        new AppError(
          403,
          'SUBSCRIPTION_REQUIRED',
          'Your subscription has expired or been cancelled. Please renew to continue using this feature.'
        )
      );
    }

    if (subscription.status === 'PAST_DUE') {
      return next(
        new AppError(
          403,
          'PAYMENT_REQUIRED',
          'Your subscription payment is past due. Please update your payment method to continue.'
        )
      );
    }

    // Check if subscription is in trial and trial has ended
    if (subscription.status === 'TRIAL' && subscription.trialEndsAt) {
      if (new Date() > subscription.trialEndsAt) {
        return next(
          new AppError(
            403,
            'TRIAL_EXPIRED',
            'Your trial period has ended. Please subscribe to a plan to continue.'
          )
        );
      }
    }

    // Attach subscription to request for use in route handlers
    (req as any).subscription = subscription;

    return next();
  } catch (error: any) {
    return next(new AppError(500, 'INTERNAL_ERROR', 'Failed to check subscription status.'));
  }
};

/**
 * Middleware to check if organization has access to a specific feature
 */
export const requireFeature = (featureName: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Missing auth context.'));
    }

    try {
      const subscription = await getCurrentSubscription(req.auth.organizationId);

      // If no subscription, check free plan features
      if (!subscription) {
        // Free plan features are hardcoded here (or you could fetch from a default plan)
        const freeFeatures: Record<string, boolean> = {
          properties: true,
          tenants: true,
          leases: true,
          workOrders: true,
          reports: false,
          api: false,
          advancedReports: false,
        };

        if (!freeFeatures[featureName]) {
          return next(
            new AppError(
              403,
              'FEATURE_NOT_AVAILABLE',
              `The "${featureName}" feature is not available on your current plan. Please upgrade to access this feature.`
            )
          );
        }

        return next();
      }

      // Check if feature is available in current plan
      const features = subscription.plan.features as Record<string, boolean>;
      if (!features[featureName]) {
        return next(
          new AppError(
            403,
            'FEATURE_NOT_AVAILABLE',
            `The "${featureName}" feature is not available on your current plan. Please upgrade to access this feature.`
          )
        );
      }

      return next();
    } catch (error: any) {
      return next(new AppError(500, 'INTERNAL_ERROR', 'Failed to check feature access.'));
    }
  };
};

/**
 * Middleware to check usage limits before creating resources
 * Usage: requireLimit('properties') - checks if org can create more properties
 */
export const requireLimit = (resourceType: 'properties' | 'tenants' | 'users' | 'storage' | 'apiCalls') => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Missing auth context.'));
    }

    try {
      const limits = await getSubscriptionLimits(req.auth.organizationId);
      const limit = limits[resourceType];

      // If limit is effectively unlimited (999999), allow
      if (limit >= 999999) {
        return next();
      }

      // Get current usage
      let currentUsage = 0;

      switch (resourceType) {
        case 'properties':
          currentUsage = await prisma.property.count({
            where: { organizationId: req.auth.organizationId },
          });
          break;
        case 'tenants':
          currentUsage = await prisma.tenant.count({
            where: { organizationId: req.auth.organizationId },
          });
          break;
        case 'users':
          currentUsage = await prisma.organizationMembership.count({
            where: { organizationId: req.auth.organizationId },
          });
          break;
        case 'storage':
          // Storage is calculated in MB from documents
          const documents = await prisma.document.findMany({
            where: { organizationId: req.auth.organizationId },
            select: { fileSize: true },
          });
          currentUsage = Math.round(
            documents.reduce((sum, doc) => sum + (Number(doc.fileSize) || 0), 0) / (1024 * 1024)
          );
          break;
        case 'apiCalls':
          // API calls would need to be tracked separately (not implemented yet)
          // For now, we'll skip this check
          return next();
      }

      if (currentUsage >= limit) {
        const resourceName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
        return next(
          new AppError(
            403,
            'LIMIT_EXCEEDED',
            `You have reached your ${resourceName} limit (${limit}). Please upgrade your plan to add more ${resourceType}.`
          )
        );
      }

      return next();
    } catch (error: any) {
      return next(new AppError(500, 'INTERNAL_ERROR', 'Failed to check usage limits.'));
    }
  };
};

/**
 * Helper to get subscription info for use in route handlers
 */
export async function getSubscriptionInfo(organizationId: string) {
  const subscription = await getCurrentSubscription(organizationId);
  const limits = await getSubscriptionLimits(organizationId);

  return {
    subscription,
    limits,
    hasActiveSubscription: subscription !== null && subscription.status === 'ACTIVE',
    isTrial: subscription !== null && subscription.status === 'TRIAL',
    isExpired: subscription !== null && (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED'),
  };
}

