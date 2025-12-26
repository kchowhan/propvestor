import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery, paginationQuerySchema } from '../validators/common.js';
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

const querySchema = paginationQuerySchema.extend({
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

    const [associations, total] = await Promise.all([
      prisma.association.findMany({
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
        take: query.limit,
        skip: query.offset,
      }),
      prisma.association.count({ where }),
    ]);

    // Get property counts for each association
    const associationsWithPropertyCounts = await Promise.all(
      associations.map(async (a) => {
        // Get unique property IDs from homeowners
        const homeowners = await prisma.homeowner.findMany({
          where: {
            associationId: a.id,
            archivedAt: null,
          },
          select: {
            unitId: true,
            propertyId: true,
            unit: {
              select: {
                propertyId: true,
              },
            },
          },
        });

        const propertyIds = new Set<string>();
        homeowners.forEach((ho) => {
          if (ho.unit?.propertyId) {
            propertyIds.add(ho.unit.propertyId);
          } else if (ho.propertyId) {
            propertyIds.add(ho.propertyId);
          }
        });

        return {
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
          propertyCount: propertyIds.size,
          boardMemberCount: a._count.boardMembers,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        };
      })
    );

    res.json({
      data: associationsWithPropertyCounts,
      pagination: {
        total,
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
        hasMore: (query.offset ?? 0) + (query.limit ?? 50) < total,
      },
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

    // Get all unique properties and units linked to homeowners in this association
    const homeowners = await prisma.homeowner.findMany({
      where: {
        associationId: association.id,
        archivedAt: null,
      },
      select: {
        unitId: true,
        propertyId: true,
        unit: {
          select: {
            id: true,
            name: true,
            bedrooms: true,
            bathrooms: true,
            squareFeet: true,
            status: true,
            property: {
              select: {
                id: true,
                name: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                postalCode: true,
                type: true,
              },
            },
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            type: true,
            units: {
              select: {
                id: true,
                name: true,
                bedrooms: true,
                bathrooms: true,
                squareFeet: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Collect unique properties and units
    const propertyMap = new Map();
    const unitMap = new Map();

    homeowners.forEach((ho) => {
      // If homeowner has a unit, add the unit and its property
      if (ho.unit && ho.unit.property) {
        const prop = ho.unit.property;
        if (!propertyMap.has(prop.id)) {
          propertyMap.set(prop.id, {
            ...prop,
            units: [],
          });
        }
        if (!unitMap.has(ho.unit.id)) {
          unitMap.set(ho.unit.id, {
            ...ho.unit,
            property: {
              id: prop.id,
              name: prop.name,
            },
          });
          propertyMap.get(prop.id).units.push({
            id: ho.unit.id,
            name: ho.unit.name,
            bedrooms: ho.unit.bedrooms,
            bathrooms: ho.unit.bathrooms,
            squareFeet: ho.unit.squareFeet,
            status: ho.unit.status,
          });
        }
      }
      // If homeowner has a property (but no unit), add the property
      if (ho.property && !ho.unitId) {
        if (!propertyMap.has(ho.property.id)) {
          propertyMap.set(ho.property.id, {
            ...ho.property,
            units: ho.property.units || [],
          });
        }
      }
    });

    const properties = Array.from(propertyMap.values());
    const units = Array.from(unitMap.values());

    res.json({
      data: {
        ...association,
        homeownerCount: association._count.homeowners,
        boardMemberCount: association._count.boardMembers,
        propertyCount: properties.length,
        unitCount: units.length,
        properties,
        units,
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
