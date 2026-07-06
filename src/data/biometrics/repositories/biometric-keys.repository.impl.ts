import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricKeysRepository } from '@domain/biometrics/repositories/biometric-keys.repository';
import { BiometricKeysDatasource } from '../datasources/biometric-keys.datasource';

export class BiometricKeysRepositoryImpl implements BiometricKeysRepository {
  constructor(private readonly datasource: BiometricKeysDatasource) {}

  createKeys(): Promise<Result<string, AppError>> {
    return this.datasource.createKeys();
  }

  createSignature(payload: string): Promise<Result<string, AppError>> {
    return this.datasource.createSignature(payload);
  }

  deleteKeys(): Promise<Result<void, AppError>> {
    return this.datasource.deleteKeys();
  }

  biometricKeysExist(): Promise<Result<boolean, AppError>> {
    return this.datasource.biometricKeysExist();
  }
}
