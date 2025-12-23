import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getOrCreateStripeCustomer,
  createSetupIntent,
  attachPaymentMethod,
  processPayment,
  findBestPaymentMethodForCharge,
  getPaymentIntentStatus,
  deletePaymentMethod,
  listPaymentMethods,
} from '../../lib/stripe.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { createTestOrganization, cleanupTestData } from '../setup.js';

// Mock Stripe
const mockStripeInstance = {
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  setupIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  paymentMethods: {
    attach: vi.fn(),
    retrieve: vi.fn(),
    detach: vi.fn(),
  },
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
};

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => mockStripeInstance),
  };
});

describe('Stripe Library', () => {
  let testOrg: any;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    await cleanupTestData();
    testOrg = await createTestOrganization();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('getOrCreateStripeCustomer', () => {
    it('should return existing customer ID', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          stripeCustomerId: 'cus_existing',
          status: 'ACTIVE',
        },
      });

      const customerId = await getOrCreateStripeCustomer(tenant.id);
      expect(customerId).toBe('cus_existing');
    });

    it('should create new customer when not exists', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'ACTIVE',
        },
      });

      (mockStripeInstance.customers.create as any).mockResolvedValue({
        id: 'cus_new',
      });

      const customerId = await getOrCreateStripeCustomer(tenant.id);
      expect(customerId).toBe('cus_new');
    });

    it('should throw error for non-existent tenant', async () => {
      await expect(
        getOrCreateStripeCustomer('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(AppError);
    });
  });

  describe('createSetupIntent', () => {
    it('should create setup intent', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          stripeCustomerId: 'cus_test',
          status: 'ACTIVE',
        },
      });

      (mockStripeInstance.setupIntents.create as any).mockResolvedValue({
        id: 'seti_test',
        client_secret: 'seti_test_secret',
      });

      const result = await createSetupIntent(tenant.id);
      expect(result.setupIntentId).toBe('seti_test');
      expect(result.clientSecret).toBe('seti_test_secret');
    });
  });

  describe('attachPaymentMethod', () => {
    let tenant: any;

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          stripeCustomerId: 'cus_test',
          status: 'ACTIVE',
        },
      });
    });

    it('should attach ACH payment method', async () => {
      (mockStripeInstance.setupIntents.retrieve as any).mockResolvedValue({
        id: 'seti_test',
        status: 'succeeded',
        payment_method: 'pm_ach_123',
      });

      (mockStripeInstance.paymentMethods.retrieve as any).mockResolvedValue({
        id: 'pm_ach_123',
        type: 'us_bank_account',
        us_bank_account: {
          last4: '1234',
          bank_name: 'Test Bank',
        },
      });

      (mockStripeInstance.paymentMethods.attach as any).mockResolvedValue({});

      const result = await attachPaymentMethod(tenant.id, 'seti_test', false);

      expect(result.type).toBe('us_bank_account');
      expect(result.last4).toBe('1234');
      expect(result.bankName).toBe('Test Bank');
    });

    it('should attach card payment method', async () => {
      (mockStripeInstance.setupIntents.retrieve as any).mockResolvedValue({
        id: 'seti_test',
        status: 'succeeded',
        payment_method: 'pm_card_123',
      });

      (mockStripeInstance.paymentMethods.retrieve as any).mockResolvedValue({
        id: 'pm_card_123',
        type: 'card',
        card: {
          last4: '4242',
          brand: 'visa',
          exp_month: 12,
          exp_year: 2025,
        },
      });

      (mockStripeInstance.paymentMethods.attach as any).mockResolvedValue({});

      const result = await attachPaymentMethod(tenant.id, 'seti_test', true);

      expect(result.type).toBe('card');
      expect(result.last4).toBe('4242');
      expect(result.cardBrand).toBe('visa');
    });

    it('should throw error if setup intent not succeeded', async () => {
      (mockStripeInstance.setupIntents.retrieve as any).mockResolvedValue({
        id: 'seti_test',
        status: 'requires_payment_method',
      });

      await expect(
        attachPaymentMethod(tenant.id, 'seti_test', false)
      ).rejects.toThrow(AppError);
    });

    it('should set as default and unset others', async () => {
      // Create existing default payment method
      await prisma.tenantPaymentMethod.create({
        data: {
          organizationId: testOrg.id,
          tenantId: tenant.id,
          stripePaymentMethodId: 'pm_old',
          type: 'card',
          isDefault: true,
          isActive: true,
        },
      });

      (mockStripeInstance.setupIntents.retrieve as any).mockResolvedValue({
        id: 'seti_test',
        status: 'succeeded',
        payment_method: 'pm_new',
      });

      (mockStripeInstance.paymentMethods.retrieve as any).mockResolvedValue({
        id: 'pm_new',
        type: 'card',
        card: { last4: '4242', brand: 'visa', exp_month: 12, exp_year: 2025 },
      });

      (mockStripeInstance.paymentMethods.attach as any).mockResolvedValue({});

      await attachPaymentMethod(tenant.id, 'seti_test', true);

      // Verify old default was unset
      const oldMethod = await prisma.tenantPaymentMethod.findUnique({
        where: { stripePaymentMethodId: 'pm_old' },
      });
      expect(oldMethod?.isDefault).toBe(false);
    });
  });

  describe('processPayment', () => {
    let tenant: any;
    let testProperty: any;
    let testUnit: any;
    let testLease: any;
    let testCharge: any;
    let paymentMethod: any;

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          stripeCustomerId: 'cus_test',
          status: 'ACTIVE',
        },
      });

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

      testLease = await prisma.lease.create({
        data: {
          organizationId: testOrg.id,
          unitId: testUnit.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          rentAmount: 1000,
          rentDueDay: 1,
          status: 'ACTIVE',
          tenants: {
            create: {
              tenantId: tenant.id,
              isPrimary: true,
            },
          },
        },
      });

      testCharge = await prisma.charge.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          leaseId: testLease.id,
          type: 'RENT',
          description: 'Monthly rent',
          amount: 1000,
          dueDate: new Date(),
        },
      });

      paymentMethod = await prisma.tenantPaymentMethod.create({
        data: {
          organizationId: testOrg.id,
          tenantId: tenant.id,
          stripePaymentMethodId: 'pm_test_123',
          type: 'us_bank_account',
          last4: '1234',
          isDefault: true,
          isActive: true,
        },
      });
    });

    it('should process payment successfully', async () => {
      (mockStripeInstance.paymentIntents.create as any).mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        client_secret: 'pi_test_123_secret',
      });

      const result = await processPayment(testCharge.id, 'pm_test_123', 1000);

      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(result.status).toBe('succeeded');
    });

    it('should throw error if charge not found', async () => {
      await expect(
        processPayment('00000000-0000-0000-0000-000000000000', 'pm_test_123', 1000)
      ).rejects.toThrow(AppError);
    });

    it('should throw error if payment method not found', async () => {
      await expect(
        processPayment(testCharge.id, 'pm_nonexistent', 1000)
      ).rejects.toThrow(AppError);
    });
  });

  describe('findBestPaymentMethodForCharge', () => {
    let tenant: any;
    let testProperty: any;
    let testUnit: any;
    let testLease: any;
    let testCharge: any;

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'ACTIVE',
        },
      });

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

      testLease = await prisma.lease.create({
        data: {
          organizationId: testOrg.id,
          unitId: testUnit.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          rentAmount: 1000,
          rentDueDay: 1,
          status: 'ACTIVE',
          tenants: {
            create: {
              tenantId: tenant.id,
              isPrimary: true,
            },
          },
        },
      });

      testCharge = await prisma.charge.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          leaseId: testLease.id,
          type: 'RENT',
          description: 'Monthly rent',
          amount: 1000,
          dueDate: new Date(),
        },
      });
    });

    it('should find default payment method for primary tenant', async () => {
      await prisma.tenantPaymentMethod.create({
        data: {
          organizationId: testOrg.id,
          tenantId: tenant.id,
          stripePaymentMethodId: 'pm_default',
          type: 'us_bank_account',
          last4: '1234',
          isDefault: true,
          isActive: true,
        },
      });

      const result = await findBestPaymentMethodForCharge(testCharge.id);

      expect(result).not.toBeNull();
      expect(result?.paymentMethodId).toBe('pm_default');
      expect(result?.tenantId).toBe(tenant.id);
    });

    it('should return null if no payment methods found', async () => {
      const result = await findBestPaymentMethodForCharge(testCharge.id);
      expect(result).toBeNull();
    });

    it('should return null if charge has no lease', async () => {
      const chargeWithoutLease = await prisma.charge.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          type: 'RENT',
          description: 'Monthly rent',
          amount: 1000,
          dueDate: new Date(),
        },
      });

      const result = await findBestPaymentMethodForCharge(chargeWithoutLease.id);
      expect(result).toBeNull();
    });
  });

  describe('getPaymentIntentStatus', () => {
    beforeEach(() => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    });

    it('should return payment intent status', async () => {
      (mockStripeInstance.paymentIntents.retrieve as any).mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 100000, // $1000 in cents
        currency: 'usd',
      });

      const result = await getPaymentIntentStatus('pi_test_123');

      expect(result.status).toBe('succeeded');
      expect(result.amount).toBe(1000);
      expect(result.currency).toBe('usd');
    });
  });

  describe('deletePaymentMethod', () => {
    let tenant: any;
    let paymentMethod: any;

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          stripeCustomerId: 'cus_test',
          status: 'ACTIVE',
        },
      });

      paymentMethod = await prisma.tenantPaymentMethod.create({
        data: {
          organizationId: testOrg.id,
          tenantId: tenant.id,
          stripePaymentMethodId: 'pm_test_123',
          type: 'us_bank_account',
          last4: '1234',
          isActive: true,
        },
      });
    });

    it('should delete payment method', async () => {
      (mockStripeInstance.paymentMethods.detach as any).mockResolvedValue({});

      await deletePaymentMethod('pm_test_123');

      const deleted = await prisma.tenantPaymentMethod.findUnique({
        where: { stripePaymentMethodId: 'pm_test_123' },
      });

      expect(deleted?.isActive).toBe(false);
    });

    it('should handle already detached payment method', async () => {
      const error = new Error('Resource missing');
      (error as any).code = 'resource_missing';
      (mockStripeInstance.paymentMethods.detach as any).mockRejectedValue(error);

      await deletePaymentMethod('pm_test_123');

      const deleted = await prisma.tenantPaymentMethod.findUnique({
        where: { stripePaymentMethodId: 'pm_test_123' },
      });

      expect(deleted?.isActive).toBe(false);
    });

    it('should throw error if payment method not found', async () => {
      await expect(
        deletePaymentMethod('pm_nonexistent')
      ).rejects.toThrow(AppError);
    });
  });

  describe('listPaymentMethods', () => {
    let tenant: any;

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'ACTIVE',
        },
      });
    });

    it('should return empty array when no payment methods', async () => {
      const result = await listPaymentMethods(tenant.id);
      expect(result).toEqual([]);
    });

    it('should return payment methods ordered by default first', async () => {
      await prisma.tenantPaymentMethod.create({
        data: {
          organizationId: testOrg.id,
          tenantId: tenant.id,
          stripePaymentMethodId: 'pm_1',
          type: 'card',
          isDefault: false,
          isActive: true,
        },
      });

      await prisma.tenantPaymentMethod.create({
        data: {
          organizationId: testOrg.id,
          tenantId: tenant.id,
          stripePaymentMethodId: 'pm_2',
          type: 'us_bank_account',
          isDefault: true,
          isActive: true,
        },
      });

      const result = await listPaymentMethods(tenant.id);

      expect(result.length).toBe(2);
      expect(result[0].isDefault).toBe(true);
      expect(result[0].stripePaymentMethodId).toBe('pm_2');
    });

    it('should only return active payment methods', async () => {
      await prisma.tenantPaymentMethod.create({
        data: {
          organizationId: testOrg.id,
          tenantId: tenant.id,
          stripePaymentMethodId: 'pm_active',
          type: 'card',
          isActive: true,
        },
      });

      await prisma.tenantPaymentMethod.create({
        data: {
          organizationId: testOrg.id,
          tenantId: tenant.id,
          stripePaymentMethodId: 'pm_inactive',
          type: 'card',
          isActive: false,
        },
      });

      const result = await listPaymentMethods(tenant.id);

      expect(result.length).toBe(1);
      expect(result[0].stripePaymentMethodId).toBe('pm_active');
    });
  });
});

