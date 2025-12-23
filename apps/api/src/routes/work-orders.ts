import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';

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
  assignedVendorId: z.string().uuid().optional().nullable(),
  estimatedCost: z.coerce.number().optional().nullable(),
  actualCost: z.coerce.number().optional().nullable(),
  openedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional().nullable(),
});

workOrderRouter.get('/', async (req, res, next) => {
  try {
    const { status, propertyId, priority } = req.query;
    const workOrders = await prisma.workOrder.findMany({
      where: {
        organizationId: req.auth?.organizationId,
        ...(status ? { status: String(status) as any } : {}),
        ...(propertyId ? { propertyId: String(propertyId) } : {}),
        ...(priority ? { priority: String(priority) as any } : {}),
      },
      include: { property: true, unit: true, assignedVendor: true },
      orderBy: { openedAt: 'desc' },
    });

    res.json({ data: workOrders });
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
        assignedVendorId: data.assignedVendorId ?? undefined,
        estimatedCost: data.estimatedCost ?? undefined,
        actualCost: data.actualCost ?? undefined,
        openedAt: data.openedAt ?? new Date(),
        completedAt: data.completedAt ?? undefined,
      },
      include: { property: true, unit: true, assignedVendor: true },
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

    const updated = await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: {
        title: data.title ?? undefined,
        description: data.description ?? undefined,
        category: data.category ?? undefined,
        priority: data.priority ?? undefined,
        status: data.status ?? undefined,
        assignedVendorId: data.assignedVendorId ?? undefined,
        estimatedCost: data.estimatedCost ?? undefined,
        actualCost: data.actualCost ?? undefined,
        completedAt: data.completedAt ?? undefined,
      },
      include: { property: true, unit: true, assignedVendor: true },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
