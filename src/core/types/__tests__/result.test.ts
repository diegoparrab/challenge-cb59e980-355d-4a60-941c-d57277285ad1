import { ok, err, isOk, isErr, Result } from '@core/types';
import { AppError } from '@core/errors';

describe('Result', () => {
  describe('ok()', () => {
    it('creates a success result with the given value', () => {
      const result = ok(42);
      expect(result.kind).toBe('ok');
      expect(result.value).toBe(42);
    });

    it('works with complex types', () => {
      const result = ok({ name: 'test', active: true });
      expect(result.kind).toBe('ok');
      expect(result.value).toEqual({ name: 'test', active: true });
    });
  });

  describe('err()', () => {
    it('creates an error result with the given error', () => {
      const error = AppError.unknown('something failed');
      const result = err(error);
      expect(result.kind).toBe('err');
      expect(result.error).toBe(error);
    });
  });

  describe('isOk()', () => {
    it('returns true for ok results', () => {
      const result: Result<number, AppError> = ok(1);
      expect(isOk(result)).toBe(true);
    });

    it('returns false for err results', () => {
      const result: Result<number, AppError> = err(AppError.unknown());
      expect(isOk(result)).toBe(false);
    });
  });

  describe('isErr()', () => {
    it('returns true for err results', () => {
      const result: Result<number, AppError> = err(AppError.unknown());
      expect(isErr(result)).toBe(true);
    });

    it('returns false for ok results', () => {
      const result: Result<number, AppError> = ok(1);
      expect(isErr(result)).toBe(false);
    });
  });

  describe('type narrowing', () => {
    it('narrows type after isOk check', () => {
      const result: Result<string, AppError> = ok('hello');
      if (isOk(result)) {
        // TypeScript should know result.value is string here
        expect(result.value.toUpperCase()).toBe('HELLO');
      }
    });

    it('narrows type after isErr check', () => {
      const result: Result<string, AppError> = err(
        new AppError('NETWORK_ERROR', 'connection failed'),
      );
      if (isErr(result)) {
        // TypeScript should know result.error is AppError here
        expect(result.error.code).toBe('NETWORK_ERROR');
      }
    });
  });
});
