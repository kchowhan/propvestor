import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery } from '../validators/common.js';
import { requireAuth } from '../middleware/auth.js';

export const associationRouter = Router();

const createAssociationSchema = z.object({
  name: z.string().min(1).max(200),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable(),
  fiscalYearStart: z.number().int().min(1).max(12).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateAssociationSchema = createAssociationSchema.partial();

const querySchema = z.object({
  isActive: z.preprocess(
    (val) => (val === undefined ? undefined : val === 'true' || val === true),
    z.boolean().optional()
  ),
});

// List all associations for the organization
associationRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const query = parseQuery(querySchema, req.query);
    const where: any = {
      organizationId: req.auth.organizationId,
    };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const associations = await prisma.association.findMany({
      where,
      include: {
        _count: {
          select: {
            homeowners: true,
            boardMembers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: associations.map((a) => ({
        id: a.id,
        name: a.name,
        addressLine1: a.addressLine1,
        addressLine2: a.addressLine2,
        city: a.city,
        state: a.state,
        postalCode: a.postalCode,
        country: a.country,
        phone: a.phone,
        email: a.email,
        website: a.website,
        fiscalYearStart: a.fiscalYearStart,
        notes: a.notes,
        isActive: a.isActive,
        homeownerCount: a._count.homeowners,
        boardMemberCount: a._count.boardMembers,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Create a new association
associationRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(createAssociationSchema, req.body);

    const association = await prisma.association.create({
      data: {
        organizationId: req.auth.organizationId,
        name: data.name,
        addressLine1: data.addressLine1 ?? undefined,
        addressLine2: data.addressLine2 ?? undefined,
        city: data.city ?? undefined,
        state: data.state ?? undefined,
        postalCode: data.postalCode ?? undefined,
        country: data.country ?? undefined,
        phone: data.phone ?? undefined,
        email: data.email ?? undefined,
        website: data.website ?? undefined,
        fiscalYearStart: data.fiscalYearStart ?? undefined,
        notes: data.notes ?? undefined,
      },
    });

    res.status(201).json({
      data: association,
      message: 'Association created successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Get association details
associationRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const association = await prisma.association.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
      include: {
        _count: {
          select: {
            homeowners: true,
            boardMembers: true,
          },
        },
      },
    });

    if (!association) {
      throw new AppError(404, 'NOT_FOUND', 'Association not found.');
    }

    res.json({
      data: {
        ...association,
        homeownerCount: association._count.homeowners,
        boardMemberCount: association._count.boardMembers,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update association
associationRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify association exists and belongs to organization
    const existing = await prisma.association.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Association not found.');
    }

    const data = parseBody(updateAssociationSchema, req.body);

    const association = await prisma.association.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.addressLine1 !== undefined && { addressLine1: data.addressLine1 }),
        ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.fiscalYearStart !== undefined && { fiscalYearStart: data.fiscalYearStart }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    res.json({
      data: association,
      message: 'Association updated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Delete association (soft delete by setting isActive to false)
associationRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify association exists and belongs to organization
    const existing = await prisma.association.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Association not found.');
    }

    // Soft delete by setting isActive to false
    const association = await prisma.association.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      data: association,
      message: 'Association deactivated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

