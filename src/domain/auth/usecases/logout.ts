import {Result} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {AuthRepository} from '@domain/auth/repositories/auth.repository';

export class LogoutUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(): Promise<Result<void, AppError>> {
    return this.authRepository.logout();
  }
}
