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
