import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricCapability } from '../entities/biometric-capability';

export interface BiometricRepository {
  checkCapability(): Promise<Result<BiometricCapability, AppError>>;
}
