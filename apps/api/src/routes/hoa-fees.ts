import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery } from '../validators/common.js';
import { requireAuth } from '../middleware/auth.js';

export const hoaFeeRouter = Router();

const createHOAFeeSchema = z.object({
  associationId: z.string().uuid(),
  homeownerId: z.string().uuid(),
  type: z.enum(['MONTHLY_DUES', 'SPECIAL_ASSESSMENT', 'LATE_FEE', 'VIOLATION_FEE', 'TRANSFER_FEE', 'OTHER']),
  description: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.enum(['monthly', 'quarterly', 'annually']).optional(),
  notes: z.string().optional(),
});

const updateHOAFeeSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  lateFeeAmount: z.number().nonnegative().optional(),
  lateFeeApplied: z.boolean().optional(),
  notes: z.string().optional(),
});

const querySchema = z.object({
  associationId: z.string().uuid().optional(),
  homeownerId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  type: z.enum(['MONTHLY_DUES', 'SPECIAL_ASSESSMENT', 'LATE_FEE', 'VIOLATION_FEE', 'TRANSFER_FEE', 'OTHER']).optional(),
  isRecurring: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : undefined), z.boolean().optional()),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// List HOA fees
hoaFeeRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const query = parseQuery(querySchema, req.query);
    const where: any = {
      association: {
        organizationId: req.auth.organizationId,
      },
    };

    if (query.associationId) {
      // Verify association belongs to organization
      const association = await prisma.association.findFirst({
        where: {
          id: query.associationId,
          organizationId: req.auth.organizationId,
        },
      });
      if (!association) {
        throw new AppError(404, 'NOT_FOUND', 'Association not found.');
      }
      where.associationId = query.associationId;
    }

    if (query.homeownerId) {
      where.homeownerId = query.homeownerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.isRecurring !== undefined) {
      where.isRecurring = query.isRecurring;
    }

    const take = query.limit ?? 100;
    const skip = query.offset ?? 0;

    const [fees, total] = await Promise.all([
      prisma.hOAFee.findMany({
        where,
        include: {
          association: {
            select: {
              id: true,
              name: true,
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
          payments: {
            select: {
              id: true,
              amount: true,
              receivedDate: true,
              method: true,
            },
            orderBy: { receivedDate: 'desc' },
          },
        },
        orderBy: { dueDate: 'desc' },
        take,
        skip,
      }),
      prisma.hOAFee.count({ where }),
    ]);

    // Calculate paid amount for each fee
    const feesWithPaidAmount = fees.map((fee) => {
      const paidAmount = fee.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        ...fee,
        paidAmount,
        remainingAmount: Number(fee.amount) - paidAmount,
      };
    });

    res.json({
      data: feesWithPaidAmount,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + take < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Create HOA fee
hoaFeeRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(createHOAFeeSchema, req.body);

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

    // Verify homeowner belongs to association
    const homeowner = await prisma.homeowner.findFirst({
      where: {
        id: data.homeownerId,
        associationId: data.associationId,
      },
    });
    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found in this association.');
    }

    // Calculate next due date for recurring fees
    let nextDueDate: Date | null = null;
    if (data.isRecurring && data.recurringInterval) {
      const dueDate = new Date(data.dueDate);
      const interval = data.recurringInterval;
      if (interval === 'monthly') {
        nextDueDate = new Date(dueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      } else if (interval === 'quarterly') {
        nextDueDate = new Date(dueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 3);
      } else if (interval === 'annually') {
        nextDueDate = new Date(dueDate);
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
      }
    }

    const fee = await prisma.hOAFee.create({
      data: {
        associationId: data.associationId,
        homeownerId: data.homeownerId,
        type: data.type,
        description: data.description,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        isRecurring: data.isRecurring ?? false,
        recurringInterval: data.recurringInterval ?? null,
        nextDueDate,
        notes: data.notes ?? null,
      },
      include: {
        association: {
          select: {
            id: true,
            name: true,
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

    // Update homeowner account balance
    await prisma.homeowner.update({
      where: { id: data.homeownerId },
      data: {
        accountBalance: {
          increment: data.amount,
        },
      },
    });

    res.status(201).json({
      data: fee,
      message: 'HOA fee created successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Get HOA fee details
hoaFeeRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const fee = await prisma.hOAFee.findFirst({
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
        homeowner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accountBalance: true,
          },
        },
        payments: {
          include: {
            paymentMethod: {
              select: {
                id: true,
                type: true,
                last4: true,
                cardBrand: true,
              },
            },
          },
          orderBy: { receivedDate: 'desc' },
        },
      },
    });

    if (!fee) {
      throw new AppError(404, 'NOT_FOUND', 'HOA fee not found.');
    }

    const paidAmount = fee.payments.reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      data: {
        ...fee,
        paidAmount,
        remainingAmount: Number(fee.amount) - paidAmount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update HOA fee
hoaFeeRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify fee exists and belongs to organization
    const existing = await prisma.hOAFee.findFirst({
      where: {
        id: req.params.id,
        association: {
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'HOA fee not found.');
    }

    const data = parseBody(updateHOAFeeSchema, req.body);

    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) {
      // Update homeowner balance if amount changed
      const difference = data.amount - Number(existing.amount);
      await prisma.homeowner.update({
        where: { id: existing.homeownerId },
        data: {
          accountBalance: {
            increment: difference,
          },
        },
      });
      updateData.amount = data.amount;
    }
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.lateFeeAmount !== undefined) updateData.lateFeeAmount = data.lateFeeAmount;
    if (data.lateFeeApplied !== undefined) {
      updateData.lateFeeApplied = data.lateFeeApplied;
      if (data.lateFeeApplied && !existing.lateFeeApplied) {
        updateData.lateFeeAppliedAt = new Date();
      }
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    const fee = await prisma.hOAFee.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        association: {
          select: {
            id: true,
            name: true,
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
      data: fee,
      message: 'HOA fee updated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Delete HOA fee (soft delete by cancelling)
hoaFeeRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify fee exists and belongs to organization
    const existing = await prisma.hOAFee.findFirst({
      where: {
        id: req.params.id,
        association: {
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'HOA fee not found.');
    }

    // Check if fee has payments
    const paymentCount = await prisma.homeownerPayment.count({
      where: { hoaFeeId: req.params.id },
    });

    if (paymentCount > 0) {
      // If fee has payments, cancel it instead of deleting
      await prisma.hOAFee.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
      });
    } else {
      // If no payments, update homeowner balance and delete
      await prisma.homeowner.update({
        where: { id: existing.homeownerId },
        data: {
          accountBalance: {
            decrement: existing.amount,
          },
        },
      });
      await prisma.hOAFee.delete({
        where: { id: req.params.id },
      });
    }

    res.json({
      message: 'HOA fee deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

