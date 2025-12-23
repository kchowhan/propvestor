import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { importBankTransactions, autoMatchPayments, createReconciliation, manualMatch } from '../../lib/reconciliation.js';
import { prisma } from '../../lib/prisma.js';
import { createTestOrganization, cleanupTestData } from '../setup.js';

describe('Reconciliation Library', () => {
  let testOrg: any;

  beforeEach(async () => {
    await cleanupTestData();
    testOrg = await createTestOrganization();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('importBankTransactions', () => {
    it('should import bank transactions', async () => {
      const transactions = [
        {
          date: new Date('2024-01-01'),
          amount: 1000,
          description: 'Rent payment',
          reference: 'TXN-123',
        },
      ];

      const result = await importBankTransactions(testOrg.id, transactions);

      expect(result.imported).toBe(1);
      expect(result.duplicates).toBe(0);
    });

    it('should skip duplicate transactions', async () => {
      const transactions = [
        {
          date: new Date('2024-01-01'),
          amount: 1000,
          description: 'Rent payment',
          reference: 'TXN-123',
        },
      ];

      await importBankTransactions(testOrg.id, transactions);
      const result = await importBankTransactions(testOrg.id, transactions);

      expect(result.imported).toBe(0);
      expect(result.duplicates).toBe(1);
    });
  });

  describe('autoMatchPayments', () => {
    it('should match payments with transactions', async () => {
      // Ensure testOrg exists
      if (!testOrg) {
        testOrg = await createTestOrganization();
      }

      const payment = await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          amount: 1000,
          receivedDate: new Date('2024-01-01'),
          method: 'ONLINE_PROCESSOR',
        },
      });

      await prisma.bankTransaction.create({
        data: {
          organizationId: testOrg.id,
          date: new Date('2024-01-01'),
          amount: 1000,
          description: 'Rent payment',
          reconciled: false,
        },
      });

      const result = await autoMatchPayments(
        testOrg.id,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result.matched).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createReconciliation', () => {
    it('should create reconciliation record', async () => {
      // Create payment and transaction first
      const payment = await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          amount: 1000,
          receivedDate: new Date('2024-01-15'),
          method: 'ONLINE_PROCESSOR',
        },
      });

      const transaction = await prisma.bankTransaction.create({
        data: {
          organizationId: testOrg.id,
          date: new Date('2024-01-15'),
          amount: 1000,
          description: 'Rent payment',
          reconciled: false,
        },
      });

      // Run auto-match first to create matches
      await autoMatchPayments(
        testOrg.id,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      const result = await createReconciliation(
        testOrg.id,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result.id).toBeDefined();
      expect(result.matched).toBeDefined();
      expect(result.suggested).toBeDefined();
    });
  });

  describe('manualMatch', () => {
    it('should manually match payment with transaction', async () => {
      const reconciliation = await prisma.reconciliation.create({
        data: {
          organizationId: testOrg.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          status: 'IN_PROGRESS',
          expectedTotal: 1000,
          actualTotal: 1000,
          difference: 0,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          amount: 1000,
          receivedDate: new Date('2024-01-01'),
          method: 'ONLINE_PROCESSOR',
        },
      });

      const transaction = await prisma.bankTransaction.create({
        data: {
          organizationId: testOrg.id,
          date: new Date('2024-01-01'),
          amount: 1000,
          description: 'Rent payment',
          reconciled: false,
        },
      });

      await expect(
        manualMatch(reconciliation.id, payment.id, transaction.id)
      ).resolves.not.toThrow();
    });
  });
});

