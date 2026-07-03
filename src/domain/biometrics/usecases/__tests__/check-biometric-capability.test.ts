import { CheckBiometricCapabilityUseCase } from '@domain/biometrics/usecases/check-biometric-capability';
import { BiometricRepository } from '@domain/biometrics/repositories/biometric.repository';
import {
  BiometricCapability,
  createBiometricCapability,
} from '@domain/biometrics/entities/biometric-capability';
import { Result, ok, err, isOk, isErr } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import {
  PromptConfig,
  BiometricAuthResult,
} from '@domain/biometrics/entities/biometric-auth';

class FakeBiometricRepository implements BiometricRepository {
  private result: Result<BiometricCapability, AppError>;

  constructor(result: Result<BiometricCapability, AppError>) {
    this.result = result;
  }

  setResult(result: Result<BiometricCapability, AppError>): void {
    this.result = result;
  }

  async checkCapability(): Promise<Result<BiometricCapability, AppError>> {
    return this.result;
  }

  async authenticate(
    _config: PromptConfig,
  ): Promise<Result<BiometricAuthResult, AppError>> {
    return ok({ success: true });
  }
}

describe('CheckBiometricCapabilityUseCase', () => {
  it('forwards AVAILABLE result with FaceID correctly', async () => {
    const capability = createBiometricCapability('AVAILABLE', 'FaceID');
    const repository = new FakeBiometricRepository(ok(capability));
    const useCase = new CheckBiometricCapabilityUseCase(repository);

    const result = await useCase.execute();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(true);
      expect(result.value.biometryType).toBe('FaceID');
      expect(result.value.reason).toBe('AVAILABLE');
    }
  });

  it('forwards AVAILABLE result with TouchID correctly', async () => {
    const capability = createBiometricCapability('AVAILABLE', 'TouchID');
    const repository = new FakeBiometricRepository(ok(capability));
    const useCase = new CheckBiometricCapabilityUseCase(repository);

    const result = await useCase.execute();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(true);
      expect(result.value.biometryType).toBe('TouchID');
      expect(result.value.reason).toBe('AVAILABLE');
    }
  });

  it('forwards AVAILABLE result with Fingerprint correctly', async () => {
    const capability = createBiometricCapability('AVAILABLE', 'Fingerprint');
    const repository = new FakeBiometricRepository(ok(capability));
    const useCase = new CheckBiometricCapabilityUseCase(repository);

    const result = await useCase.execute();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(true);
      expect(result.value.biometryType).toBe('Fingerprint');
      expect(result.value.reason).toBe('AVAILABLE');
    }
  });

  it('forwards NOT_ENROLLED result correctly', async () => {
    const capability = createBiometricCapability('NOT_ENROLLED', 'FaceID');
    const repository = new FakeBiometricRepository(ok(capability));
    const useCase = new CheckBiometricCapabilityUseCase(repository);

    const result = await useCase.execute();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(false);
      expect(result.value.biometryType).toBe('FaceID');
      expect(result.value.reason).toBe('NOT_ENROLLED');
    }
  });

  it('forwards NO_HARDWARE result correctly', async () => {
    const capability = createBiometricCapability('NO_HARDWARE', null);
    const repository = new FakeBiometricRepository(ok(capability));
    const useCase = new CheckBiometricCapabilityUseCase(repository);

    const result = await useCase.execute();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBe(false);
      expect(result.value.biometryType).toBeNull();
      expect(result.value.reason).toBe('NO_HARDWARE');
    }
  });

  it('propagates error from repository unchanged', async () => {
    const appError = new AppError(
      'BIOMETRIC_NOT_AVAILABLE',
      'Sensor check failed',
    );
    const repository = new FakeBiometricRepository(err(appError));
    const useCase = new CheckBiometricCapabilityUseCase(repository);

    const result = await useCase.execute();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe(appError);
      expect(result.error.code).toBe('BIOMETRIC_NOT_AVAILABLE');
      expect(result.error.message).toBe('Sensor check failed');
    }
  });
});
