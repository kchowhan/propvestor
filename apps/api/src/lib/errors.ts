export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR'
  | 'CONFIG_ERROR'
  | 'DOCUSIGN_AUTH_ERROR'
  | 'DOCUSIGN_ERROR'
  | 'RENTSPREE_ERROR'
  | 'SCHEDULER_ERROR'
  | 'SUBSCRIPTION_REQUIRED'
  | 'PAYMENT_REQUIRED'
  | 'TRIAL_EXPIRED'
  | 'FEATURE_NOT_AVAILABLE'
  | 'LIMIT_EXCEEDED';

export class AppError extends Error {
  status: number;
  code: ErrorCode;
  details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errorResponse = (err: AppError | Error) => {
  if (err instanceof AppError) {
    return { status: err.status, body: { error: { code: err.code, message: err.message, details: err.details } } };
  }

  return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Unexpected error.' } } };
};
