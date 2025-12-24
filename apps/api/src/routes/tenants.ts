import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { requireLimit } from '../middleware/subscription.js';

export const tenantRouter = Router();

const tenantSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  propertyId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  status: z.enum(['PROSPECT', 'SCREENING', 'APPROVED', 'ACTIVE', 'INACTIVE', 'DECLINED', 'WITHDRAWN']).optional(),
});

tenantRouter.get('/', async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const take = limit ? Math.min(Number(limit), 100) : 100; // Max 100 per page
    const skip = offset ? Number(offset) : 0;
    
    const statusFilter = status 
      ? (Array.isArray(status) ? status : [status]).map(s => String(s))
      : undefined;
    
    const where: any = { 
      organizationId: req.auth?.organizationId, 
      archivedAt: null,
    };
    
    if (statusFilter && statusFilter.length > 0) {
      where.status = { in: statusFilter };
    }
    
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          leases: { 
            include: { lease: true },
            take: 1, // Only get most recent lease
          },
          property: true,
          unit: true,
          screeningRequests: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      data: tenants,
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

tenantRouter.post('/', requireLimit('tenants'), async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(tenantSchema, req.body);
    
    // Verify property/unit belongs to organization if provided
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

    if (data.unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: data.unitId,
          property: { organizationId: req.auth.organizationId },
        },
      });
      if (!unit) {
        throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
      }
    }

    const tenant = await prisma.tenant.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        notes: data.notes ?? undefined,
        propertyId: data.propertyId ?? undefined,
        unitId: data.unitId ?? undefined,
        status: data.status || 'PROSPECT',
        organizationId: req.auth.organizationId,
      },
      include: {
        property: true,
        unit: true,
      },
    });

    res.status(201).json({ data: tenant });
  } catch (err) {
    next(err);
  }
});

tenantRouter.get('/:id', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId, archivedAt: null },
      include: {
        leases: {
          include: {
            lease: { include: { unit: { include: { property: true } } } },
          },
        },
        property: true,
        unit: true,
        screeningRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found.');
    }

    res.json({ data: tenant });
  } catch (err) {
    next(err);
  }
});

tenantRouter.put('/:id', async (req, res, next) => {
  try {
    const data = parseBody(tenantSchema.partial(), req.body);
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found.');
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        notes: data.notes ?? undefined,
        propertyId: data.propertyId ?? undefined,
        unitId: data.unitId ?? undefined,
        status: data.status ?? undefined,
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

tenantRouter.delete('/:id', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found.');
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { archivedAt: new Date() },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
