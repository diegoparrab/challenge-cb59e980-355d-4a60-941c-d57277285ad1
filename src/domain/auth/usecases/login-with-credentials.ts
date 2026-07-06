import {Result, isOk} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {AuthSession} from '@domain/auth/entities';
import {Credentials} from '@domain/auth/entities/credentials';
import {AuthRepository} from '@domain/auth/repositories/auth.repository';

export class LoginWithCredentialsUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(credentials: Credentials): Promise<Result<AuthSession, AppError>> {
    const result = await this.authRepository.loginWithCredentials(credentials);
    if (isOk(result)) {
      await this.authRepository.persistSession(result.value);
    }
    return result;
  }
}
