import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';

export const chargeRouter = Router();

const chargeSchema = z.object({
  propertyId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  leaseId: z.string().uuid().optional().nullable(),
  type: z.enum(['RENT', 'LATE_FEE', 'UTILITY', 'OTHER']),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
  status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']).optional(),
});

chargeRouter.get('/', async (req, res, next) => {
  try {
    const charges = await prisma.charge.findMany({
      where: { organizationId: req.auth?.organizationId },
      include: { lease: true, unit: true, property: true, payments: true },
      orderBy: { dueDate: 'desc' },
    });

    res.json({ data: charges });
  } catch (err) {
    next(err);
  }
});

chargeRouter.post('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(chargeSchema, req.body);
    const charge = await prisma.charge.create({
      data: {
        organizationId: req.auth.organizationId,
        propertyId: data.propertyId ?? undefined,
        unitId: data.unitId ?? undefined,
        leaseId: data.leaseId ?? undefined,
        type: data.type,
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate,
        status: data.status ?? 'PENDING',
      },
    });

    res.status(201).json({ data: charge });
  } catch (err) {
    next(err);
  }
});

chargeRouter.get('/:id', async (req, res, next) => {
  try {
    const charge = await prisma.charge.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
      include: { payments: true, lease: true, unit: true, property: true },
    });

    if (!charge) {
      throw new AppError(404, 'NOT_FOUND', 'Charge not found.');
    }

    res.json({ data: charge });
  } catch (err) {
    next(err);
  }
});

chargeRouter.put('/:id', async (req, res, next) => {
  try {
    const data = parseBody(chargeSchema.partial(), req.body);
    const charge = await prisma.charge.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!charge) {
      throw new AppError(404, 'NOT_FOUND', 'Charge not found.');
    }

    const updated = await prisma.charge.update({
      where: { id: charge.id },
      data: {
        propertyId: data.propertyId ?? undefined,
        unitId: data.unitId ?? undefined,
        leaseId: data.leaseId ?? undefined,
        type: data.type ?? undefined,
        description: data.description ?? undefined,
        amount: data.amount ?? undefined,
        dueDate: data.dueDate ?? undefined,
        status: data.status ?? undefined,
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
