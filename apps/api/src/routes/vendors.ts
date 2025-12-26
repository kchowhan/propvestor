import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery, paginationQuerySchema } from '../validators/common.js';

export const vendorRouter = Router();

const vendorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(5),
  website: z.string().url().optional().nullable().or(z.literal('')),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'LANDSCAPING', 'PAINTING', 'CARPENTRY', 'ROOFING', 'FLOORING', 'GENERAL', 'OTHER']),
  notes: z.string().optional().nullable(),
});

const querySchema = paginationQuerySchema;

vendorRouter.get('/', async (req, res, next) => {
  try {
    const query = parseQuery(querySchema, req.query);
    const where = { organizationId: req.auth?.organizationId };
    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.vendor.count({ where }),
    ]);

    res.json({
      data: vendors,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

vendorRouter.post('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(vendorSchema, req.body);
    const vendor = await prisma.vendor.create({
      data: {
        organizationId: req.auth.organizationId,
        name: data.name,
        email: data.email ?? undefined,
        phone: data.phone,
        website: data.website && data.website.trim() !== '' ? data.website : undefined,
        category: data.category,
        notes: data.notes ?? undefined,
      },
    });

    res.status(201).json({ data: vendor });
  } catch (err) {
    next(err);
  }
});

vendorRouter.get('/:id', async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!vendor) {
      throw new AppError(404, 'NOT_FOUND', 'Vendor not found.');
    }

    res.json({ data: vendor });
  } catch (err) {
    next(err);
  }
});

vendorRouter.put('/:id', async (req, res, next) => {
  try {
    const data = parseBody(vendorSchema.partial(), req.body);
    const vendor = await prisma.vendor.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!vendor) {
      throw new AppError(404, 'NOT_FOUND', 'Vendor not found.');
    }

    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        name: data.name ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        website: data.website !== undefined ? (data.website && data.website.trim() !== '' ? data.website : null) : undefined,
        category: data.category ?? undefined,
        notes: data.notes ?? undefined,
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

vendorRouter.delete('/:id', async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!vendor) {
      throw new AppError(404, 'NOT_FOUND', 'Vendor not found.');
    }

    await prisma.vendor.delete({ where: { id: vendor.id } });
    res.json({ data: { id: vendor.id } });
  } catch (err) {
    next(err);
  }
});
