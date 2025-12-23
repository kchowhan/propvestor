import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { sendWelcomeEmail } from '../lib/email.js';

export const userRouter = Router();

// Generate a random password
const generatePassword = (length = 12): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + symbols;

  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

// Check if user has permission to manage users (OWNER or ADMIN)
const checkUserManagementPermission = async (userId: string, organizationId: string): Promise<boolean> => {
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  return membership?.role === 'OWNER' || membership?.role === 'ADMIN';
};

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER']).default('VIEWER'),
});

const addExistingUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER']).default('VIEWER'),
});

// Get all users in the organization
userRouter.get('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const hasPermission = await checkUserManagementPermission(req.auth.userId, req.auth.organizationId);
    if (!hasPermission) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view users.');
    }

    const memberships = await prisma.organizationMembership.findMany({
      where: { organizationId: req.auth.organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Create new user and add to organization
userRouter.post('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const hasPermission = await checkUserManagementPermission(req.auth.userId, req.auth.organizationId);
    if (!hasPermission) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to add users.');
    }

    const data = parseBody(createUserSchema, req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      // Check if user is already in this organization
      const existingMembership = await prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: req.auth.organizationId,
          },
        },
      });

      if (existingMembership) {
        throw new AppError(400, 'BAD_REQUEST', 'User is already a member of this organization.');
      }

      // User exists but not in org - add them
      const membership = await prisma.organizationMembership.create({
        data: {
          userId: existingUser.id,
          organizationId: req.auth.organizationId,
          role: data.role,
        },
        include: {
          user: true,
          organization: true,
        },
      });

      // Send email notification (without password since user already has one)
      await sendWelcomeEmail(
        existingUser.email,
        existingUser.name,
        '[Your existing password]',
        membership.organization.name,
      );

      res.status(201).json({
        data: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: membership.role,
          message: 'Existing user added to organization',
        },
      });
      return;
    }

    // Create new user
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        memberships: {
          create: {
            organizationId: req.auth.organizationId,
            role: data.role,
          },
        },
      },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    const organization = user.memberships[0]?.organization;

    // Send welcome email with password
    if (organization) {
      await sendWelcomeEmail(user.email, user.name, password, organization.name);
    }

    res.status(201).json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.memberships[0]?.role,
        message: 'User created and added to organization. Welcome email sent.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// Add existing user to organization
userRouter.post('/add-existing', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const hasPermission = await checkUserManagementPermission(req.auth.userId, req.auth.organizationId);
    if (!hasPermission) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to add users.');
    }

    const data = parseBody(addExistingUserSchema, req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User with this email does not exist.');
    }

    // Check if user is already in this organization
    const existingMembership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (existingMembership) {
      throw new AppError(400, 'BAD_REQUEST', 'User is already a member of this organization.');
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.auth.organizationId },
    });

    const membership = await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: req.auth.organizationId,
        role: data.role,
      },
    });

    // Send notification email
    if (organization) {
      await sendWelcomeEmail(user.email, user.name, '[Your existing password]', organization.name);
    }

    res.status(201).json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        message: 'User added to organization. Notification email sent.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update user role in organization
userRouter.put('/:userId/role', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const hasPermission = await checkUserManagementPermission(req.auth.userId, req.auth.organizationId);
    if (!hasPermission) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to update user roles.');
    }

    const roleSchema = z.object({
      role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER']),
    });
    const data = parseBody(roleSchema, req.body);

    // Prevent removing the last OWNER
    if (data.role !== 'OWNER') {
      const ownerCount = await prisma.organizationMembership.count({
        where: {
          organizationId: req.auth.organizationId,
          role: 'OWNER',
        },
      });

      const currentMembership = await prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: req.params.userId,
            organizationId: req.auth.organizationId,
          },
        },
      });

      if (currentMembership?.role === 'OWNER' && ownerCount === 1) {
        throw new AppError(400, 'BAD_REQUEST', 'Cannot remove the last OWNER from the organization.');
      }
    }

    const membership = await prisma.organizationMembership.update({
      where: {
        userId_organizationId: {
          userId: req.params.userId,
          organizationId: req.auth.organizationId,
        },
      },
      data: { role: data.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      data: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Remove user from organization
userRouter.delete('/:userId', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const hasPermission = await checkUserManagementPermission(req.auth.userId, req.auth.organizationId);
    if (!hasPermission) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to remove users.');
    }

    // Prevent removing yourself
    if (req.params.userId === req.auth.userId) {
      throw new AppError(400, 'BAD_REQUEST', 'You cannot remove yourself from the organization.');
    }

    // Prevent removing the last OWNER
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.params.userId,
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (membership?.role === 'OWNER') {
      const ownerCount = await prisma.organizationMembership.count({
        where: {
          organizationId: req.auth.organizationId,
          role: 'OWNER',
        },
      });

      if (ownerCount === 1) {
        throw new AppError(400, 'BAD_REQUEST', 'Cannot remove the last OWNER from the organization.');
      }
    }

    await prisma.organizationMembership.delete({
      where: {
        userId_organizationId: {
          userId: req.params.userId,
          organizationId: req.auth.organizationId,
        },
      },
    });

    res.json({ data: { message: 'User removed from organization' } });
  } catch (err) {
    next(err);
  }
});

