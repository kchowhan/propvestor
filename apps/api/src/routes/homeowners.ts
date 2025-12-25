import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery } from '../validators/common.js';
import { requireAuth } from '../middleware/auth.js';

export const homeownerRouter = Router();

const createHomeownerSchema = z.object({
  associationId: z.string().uuid(),
  unitId: z.string().uuid().optional().nullable(),
  propertyId: z.string().uuid().optional().nullable(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELINQUENT', 'SUSPENDED']).optional(),
  notes: z.string().optional().nullable(),
});

const updateHomeownerSchema = createHomeownerSchema.partial().extend({
  associationId: z.string().uuid().optional(), // Can't change association
});

const querySchema = z.object({
  associationId: z.string().uuid().optional(),
  status: z.string().optional(),
  unitId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  limit: z.string().optional().transform((val) => (val ? Math.min(Number(val), 100) : 100)),
  offset: z.string().optional().transform((val) => (val ? Number(val) : 0)),
});

// List homeowners
homeownerRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const query = parseQuery(querySchema, req.query);
    const where: any = {
      association: {
        organizationId: req.auth.organizationId,
      },
      archivedAt: null,
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

    if (query.status) {
      where.status = query.status;
    }

    if (query.unitId) {
      where.unitId = query.unitId;
    }

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    const [homeowners, total] = await Promise.all([
      prisma.homeowner.findMany({
        where,
        include: {
          association: {
            select: {
              id: true,
              name: true,
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
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.homeowner.count({ where }),
    ]);

    res.json({
      data: homeowners,
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

// Create homeowner
homeownerRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(createHomeownerSchema, req.body);

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

    // Verify unit belongs to organization if provided
    if (data.unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: data.unitId,
          property: {
            organizationId: req.auth.organizationId,
          },
        },
      });
      if (!unit) {
        throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
      }
    }

    // Verify property belongs to organization if provided
    if (data.propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: data.propertyId,
          organizationId: req.auth.organizationId,
        },
      });
      if (!property) {
        throw new AppError(404, 'NOT_FOUND', 'Property not found.');
      }
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

    const homeowner = await prisma.homeowner.create({
      data: {
        associationId: data.associationId,
        unitId: data.unitId ?? undefined,
        propertyId: data.propertyId ?? undefined,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone ?? undefined,
        status: data.status ?? 'ACTIVE',
        notes: data.notes ?? undefined,
      },
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: true,
        property: true,
      },
    });

    res.status(201).json({
      data: homeowner,
      message: 'Homeowner created successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Get homeowner details
homeownerRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const homeowner = await prisma.homeowner.findFirst({
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
        unit: {
          include: {
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
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    res.json({ data: homeowner });
  } catch (err) {
    next(err);
  }
});

// Update homeowner
homeownerRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify homeowner exists and belongs to organization
    const existing = await prisma.homeowner.findFirst({
      where: {
        id: req.params.id,
        association: {
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    const data = parseBody(updateHomeownerSchema, req.body);

    // If email is being updated, check for duplicates
    if (data.email && data.email !== existing.email) {
      const duplicate = await prisma.homeowner.findUnique({
        where: {
          associationId_email: {
            associationId: existing.associationId,
            email: data.email,
          },
        },
      });

      if (duplicate) {
        throw new AppError(409, 'CONFLICT', 'A homeowner with this email already exists in this association.');
      }
    }

    // Verify unit belongs to organization if being updated
    if (data.unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: data.unitId,
          property: {
            organizationId: req.auth.organizationId,
          },
        },
      });
      if (!unit) {
        throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
      }
    }

    // Verify property belongs to organization if being updated
    if (data.propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: data.propertyId,
          organizationId: req.auth.organizationId,
        },
      });
      if (!property) {
        throw new AppError(404, 'NOT_FOUND', 'Property not found.');
      }
    }

    const homeowner = await prisma.homeowner.update({
      where: { id: req.params.id },
      data: {
        ...(data.unitId !== undefined && { unitId: data.unitId }),
        ...(data.propertyId !== undefined && { propertyId: data.propertyId }),
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: true,
        property: true,
      },
    });

    res.json({
      data: homeowner,
      message: 'Homeowner updated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Delete homeowner (soft delete)
homeownerRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify homeowner exists and belongs to organization
    const existing = await prisma.homeowner.findFirst({
      where: {
        id: req.params.id,
        association: {
          organizationId: req.auth.organizationId,
        },
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    // Soft delete by setting archivedAt
    const homeowner = await prisma.homeowner.update({
      where: { id: req.params.id },
      data: { archivedAt: new Date() },
    });

    res.json({
      data: homeowner,
      message: 'Homeowner archived successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Get homeowner account balance
homeownerRouter.get('/:id/balance', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const homeowner = await prisma.homeowner.findFirst({
      where: {
        id: req.params.id,
        association: {
          organizationId: req.auth.organizationId,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        accountBalance: true,
      },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    res.json({
      data: {
        homeownerId: homeowner.id,
        name: `${homeowner.firstName} ${homeowner.lastName}`,
        email: homeowner.email,
        accountBalance: homeowner.accountBalance,
      },
    });
  } catch (err) {
    next(err);
  }
});

