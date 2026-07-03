import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricCapability } from '@domain/biometrics/entities/biometric-capability';
import { BiometricRepository } from '@domain/biometrics/repositories/biometric.repository';
import { BiometricDatasource } from '../datasources/biometric.datasource';

export class BiometricRepositoryImpl implements BiometricRepository {
  constructor(private readonly datasource: BiometricDatasource) {}

  checkCapability(): Promise<Result<BiometricCapability, AppError>> {
    return this.datasource.checkCapability();
  }
}
