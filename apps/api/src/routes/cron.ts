import { Router } from 'express';
import { applyLateFeesToOverdueFees } from '../lib/hoa-late-fees.js';
import { env } from '../config/env.js';

export const cronRouter = Router();

/**
 * Cron endpoint to apply late fees to overdue HOA fees
 * Should be called daily via a cron job service (e.g., GitHub Actions, cron-job.org, etc.)
 * 
 * Security: This endpoint should be protected with a secret token
 */
cronRouter.post('/apply-late-fees', async (req, res, next) => {
  try {
    // Verify cron secret token (if configured)
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
    if (env.CRON_SECRET && cronSecret !== env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const associationId = req.query.associationId as string | undefined;

    const result = await applyLateFeesToOverdueFees(associationId);

    res.json({
      success: true,
      message: `Applied late fees to ${result.feesUpdated} overdue fees. Total late fees: $${result.totalLateFeesApplied.toFixed(2)}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

