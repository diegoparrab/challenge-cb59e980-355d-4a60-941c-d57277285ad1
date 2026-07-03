import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricCapability } from '../entities/biometric-capability';
import { BiometricRepository } from '../repositories/biometric.repository';

export class CheckBiometricCapabilityUseCase {
  constructor(private readonly repository: BiometricRepository) {}

  execute(): Promise<Result<BiometricCapability, AppError>> {
    return this.repository.checkCapability();
  }
}
