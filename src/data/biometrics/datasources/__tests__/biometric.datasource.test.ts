import { BiometricDatasource } from '@data/biometrics/datasources/biometric.datasource';
import { isOk, isErr } from '@core/types/result';

const mockIsSensorAvailable = jest.fn();

jest.mock('react-native-biometrics', () => {
  return jest.fn().mockImplementation(() => ({
    isSensorAvailable: mockIsSensorAvailable,
  }));
});

describe('BiometricDatasource', () => {
  let datasource: BiometricDatasource;

  beforeEach(() => {
    mockIsSensorAvailable.mockReset();
    datasource = new BiometricDatasource();
  });

  it('maps native FaceID available response to AVAILABLE/FaceID', async () => {
    mockIsSensorAvailable.mockResolvedValue({
      available: true,
      biometryType: 'FaceID',
    });

    const result = await datasource.checkCapability();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(true);
      expect(result.value.biometryType).toBe('FaceID');
      expect(result.value.reason).toBe('AVAILABLE');
    }
  });

  it('maps native TouchID available response to AVAILABLE/TouchID', async () => {
    mockIsSensorAvailable.mockResolvedValue({
      available: true,
      biometryType: 'TouchID',
    });

    const result = await datasource.checkCapability();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(true);
      expect(result.value.biometryType).toBe('TouchID');
      expect(result.value.reason).toBe('AVAILABLE');
    }
  });

  it('maps native Biometrics available response to AVAILABLE/Fingerprint', async () => {
    mockIsSensorAvailable.mockResolvedValue({
      available: true,
      biometryType: 'Biometrics',
    });

    const result = await datasource.checkCapability();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(true);
      expect(result.value.biometryType).toBe('Fingerprint');
      expect(result.value.reason).toBe('AVAILABLE');
    }
  });

  it('maps NOT_ENROLLED error to NOT_ENROLLED reason', async () => {
    mockIsSensorAvailable.mockResolvedValue({
      available: false,
      biometryType: 'FaceID',
      error: 'NOT_ENROLLED',
    });

    const result = await datasource.checkCapability();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(false);
      expect(result.value.biometryType).toBe('FaceID');
      expect(result.value.reason).toBe('NOT_ENROLLED');
    }
  });

  it('maps "not enrolled" error string to NOT_ENROLLED reason', async () => {
    mockIsSensorAvailable.mockResolvedValue({
      available: false,
      biometryType: 'TouchID',
      error: 'Biometrics not enrolled on this device',
    });

    const result = await datasource.checkCapability();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(false);
      expect(result.value.biometryType).toBe('TouchID');
      expect(result.value.reason).toBe('NOT_ENROLLED');
    }
  });

  it('maps unavailable with no error to NO_HARDWARE', async () => {
    mockIsSensorAvailable.mockResolvedValue({
      available: false,
    });

    const result = await datasource.checkCapability();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(false);
      expect(result.value.biometryType).toBeNull();
      expect(result.value.reason).toBe('NO_HARDWARE');
    }
  });

  it('returns err with BIOMETRIC_NOT_AVAILABLE when native module throws', async () => {
    mockIsSensorAvailable.mockRejectedValue(
      new Error('Native module not available'),
    );

    const result = await datasource.checkCapability();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('BIOMETRIC_NOT_AVAILABLE');
      expect(result.error.message).toBe(
        'Failed to check biometric capability',
      );
    }
  });
});
