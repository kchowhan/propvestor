import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';

export const unitRouter = Router();

const unitSchema = z.object({
  name: z.string().min(1),
  bedrooms: z.coerce.number().int().optional().nullable(),
  bathrooms: z.coerce.number().optional().nullable(),
  squareFeet: z.coerce.number().int().optional().nullable(),
  marketRent: z.coerce.number().optional().nullable(),
  status: z.enum(['VACANT', 'OCCUPIED', 'UNDER_RENOVATION']).optional(),
});

unitRouter.get('/properties/:propertyId/units', async (req, res, next) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.params.propertyId, organizationId: req.auth?.organizationId },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Property not found.');
    }

    const units = await prisma.unit.findMany({
      where: { propertyId: property.id, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: units });
  } catch (err) {
    next(err);
  }
});

unitRouter.post('/properties/:propertyId/units', async (req, res, next) => {
  try {
    const data = parseBody(unitSchema, req.body);
    const property = await prisma.property.findFirst({
      where: { id: req.params.propertyId, organizationId: req.auth?.organizationId },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Property not found.');
    }

    const unit = await prisma.unit.create({
      data: {
        ...data,
        bedrooms: data.bedrooms ?? undefined,
        bathrooms: data.bathrooms ?? undefined,
        squareFeet: data.squareFeet ?? undefined,
        marketRent: data.marketRent ?? undefined,
        propertyId: property.id,
      },
    });

    res.status(201).json({ data: unit });
  } catch (err) {
    next(err);
  }
});

unitRouter.get('/units/:id', async (req, res, next) => {
  try {
    const unit = await prisma.unit.findFirst({
      where: {
        id: req.params.id,
        archivedAt: null,
        property: { organizationId: req.auth?.organizationId },
      },
      include: {
        property: true,
      },
    });

    if (!unit) {
      throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
    }

    res.json({ data: unit });
  } catch (err) {
    next(err);
  }
});

unitRouter.put('/units/:id', async (req, res, next) => {
  try {
    const data = parseBody(unitSchema.partial(), req.body);
    const unit = await prisma.unit.findFirst({
      where: { id: req.params.id, property: { organizationId: req.auth?.organizationId } },
    });

    if (!unit) {
      throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
    }

    const updated = await prisma.unit.update({
      where: { id: unit.id },
      data: {
        ...data,
        bedrooms: data.bedrooms ?? undefined,
        bathrooms: data.bathrooms ?? undefined,
        squareFeet: data.squareFeet ?? undefined,
        marketRent: data.marketRent ?? undefined,
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

unitRouter.delete('/units/:id', async (req, res, next) => {
  try {
    const unit = await prisma.unit.findFirst({
      where: { id: req.params.id, property: { organizationId: req.auth?.organizationId } },
    });

    if (!unit) {
      throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
    }

    const updated = await prisma.unit.update({
      where: { id: unit.id },
      data: { archivedAt: new Date() },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
