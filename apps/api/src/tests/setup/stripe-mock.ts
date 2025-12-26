import { vi, beforeEach, afterEach } from 'vitest';
import { cleanupRedis } from './redis-cleanup.js';

// Global Stripe mock - used by all tests

// Global Redis cleanup - ensures all tests start with clean Redis state
beforeEach(async () => {
  await cleanupRedis();
});

afterEach(async () => {
  await cleanupRedis();
});
export const mockStripeWebhooks = {
  constructEvent: vi.fn(),
};

export const mockStripeCustomers = {
  create: vi.fn().mockResolvedValue({
    id: 'cus_test123',
    email: 'test@example.com',
    name: 'Test Organization',
  }),
  update: vi.fn().mockResolvedValue({
    id: 'cus_test123',
    invoice_settings: {
      default_payment_method: 'pm_test123',
    },
  }),
};

export const mockStripeSetupIntents = {
  create: vi.fn().mockResolvedValue({
    client_secret: 'seti_test_secret_123',
    customer: 'cus_test123',
  }),
};

export const mockStripePaymentMethods = {
  attach: vi.fn().mockResolvedValue({ id: 'pm_test123' }),
  list: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'pm_test123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
        },
      },
    ],
  }),
  detach: vi.fn().mockResolvedValue({ id: 'pm_test123' }),
};

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      webhooks: mockStripeWebhooks,
      customers: mockStripeCustomers,
      setupIntents: mockStripeSetupIntents,
      paymentMethods: mockStripePaymentMethods,
    })),
  };
});

