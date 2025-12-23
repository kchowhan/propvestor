import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getOrCreateStripeCustomer, createSetupIntent } from '../../lib/stripe.js';
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
});

