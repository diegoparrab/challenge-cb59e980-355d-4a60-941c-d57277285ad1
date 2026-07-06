import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricCapability } from '@domain/biometrics/entities/biometric-capability';
import {
  PromptConfig,
  BiometricAuthResult,
} from '@domain/biometrics/entities/biometric-auth';
import { BiometricError } from '@domain/biometrics/entities/biometric-error';
import { BiometricRepository } from '@domain/biometrics/repositories/biometric.repository';
import { BiometricDatasource } from '../datasources/biometric.datasource';

export class BiometricRepositoryImpl implements BiometricRepository {
  constructor(private readonly datasource: BiometricDatasource) {}

  checkCapability(): Promise<Result<BiometricCapability, AppError>> {
    return this.datasource.checkCapability();
  }

  authenticate(
    config: PromptConfig,
  ): Promise<Result<BiometricAuthResult, BiometricError>> {
    return this.datasource.authenticate(config);
  }
}
