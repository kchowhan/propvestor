import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery, paginationQuerySchema } from '../validators/common.js';
import {
  importBankTransactions,
  createReconciliation,
  manualMatch,
  autoMatchPayments,
} from '../lib/reconciliation.js';

export const reconciliationRouter = Router();

const importTransactionsSchema = z.object({
  transactions: z.array(
    z.object({
      date: z.coerce.date(),
      amount: z.coerce.number().positive(),
      description: z.string().min(1),
      reference: z.string().optional().nullable(),
      accountNumber: z.string().optional().nullable(),
      accountName: z.string().optional().nullable(),
    })
  ),
  importSource: z.enum(['csv', 'ofx', 'manual', 'email']).optional().default('manual'),
});

const createReconciliationSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const manualMatchSchema = z.object({
  paymentId: z.string().uuid(),
  bankTransactionId: z.string().uuid(),
});

const listQuerySchema = paginationQuerySchema;

const unmatchedQuerySchema = paginationQuerySchema.extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// List all reconciliations
reconciliationRouter.get('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const query = parseQuery(listQuerySchema, req.query);
    const where = { organizationId: req.auth.organizationId };
    const [reconciliations, total] = await Promise.all([
      prisma.reconciliation.findMany({
        where,
        include: {
          reviewer: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              matches: true,
              payments: true,
              bankTransactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.reconciliation.count({ where }),
    ]);

    res.json({
      data: reconciliations,
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

// Get reconciliation details
reconciliationRouter.get('/:id', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const query = parseQuery(paginationQuerySchema, req.query);
    const reconciliation = await prisma.reconciliation.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true },
        },
        matches: {
          include: {
            payment: {
              include: {
                charge: true,
                lease: {
                  include: {
                    unit: {
                      include: { property: true },
                    },
                  },
                },
              },
            },
            bankTransaction: true,
          },
        },
        payments: {
          include: {
            charge: true,
            lease: {
              include: {
                unit: {
                  include: { property: true },
                },
              },
            },
          },
        },
        bankTransactions: true,
      },
    });

    if (!reconciliation) {
      throw new AppError(404, 'NOT_FOUND', 'Reconciliation not found.');
    }

    // Get unmatched payments and transactions
    const paymentsWhere = {
      organizationId: req.auth.organizationId,
      receivedDate: {
        gte: reconciliation.startDate,
        lte: reconciliation.endDate,
      },
      reconciled: false,
    };
    const transactionsWhere = {
      organizationId: req.auth.organizationId,
      date: {
        gte: reconciliation.startDate,
        lte: reconciliation.endDate,
      },
      reconciled: false,
    };

    const [
      unmatchedPayments,
      unmatchedTransactions,
      unmatchedPaymentsTotal,
      unmatchedTransactionsTotal,
    ] = await Promise.all([
      prisma.payment.findMany({
        where: paymentsWhere,
        include: {
          charge: true,
          lease: {
            include: {
              unit: {
                include: { property: true },
              },
            },
          },
        },
        orderBy: { receivedDate: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.bankTransaction.findMany({
        where: transactionsWhere,
        orderBy: { date: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.payment.count({ where: paymentsWhere }),
      prisma.bankTransaction.count({ where: transactionsWhere }),
    ]);

    res.json({
      data: {
        ...reconciliation,
        unmatchedPayments,
        unmatchedTransactions,
      },
      pagination: {
        unmatchedPayments: {
          total: unmatchedPaymentsTotal,
          limit: query.limit ?? 50,
          offset: query.offset ?? 0,
          hasMore: (query.offset ?? 0) + (query.limit ?? 50) < unmatchedPaymentsTotal,
        },
        unmatchedTransactions: {
          total: unmatchedTransactionsTotal,
          limit: query.limit ?? 50,
          offset: query.offset ?? 0,
          hasMore: (query.offset ?? 0) + (query.limit ?? 50) < unmatchedTransactionsTotal,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Create a new reconciliation period
reconciliationRouter.post('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(createReconciliationSchema, req.body);

    if (data.endDate <= data.startDate) {
      throw new AppError(400, 'VALIDATION_ERROR', 'End date must be after start date.');
    }

    const result = await createReconciliation(
      req.auth.organizationId,
      data.startDate,
      data.endDate
    );

    const reconciliation = await prisma.reconciliation.findUnique({
      where: { id: result.id },
      include: {
        _count: {
          select: {
            matches: true,
            payments: true,
            bankTransactions: true,
          },
        },
      },
    });

    res.status(201).json({
      data: {
        ...reconciliation,
        matched: result.matched,
        suggested: result.suggested,
        unmatchedPayments: result.unmatchedPayments,
        unmatchedTransactions: result.unmatchedTransactions,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Import bank transactions (CSV, OFX, or manual entry)
reconciliationRouter.post('/import-transactions', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(importTransactionsSchema, req.body);

    const result = await importBankTransactions(
      req.auth.organizationId,
      data.transactions,
      data.importSource
    );

    res.status(201).json({
      data: {
        imported: result.imported,
        duplicates: result.duplicates,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get unmatched payments and transactions for a period
reconciliationRouter.get('/unmatched/list', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const query = parseQuery(unmatchedQuerySchema, req.query);
    const startDate =
      query.startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate =
      query.endDate ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const paymentsWhere = {
      organizationId: req.auth.organizationId,
      receivedDate: {
        gte: startDate,
        lte: endDate,
      },
      reconciled: false,
    };
    const transactionsWhere = {
      organizationId: req.auth.organizationId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      reconciled: false,
    };

    const [
      unmatchedPayments,
      unmatchedTransactions,
      unmatchedPaymentsTotal,
      unmatchedTransactionsTotal,
    ] = await Promise.all([
      prisma.payment.findMany({
        where: paymentsWhere,
        include: {
          charge: true,
          lease: {
            include: {
              unit: {
                include: { property: true },
              },
            },
          },
        },
        orderBy: { receivedDate: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.bankTransaction.findMany({
        where: transactionsWhere,
        orderBy: { date: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.payment.count({ where: paymentsWhere }),
      prisma.bankTransaction.count({ where: transactionsWhere }),
    ]);

    res.json({
      data: {
        unmatchedPayments,
        unmatchedTransactions,
        period: { startDate, endDate },
      },
      pagination: {
        unmatchedPayments: {
          total: unmatchedPaymentsTotal,
          limit: query.limit ?? 50,
          offset: query.offset ?? 0,
          hasMore: (query.offset ?? 0) + (query.limit ?? 50) < unmatchedPaymentsTotal,
        },
        unmatchedTransactions: {
          total: unmatchedTransactionsTotal,
          limit: query.limit ?? 50,
          offset: query.offset ?? 0,
          hasMore: (query.offset ?? 0) + (query.limit ?? 50) < unmatchedTransactionsTotal,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Manually match a payment with a bank transaction
reconciliationRouter.post('/:id/match', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(manualMatchSchema, req.body);

    // Verify reconciliation belongs to organization
    const reconciliation = await prisma.reconciliation.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
    });

    if (!reconciliation) {
      throw new AppError(404, 'NOT_FOUND', 'Reconciliation not found.');
    }

    // Verify payment belongs to organization
    const payment = await prisma.payment.findFirst({
      where: {
        id: data.paymentId,
        organizationId: req.auth.organizationId,
      },
    });

    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Payment not found.');
    }

    // Verify transaction belongs to organization
    const transaction = await prisma.bankTransaction.findFirst({
      where: {
        id: data.bankTransactionId,
        organizationId: req.auth.organizationId,
      },
    });

    if (!transaction) {
      throw new AppError(404, 'NOT_FOUND', 'Bank transaction not found.');
    }

    await manualMatch(reconciliation.id, payment.id, transaction.id);

    const updatedMatch = await prisma.reconciliationMatch.findFirst({
      where: {
        reconciliationId: reconciliation.id,
        paymentId: payment.id,
        bankTransactionId: transaction.id,
      },
      include: {
        payment: true,
        bankTransaction: true,
      },
    });

    res.status(201).json({ data: updatedMatch });
  } catch (err) {
    next(err);
  }
});

// Run auto-matching for a reconciliation period
reconciliationRouter.post('/:id/auto-match', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const reconciliation = await prisma.reconciliation.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
    });

    if (!reconciliation) {
      throw new AppError(404, 'NOT_FOUND', 'Reconciliation not found.');
    }

    const result = await autoMatchPayments(
      req.auth.organizationId,
      reconciliation.startDate,
      reconciliation.endDate
    );

    // Update reconciliation totals
    const payments = await prisma.payment.findMany({
      where: {
        organizationId: req.auth.organizationId,
        receivedDate: {
          gte: reconciliation.startDate,
          lte: reconciliation.endDate,
        },
      },
    });

    const transactions = await prisma.bankTransaction.findMany({
      where: {
        organizationId: req.auth.organizationId,
        date: {
          gte: reconciliation.startDate,
          lte: reconciliation.endDate,
        },
      },
    });

    const expectedTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const actualTotal = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const difference = actualTotal - expectedTotal;

    await prisma.reconciliation.update({
      where: { id: reconciliation.id },
      data: {
        expectedTotal,
        actualTotal,
        difference,
      },
    });

    res.json({
      data: {
        matched: result.matched,
        suggested: result.suggested,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Complete a reconciliation (mark as reviewed)
reconciliationRouter.put('/:id/complete', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const schema = z.object({
      notes: z.string().optional().nullable(),
    });
    const data = parseBody(schema, req.body);

    const reconciliation = await prisma.reconciliation.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
    });

    if (!reconciliation) {
      throw new AppError(404, 'NOT_FOUND', 'Reconciliation not found.');
    }

    const updated = await prisma.reconciliation.update({
      where: { id: reconciliation.id },
      data: {
        status: 'COMPLETED',
        notes: data.notes ?? undefined,
        reviewedBy: req.auth.userId,
        reviewedAt: new Date(),
      },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// Update bank transaction (e.g., when check clears, update date/amount)
reconciliationRouter.put('/bank-transactions/:id', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const schema = z.object({
      date: z.coerce.date().optional(),
      amount: z.coerce.number().positive().optional(),
      description: z.string().optional(),
      reference: z.string().optional().nullable(),
      reconciled: z.boolean().optional(),
    });
    const data = parseBody(schema, req.body);

    const transaction = await prisma.bankTransaction.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
    });

    if (!transaction) {
      throw new AppError(404, 'NOT_FOUND', 'Bank transaction not found.');
    }

    const updated = await prisma.bankTransaction.update({
      where: { id: transaction.id },
      data: {
        date: data.date ?? undefined,
        amount: data.amount ?? undefined,
        description: data.description ?? undefined,
        reference: data.reference ?? undefined,
        reconciled: data.reconciled ?? undefined,
      },
    });

    // If marking as reconciled and there's a linked payment, update payment too
    if (data.reconciled === true && transaction.paymentId) {
      await prisma.payment.update({
        where: { id: transaction.paymentId },
        data: { reconciled: true },
      });
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
