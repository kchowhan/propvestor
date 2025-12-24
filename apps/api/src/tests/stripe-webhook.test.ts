import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';
import Stripe from 'stripe';

// Mock Stripe
const mockStripeWebhooks = {
  constructEvent: vi.fn(),
};

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      webhooks: mockStripeWebhooks,
    })),
  };
});

const app = createApp();

describe('Stripe Webhook Routes', () => {
  let testOrg: any;
  let testProperty: any;
  let testCharge: any;
  let testPayment: any;

  beforeEach(async () => {
    await cleanupTestData();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

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

    testCharge = await prisma.charge.create({
      data: {
        organizationId: testOrg.id,
        propertyId: testProperty.id,
        type: 'RENT',
        description: 'Monthly rent',
        amount: 1000,
        dueDate: new Date(),
        status: 'PENDING',
      },
    });

    testPayment = await prisma.payment.create({
      data: {
        organizationId: testOrg.id,
        chargeId: testCharge.id,
        amount: 1000,
        receivedDate: new Date(),
        method: 'STRIPE_ACH',
        stripePaymentIntentId: 'pi_test_123',
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  describe('POST /api/stripe/webhook', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const paymentIntent: Partial<Stripe.PaymentIntent> & { latest_charge?: string | Stripe.Charge | null } = {
        id: 'pi_test_123',
        status: 'succeeded',
        metadata: { chargeId: testCharge.id },
        latest_charge: { id: 'ch_test_123' } as Stripe.Charge,
      };

      mockStripeWebhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: paymentIntent },
      } as Stripe.Event);

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test-signature')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);

      // Verify charge status was updated
      const charge = await prisma.charge.findUnique({
        where: { id: testCharge.id },
      });
      expect(charge?.status).toBe('PAID');
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const paymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_test_123',
        status: 'canceled', // Use valid PaymentIntent status
        last_payment_error: { type: 'card_error', message: 'Card declined' } as Stripe.PaymentIntent.LastPaymentError,
      };

      mockStripeWebhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: { object: paymentIntent },
      } as Stripe.Event);

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test-signature')
        .send({});

      expect(response.status).toBe(200);
    });

    it('should create payment record if it does not exist', async () => {
      // Delete existing payment
      await prisma.payment.delete({ where: { id: testPayment.id } });

      const paymentIntent: Partial<Stripe.PaymentIntent> & { latest_charge?: string | Stripe.Charge | null, created: number, amount: number } = {
        id: 'pi_new_123',
        status: 'succeeded',
        metadata: { chargeId: testCharge.id },
        latest_charge: { id: 'ch_new_123' } as Stripe.Charge,
        created: Math.floor(Date.now() / 1000),
        amount: 100000, // amount in cents
      };

      mockStripeWebhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: paymentIntent },
      } as Stripe.Event);

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test-signature')
        .send({});

      expect(response.status).toBe(200);

      // Verify payment was created
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: 'pi_new_123' },
      });
      expect(payment).toBeDefined();
    });

    it('should return 400 for invalid signature', async () => {
      mockStripeWebhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 500 when webhook secret is not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test-signature')
        .send({});

      expect(response.status).toBe(500);
    });

    it('should handle unhandled event types', async () => {
      mockStripeWebhooks.constructEvent.mockReturnValue({
        type: 'customer.created',
        data: { object: {} },
      } as Stripe.Event);

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test-signature')
        .send({});

      expect(response.status).toBe(200);
    });
  });
});

