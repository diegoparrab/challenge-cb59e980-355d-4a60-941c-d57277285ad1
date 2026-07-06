import { BiometricErrorCode } from '@domain/biometrics/entities/biometric-error';

export function mapNativeError(nativeCode: unknown): BiometricErrorCode {
  if (typeof nativeCode !== 'string' || nativeCode.trim() === '') {
    return 'UNKNOWN';
  }

  const input = nativeCode.trim().toLowerCase();

  if (input.includes('user cancel')) {
    return 'USER_CANCELLED';
  }

  if (
    input.includes('too many attempts') ||
    input.includes('demasiados intentos') ||
    input.includes('locked out') ||
    input.includes('bloqueada')
  ) {
    return 'LOCKOUT';
  }

  return 'UNKNOWN';
}
