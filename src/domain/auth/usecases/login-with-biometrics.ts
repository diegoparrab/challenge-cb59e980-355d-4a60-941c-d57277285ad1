import {Result, isOk} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {AuthSession} from '@domain/auth/entities';
import {BiometricEnrollmentRepository} from '@domain/auth/repositories/biometric-enrollment.repository';
import {AuthRepository} from '@domain/auth/repositories/auth.repository';

export class LoginWithBiometricsUseCase {
  constructor(
    private enrollmentRepository: BiometricEnrollmentRepository,
    private authRepository: AuthRepository,
  ) {}

  async execute(): Promise<Result<AuthSession, AppError>> {
    const result = await this.enrollmentRepository.loginWithBiometrics();
    if (isOk(result)) {
      await this.authRepository.persistSession(result.value);
    }
    return result;
  }
}
