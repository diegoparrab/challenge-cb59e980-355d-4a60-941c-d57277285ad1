import {Result} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {AuthSession} from '../entities/auth-session';
import {Credentials} from '../entities/credentials';

export interface AuthRepository {
  loginWithCredentials(
    credentials: Credentials,
  ): Promise<Result<AuthSession, AppError>>;
  logout(): Promise<Result<void, AppError>>;
  getSession(): Promise<Result<AuthSession | null, AppError>>;
  persistSession(session: AuthSession): Promise<Result<void, AppError>>;
}
