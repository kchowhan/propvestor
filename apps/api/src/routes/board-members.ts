import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery } from '../validators/common.js';
import { requireAuth } from '../middleware/auth.js';

export const boardMemberRouter = Router();

const createBoardMemberSchema = z.object({
  associationId: z.string().uuid(),
  userId: z.string().uuid().optional().nullable(),
  homeownerId: z.string().uuid().optional().nullable(),
  role: z.enum(['PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'TREASURER', 'MEMBER_AT_LARGE']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateBoardMemberSchema = createBoardMemberSchema.partial().extend({
  associationId: z.string().uuid().optional(), // Can't change association
});

const querySchema = z.object({
  associationId: z.string().uuid().optional(),
  isActive: z.string().optional().transform((val) => val === 'true'),
  role: z.string().optional(),
});

// List board members
boardMemberRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const query = parseQuery(querySchema, req.query);
    
    // First, get all associations for this organization
    const associations = await prisma.association.findMany({
      where: { organizationId: req.auth.organizationId },
      select: { id: true },
    });
    const associationIds = associations.map((a) => a.id);
    
    if (associationIds.length === 0) {
      // No associations, return empty array
      return res.json({ data: [] });
    }
    
    const where: any = {
      associationId: { in: associationIds },
    };

    if (query.associationId) {
      // Verify association belongs to organization
      if (!associationIds.includes(query.associationId)) {
        throw new AppError(404, 'NOT_FOUND', 'Association not found.');
      }
      // Filter by specific association
      where.associationId = query.associationId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.role) {
      where.role = query.role;
    }

    const boardMembers = await prisma.boardMember.findMany({
      where,
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        homeowner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { startDate: 'desc' },
      ],
    });

    res.json({ data: boardMembers });
  } catch (err) {
    next(err);
  }
});

// Create board member
boardMemberRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(createBoardMemberSchema, req.body);

    // Must provide either userId or homeownerId, but not both
    if (!data.userId && !data.homeownerId) {
      throw new AppError(400, 'BAD_REQUEST', 'Either userId or homeownerId must be provided.');
    }

    if (data.userId && data.homeownerId) {
      throw new AppError(400, 'BAD_REQUEST', 'Cannot provide both userId and homeownerId.');
    }

    // Verify association belongs to organization
    const association = await prisma.association.findFirst({
      where: {
        id: data.associationId,
        organizationId: req.auth.organizationId,
      },
    });

    if (!association) {
      throw new AppError(404, 'NOT_FOUND', 'Association not found.');
    }

    // Verify user belongs to organization if provided
    if (data.userId) {
      const membership = await prisma.organizationMembership.findFirst({
        where: {
          userId: data.userId,
          organizationId: req.auth.organizationId,
        },
      });
      if (!membership) {
        throw new AppError(404, 'NOT_FOUND', 'User not found or not a member of this organization.');
      }
    }

    // Verify homeowner belongs to association if provided
    if (data.homeownerId) {
      const homeowner = await prisma.homeowner.findFirst({
        where: {
          id: data.homeownerId,
          associationId: data.associationId,
        },
      });
      if (!homeowner) {
        throw new AppError(404, 'NOT_FOUND', 'Homeowner not found or does not belong to this association.');
      }
    }

    // Check for active board member with same role (optional - can have multiple)
    // But check if this person is already an active board member
    const existingActive = await prisma.boardMember.findFirst({
      where: {
        associationId: data.associationId,
        isActive: true,
        ...(data.userId ? { userId: data.userId } : { homeownerId: data.homeownerId }),
      },
    });

    if (existingActive) {
      throw new AppError(409, 'CONFLICT', 'This person is already an active board member. Please end their current term first.');
    }

    const boardMember = await prisma.boardMember.create({
      data: {
        associationId: data.associationId,
        userId: data.userId ?? undefined,
        homeownerId: data.homeownerId ?? undefined,
        role: data.role,
        startDate: data.startDate,
        endDate: data.endDate ?? undefined,
        isActive: !data.endDate || data.endDate > new Date(),
        notes: data.notes ?? undefined,
      },
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        homeowner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      data: boardMember,
      message: 'Board member added successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Get board member details
boardMemberRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const boardMember = await prisma.boardMember.findFirst({
      where: {
        id: req.params.id,
        association: {
          organizationId: req.auth.organizationId,
        },
      },
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        homeowner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!boardMember) {
      throw new AppError(404, 'NOT_FOUND', 'Board member not found.');
    }

    res.json({ data: boardMember });
  } catch (err) {
    next(err);
  }
});

// Update board member
boardMemberRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify board member exists and belongs to organization
    const existing = await prisma.boardMember.findFirst({
      where: {
        id: req.params.id,
        association: {
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Board member not found.');
    }

    const data = parseBody(updateBoardMemberSchema, req.body);

    // Cannot change userId or homeownerId
    if (data.userId !== undefined || data.homeownerId !== undefined) {
      throw new AppError(400, 'BAD_REQUEST', 'Cannot change userId or homeownerId. Create a new board member record instead.');
    }

    // Calculate isActive based on endDate
    let isActive = existing.isActive;
    if (data.endDate !== undefined) {
      isActive = !data.endDate || data.endDate > new Date();
    }

    const boardMember = await prisma.boardMember.update({
      where: { id: req.params.id },
      data: {
        ...(data.role !== undefined && { role: data.role }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.notes !== undefined && { notes: data.notes }),
        isActive,
      },
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        homeowner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      data: boardMember,
      message: 'Board member updated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Delete board member (hard delete - removes from board)
boardMemberRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify board member exists and belongs to organization
    const existing = await prisma.boardMember.findFirst({
      where: {
        id: req.params.id,
        association: {
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Board member not found.');
    }

    await prisma.boardMember.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: 'Board member removed successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Get board member tenure history
boardMemberRouter.get('/:id/tenure', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const boardMember = await prisma.boardMember.findFirst({
      where: {
        id: req.params.id,
        association: {
          organizationId: req.auth.organizationId,
        },
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

    if (!boardMember) {
      throw new AppError(404, 'NOT_FOUND', 'Board member not found.');
    }

    // Get all board member records for this person in this association
    const where: any = {
      associationId: boardMember.associationId,
    };

    if (boardMember.userId) {
      where.userId = boardMember.userId;
    } else if (boardMember.homeownerId) {
      where.homeownerId = boardMember.homeownerId;
    }

    const tenureHistory = await prisma.boardMember.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate total tenure
    let totalDays = 0;
    for (const record of tenureHistory) {
      const end = record.endDate || new Date();
      const days = Math.floor((end.getTime() - record.startDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDays += days;
    }

    res.json({
      data: {
        currentRecord: boardMember,
        tenureHistory,
        totalTenureDays: totalDays,
        totalTenureYears: Math.floor(totalDays / 365),
        totalTenureMonths: Math.floor(totalDays / 30),
      },
    });
  } catch (err) {
    next(err);
  }
});

