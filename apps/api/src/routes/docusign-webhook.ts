import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { downloadCompletedDocument } from '../lib/docusign.js';
import { AppError } from '../lib/errors.js';
import { webhookRateLimit } from '../middleware/rate-limit.js';

export const docusignWebhookRouter = Router();

// Apply rate limiting to prevent DoS attacks on webhooks
// CodeQL: Webhook endpoints must be rate-limited to prevent abuse
docusignWebhookRouter.use(webhookRateLimit);

/**
 * DocuSign webhook handler for envelope status updates
 * This endpoint should be configured in DocuSign Connect settings
 */
docusignWebhookRouter.post('/webhook', async (req, res, next) => {
  try {
    // DocuSign sends XML by default, but can be configured to send JSON
    const envelopeId = req.body?.envelopeId || req.body?.data?.envelopeId;
    const status = req.body?.status || req.body?.data?.status;

    if (!envelopeId || !status) {
      console.warn('DocuSign webhook received with missing envelopeId or status:', req.body);
      return res.status(400).json({ error: 'Missing envelopeId or status' });
    }

    // Find lease by envelope ID
    const lease = await prisma.lease.findUnique({
      where: { docusignEnvelopeId: envelopeId },
      include: { organization: true },
    });

    if (!lease) {
      console.warn(`Lease not found for envelope ID: ${envelopeId}`);
      return res.status(404).json({ error: 'Lease not found' });
    }

    // Map DocuSign status to our status
    let signatureStatus: string;
    switch (status.toLowerCase()) {
      case 'sent':
        signatureStatus = 'sent';
        break;
      case 'delivered':
        signatureStatus = 'delivered';
        break;
      case 'signed':
      case 'completed':
        signatureStatus = 'completed';
        break;
      case 'declined':
        signatureStatus = 'declined';
        break;
      case 'voided':
        signatureStatus = 'voided';
        break;
      default:
        signatureStatus = status.toLowerCase();
    }

    // Update lease status
    const updateData: any = {
      signatureStatus,
    };

    // If completed, download the signed PDF
    if (signatureStatus === 'completed') {
      const storageKey = `leases/${lease.organizationId}/signed-lease-${lease.id}-${Date.now()}.pdf`;
      
      try {
        await downloadCompletedDocument(envelopeId, storageKey);
        
        // Get signed URL
        const { getSignedUrl } = await import('../lib/storage.js');
        const signedPdfUrl = await getSignedUrl(storageKey, 365 * 24 * 60); // 1 year
        
        updateData.signedPdfUrl = signedPdfUrl;
        
        // Also create a document record
        // Find a user in the organization to use as uploader (system upload)
        const orgUser = await prisma.organizationMembership.findFirst({
          where: { organizationId: lease.organizationId },
          select: { userId: true },
        });
        
        if (orgUser) {
          await prisma.document.create({
            data: {
              organizationId: lease.organizationId,
              leaseId: lease.id,
              fileName: `signed-lease-${lease.id}.pdf`,
              fileType: 'application/pdf',
              storageKey,
              uploadedByUserId: orgUser.userId,
            },
          });
        }
      } catch (error) {
        console.error('Failed to download signed document:', error);
        // Continue with status update even if download fails
      }
    }

    await prisma.lease.update({
      where: { id: lease.id },
      data: updateData,
    });

    console.log(`Updated lease ${lease.id} with DocuSign status: ${signatureStatus}`);

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('Error processing DocuSign webhook:', err);
    next(err);
  }
});

/**
 * Manual status check endpoint (for testing or manual sync)
 */
docusignWebhookRouter.post('/check-status/:leaseId', async (req, res, next) => {
  try {
    const lease = await prisma.lease.findFirst({
      where: { id: req.params.leaseId },
    });

    if (!lease || !lease.docusignEnvelopeId) {
      throw new AppError(404, 'NOT_FOUND', 'Lease not found or not sent for signature.');
    }

    const { getEnvelopeStatus } = await import('../lib/docusign.js');
    const status = await getEnvelopeStatus(lease.docusignEnvelopeId);

    // Update lease status
    let signatureStatus: string;
    switch (status.status.toLowerCase()) {
      case 'sent':
        signatureStatus = 'sent';
        break;
      case 'delivered':
        signatureStatus = 'delivered';
        break;
      case 'signed':
      case 'completed':
        signatureStatus = 'completed';
        break;
      case 'declined':
        signatureStatus = 'declined';
        break;
      case 'voided':
        signatureStatus = 'voided';
        break;
      default:
        signatureStatus = status.status.toLowerCase();
    }

    await prisma.lease.update({
      where: { id: lease.id },
      data: { signatureStatus },
    });

    res.json({
      data: {
        envelopeId: lease.docusignEnvelopeId,
        status: signatureStatus,
        statusDateTime: status.statusDateTime,
        completedDateTime: status.completedDateTime,
      },
    });
  } catch (err) {
    next(err);
  }
});

