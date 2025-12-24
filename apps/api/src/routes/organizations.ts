import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { requireAuth } from '../middleware/auth.js';

export const organizationRouter = Router();

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60) || 'org';

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
});

// Create a new organization
// Restricted: Only users with OWNER role AND appropriate subscription plan can create new organizations
// This prevents abuse and ensures proper billing for multiple organizations
organizationRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Check if organization creation is enabled (feature flag)
    const ORG_CREATION_ENABLED = process.env.ALLOW_ORG_CREATION !== 'false'; // Default: enabled
    if (!ORG_CREATION_ENABLED) {
      throw new AppError(403, 'FORBIDDEN', 'Organization creation is currently disabled. Please contact support.');
    }

    // Check if user has OWNER role in at least one organization
    const ownerMembership = await prisma.organizationMembership.findFirst({
      where: {
        userId: req.auth.userId,
        role: 'OWNER',
      },
    });

    if (!ownerMembership) {
      throw new AppError(403, 'FORBIDDEN', 'Only users with OWNER role can create new organizations.');
    }

    // Check subscription plan - only Enterprise plan allows multiple organizations
    // OR if user has no subscription (first org creation during registration is allowed)
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: req.auth.organizationId },
      include: { plan: true },
    });
    
    if (subscription) {
      const planSlug = subscription.plan.slug.toLowerCase();
      const REQUIRES_ENTERPRISE = process.env.ORG_CREATION_REQUIRES_ENTERPRISE !== 'false'; // Default: requires Enterprise
      
      if (REQUIRES_ENTERPRISE && !planSlug.includes('enterprise')) {
        throw new AppError(
          403,
          'SUBSCRIPTION_REQUIRED',
          'Creating additional organizations requires an Enterprise plan. Please upgrade your subscription or contact support.'
        );
      }

      // Optional: Limit number of organizations per user
      const MAX_ORGS_PER_USER = process.env.MAX_ORGS_PER_USER 
        ? parseInt(process.env.MAX_ORGS_PER_USER, 10) 
        : null; // null = unlimited
      
      if (MAX_ORGS_PER_USER) {
        const userOrgCount = await prisma.organizationMembership.count({
          where: {
            userId: req.auth.userId,
            role: 'OWNER',
          },
        });

        if (userOrgCount >= MAX_ORGS_PER_USER) {
          throw new AppError(
            403,
            'LIMIT_EXCEEDED',
            `You have reached the maximum number of organizations (${MAX_ORGS_PER_USER}). Please contact support to create additional organizations.`
          );
        }
      }
    }

    const data = parseBody(createOrganizationSchema, req.body);
    const slugBase = makeSlug(data.name);

    // Check if slug already exists
    const existingOrg = await prisma.organization.findFirst({
      where: {
        slug: {
          startsWith: slugBase,
        },
      },
    });

    // Generate unique slug
    const slug = existingOrg
      ? `${slugBase}-${Date.now().toString(36)}`
      : `${slugBase}-${Date.now().toString(36)}`;

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        slug,
      },
    });

    // Add the current user as OWNER of the new organization
    await prisma.organizationMembership.create({
      data: {
        userId: req.auth.userId,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    res.status(201).json({
      data: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
        message: 'Organization created successfully. You are now the OWNER.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// List all organizations the user belongs to
organizationRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const memberships = await prisma.organizationMembership.findMany({
      where: { userId: req.auth.userId },
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        joinedAt: m.createdAt,
        createdAt: m.organization.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Get organization details (only if user is a member)
organizationRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.auth.userId,
          organizationId: req.params.id,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new AppError(404, 'NOT_FOUND', 'Organization not found or you are not a member.');
    }

    res.json({
      data: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
        createdAt: membership.organization.createdAt,
        joinedAt: membership.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

