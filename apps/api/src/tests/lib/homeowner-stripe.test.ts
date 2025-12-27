import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOrCreateHomeownerStripeCustomer, createHomeownerSetupIntent, listHomeownerPaymentMethods } from '../../lib/homeowner-stripe.js';
import { prisma } from '../../lib/prisma.js';
import { getStripeClient } from '../../lib/stripe.js';
import { AppError } from '../../lib/errors.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    homeowner: {
      findUnique: vi.fn(),
    },
    homeownerPaymentMethod: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../lib/stripe.js', () => ({
  getStripeClient: vi.fn(),
}));

describe('homeowner-stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateHomeownerStripeCustomer', () => {
    it('should create Stripe customer for homeowner', async () => {
      const mockHomeowner = {
        id: 'homeowner-1',
        email: 'homeowner@example.com',
        firstName: 'John',
        lastName: 'Doe',
        associationId: 'assoc-1',
        association: {
          organizationId: 'org-1',
        },
      };

      const mockStripeCustomer = {
        id: 'cus_stripe123',
      };

      (prisma.homeowner.findUnique as any).mockResolvedValue(mockHomeowner);
      const mockStripe = {
        customers: {
          create: vi.fn().mockResolvedValue(mockStripeCustomer),
        },
      };
      (getStripeClient as any).mockReturnValue(mockStripe);

      const result = await getOrCreateHomeownerStripeCustomer('homeowner-1');

      expect(result).toBe('cus_stripe123');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'homeowner@example.com',
        name: 'John Doe',
        metadata: {
          homeownerId: 'homeowner-1',
          associationId: 'assoc-1',
          organizationId: 'org-1',
        },
      });
    });

    it('should throw error if homeowner not found', async () => {
      (prisma.homeowner.findUnique as any).mockResolvedValue(null);

      await expect(getOrCreateHomeownerStripeCustomer('homeowner-1')).rejects.toThrow(AppError);
    });
  });

  describe('createHomeownerSetupIntent', () => {
    it('should create setup intent for homeowner', async () => {
      const mockHomeowner = {
        id: 'homeowner-1',
        email: 'homeowner@example.com',
        firstName: 'John',
        lastName: 'Doe',
        associationId: 'assoc-1',
        association: {
          organizationId: 'org-1',
        },
      };

      const mockSetupIntent = {
        id: 'seti_123',
        client_secret: 'seti_123_secret',
      };

      (prisma.homeowner.findUnique as any).mockResolvedValue(mockHomeowner);
      const mockStripe = {
        customers: {
          create: vi.fn().mockResolvedValue({ id: 'cus_123' }),
        },
        setupIntents: {
          create: vi.fn().mockResolvedValue(mockSetupIntent),
        },
      };
      (getStripeClient as any).mockReturnValue(mockStripe);

      const result = await createHomeownerSetupIntent('homeowner-1');

      expect(result.clientSecret).toBe('seti_123_secret');
      expect(result.setupIntentId).toBe('seti_123');
      expect(mockStripe.setupIntents.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        payment_method_types: ['us_bank_account', 'card'],
        usage: 'off_session',
      });
    });
  });

  describe('listHomeownerPaymentMethods', () => {
    it('should list payment methods for homeowner', async () => {
      const mockMethods = [
        {
          id: 'pm-1',
          stripePaymentMethodId: 'pm_stripe1',
          type: 'us_bank_account',
          last4: '1234',
          bankName: 'Test Bank',
          isDefault: true,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'pm-2',
          stripePaymentMethodId: 'pm_stripe2',
          type: 'card',
          last4: '5678',
          cardBrand: 'visa',
          cardExpMonth: 12,
          cardExpYear: 2025,
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
        },
      ];

      (prisma.homeownerPaymentMethod.findMany as any).mockResolvedValue(mockMethods);

      const result = await listHomeownerPaymentMethods('homeowner-1');

      expect(result).toHaveLength(2);
      expect(result[0].isDefault).toBe(true);
      expect(result[0].type).toBe('us_bank_account');
      expect(result[1].type).toBe('card');
      expect(prisma.homeownerPaymentMethod.findMany).toHaveBeenCalledWith({
        where: {
          homeownerId: 'homeowner-1',
          isActive: true,
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    });

    it('should return empty array when no payment methods', async () => {
      (prisma.homeownerPaymentMethod.findMany as any).mockResolvedValue([]);

      const result = await listHomeownerPaymentMethods('homeowner-1');

      expect(result).toEqual([]);
    });
  });
});

