import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { parseQuery, paginationQuerySchema } from '../validators/common.js';

export const reportRouter = Router();

const monthYearSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

const rentRollQuerySchema = monthYearSchema.merge(paginationQuerySchema);

reportRouter.get('/rent-roll', async (req, res, next) => {
  try {
    const data = parseQuery(rentRollQuerySchema, req.query);
    const start = new Date(data.year, data.month - 1, 1);
    const end = new Date(data.year, data.month, 1);

    const where = {
      organizationId: req.auth?.organizationId,
      type: 'RENT',
      dueDate: { gte: start, lt: end },
    };

    const [charges, total] = await Promise.all([
      prisma.charge.findMany({
        where,
        include: {
          lease: {
            include: {
              unit: { include: { property: true } },
              tenants: { include: { tenant: true } },
            },
          },
          payments: true,
        },
        orderBy: { dueDate: 'asc' },
        take: data.limit,
        skip: data.offset,
      }),
      prisma.charge.count({ where }),
    ]);

    const rows = charges.map((charge) => {
      const paid = charge.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      return {
        chargeId: charge.id,
        property: charge.lease?.unit.property,
        unit: charge.lease?.unit,
        tenants: charge.lease?.tenants.map((lt) => lt.tenant) ?? [],
        rentAmount: Number(charge.amount),
        amountPaid: paid,
        balance: Number(charge.amount) - paid,
        leaseStatus: charge.lease?.status,
        dueDate: charge.dueDate,
      };
    });

    res.json({
      data: rows,
      pagination: {
        total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.offset + data.limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

reportRouter.get('/delinquency', async (req, res, next) => {
  try {
    const now = new Date();
    const charges = await prisma.charge.findMany({
      where: {
        organizationId: req.auth?.organizationId,
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { lt: now },
      },
      include: { lease: true, unit: true, property: true, payments: true },
    });

    res.json({ data: charges });
  } catch (err) {
    next(err);
  }
});

reportRouter.get('/kpis', async (req, res, next) => {
  try {
    const orgId = req.auth?.organizationId;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [properties, units, occupiedUnits, charges, payments, openWorkOrders] =
      await Promise.all([
        prisma.property.count({ where: { organizationId: orgId, archivedAt: null } }),
        prisma.unit.count({ where: { property: { organizationId: orgId }, archivedAt: null } }),
        prisma.unit.count({
          where: { property: { organizationId: orgId }, status: 'OCCUPIED', archivedAt: null },
        }),
        prisma.charge.aggregate({
          where: { organizationId: orgId, type: 'RENT', dueDate: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { organizationId: orgId, receivedDate: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
        prisma.workOrder.count({
          where: { organizationId: orgId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
      ]);

    const totalDue = Number(charges._sum.amount ?? 0);
    const totalCollected = Number(payments._sum.amount ?? 0);
    const occupancyRate = units === 0 ? 0 : Number((occupiedUnits / units).toFixed(2));

    res.json({
      data: {
        totalProperties: properties,
        totalUnits: units,
        occupancyRate,
        rentDueThisMonth: totalDue,
        rentCollectedThisMonth: totalCollected,
        openWorkOrders,
      },
    });
  } catch (err) {
    next(err);
  }
});
