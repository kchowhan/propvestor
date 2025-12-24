import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { parseBody } from '../validators/common.js';
import { requireAuth } from '../middleware/auth.js';
import {
  generateVerificationToken,
  getVerificationTokenExpiry,
  sendVerificationEmail,
  verifyEmailToken,
  resendVerificationEmail,
} from '../lib/verification.js';

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
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as any);

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = parseBody(registerSchema, req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const slugBase = makeSlug(data.organizationName);

    // Generate email verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = getVerificationTokenExpiry();

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
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: verificationTokenExpiry,
        memberships: {
          create: {
            organizationId: organization.id,
            role: 'OWNER',
          },
        },
      },
    });

    // Send verification email (don't block registration on email send)
    sendVerificationEmail(user.email, user.name, verificationToken).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    const token = signToken({ userId: user.id, organizationId: organization.id });

    res.json({
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        isSuperAdmin: user.isSuperAdmin,
        emailVerified: user.emailVerified,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        paymentMethodSetupComplete: organization.paymentMethodSetupComplete,
      },
      message: 'Registration successful. Please check your email to verify your account.',
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
      user: { id: user.id, name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin },
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

    if (!user || !organization || !req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid user session.');
    }

    // Find the current user's role in the current organization
    const currentMembership = user.memberships.find((m) => m.organizationId === req.auth!.organizationId);

    res.json({
      user: { id: user.id, name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin },
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

// Email verification endpoint
authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const verifySchema = z.object({
      token: z.string().min(1),
    });
    const data = parseBody(verifySchema, req.body);

    const result = await verifyEmailToken(data.token);

    if (!result.success) {
      throw new AppError(400, 'BAD_REQUEST', result.message);
    }

    res.json({
      message: result.message,
      verified: true,
    });
  } catch (err) {
    next(err);
  }
});

// Resend verification email
authRouter.post('/resend-verification', async (req, res, next) => {
  try {
    const resendSchema = z.object({
      email: z.string().email(),
    });
    const data = parseBody(resendSchema, req.body);

    const result = await resendVerificationEmail(data.email);

    if (!result.success) {
      throw new AppError(400, 'BAD_REQUEST', result.message);
    }

    res.json({ message: result.message });
  } catch (err) {
    next(err);
  }
});
