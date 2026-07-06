import {Result} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {AuthSession} from '@domain/auth/entities/auth-session';
import {Credentials} from '@domain/auth/entities/credentials';
import {AuthRepository} from '@domain/auth/repositories/auth.repository';
import {FakeAuthBackend} from '../datasources/fake-auth-backend';
import {SecureStorageDatasource} from '../datasources/secure-storage.datasource';

export class AuthRepositoryImpl implements AuthRepository {
  constructor(
    private readonly fakeBackend: FakeAuthBackend,
    private readonly secureStorage: SecureStorageDatasource,
  ) {}

  async loginWithCredentials(
    credentials: Credentials,
  ): Promise<Result<AuthSession, AppError>> {
    return this.fakeBackend.validateCredentials(
      credentials.username,
      credentials.password,
    );
  }

  async logout(): Promise<Result<void, AppError>> {
    return this.secureStorage.clearSession();
  }

  async getSession(): Promise<Result<AuthSession | null, AppError>> {
    return this.secureStorage.getSession();
  }

  async persistSession(session: AuthSession): Promise<Result<void, AppError>> {
    return this.secureStorage.storeSession(session);
  }
}
