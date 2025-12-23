import { prisma } from './prisma.js';
import { AppError } from './errors.js';
import { Decimal } from '@prisma/client/runtime/library';

export interface BankTransactionImport {
  date: Date;
  amount: number;
  description: string;
  reference?: string;
  accountNumber?: string;
  accountName?: string;
}

/**
 * Import bank transactions from CSV or manual entry
 */
export async function importBankTransactions(
  organizationId: string,
  transactions: BankTransactionImport[],
  importSource: string = 'manual'
): Promise<{ imported: number; duplicates: number }> {
  let imported = 0;
  let duplicates = 0;

  for (const tx of transactions) {
    // Check for duplicates (same date, amount, and reference)
    const existing = await prisma.bankTransaction.findFirst({
      where: {
        organizationId,
        date: tx.date,
        amount: tx.amount,
        ...(tx.reference ? { reference: tx.reference } : {}),
      },
    });

    if (existing) {
      duplicates++;
      continue;
    }

    await prisma.bankTransaction.create({
      data: {
        organizationId,
        date: tx.date,
        amount: tx.amount,
        description: tx.description,
        reference: tx.reference,
        accountNumber: tx.accountNumber,
        accountName: tx.accountName,
        importSource,
        reconciled: false,
      },
    });

    imported++;
  }

  return { imported, duplicates };
}

/**
 * Auto-match payments with bank transactions
 */
export async function autoMatchPayments(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{ matched: number; suggested: number }> {
  // Get unreconciled payments in date range
  const payments = await prisma.payment.findMany({
    where: {
      organizationId,
      receivedDate: {
        gte: startDate,
        lte: endDate,
      },
      reconciled: false,
    },
  });

  // Get unreconciled bank transactions in date range
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      organizationId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      reconciled: false,
    },
  });

  let matched = 0;
  let suggested = 0;

  for (const payment of payments) {
    const paymentAmount = Number(payment.amount);

    // Try exact match first (same amount, within 3 days)
    const exactMatch = transactions.find((tx) => {
      const txAmount = Number(tx.amount);
      const daysDiff = Math.abs(
        (tx.date.getTime() - payment.receivedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return (
        Math.abs(txAmount - paymentAmount) < 0.01 && // Allow for rounding
        daysDiff <= 3 &&
        !tx.reconciled
      );
    });

    if (exactMatch) {
      // Create reconciliation match (reconciliationId will be set later when creating reconciliation)
      const matchData: any = {
        paymentId: payment.id,
        bankTransactionId: exactMatch.id,
        matchType: 'auto',
        confidence: 100,
      };
      if (payment.reconciliationId) {
        matchData.reconciliationId = payment.reconciliationId;
      }
      await prisma.reconciliationMatch.create({ data: matchData });

      // Mark as reconciled
      await prisma.payment.update({
        where: { id: payment.id },
        data: { reconciled: true, bankTransactionId: exactMatch.id },
      });

      await prisma.bankTransaction.update({
        where: { id: exactMatch.id },
        data: { reconciled: true, paymentId: payment.id },
      });

      matched++;
      continue;
    }

    // Try fuzzy match (amount within 1%, within 7 days)
    const fuzzyMatch = transactions.find((tx) => {
      const txAmount = Number(tx.amount);
      const amountDiff = Math.abs(txAmount - paymentAmount) / paymentAmount;
      const daysDiff = Math.abs(
        (tx.date.getTime() - payment.receivedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return amountDiff <= 0.01 && daysDiff <= 7 && !tx.reconciled;
    });

    if (fuzzyMatch) {
      // Create suggested match (requires manual review)
      const confidence = Math.max(
        0,
        100 - (Math.abs(Number(fuzzyMatch.amount) - paymentAmount) / paymentAmount) * 100 - daysDiff * 5
      );

      // Create suggested match (reconciliationId will be set later when creating reconciliation)
      const matchData: any = {
        paymentId: payment.id,
        bankTransactionId: fuzzyMatch.id,
        matchType: 'suggested',
        confidence,
      };
      if (payment.reconciliationId) {
        matchData.reconciliationId = payment.reconciliationId;
      }
      await prisma.reconciliationMatch.create({ data: matchData });

      suggested++;
    }
  }

  return { matched, suggested };
}

/**
 * Create reconciliation record
 */
export async function createReconciliation(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  id: string;
  matched: number;
  suggested: number;
  unmatchedPayments: number;
  unmatchedTransactions: number;
}> {
  // Run auto-matching
  const { matched, suggested } = await autoMatchPayments(organizationId, startDate, endDate);

  // Get all payments and transactions in period
  const payments = await prisma.payment.findMany({
    where: {
      organizationId,
      receivedDate: { gte: startDate, lte: endDate },
    },
  });

  const transactions = await prisma.bankTransaction.findMany({
    where: {
      organizationId,
      date: { gte: startDate, lte: endDate },
    },
  });

  // Calculate totals
  const expectedTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const actualTotal = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const difference = actualTotal - expectedTotal;

  // Create reconciliation record
  const reconciliation = await prisma.reconciliation.create({
    data: {
      organizationId,
      startDate,
      endDate,
      status: 'IN_PROGRESS',
      expectedTotal,
      actualTotal,
      difference,
    },
  });

  // Update matches with reconciliation ID (only for auto-matched payments)
  // Find matches that don't have a reconciliation ID yet
  const matchesToUpdate = await prisma.reconciliationMatch.findMany({
    where: {
      reconciliationId: null,
      paymentId: { in: payments.filter((p) => p.reconciled).map((p) => p.id) },
    },
  });

  if (matchesToUpdate.length > 0) {
    await prisma.reconciliationMatch.updateMany({
      where: {
        id: { in: matchesToUpdate.map((m) => m.id) },
      },
      data: { reconciliationId: reconciliation.id },
    });
  }

  const unmatchedPayments = payments.filter((p) => !p.reconciled).length;
  const unmatchedTransactions = transactions.filter((t) => !t.reconciled).length;

  return {
    id: reconciliation.id,
    matched,
    suggested,
    unmatchedPayments,
    unmatchedTransactions,
  };
}

/**
 * Manually match payment with bank transaction
 */
export async function manualMatch(
  reconciliationId: string,
  paymentId: string,
  bankTransactionId: string
): Promise<void> {
  const reconciliation = await prisma.reconciliation.findUnique({
    where: { id: reconciliationId },
  });

  if (!reconciliation) {
    throw new AppError(404, 'NOT_FOUND', 'Reconciliation not found');
  }

  // Create match
  await prisma.reconciliationMatch.create({
    data: {
      reconciliationId,
      paymentId,
      bankTransactionId,
      matchType: 'manual',
      confidence: 100,
    },
  });

  // Mark as reconciled
  await prisma.payment.update({
    where: { id: paymentId },
    data: { reconciled: true, reconciliationId, bankTransactionId },
  });

  await prisma.bankTransaction.update({
    where: { id: bankTransactionId },
    data: { reconciled: true, reconciliationId, paymentId },
  });
}

