import { AppError } from '@core/errors';

describe('AppError', () => {
  it('creates an error with code and message', () => {
    const error = new AppError('BIOMETRIC_NOT_AVAILABLE', 'No biometric hardware');

    expect(error.code).toBe('BIOMETRIC_NOT_AVAILABLE');
    expect(error.message).toBe('No biometric hardware');
    expect(error.name).toBe('AppError');
    expect(error.originalError).toBeUndefined();
  });

  it('preserves the original error when provided', () => {
    const original = new Error('native crash');
    const error = new AppError('UNKNOWN', 'wrapped error', original);

    expect(error.originalError).toBe(original);
  });

  it('is an instance of Error', () => {
    const error = new AppError('STORAGE_ERROR', 'disk full');
    expect(error).toBeInstanceOf(Error);
  });

  describe('AppError.unknown()', () => {
    it('creates an UNKNOWN error with default message', () => {
      const error = AppError.unknown();
      expect(error.code).toBe('UNKNOWN');
      expect(error.message).toBe('An unexpected error occurred');
    });

    it('creates an UNKNOWN error with custom message', () => {
      const error = AppError.unknown('something weird');
      expect(error.code).toBe('UNKNOWN');
      expect(error.message).toBe('something weird');
    });

    it('attaches the cause when provided', () => {
      const cause = new TypeError('null reference');
      const error = AppError.unknown('wrapped', cause);
      expect(error.originalError).toBe(cause);
    });
  });
});
