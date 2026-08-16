/**
 * Typed error taxonomy — see skills/bookstore-core (Error taxonomy).
 * Services throw AppError; UI maps code → safe message. Raw database /
 * Supabase errors must never reach the user.
 */

export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'AUTHZ_ERROR'
  | 'NOT_FOUND'
  | 'BUSINESS_RULE'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNEXPECTED';

const DEFAULT_MESSAGES: Record<AppErrorCode, string> = {
  VALIDATION_ERROR: 'Please check the form and try again.',
  AUTH_ERROR: 'You must be signed in to do that.',
  AUTHZ_ERROR: 'You do not have permission for this action.',
  NOT_FOUND: 'The requested record was not found.',
  BUSINESS_RULE: 'This operation is not allowed.',
  DATABASE_ERROR: 'Something went wrong saving your changes. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNEXPECTED: 'Something went wrong. Please try again.',
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message?: string, details?: unknown) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/** Normalize any thrown value into an AppError so raw messages never leak. */
export function fromError(e: unknown): AppError {
  if (isAppError(e)) return e;
  if (e instanceof Error) {
    return new AppError('UNEXPECTED', undefined, { message: e.message });
  }
  return new AppError('UNEXPECTED');
}

/** Safe user-facing message for any thrown value. */
export function safeMessage(e: unknown): string {
  return fromError(e).message;
}

/**
 * Map a Supabase/Postgrest error to AppError (bookstore-supabase).
 * Raw database messages never reach the UI.
 */
export function mapDbError(error: { message?: string; code?: string } | null): AppError {
  if (!error) return new AppError('UNEXPECTED');
  if (error.code === '23505') {
    return new AppError('VALIDATION_ERROR', 'This record already exists (duplicate value).');
  }
  if (error.code === '23503') {
    return new AppError('BUSINESS_RULE', 'This record is in use and cannot be changed.');
  }
  return new AppError('DATABASE_ERROR');
}

/**
 * Map a failed RPC call (symbolic exceptions raised by the functions in
 * supabase/migrations/0001_init.sql) to AppError.
 */
export function mapRpcError(error: { message?: string } | null): AppError {
  const msg = (error?.message ?? '').toLowerCase();
  if (msg.includes('authz_denied')) return new AppError('AUTHZ_ERROR');
  if (msg.includes('insufficient_stock') || msg.includes('negative_stock')) {
    return new AppError('BUSINESS_RULE', 'Insufficient stock for this operation.');
  }
  if (msg.includes('empty_cart')) return new AppError('VALIDATION_ERROR', 'The cart is empty.');
  if (msg.includes('invalid_quantity')) return new AppError('VALIDATION_ERROR', 'Quantity must be greater than zero.');
  if (msg.includes('discount_exceeds_limit')) return new AppError('BUSINESS_RULE', 'Discount exceeds the allowed limit.');
  if (msg.includes('tendered_below_total')) return new AppError('VALIDATION_ERROR', 'Amount tendered is less than the total.');
  if (msg.includes('purchase_not_receivable')) return new AppError('BUSINESS_RULE', 'This purchase cannot be received in its current state.');
  if (msg.includes('sale_not_voidable')) return new AppError('BUSINESS_RULE', 'This sale cannot be voided.');
  if (msg.includes('sale_not_refundable')) return new AppError('BUSINESS_RULE', 'This sale cannot be refunded.');
  if (msg.includes('refund_exceeds')) return new AppError('BUSINESS_RULE', 'Refund exceeds what can be refunded.');
  if (msg.includes('book_not_found')) return new AppError('NOT_FOUND', 'Book not found.');
  if (msg.includes('image_not_found')) return new AppError('NOT_FOUND', 'Image not found.');
  return new AppError('DATABASE_ERROR', 'The operation failed. Please try again.');
}
