import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { runOpsAssistant } from '../lib/ops-assistant.js';
import { requireAuth } from '../middleware/auth.js';
import { parseBody } from '../validators/common.js';

export const chatRouter = Router();

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
});

chatRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const { message } = parseBody(chatRequestSchema, req.body);
    const result = await runOpsAssistant(req.auth.organizationId, message);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});
