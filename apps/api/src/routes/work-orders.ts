import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery, paginationQuerySchema } from '../validators/common.js';

export const workOrderRouter = Router();

const workOrderSchema = z.object({
  propertyId: z.string().uuid(),
  unitId: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'LANDSCAPING', 'PAINTING', 'CARPENTRY', 'ROOFING', 'FLOORING', 'GENERAL', 'OTHER']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'EMERGENCY']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  requestedByTenantId: z.string().uuid().optional().nullable(),
  requestedByHomeownerId: z.string().uuid().optional().nullable(),
  assignedVendorId: z.string().uuid().optional().nullable(),
  estimatedCost: z.coerce.number().optional().nullable(),
  actualCost: z.coerce.number().optional().nullable(),
  openedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional().nullable(),
});

const querySchema = paginationQuerySchema.extend({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  propertyId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'EMERGENCY']).optional(),
});

workOrderRouter.get('/', async (req, res, next) => {
  try {
    const query = parseQuery(querySchema, req.query);
    const where = {
      organizationId: req.auth?.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    const [workOrders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: { property: true, unit: true, assignedVendor: true, requestedByHomeowner: true },
        orderBy: { openedAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.workOrder.count({ where }),
    ]);

    res.json({
      data: workOrders,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: (query.offset ?? 0) + (query.limit ?? 50) < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

workOrderRouter.post('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(workOrderSchema, req.body);
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, organizationId: req.auth.organizationId },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Property not found.');
    }

    const workOrder = await prisma.workOrder.create({
      data: {
        organizationId: req.auth.organizationId,
        propertyId: data.propertyId,
        unitId: data.unitId ?? undefined,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority ?? 'NORMAL',
        status: data.status ?? 'OPEN',
        requestedByTenantId: data.requestedByTenantId ?? undefined,
        requestedByHomeownerId: data.requestedByHomeownerId ?? undefined,
        assignedVendorId: data.assignedVendorId ?? undefined,
        estimatedCost: data.estimatedCost ?? undefined,
        actualCost: data.actualCost ?? undefined,
        openedAt: data.openedAt ?? new Date(),
        completedAt: data.completedAt ?? undefined,
      },
      include: { property: true, unit: true, assignedVendor: true, requestedByHomeowner: true },
    });

    res.status(201).json({ data: workOrder });
  } catch (err) {
    next(err);
  }
});

workOrderRouter.get('/:id', async (req, res, next) => {
  try {
    const workOrder = await prisma.workOrder.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
      include: { property: true, unit: true, assignedVendor: true },
    });

    if (!workOrder) {
      throw new AppError(404, 'NOT_FOUND', 'Work order not found.');
    }

    res.json({ data: workOrder });
  } catch (err) {
    next(err);
  }
});

workOrderRouter.put('/:id', async (req, res, next) => {
  try {
    const data = parseBody(workOrderSchema.partial(), req.body);
    const workOrder = await prisma.workOrder.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!workOrder) {
      throw new AppError(404, 'NOT_FOUND', 'Work order not found.');
    }

    const oldStatus = workOrder.status;
    const newStatus = data.status ?? workOrder.status;

    const updated = await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: {
        title: data.title ?? undefined,
        description: data.description ?? undefined,
        category: data.category ?? undefined,
        priority: data.priority ?? undefined,
        status: newStatus,
        assignedVendorId: data.assignedVendorId ?? undefined,
        estimatedCost: data.estimatedCost ?? undefined,
        actualCost: data.actualCost ?? undefined,
        completedAt: data.completedAt ?? undefined,
      },
      include: { 
        property: true, 
        unit: true, 
        assignedVendor: true, 
        requestedByHomeowner: {
          include: {
            association: {
              include: {
                organization: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    // Send email notification to homeowner if status changed and request was from homeowner
    if (oldStatus !== newStatus && updated.requestedByHomeowner) {
      try {
        const { sendMaintenanceRequestStatusUpdate } = await import('../lib/email.js');
        const homeowner = updated.requestedByHomeowner;
        await sendMaintenanceRequestStatusUpdate(
          homeowner.email,
          `${homeowner.firstName} ${homeowner.lastName}`,
          updated.title,
          oldStatus,
          newStatus,
          updated.property.name,
          updated.unit?.name || null,
          undefined, // notes
          homeowner.association.organization.name
        );
      } catch (emailError) {
        console.error('Failed to send maintenance request status update:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
