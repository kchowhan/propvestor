import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { importBankTransactions } from '../lib/reconciliation.js';
import { getStripeClient } from '../lib/stripe.js';

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
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
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
  let payment = await prisma.payment.findFirst({
    where: {
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  // Get charge to access organizationId
  const charge = await prisma.charge.findUnique({
    where: { id: chargeId },
    include: { lease: true },
  });

  if (!charge) {
    console.warn('Charge not found for payment intent:', paymentIntent.id);
    return;
  }

  // Determine payment method type from payment intent
  const paymentMethodType = paymentIntent.payment_method_types?.[0] === 'card' ? 'card' : 'ach';
  const paymentMethod = paymentIntent.payment_method;
  let actualPaymentMethodType: 'card' | 'ach' = paymentMethodType;
  
  // If we have a payment method ID, retrieve it to get the actual type
  if (typeof paymentMethod === 'string') {
    try {
      const stripe = getStripeClient();
      const pm = await stripe.paymentMethods.retrieve(paymentMethod);
      actualPaymentMethodType = pm.type === 'card' ? 'card' : 'ach';
    } catch (error) {
      // Fall back to payment intent type
      console.warn('Failed to retrieve payment method type:', error);
    }
  }

  // Get charge ID from latest_charge (newer API) or expand if needed
  const stripeChargeId = typeof paymentIntent.latest_charge === 'string' 
    ? paymentIntent.latest_charge 
    : paymentIntent.latest_charge?.id;

  if (payment) {
    // Update payment with charge ID if available
    if (stripeChargeId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripeChargeId,
        },
      });
    }

    // Update charge status
    if (payment.chargeId) {
      await updateChargeStatus(payment.chargeId);
    }
  } else {
    // Create payment record if it doesn't exist
    payment = await prisma.payment.create({
      data: {
        organizationId: charge.organizationId,
        leaseId: charge.leaseId ?? undefined,
        chargeId: charge.id,
        amount: charge.amount,
        receivedDate: new Date(paymentIntent.created * 1000), // Use payment intent creation date
        method: actualPaymentMethodType === 'card' ? 'STRIPE_CARD' : 'STRIPE_ACH',
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: stripeChargeId ?? undefined,
        reference: paymentIntent.id,
      },
    });

    await updateChargeStatus(chargeId);
  }

  // Create organization fee for Stripe processing
  try {
    const { createStripeProcessingFee, getStripeFeeFromPaymentIntent } = await import('../lib/organization-fees.js');
    const stripe = getStripeClient();
    
    // Try to get actual fee from Stripe
    const actualFee = await getStripeFeeFromPaymentIntent(paymentIntent.id, stripe);
    
    // Create organization fee
    await createStripeProcessingFee(
      charge.organizationId,
      payment.id,
      Number(charge.amount),
      actualPaymentMethodType,
      paymentIntent.id,
      actualFee ?? undefined
    );
  } catch (feeError: any) {
    // Log error but don't fail the webhook - payment was successful
    console.error('Failed to create Stripe processing fee:', feeError);
  }

  // Automatically create bank transaction for reconciliation
  // Note: For ACH, actual bank deposit may be 2-7 days later, but we create the transaction
  // record now for tracking. The date can be adjusted when the actual deposit clears.
  try {
    const txnChargeId = stripeChargeId || paymentIntent.id;
    const amount = paymentIntent.amount / 100; // Convert from cents
    const paymentDate = new Date(paymentIntent.created * 1000);

    // Import as bank transaction
    await importBankTransactions(
      charge.organizationId,
      [
        {
          date: paymentDate,
          amount,
          description: `Stripe payment - ${paymentIntent.id}${paymentIntent.description ? ` - ${paymentIntent.description}` : ''}`,
          reference: txnChargeId,
          accountName: 'Stripe Account',
        },
      ],
      'stripe'
    );

    // Link the bank transaction to the payment
    const bankTransaction = await prisma.bankTransaction.findFirst({
      where: {
        organizationId: charge.organizationId,
        reference: stripeChargeId,
        date: paymentDate,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (bankTransaction && payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { bankTransactionId: bankTransaction.id },
      });
    }
  } catch (error: any) {
    // Log error but don't fail the webhook - payment was successful
    console.error('Failed to create bank transaction for Stripe payment:', error);
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

