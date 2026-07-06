import {Result} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {BiometricEnrollmentRepository} from '@domain/auth/repositories/biometric-enrollment.repository';

export class EnrollBiometricsUseCase {
  constructor(private enrollmentRepository: BiometricEnrollmentRepository) {}

  async execute(userId: string): Promise<Result<string, AppError>> {
    return this.enrollmentRepository.enroll(userId);
  }
}
