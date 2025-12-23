import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildRentDueDate, createRentChargeForLease } from '../../lib/rent.js';
import { prisma } from '../../lib/prisma.js';
import { createTestOrganization, cleanupTestData } from '../setup.js';

describe('Rent Library', () => {
  let testOrg: any;
  let testProperty: any;
  let testUnit: any;

  beforeEach(async () => {
    await cleanupTestData();
    testOrg = await createTestOrganization();
    testProperty = await prisma.property.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test Property',
        addressLine1: '123 Main St',
        city: 'Test City',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        type: 'SINGLE_FAMILY',
      },
    });
    testUnit = await prisma.unit.create({
      data: {
        propertyId: testProperty.id,
        name: 'Unit 1',
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('buildRentDueDate', () => {
    it('should clamp to last day of month', () => {
      const lease = { rentDueDay: 31 } as any;
      const dueDate = buildRentDueDate(lease, 2, 2024);
      expect(dueDate.getFullYear()).toBe(2024);
      expect(dueDate.getMonth()).toBe(1); // February is month 1
      expect(dueDate.getDate()).toBe(29); // 2024 is leap year
    });

    it('should use rentDueDay when valid', () => {
      const lease = { rentDueDay: 10 } as any;
      const dueDate = buildRentDueDate(lease, 9, 2025);
      expect(dueDate.getFullYear()).toBe(2025);
      expect(dueDate.getMonth()).toBe(8); // September is month 8
      expect(dueDate.getDate()).toBe(10);
    });

    it('should handle month with 30 days', () => {
      const lease = { rentDueDay: 31 } as any;
      const dueDate = buildRentDueDate(lease, 4, 2024); // April has 30 days
      expect(dueDate.getDate()).toBe(30);
    });

    it('should handle February in non-leap year', () => {
      const lease = { rentDueDay: 31 } as any;
      const dueDate = buildRentDueDate(lease, 2, 2023); // 2023 is not leap year
      expect(dueDate.getDate()).toBe(28);
    });
  });

  describe('createRentChargeForLease', () => {
    it('should create rent charge for lease', async () => {
      // Ensure testOrg, testProperty, and testUnit exist
      if (!testOrg) {
        testOrg = await createTestOrganization();
      }
      if (!testProperty) {
        testProperty = await prisma.property.create({
          data: {
            organizationId: testOrg.id,
            name: 'Test Property',
            addressLine1: '123 Main St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'USA',
            type: 'SINGLE_FAMILY',
          },
        });
      }
      if (!testUnit) {
        testUnit = await prisma.unit.create({
          data: {
            propertyId: testProperty.id,
            name: 'Unit 1',
          },
        });
      }
      
      const lease = await prisma.lease.create({
        data: {
          organizationId: testOrg.id,
          unitId: testUnit.id,
          rentAmount: 1000,
          rentDueDay: 1,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          status: 'ACTIVE',
        },
      });

      // Verify lease exists before creating charge
      const verifyLease = await prisma.lease.findUnique({ where: { id: lease.id } });
      if (!verifyLease) {
        throw new Error('Lease was not created properly');
      }

      const charge = await createRentChargeForLease(lease, 1, 2024);

      expect(charge).not.toBeNull();
      expect(charge?.type).toBe('RENT');
      expect(charge?.amount.toNumber()).toBe(1000);
      expect(charge?.organizationId).toBe(testOrg.id);
    });

    it('should not create duplicate charge for same month', async () => {
      // Ensure testOrg, testProperty, and testUnit exist
      if (!testOrg) {
        testOrg = await createTestOrganization();
      }
      if (!testProperty) {
        testProperty = await prisma.property.create({
          data: {
            organizationId: testOrg.id,
            name: 'Test Property',
            addressLine1: '123 Main St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'USA',
            type: 'SINGLE_FAMILY',
          },
        });
      }
      if (!testUnit) {
        testUnit = await prisma.unit.create({
          data: {
            propertyId: testProperty.id,
            name: 'Unit 1',
          },
        });
      }
      
      const lease = await prisma.lease.create({
        data: {
          organizationId: testOrg.id,
          unitId: testUnit.id,
          rentAmount: 1000,
          rentDueDay: 1,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          status: 'ACTIVE',
        },
      });

      await createRentChargeForLease(lease, 1, 2024);
      const duplicate = await createRentChargeForLease(lease, 1, 2024);

      expect(duplicate).toBeNull();
    });

    it('should create separate charges for different months', async () => {
      const lease = await prisma.lease.create({
        data: {
          organizationId: testOrg.id,
          unitId: testUnit.id,
          rentAmount: 1000,
          rentDueDay: 1,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          status: 'ACTIVE',
        },
      });

      const charge1 = await createRentChargeForLease(lease, 1, 2024);
      const charge2 = await createRentChargeForLease(lease, 2, 2024);

      expect(charge1).not.toBeNull();
      expect(charge2).not.toBeNull();
      expect(charge1?.id).not.toBe(charge2?.id);
    });
  });
});

