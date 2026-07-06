import {Result} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {AuthSession} from '@domain/auth/entities';

export interface BiometricEnrollmentRepository {
  enroll(userId: string): Promise<Result<string, AppError>>;
  isEnrolled(): Promise<Result<boolean, AppError>>;
  loginWithBiometrics(): Promise<Result<AuthSession, AppError>>;
  unenroll(): Promise<Result<void, AppError>>;
  getPublicKey(): Promise<Result<string | null, AppError>>;
  isEnrollmentRejected(): Promise<Result<boolean, AppError>>;
  rejectEnrollment(): Promise<Result<void, AppError>>;
  clearRejection(): Promise<Result<void, AppError>>;
}
