import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { requireLimit } from '../middleware/subscription.js';

export const propertyRouter = Router();

const propertySchema = z.object({
  name: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  type: z.enum(['SINGLE_FAMILY', 'MULTI_FAMILY', 'CONDO', 'COMMERCIAL', 'OTHER']),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  purchasePrice: z.coerce.number().optional().nullable(),
  acquisitionDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

propertyRouter.get('/', async (req, res, next) => {
  try {
    const { city, status, limit, offset } = req.query;
    const take = limit ? Math.min(Number(limit), 100) : 100; // Max 100 per page
    const skip = offset ? Number(offset) : 0;
    
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where: {
          organizationId: req.auth?.organizationId,
          archivedAt: null,
          ...(city ? { city: String(city) } : {}),
          ...(status ? { status: String(status) as 'ACTIVE' | 'ARCHIVED' } : {}),
        },
        include: {
          units: { where: { archivedAt: null } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.property.count({
        where: {
          organizationId: req.auth?.organizationId,
          archivedAt: null,
          ...(city ? { city: String(city) } : {}),
          ...(status ? { status: String(status) as 'ACTIVE' | 'ARCHIVED' } : {}),
        },
      }),
    ]);
    
    res.json({ 
      data: properties,
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

propertyRouter.post('/', requireLimit('properties'), async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(propertySchema, req.body);
    const property = await prisma.property.create({
      data: {
        ...data,
        purchasePrice: data.purchasePrice ?? undefined,
        acquisitionDate: data.acquisitionDate ?? undefined,
        notes: data.notes ?? undefined,
        organizationId: req.auth.organizationId,
      },
    });

    res.status(201).json({ data: property });
  } catch (err) {
    next(err);
  }
});

propertyRouter.get('/:id', async (req, res, next) => {
  try {
    const property = await prisma.property.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth?.organizationId,
        archivedAt: null,
      },
      include: {
        units: { where: { archivedAt: null } },
      },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Property not found.');
    }

    res.json({ data: property });
  } catch (err) {
    next(err);
  }
});

propertyRouter.put('/:id', async (req, res, next) => {
  try {
    const data = parseBody(propertySchema.partial(), req.body);
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Property not found.');
    }

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: {
        ...data,
        purchasePrice: data.purchasePrice ?? undefined,
        acquisitionDate: data.acquisitionDate ?? undefined,
        notes: data.notes ?? undefined,
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

propertyRouter.delete('/:id', async (req, res, next) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Property not found.');
    }

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
