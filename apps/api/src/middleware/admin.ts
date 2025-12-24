import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

/**
 * Middleware to check if user is a super admin
 * Must be used after requireAuth middleware
 */
export const requireSuperAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.auth) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required.'));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { isSuperAdmin: true },
    });

    if (!user) {
      return next(new AppError(404, 'NOT_FOUND', 'User not found.'));
    }

    if (!user.isSuperAdmin) {
      return next(
        new AppError(403, 'FORBIDDEN', 'Super admin access required.')
      );
    }

    return next();
  } catch (error: any) {
    return next(new AppError(500, 'INTERNAL_ERROR', 'Failed to verify admin status.'));
  }
};

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats() {
  const [
    totalOrganizations,
    totalUsers,
    totalProperties,
    totalTenants,
    activeSubscriptions,
    trialSubscriptions,
    cancelledSubscriptions,
    revenueData,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.property.count(),
    prisma.tenant.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'TRIAL' } }),
    prisma.subscription.count({ where: { status: { in: ['CANCELLED', 'EXPIRED'] } } }),
    prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    }),
  ]);

  // Calculate MRR (Monthly Recurring Revenue)
  const mrr = revenueData.reduce((sum, sub) => {
    const price = Number(sub.plan.price);
    if (sub.plan.billingInterval === 'annual') {
      return sum + price / 12;
    }
    return sum + price;
  }, 0);

  return {
    totalOrganizations,
    totalUsers,
    totalProperties,
    totalTenants,
    subscriptions: {
      active: activeSubscriptions,
      trial: trialSubscriptions,
      cancelled: cancelledSubscriptions,
      total: activeSubscriptions + trialSubscriptions + cancelledSubscriptions,
    },
    revenue: {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
    },
  };
}

