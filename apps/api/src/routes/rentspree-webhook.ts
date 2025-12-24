import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyWebhookSignature } from '../lib/rentspree.js';
import { AppError } from '../lib/errors.js';
import { webhookRateLimit } from '../middleware/rate-limit.js';

export const rentspreeWebhookRouter = Router();

// Apply rate limiting to prevent DoS attacks on webhooks
// CodeQL: Webhook endpoints must be rate-limited to prevent abuse
rentspreeWebhookRouter.use(webhookRateLimit);

/**
 * RentSpree webhook handler for screening status updates
 * This endpoint should be configured in RentSpree dashboard
 */
rentspreeWebhookRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-rentspree-signature'] as string;
    const webhookSecret = process.env.RENTSPREE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('RentSpree webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const payload = JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(payload, signature, webhookSecret);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const applicationId = event.applicationId || event.id;

    if (!applicationId) {
      console.warn('Webhook received without applicationId:', event);
      return res.status(400).json({ error: 'Missing applicationId' });
    }

    // Find screening request by external request ID
    const screeningRequest = await prisma.screeningRequest.findUnique({
      where: { externalRequestId: applicationId },
      include: { tenant: true },
    });

    if (!screeningRequest) {
      console.warn(`Screening request not found for applicationId: ${applicationId}`);
      return res.status(404).json({ error: 'Screening request not found' });
    }

    // Update screening request with data from webhook
    const updateData: any = {
      status: event.status || screeningRequest.status,
    };

    // Extract screening results
    if (event.recommendation || event.decision) {
      updateData.recommendation = event.recommendation || event.decision;
    }

    if (event.creditScore !== undefined) {
      updateData.creditScore = event.creditScore;
    }

    if (event.incomeVerified !== undefined) {
      updateData.incomeVerified = event.incomeVerified;
    }

    if (event.evictionHistory !== undefined) {
      updateData.evictionHistory = event.evictionHistory;
    }

    if (event.criminalHistory !== undefined) {
      updateData.criminalHistory = event.criminalHistory;
    }

    if (event.flags || event.warnings) {
      updateData.flags = JSON.stringify(event.flags || event.warnings || []);
    }

    if (event.reportUrl || event.pdfUrl) {
      updateData.reportPdfUrl = event.reportUrl || event.pdfUrl;
    }

    if (event.status === 'COMPLETED' || event.status === 'APPROVED' || event.status === 'DECLINED') {
      updateData.completedAt = new Date();
    }

    await prisma.screeningRequest.update({
      where: { id: screeningRequest.id },
      data: updateData,
    });

    // Update tenant status based on screening results
    if (screeningRequest.tenant) {
      let tenantStatus = screeningRequest.tenant.status;
      
      if (event.status === 'APPROVED' || updateData.recommendation === 'APPROVED') {
        tenantStatus = 'APPROVED';
      } else if (event.status === 'DECLINED' || updateData.recommendation === 'DECLINED') {
        tenantStatus = 'DECLINED';
      } else if (event.status === 'COMPLETED' && tenantStatus === 'SCREENING') {
        // Keep as APPROVED if already approved, otherwise keep current status
        // (screening completed but recommendation might be BORDERLINE)
      }

      if (tenantStatus !== screeningRequest.tenant.status) {
        await prisma.tenant.update({
          where: { id: screeningRequest.tenant.id },
          data: { status: tenantStatus },
        });
      }
    }

    console.log(`Updated screening request ${screeningRequest.id} with status: ${updateData.status}`);

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err: any) {
    console.error('Error processing RentSpree webhook:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

