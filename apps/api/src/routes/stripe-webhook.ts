import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';

export const stripeWebhookRouter = Router();

// Helper function to update charge status (duplicated from payments.ts for webhook use)
async function updateChargeStatus(chargeId: string) {
  const payments = await prisma.payment.findMany({ where: { chargeId } });
  const charge = await prisma.charge.findUnique({ where: { id: chargeId } });

  if (!charge) {
    return;
  }

  const paidTotal = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  let status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' = 'PENDING';

  if (paidTotal <= 0) {
    status = 'PENDING';
  } else if (paidTotal < Number(charge.amount)) {
    status = 'PARTIALLY_PAID';
  } else {
    status = 'PAID';
  }

  await prisma.charge.update({ where: { id: chargeId }, data: { status } });
}

// Stripe webhook endpoint (no auth - uses webhook signature verification)
stripeWebhookRouter.post('/webhook', async (req: Request, res: Response) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
  });

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log('Payment method attached:', paymentMethod.id);
        break;
      }

      case 'payment_method.detached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log('Payment method detached:', paymentMethod.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const chargeId = paymentIntent.metadata?.chargeId;

  if (!chargeId) {
    console.warn('Payment intent missing chargeId metadata');
    return;
  }

  // Find payment record
  const payment = await prisma.payment.findFirst({
    where: {
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  if (payment) {
    // Update payment with charge ID if available
    if (paymentIntent.charges?.data?.[0]?.id) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripeChargeId: paymentIntent.charges.data[0].id,
        },
      });
    }

    // Update charge status
    if (payment.chargeId) {
      await updateChargeStatus(payment.chargeId);
    }
  } else {
    // Create payment record if it doesn't exist
    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      include: { lease: true },
    });

    if (charge) {
      await prisma.payment.create({
        data: {
          organizationId: charge.organizationId,
          leaseId: charge.leaseId ?? undefined,
          chargeId: charge.id,
          amount: charge.amount,
          receivedDate: new Date(),
          method: 'STRIPE_ACH',
          stripePaymentIntentId: paymentIntent.id,
          stripeChargeId: paymentIntent.charges?.data?.[0]?.id,
          reference: paymentIntent.id,
        },
      });

      await updateChargeStatus(chargeId);
    }
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error);

  // Update payment record if it exists
  const payment = await prisma.payment.findFirst({
    where: {
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  if (payment) {
    // You might want to add a failed_payments table or update payment status
    console.log('Payment failed for charge:', payment.chargeId);
  }
}

