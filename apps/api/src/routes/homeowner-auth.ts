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

const homeownerRegisterSchema = z.object({
  associationId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  propertyId: z.string().uuid().optional().nullable(),
});

const homeownerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  associationId: z.string().uuid().optional(), // Optional - will find by email if not provided
});

const superadminImpersonateHomeownerSchema = z.object({
  homeownerId: z.string().uuid(),
});

const signHomeownerToken = (payload: { homeownerId: string; associationId: string }) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as any);

export const homeownerAuthRouter = Router();

// Register homeowner (self-registration)
homeownerAuthRouter.post('/register', async (req, res, next) => {
  try {
    const data = parseBody(homeownerRegisterSchema, req.body);

    // Verify association exists
    const association = await prisma.association.findFirst({
      where: { id: data.associationId, isActive: true },
    });

    if (!association) {
      throw new AppError(404, 'NOT_FOUND', 'Association not found or inactive.');
    }

    // Check for duplicate email in association
    const existing = await prisma.homeowner.findUnique({
      where: {
        associationId_email: {
          associationId: data.associationId,
          email: data.email,
        },
      },
    });

    if (existing) {
      throw new AppError(409, 'CONFLICT', 'A homeowner with this email already exists in this association.');
    }

    // Verify unit/property if provided
    if (data.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: data.unitId },
      });
      if (!unit) {
        throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
      }
    }

    if (data.propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: data.propertyId },
      });
      if (!property) {
        throw new AppError(404, 'NOT_FOUND', 'Property not found.');
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = getVerificationTokenExpiry();

    const homeowner = await prisma.homeowner.create({
      data: {
        associationId: data.associationId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone ?? undefined,
        passwordHash,
        unitId: data.unitId ?? undefined,
        propertyId: data.propertyId ?? undefined,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: verificationTokenExpiry,
      },
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Send verification email
    sendVerificationEmail(homeowner.email, `${homeowner.firstName} ${homeowner.lastName}`, verificationToken).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      homeowner: {
        id: homeowner.id,
        firstName: homeowner.firstName,
        lastName: homeowner.lastName,
        email: homeowner.email,
        emailVerified: homeowner.emailVerified,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Login homeowner endpoint removed - use unified /auth/login instead

// Get current homeowner (me)
homeownerAuthRouter.get('/me', async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing authorization header.');
    }

    const token = header.replace('Bearer ', '');
    let payload: { homeownerId: string; associationId: string };

    try {
      payload = jwt.verify(token, env.JWT_SECRET) as { homeownerId: string; associationId: string };
    } catch (err) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token.');
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { id: payload.homeownerId },
      include: {
        association: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
          },
        },
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                addressLine1: true,
                city: true,
                state: true,
              },
            },
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    if (homeowner.archivedAt) {
      throw new AppError(403, 'FORBIDDEN', 'Your account has been archived.');
    }

    res.json({
      homeowner: {
        id: homeowner.id,
        firstName: homeowner.firstName,
        lastName: homeowner.lastName,
        email: homeowner.email,
        phone: homeowner.phone,
        emailVerified: homeowner.emailVerified,
        status: homeowner.status,
        accountBalance: homeowner.accountBalance,
      },
      association: homeowner.association,
      unit: homeowner.unit,
      property: homeowner.property,
    });
  } catch (err) {
    next(err);
  }
});

// Verify email (reuse existing verification logic)
homeownerAuthRouter.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = parseBody(z.object({ token: z.string() }), req.body);

    const homeowner = await prisma.homeowner.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: { gt: new Date() },
      },
    });

    if (!homeowner) {
      throw new AppError(400, 'BAD_REQUEST', 'Invalid or expired verification token.');
    }

    await prisma.homeowner.update({
      where: { id: homeowner.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });

    res.json({
      success: true,
      message: 'Email verified successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Resend verification email
homeownerAuthRouter.post('/resend-verification', async (req, res, next) => {
  try {
    const { email, associationId } = parseBody(
      z.object({
        email: z.string().email(),
        associationId: z.string().uuid().optional(),
      }),
      req.body
    );

    const where: any = { email };
    if (associationId) {
      where.associationId = associationId;
    }

    const homeowner = await prisma.homeowner.findFirst({ where });

    if (!homeowner) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a verification email has been sent.',
      });
    }

    if (homeowner.emailVerified) {
      return res.json({
        success: true,
        message: 'Email is already verified.',
      });
    }

    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = getVerificationTokenExpiry();

    await prisma.homeowner.update({
      where: { id: homeowner.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: verificationTokenExpiry,
      },
    });

    sendVerificationEmail(
      homeowner.email,
      `${homeowner.firstName} ${homeowner.lastName}`,
      verificationToken
    ).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    res.json({
      success: true,
      message: 'Verification email sent successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Superadmin impersonate homeowner - allows superadmin to access homeowner portal
homeownerAuthRouter.post('/superadmin-impersonate', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(superadminImpersonateHomeownerSchema, req.body);

    // Verify user is superadmin
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { isSuperAdmin: true },
    });

    if (!user || !user.isSuperAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Superadmin privileges required.');
    }

    // Get homeowner and verify they exist
    const homeowner = await prisma.homeowner.findUnique({
      where: { id: data.homeownerId },
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    if (homeowner.archivedAt) {
      throw new AppError(403, 'FORBIDDEN', 'Homeowner account has been archived.');
    }

    // Generate homeowner token
    const token = signHomeownerToken({
      homeownerId: homeowner.id,
      associationId: homeowner.associationId,
    });

    res.json({
      token,
      homeowner: {
        id: homeowner.id,
        firstName: homeowner.firstName,
        lastName: homeowner.lastName,
        email: homeowner.email,
        emailVerified: homeowner.emailVerified,
        status: homeowner.status,
        accountBalance: homeowner.accountBalance,
      },
      association: homeowner.association,
      impersonated: true, // Flag to indicate this is an impersonation
    });
  } catch (err) {
    next(err);
  }
});

// List homeowners for superadmin selection (requires superadmin auth)
homeownerAuthRouter.get('/superadmin/homeowners', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify user is superadmin
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { isSuperAdmin: true },
    });

    if (!user || !user.isSuperAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Superadmin privileges required.');
    }

    // Get all homeowners with their associations
    const homeowners = await prisma.homeowner.findMany({
      where: {
        archivedAt: null,
      },
      include: {
        association: {
          select: {
            id: true,
            name: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            property: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { association: { name: 'asc' } },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    res.json({
      data: homeowners.map((ho) => ({
        id: ho.id,
        firstName: ho.firstName,
        lastName: ho.lastName,
        email: ho.email,
        status: ho.status,
        association: ho.association,
        unit: ho.unit,
        property: ho.property,
      })),
    });
  } catch (err) {
    next(err);
  }
});

