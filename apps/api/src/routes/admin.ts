import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery } from '../validators/common.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperAdmin, getAdminStats } from '../middleware/admin.js';

export const adminRouter = Router();

// All admin routes require authentication and super admin privileges
adminRouter.use(requireAuth);
adminRouter.use(requireSuperAdmin);

// Get admin dashboard statistics
adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const stats = await getAdminStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
});

// List all organizations with pagination and filtering
const listOrganizationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'trial', 'cancelled', 'expired']).optional().default('all'),
});

adminRouter.get('/organizations', async (req, res, next) => {
  try {
    const parsed = parseQuery(listOrganizationsSchema, req.query);
    const page = parsed.page ?? 1;
    const limit = parsed.limit ?? 20;
    const search = parsed.search;
    const status = parsed.status ?? 'all';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Get organizations with subscription info
    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: {
              memberships: true,
              properties: true,
              tenants: true,
            },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    // Filter by subscription status if specified
    let filteredOrgs = organizations;
    if (status !== 'all') {
      filteredOrgs = organizations.filter((org) => {
        if (status === 'active') return org.subscription?.status === 'ACTIVE';
        if (status === 'trial') return org.subscription?.status === 'TRIAL';
        if (status === 'cancelled') return org.subscription?.status === 'CANCELLED';
        if (status === 'expired') return org.subscription?.status === 'EXPIRED';
        return true;
      });
    }

    res.json({
      data: filteredOrgs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get single organization details
adminRouter.get('/organizations/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: {
          include: { 
            plan: true,
            invoices: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: {
          select: {
            properties: true,
            tenants: true,
            leases: true,
            workOrders: true,
          },
        },
      },
    });

    if (!organization) {
      throw new AppError(404, 'NOT_FOUND', 'Organization not found.');
    }

    res.json({ data: organization });
  } catch (err) {
    next(err);
  }
});

// Update organization (admin can change subscription status, etc.)
const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  subscriptionStatus: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED']).optional(),
  extendTrial: z.number().min(1).max(90).optional(), // Days to extend trial
});

adminRouter.patch('/organizations/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = parseBody(updateOrganizationSchema, req.body);

    // Check organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!organization) {
      throw new AppError(404, 'NOT_FOUND', 'Organization not found.');
    }

    // Update organization name if provided
    if (data.name) {
      await prisma.organization.update({
        where: { id },
        data: { name: data.name },
      });
    }

    // Update subscription status if provided
    if (data.subscriptionStatus && organization.subscription) {
      await prisma.subscription.update({
        where: { id: organization.subscription.id },
        data: { status: data.subscriptionStatus },
      });
    }

    // Extend trial if requested
    if (data.extendTrial && organization.subscription) {
      const currentEnd = organization.subscription.trialEndsAt || new Date();
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + data.extendTrial);

      await prisma.subscription.update({
        where: { id: organization.subscription.id },
        data: {
          trialEndsAt: newEnd,
          status: 'TRIAL',
        },
      });
    }

    // Fetch updated organization
    const updated = await prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// Suspend an organization (set subscription to CANCELLED)
adminRouter.post('/organizations/:id/suspend', async (req, res, next) => {
  try {
    const { id } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!organization) {
      throw new AppError(404, 'NOT_FOUND', 'Organization not found.');
    }

    if (organization.subscription) {
      await prisma.subscription.update({
        where: { id: organization.subscription.id },
        data: { status: 'CANCELLED' },
      });
    }

    res.json({ message: 'Organization suspended successfully.' });
  } catch (err) {
    next(err);
  }
});

// Reactivate an organization
adminRouter.post('/organizations/:id/reactivate', async (req, res, next) => {
  try {
    const { id } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!organization) {
      throw new AppError(404, 'NOT_FOUND', 'Organization not found.');
    }

    if (organization.subscription) {
      await prisma.subscription.update({
        where: { id: organization.subscription.id },
        data: { status: 'ACTIVE' },
      });
    }

    res.json({ message: 'Organization reactivated successfully.' });
  } catch (err) {
    next(err);
  }
});

// List all users (super admin only)
const listUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  superAdminOnly: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true';
      }
      return false;
    })
    .optional()
    .default(false),
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    const parsed = parseQuery(listUsersSchema, req.query);
    const page = parsed.page ?? 1;
    const limit = parsed.limit ?? 20;
    const search = parsed.search;
    const superAdminOnly = parsed.superAdminOnly ?? false;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (superAdminOnly) {
      where.isSuperAdmin = true;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          isSuperAdmin: true,
          createdAt: true,
          memberships: {
            include: {
              organization: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Grant/revoke super admin privileges
const updateUserAdminSchema = z.object({
  isSuperAdmin: z.boolean(),
});

adminRouter.patch('/users/:id/admin', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isSuperAdmin } = parseBody(updateUserAdminSchema, req.body);

    // Prevent removing own super admin status
    if (req.auth && req.auth.userId === id && !isSuperAdmin) {
      throw new AppError(400, 'BAD_REQUEST', 'Cannot remove your own super admin privileges.');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isSuperAdmin },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
      },
    });

    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

// Get subscription plans (for admin management)
adminRouter.get('/plans', async (_req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    res.json({ data: plans });
  } catch (err) {
    next(err);
  }
});

// Update subscription plan
const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  limits: z.record(z.number()).optional(),
  features: z.record(z.boolean()).optional(),
  stripePriceId: z.string().optional(),
});

adminRouter.patch('/plans/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = parseBody(updatePlanSchema, req.body);

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data,
    });

    res.json({ data: plan });
  } catch (err) {
    next(err);
  }
});

// Get recent activity across all organizations
adminRouter.get('/activity', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    // Get recent subscriptions
    const recentSubscriptions = await prisma.subscription.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
        plan: { select: { name: true } },
      },
    });

    // Get recent organizations
    const recentOrganizations = await prisma.organization.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true },
    });

    // Get recent users
    const recentUsers = await prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    res.json({
      data: {
        subscriptions: recentSubscriptions,
        organizations: recentOrganizations,
        users: recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Impersonate an organization (for support purposes)
// This generates a temporary token that allows admin to act as if they're part of the organization
adminRouter.post('/organizations/:id/impersonate', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new AppError(404, 'NOT_FOUND', 'Organization not found.');
    }

    // Return organization ID for client-side context switching
    // In a real implementation, you might generate a special token or session
    res.json({
      data: {
        organizationId: id,
        organizationName: organization.name,
        message: 'Impersonation context set. Use this organizationId in subsequent requests.',
      },
    });
  } catch (err) {
    next(err);
  }
});

