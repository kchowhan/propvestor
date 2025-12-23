import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { processPayment, getPaymentIntentStatus } from '../lib/stripe.js';

export const paymentRouter = Router();

const paymentSchema = z.object({
  leaseId: z.string().uuid().optional().nullable(),
  chargeId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  receivedDate: z.coerce.date(),
  method: z.enum(['MANUAL', 'CASH', 'CHECK', 'BANK_TRANSFER', 'ONLINE_PROCESSOR']),
  reference: z.string().optional().nullable(),
});

const updateChargeStatus = async (chargeId: string) => {
  const payments = await prisma.payment.findMany({ where: { chargeId } });
  const charge = await prisma.charge.findUnique({ where: { id: chargeId } });

  if (!charge) {
    return;
  }

  const paidTotal = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  let status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' = 'PENDING';

  if (paidTotal <= 0) {
    status = 'PENDING';
  } else if (paidTotal < Number(charge.amount)) {
    status = 'PARTIALLY_PAID';
  } else {
    status = 'PAID';
  }

  await prisma.charge.update({ where: { id: chargeId }, data: { status } });
};

paymentRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.query;
    const where: any = { organizationId: req.auth?.organizationId };
    
    if (tenantId) {
      // Find payments for a specific tenant via their leases
      const tenant = await prisma.tenant.findFirst({
        where: { id: String(tenantId), organizationId: req.auth?.organizationId },
        include: { leases: true },
      });
      
      if (tenant) {
        const leaseIds = tenant.leases.map((lt: any) => lt.leaseId);
        where.leaseId = { in: leaseIds };
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { 
        charge: true, 
        lease: true,
        paymentMethod: true,
      },
      orderBy: { receivedDate: 'desc' },
    });

    res.json(payments);
  } catch (err) {
    next(err);
  }
});

paymentRouter.post('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(paymentSchema, req.body);

    if (data.chargeId) {
      const charge = await prisma.charge.findFirst({
        where: { id: data.chargeId, organizationId: req.auth.organizationId },
      });

      if (!charge) {
        throw new AppError(404, 'NOT_FOUND', 'Charge not found.');
      }
    }

    const payment = await prisma.payment.create({
      data: {
        organizationId: req.auth.organizationId,
        leaseId: data.leaseId ?? undefined,
        chargeId: data.chargeId ?? undefined,
        amount: data.amount,
        receivedDate: data.receivedDate,
        method: data.method,
        reference: data.reference ?? undefined,
      },
    });

    if (payment.chargeId) {
      await updateChargeStatus(payment.chargeId);
    }

    res.status(201).json({ data: payment });
  } catch (err) {
    next(err);
  }
});

// Process payment via Stripe
paymentRouter.post('/process-stripe', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const schema = z.object({
      chargeId: z.string().uuid(),
      paymentMethodId: z.string(),
    });
    const data = parseBody(schema, req.body);

    // Verify charge belongs to organization
    const charge = await prisma.charge.findFirst({
      where: {
        id: data.chargeId,
        organizationId: req.auth.organizationId,
      },
    });

    if (!charge) {
      throw new AppError(404, 'NOT_FOUND', 'Charge not found.');
    }

    const result = await processPayment(data.chargeId, data.paymentMethodId, Number(charge.amount));

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        organizationId: req.auth.organizationId,
        leaseId: charge.leaseId ?? undefined,
        chargeId: charge.id,
        amount: charge.amount,
        receivedDate: new Date(),
        method: 'STRIPE_ACH', // Will be updated based on payment method type
        stripePaymentIntentId: result.paymentIntentId,
        reference: result.paymentIntentId,
      },
    });

    // Update charge status
    await updateChargeStatus(charge.id);

    res.status(201).json({
      data: {
        payment,
        paymentIntent: {
          id: result.paymentIntentId,
          status: result.status,
          clientSecret: result.clientSecret,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Check payment intent status
paymentRouter.get('/stripe-status/:paymentIntentId', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const status = await getPaymentIntentStatus(req.params.paymentIntentId);

    // Update payment record if it exists
    const payment = await prisma.payment.findFirst({
      where: {
        stripePaymentIntentId: req.params.paymentIntentId,
        organizationId: req.auth.organizationId,
      },
    });

    if (payment && status.status === 'succeeded') {
      // Payment succeeded, update charge status
      if (payment.chargeId) {
        await updateChargeStatus(payment.chargeId);
      }
    }

    res.json({ data: status });
  } catch (err) {
    next(err);
  }
});

paymentRouter.get('/:id', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
      include: { charge: true, lease: true },
    });

    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Payment not found.');
    }

    res.json({ data: payment });
  } catch (err) {
    next(err);
  }
});
