import {Result} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {AuthSession} from '@domain/auth/entities';
import {AuthRepository} from '@domain/auth/repositories/auth.repository';

export class GetSessionStateUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(): Promise<Result<AuthSession | null, AppError>> {
    return this.authRepository.getSession();
  }
}
