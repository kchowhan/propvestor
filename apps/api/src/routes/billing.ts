import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { createRentChargeForLease } from '../lib/rent.js';
import { findBestPaymentMethodForCharge, processPayment } from '../lib/stripe.js';

export const billingRouter = Router();

const rentBatchSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

// Monthly rent generation endpoint
// Can be called manually (with auth) or by Google Cloud Scheduler (with secret token)
billingRouter.post('/generate-monthly-rent', async (req, res, next) => {
  try {
    // Check if called by scheduler (with secret token) or by authenticated user
    const schedulerSecret = req.headers['x-scheduler-secret'];
    const expectedSecret = process.env.SCHEDULER_SECRET;
    
    let organizationIds: string[] = [];

    if (schedulerSecret && expectedSecret && schedulerSecret === expectedSecret) {
      // Called by scheduler - generate for all organizations
      const orgs = await prisma.organization.findMany({
        select: { id: true },
      });
      organizationIds = orgs.map((org) => org.id);
    } else if (req.auth) {
      // Called by authenticated user - only their organization
      organizationIds = [req.auth.organizationId];
    } else {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context or invalid scheduler secret.');
    }

    const data = parseBody(rentBatchSchema, req.body);
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalProcessed = 0;
    let totalFailed = 0;
    const paymentErrors: Array<{ chargeId: string; error: string }> = [];
    const concurrencyLimit = 10;

    // Generate rent charges for all specified organizations
    for (const orgId of organizationIds) {
      const leases = await prisma.lease.findMany({
        where: { organizationId: orgId, status: 'ACTIVE' },
      });

      for (let i = 0; i < leases.length; i += concurrencyLimit) {
        const batch = leases.slice(i, i + concurrencyLimit);
        const results = await Promise.all(
          batch.map(async (lease) => {
            const counters = {
              created: 0,
              skipped: 0,
              processed: 0,
              failed: 0,
              errors: [] as Array<{ chargeId: string; error: string }>,
            };

            const charge = await createRentChargeForLease(lease, data.month, data.year);
            if (!charge) {
              counters.skipped += 1;
              return counters;
            }

            counters.created += 1;

            // Try to automatically process payment if payment method is available
            try {
              const bestPaymentMethod = await findBestPaymentMethodForCharge(charge.id);
              
              if (bestPaymentMethod) {
                try {
                  const result = await processPayment(
                    charge.id,
                    bestPaymentMethod.paymentMethodId,
                    Number(charge.amount)
                  );

                  // Payment intent created successfully
                  // Note: Payment may still be processing (pending, requires_action, etc.)
                  // Webhook will update the final status
                  if (result.status === 'succeeded') {
                    counters.processed += 1;
                  } else if (result.status === 'requires_action' || result.status === 'processing') {
                    // Payment is processing, webhook will handle final status
                    counters.processed += 1;
                  } else {
                    // Payment failed immediately
                    counters.failed += 1;
                    counters.errors.push({
                      chargeId: charge.id,
                      error: `Payment status: ${result.status}`,
                    });
                  }
                } catch (paymentError: any) {
                  // Payment processing failed, but charge was created
                  counters.failed += 1;
                  counters.errors.push({
                    chargeId: charge.id,
                    error: paymentError.message || 'Payment processing failed',
                  });
                  console.error(`Failed to process payment for charge ${charge.id}:`, paymentError);
                }
              }
              // If no payment method found, charge is created but not processed (manual payment required)
            } catch (error: any) {
              // Error finding payment method, but charge was created
              console.error(`Error finding payment method for charge ${charge.id}:`, error);
            }

            return counters;
          })
        );

        for (const result of results) {
          totalCreated += result.created;
          totalSkipped += result.skipped;
          totalProcessed += result.processed;
          totalFailed += result.failed;
          paymentErrors.push(...result.errors);
        }
      }
    }

    res.json({ 
      data: { 
        created: totalCreated, 
        skipped: totalSkipped,
        paymentsProcessed: totalProcessed,
        paymentsFailed: totalFailed,
        paymentErrors: paymentErrors.length > 0 ? paymentErrors : undefined,
        organizations: organizationIds.length,
      } 
    });
  } catch (err) {
    next(err);
  }
});
