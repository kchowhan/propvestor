import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { parseBody } from '../validators/common.js';
import { requireAuth } from '../middleware/auth.js';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60) || 'org';

const signToken = (payload: { userId: string; organizationId: string }) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = parseBody(registerSchema, req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const slugBase = makeSlug(data.organizationName);

    const organization = await prisma.organization.create({
      data: {
        name: data.organizationName,
        slug: `${slugBase}-${Date.now().toString(36)}`,
      },
    });

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        memberships: {
          create: {
            organizationId: organization.id,
            role: 'OWNER',
          },
        },
      },
    });

    const token = signToken({ userId: user.id, organizationId: organization.id });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      organization,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = parseBody(loginSchema, req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password.');
    }

    const matches = await bcrypt.compare(data.password, user.passwordHash);
    if (!matches) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password.');
    }

    if (user.memberships.length === 0) {
      throw new AppError(403, 'FORBIDDEN', 'User is not part of an organization.');
    }

    // Use first membership as default, but return all organizations
    const defaultMembership = user.memberships[0];
    const token = signToken({ userId: user.id, organizationId: defaultMembership.organizationId });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      organization: defaultMembership.organization,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });
    const organization = await prisma.organization.findUnique({
      where: { id: req.auth.organizationId },
    });

    if (!user || !organization) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid user session.');
    }

    // Find the current user's role in the current organization
    const currentMembership = user.memberships.find((m) => m.organizationId === req.auth.organizationId);

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      organization,
      currentRole: currentMembership?.role || null,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/organizations', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid user session.');
    }

    res.json({
      data: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/switch-organization', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const switchSchema = z.object({
      organizationId: z.string().uuid(),
    });
    const data = parseBody(switchSchema, req.body);

    // Verify user has access to this organization
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: {
        memberships: {
          where: { organizationId: data.organizationId },
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
    const token = signToken({ userId: user.id, organizationId: membership.organizationId });

    res.json({
      token,
      organization: membership.organization,
    });
  } catch (err) {
    next(err);
  }
});
