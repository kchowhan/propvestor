import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery } from '../validators/common.js';
import { requireHomeownerAuth } from '../middleware/homeowner-auth.js';
import { processHomeownerPayment } from '../lib/homeowner-stripe.js';

export const homeownerPaymentRouter = Router();

const querySchema = z.object({
  hoaFeeId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// List payments for homeowner
homeownerPaymentRouter.get('/', requireHomeownerAuth, async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const query = parseQuery(querySchema, req.query);
    const where: any = {
      homeownerId: req.homeownerAuth.homeownerId,
    };

    if (query.hoaFeeId) {
      where.hoaFeeId = query.hoaFeeId;
    }

    const take = query.limit ?? 100;
    const skip = query.offset ?? 0;

    const [payments, total] = await Promise.all([
      prisma.homeownerPayment.findMany({
        where,
        include: {
          hoaFee: {
            select: {
              id: true,
              type: true,
              description: true,
              amount: true,
              dueDate: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              type: true,
              last4: true,
              cardBrand: true,
              bankName: true,
            },
          },
        },
        orderBy: { receivedDate: 'desc' },
        take,
        skip,
      }),
      prisma.homeownerPayment.count({ where }),
    ]);

    res.json({
      data: payments,
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

// Get payment details
homeownerPaymentRouter.get('/:id', requireHomeownerAuth, async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const payment = await prisma.homeownerPayment.findFirst({
      where: {
        id: req.params.id,
        homeownerId: req.homeownerAuth.homeownerId,
      },
      include: {
        hoaFee: {
          select: {
            id: true,
            type: true,
            description: true,
            amount: true,
            dueDate: true,
          },
        },
        paymentMethod: {
          select: {
            id: true,
            type: true,
            last4: true,
            cardBrand: true,
            bankName: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Payment not found.');
    }

    res.json({ data: payment });
  } catch (err) {
    next(err);
  }
});

// Process payment for HOA fee
homeownerPaymentRouter.post('/process', requireHomeownerAuth, async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const schema = z.object({
      hoaFeeId: z.string().uuid(),
      paymentMethodId: z.string(),
      amount: z.number().positive().optional(), // Optional - will use fee amount if not provided
    });
    const data = parseBody(schema, req.body);

    // Verify fee exists and belongs to homeowner
    const fee = await prisma.hOAFee.findFirst({
      where: {
        id: data.hoaFeeId,
        homeownerId: req.homeownerAuth.homeownerId,
      },
    });

    if (!fee) {
      throw new AppError(404, 'NOT_FOUND', 'HOA fee not found.');
    }

    // Calculate amount to pay (use provided amount or fee amount)
    const amountToPay = data.amount ?? Number(fee.amount);

    // Process payment via Stripe
    const result = await processHomeownerPayment(data.hoaFeeId, data.paymentMethodId, amountToPay);

    // Create payment record (webhook will update it with final status)
    const payment = await prisma.homeownerPayment.create({
      data: {
        associationId: fee.associationId,
        homeownerId: req.homeownerAuth.homeownerId,
        hoaFeeId: fee.id,
        amount: amountToPay,
        receivedDate: new Date(),
        method: 'STRIPE_ACH', // Will be updated based on payment method type
        stripePaymentIntentId: result.paymentIntentId,
        reference: result.paymentIntentId,
      },
    });

    // Update homeowner account balance
    await prisma.homeowner.update({
      where: { id: req.homeownerAuth.homeownerId },
      data: {
        accountBalance: {
          decrement: amountToPay,
        },
      },
    });

    // Update fee status based on payments
    try {
      const { updateFeeStatuses } = await import('../lib/hoa-late-fees.js');
      await updateFeeStatuses(fee.id);
    } catch (statusError) {
      console.error('Failed to update fee status:', statusError);
      // Fallback to manual calculation
      const totalPaid = await prisma.homeownerPayment.aggregate({
        where: { hoaFeeId: fee.id },
        _sum: { amount: true },
      });

      const paidAmount = Number(totalPaid._sum.amount || 0);
      const feeAmount = Number(fee.amount);
      let newStatus = fee.status;

      if (paidAmount >= feeAmount) {
        newStatus = 'PAID';
      } else if (paidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      await prisma.hOAFee.update({
        where: { id: fee.id },
        data: { status: newStatus },
      });
    }

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

