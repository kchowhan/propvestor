import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calculateLateFee, applyLateFeesToOverdueFees, updateFeeStatuses } from '../../lib/hoa-late-fees.js';
import { prisma } from '../../lib/prisma.js';
import { createTestOrganization, cleanupTestData } from '../setup.js';

describe('HOA Late Fees', () => {
  let testOrg: any;
  let testAssociation: any;
  let testHomeowner: any;

  beforeEach(async () => {
    await cleanupTestData();
    testOrg = await createTestOrganization();
    testAssociation = await prisma.association.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test HOA',
      },
    });
    testHomeowner = await prisma.homeowner.create({
      data: {
        associationId: testAssociation.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('calculateLateFee', () => {
    it('should calculate late fee as percentage of original amount', () => {
      const result = calculateLateFee(100, 0.10, 25);
      // 10% of 100 = 10, but minimum is 25, so Math.max(10, 25) = 25
      expect(result).toBe(25);
    });

    it('should use minimum late fee when percentage is less than minimum', () => {
      const result = calculateLateFee(50, 0.10, 25);
      expect(result).toBe(25); // 10% of 50 = 5, but minimum is 25
    });

    it('should use percentage fee when it exceeds minimum', () => {
      const result = calculateLateFee(500, 0.10, 25);
      expect(result).toBe(50); // 10% of 500 = 50, which is greater than 25
    });

    it('should use default values when not provided', () => {
      const result = calculateLateFee(100);
      expect(result).toBe(25); // 10% of 100 = 10, but default minimum is 25
    });

    it('should handle custom percentage and minimum', () => {
      const result = calculateLateFee(200, 0.15, 30);
      expect(result).toBe(30); // 15% of 200 = 30, which equals minimum
    });
  });

  describe('applyLateFeesToOverdueFees', () => {
    it('should apply late fees to overdue fees', async () => {
      const fee = await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly HOA fee',
          amount: 100,
          dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          status: 'PENDING',
          lateFeeApplied: false,
        },
      });

      const result = await applyLateFeesToOverdueFees(testAssociation.id);

      expect(result.feesUpdated).toBe(1);
      expect(result.totalLateFeesApplied).toBeGreaterThan(0);

      const updatedFee = await prisma.hOAFee.findUnique({
        where: { id: fee.id },
      });
      expect(updatedFee?.lateFeeApplied).toBe(true);
      expect(Number(updatedFee?.lateFeeAmount || 0)).toBeGreaterThan(0);
    });

    it('should not apply late fees to fees that already have late fees', async () => {
      const fee = await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly HOA fee',
          amount: 100,
          dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          lateFeeApplied: true,
          lateFeeAmount: 25,
        },
      });

      const result = await applyLateFeesToOverdueFees(testAssociation.id);

      expect(result.feesUpdated).toBe(0);
    });

    it('should not apply late fees to fees that are not overdue', async () => {
      const fee = await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly HOA fee',
          amount: 100,
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days in future
          status: 'PENDING',
          lateFeeApplied: false,
        },
      });

      const result = await applyLateFeesToOverdueFees(testAssociation.id);

      expect(result.feesUpdated).toBe(0);
    });
  });

  describe('updateFeeStatuses', () => {
    it('should update fee status to PAID when fully paid', async () => {
      const fee = await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly HOA fee',
          amount: 100,
          dueDate: new Date(),
          status: 'PENDING',
        },
      });

      await prisma.homeownerPayment.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          amount: 100,
          method: 'STRIPE_CARD',
          hoaFeeId: fee.id,
          receivedDate: new Date(),
        },
      });

      await updateFeeStatuses(fee.id);

      const updatedFee = await prisma.hOAFee.findUnique({
        where: { id: fee.id },
      });
      expect(updatedFee?.status).toBe('PAID');
    });

    it('should update fee status to PARTIALLY_PAID when partially paid', async () => {
      const fee = await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly HOA fee',
          amount: 100,
          dueDate: new Date(),
          status: 'PENDING',
        },
      });

      await prisma.homeownerPayment.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          amount: 50,
          method: 'STRIPE_CARD',
          hoaFeeId: fee.id,
          receivedDate: new Date(),
        },
      });

      await updateFeeStatuses(fee.id);

      const updatedFee = await prisma.hOAFee.findUnique({
        where: { id: fee.id },
      });
      expect(updatedFee?.status).toBe('PARTIALLY_PAID');
    });
  });
});

