import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { getOrganizationFees } from '../lib/organization-fees.js';

export const organizationFeesRouter = Router();

// List organization fees
organizationFeesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const schema = z.object({
      feeType: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    });

    const query = schema.parse(req.query);
    const options = {
      feeType: query.feeType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const fees = await getOrganizationFees(req.auth.organizationId, options);

    res.json({ data: fees });
  } catch (err) {
    next(err);
  }
});

