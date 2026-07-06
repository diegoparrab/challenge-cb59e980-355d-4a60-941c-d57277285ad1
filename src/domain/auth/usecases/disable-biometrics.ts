import {Result} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {BiometricEnrollmentRepository} from '@domain/auth/repositories/biometric-enrollment.repository';

export class DisableBiometricsUseCase {
  constructor(private enrollmentRepository: BiometricEnrollmentRepository) {}

  async execute(): Promise<Result<void, AppError>> {
    return this.enrollmentRepository.unenroll();
  }
}
