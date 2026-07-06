import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';

export interface BiometricKeysRepository {
  createKeys(): Promise<Result<string, AppError>>;
  createSignature(payload: string): Promise<Result<string, AppError>>;
  deleteKeys(): Promise<Result<void, AppError>>;
  biometricKeysExist(): Promise<Result<boolean, AppError>>;
}
