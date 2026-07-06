import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricCapability } from '../entities/biometric-capability';
import { PromptConfig, BiometricAuthResult } from '../entities/biometric-auth';
import { BiometricError } from '../entities/biometric-error';

export interface BiometricRepository {
  checkCapability(): Promise<Result<BiometricCapability, AppError>>;
  authenticate(config: PromptConfig): Promise<Result<BiometricAuthResult, BiometricError>>;
}
