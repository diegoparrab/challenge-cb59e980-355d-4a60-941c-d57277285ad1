import { Result, err } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricAuthResult, PromptConfig } from '../entities/biometric-auth';
import { BiometricRepository } from '../repositories/biometric.repository';

export class AuthenticateWithBiometricsUseCase {
  constructor(private readonly repository: BiometricRepository) {}

  async execute(config: PromptConfig): Promise<Result<BiometricAuthResult, AppError>> {
    const capabilityResult = await this.repository.checkCapability();

    if (capabilityResult.kind === 'err') {
      return capabilityResult;
    }

    if (!capabilityResult.value.available) {
      return err(
        new AppError(
          'BIOMETRIC_NOT_AVAILABLE',
          `Biometric not available: ${capabilityResult.value.reason}`,
        ),
      );
    }

    return this.repository.authenticate(config);
  }
}
