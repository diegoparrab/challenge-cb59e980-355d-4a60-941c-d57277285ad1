import { BiometricKeysDatasource } from '@data/biometrics/datasources/biometric-keys.datasource';
import { isOk, isErr } from '@core/types/result';

const mockCreateKeys = jest.fn();
const mockCreateSignature = jest.fn();
const mockDeleteKeys = jest.fn();
const mockBiometricKeysExist = jest.fn();

jest.mock('react-native-biometrics', () => {
  return jest.fn().mockImplementation(() => ({
    createKeys: mockCreateKeys,
    createSignature: mockCreateSignature,
    deleteKeys: mockDeleteKeys,
    biometricKeysExist: mockBiometricKeysExist,
  }));
});

describe('BiometricKeysDatasource', () => {
  let datasource: BiometricKeysDatasource;

  beforeEach(() => {
    mockCreateKeys.mockReset();
    mockCreateSignature.mockReset();
    mockDeleteKeys.mockReset();
    mockBiometricKeysExist.mockReset();
    datasource = new BiometricKeysDatasource();
  });

  describe('createKeys', () => {
    it('returns public key on success', async () => {
      mockCreateKeys.mockResolvedValue({ publicKey: 'test-public-key-abc123' });

      const result = await datasource.createKeys();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('test-public-key-abc123');
      }
    });

    it('returns err with BIOMETRIC_NOT_AVAILABLE when native module throws', async () => {
      mockCreateKeys.mockRejectedValue(new Error('Hardware unavailable'));

      const result = await datasource.createKeys();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('BIOMETRIC_NOT_AVAILABLE');
      }
    });
  });

  describe('createSignature', () => {
    it('returns signature on success', async () => {
      mockCreateSignature.mockResolvedValue({
        success: true,
        signature: 'signed-payload-xyz',
      });

      const result = await datasource.createSignature('challenge-nonce');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('signed-payload-xyz');
      }
    });

    it('returns BIOMETRIC_CANCELLED when user cancels via error field', async () => {
      mockCreateSignature.mockResolvedValue({
        success: false,
        error: 'user cancel',
      });

      const result = await datasource.createSignature('payload');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('BIOMETRIC_CANCELLED');
      }
    });

    it('returns BIOMETRIC_NOT_AVAILABLE when signature fails without cancellation', async () => {
      mockCreateSignature.mockResolvedValue({
        success: false,
        error: 'some unknown error',
      });

      const result = await datasource.createSignature('payload');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('BIOMETRIC_NOT_AVAILABLE');
      }
    });

    it('maps KeyPermanentlyInvalidatedException to BIOMETRIC_KEY_INVALIDATED', async () => {
      mockCreateSignature.mockRejectedValue(
        new Error('KeyPermanentlyInvalidatedException: key permanently invalidated'),
      );

      const result = await datasource.createSignature('payload');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('BIOMETRIC_KEY_INVALIDATED');
      }
    });

    it('maps "key invalidated" error to BIOMETRIC_KEY_INVALIDATED', async () => {
      mockCreateSignature.mockRejectedValue(
        new Error('key invalidated after biometric change'),
      );

      const result = await datasource.createSignature('payload');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('BIOMETRIC_KEY_INVALIDATED');
      }
    });

    it('maps user cancel exception to BIOMETRIC_CANCELLED', async () => {
      mockCreateSignature.mockRejectedValue(
        new Error('user cancel'),
      );

      const result = await datasource.createSignature('payload');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('BIOMETRIC_CANCELLED');
      }
    });

    it('maps unknown exceptions to BIOMETRIC_NOT_AVAILABLE', async () => {
      mockCreateSignature.mockRejectedValue(
        new Error('unexpected native crash'),
      );

      const result = await datasource.createSignature('payload');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('BIOMETRIC_NOT_AVAILABLE');
      }
    });
  });

  describe('deleteKeys', () => {
    it('returns ok(undefined) on success', async () => {
      mockDeleteKeys.mockResolvedValue({ keysDeleted: true });

      const result = await datasource.deleteKeys();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeUndefined();
      }
    });

    it('returns err with BIOMETRIC_NOT_AVAILABLE when native module throws', async () => {
      mockDeleteKeys.mockRejectedValue(new Error('Failed to delete'));

      const result = await datasource.deleteKeys();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('BIOMETRIC_NOT_AVAILABLE');
      }
    });
  });

  describe('biometricKeysExist', () => {
    it('returns true when keys exist', async () => {
      mockBiometricKeysExist.mockResolvedValue({ keysExist: true });

      const result = await datasource.biometricKeysExist();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    it('returns false when keys do not exist', async () => {
      mockBiometricKeysExist.mockResolvedValue({ keysExist: false });

      const result = await datasource.biometricKeysExist();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });

    it('returns err with BIOMETRIC_NOT_AVAILABLE when native module throws', async () => {
      mockBiometricKeysExist.mockRejectedValue(new Error('Check failed'));

      const result = await datasource.biometricKeysExist();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('BIOMETRIC_NOT_AVAILABLE');
      }
    });
  });
});
