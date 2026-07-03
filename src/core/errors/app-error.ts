/**
 * Base error class for the application.
 * All domain/data errors extend from this.
 */

export type AppErrorCode =
  | 'UNKNOWN'
  | 'BIOMETRIC_NOT_AVAILABLE'
  | 'BIOMETRIC_NOT_ENROLLED'
  | 'BIOMETRIC_LOCKOUT'
  | 'BIOMETRIC_CANCELLED'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly originalError?: unknown;

  constructor(code: AppErrorCode, message: string, originalError?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.originalError = originalError;
  }

  static unknown(message = 'An unexpected error occurred', cause?: unknown): AppError {
    return new AppError('UNKNOWN', message, cause);
  }
}
