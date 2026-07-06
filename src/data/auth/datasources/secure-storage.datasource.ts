import * as Keychain from 'react-native-keychain';
import { Result, ok, err } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { AuthSession } from '@domain/auth/entities/auth-session';

interface SecureStorageConfig {
  readonly accessible: Keychain.ACCESSIBLE;
  readonly accessControl: Keychain.ACCESS_CONTROL;
}

const SERVICE_SESSION = 'com.app.session';
const SERVICE_ENROLLMENT = 'com.app.enrollment';
const SERVICE_REJECTION = 'com.app.rejection';

export class SecureStorageDatasource {
  private static readonly CONFIG: SecureStorageConfig = {
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
  };

  async storeSession(session: AuthSession): Promise<Result<void, AppError>> {
    try {
      const serialized = JSON.stringify(session);
      await Keychain.setGenericPassword('session', serialized, {
        service: SERVICE_SESSION,
        accessible: SecureStorageDatasource.CONFIG.accessible,
        accessControl: SecureStorageDatasource.CONFIG.accessControl,
      });
      return ok(undefined);
    } catch (e: unknown) {
      return err(
        new AppError('STORAGE_ERROR', 'Failed to store session', e),
      );
    }
  }

  async getSession(): Promise<Result<AuthSession | null, AppError>> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_SESSION,
        accessControl: SecureStorageDatasource.CONFIG.accessControl,
      });
      if (!credentials) {
        return ok(null);
      }
      const session: AuthSession = JSON.parse(credentials.password);
      return ok(session);
    } catch (e: unknown) {
      return err(
        new AppError('STORAGE_ERROR', 'Failed to retrieve session', e),
      );
    }
  }

  async clearSession(): Promise<Result<void, AppError>> {
    try {
      await Keychain.resetGenericPassword({ service: SERVICE_SESSION });
      return ok(undefined);
    } catch (e: unknown) {
      return err(
        new AppError('STORAGE_ERROR', 'Failed to clear session', e),
      );
    }
  }

  async storeEnrollmentFlag(userId: string): Promise<Result<void, AppError>> {
    try {
      await Keychain.setGenericPassword('enrollment', userId, {
        service: SERVICE_ENROLLMENT,
        accessible: SecureStorageDatasource.CONFIG.accessible,
        accessControl: SecureStorageDatasource.CONFIG.accessControl,
      });
      return ok(undefined);
    } catch (e: unknown) {
      return err(
        new AppError('STORAGE_ERROR', 'Failed to store enrollment flag', e),
      );
    }
  }

  async getEnrollmentFlag(): Promise<Result<string | null, AppError>> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_ENROLLMENT,
        accessControl: SecureStorageDatasource.CONFIG.accessControl,
      });
      if (!credentials) {
        return ok(null);
      }
      return ok(credentials.password);
    } catch (e: unknown) {
      return err(
        new AppError('STORAGE_ERROR', 'Failed to retrieve enrollment flag', e),
      );
    }
  }

  async clearEnrollmentFlag(): Promise<Result<void, AppError>> {
    try {
      await Keychain.resetGenericPassword({ service: SERVICE_ENROLLMENT });
      return ok(undefined);
    } catch (e: unknown) {
      return err(
        new AppError('STORAGE_ERROR', 'Failed to clear enrollment flag', e),
      );
    }
  }

  async storeRejectionFlag(userId: string): Promise<Result<void, AppError>> {
    try {
      await Keychain.setGenericPassword('rejection', userId, {
        service: SERVICE_REJECTION,
        accessible: SecureStorageDatasource.CONFIG.accessible,
        accessControl: SecureStorageDatasource.CONFIG.accessControl,
      });
      return ok(undefined);
    } catch (e: unknown) {
      return err(
        new AppError('STORAGE_ERROR', 'Failed to store rejection flag', e),
      );
    }
  }

  async getRejectionFlag(): Promise<Result<string | null, AppError>> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_REJECTION,
        accessControl: SecureStorageDatasource.CONFIG.accessControl,
      });
      if (!credentials) {
        return ok(null);
      }
      return ok(credentials.password);
    } catch (e: unknown) {
      return err(
        new AppError('STORAGE_ERROR', 'Failed to retrieve rejection flag', e),
      );
    }
  }

  async clearRejectionFlag(): Promise<Result<void, AppError>> {
    try {
      await Keychain.resetGenericPassword({ service: SERVICE_REJECTION });
      return ok(undefined);
    } catch (e: unknown) {
      return err(
        new AppError('STORAGE_ERROR', 'Failed to clear rejection flag', e),
      );
    }
  }

  async getSecurityLevel(): Promise<Result<string, AppError>> {
    try {
      const level = await Keychain.getSecurityLevel();
      if (level === null || level === undefined) {
        return ok('UNKNOWN');
      }
      return ok(this.mapSecurityLevel(level));
    } catch (e: unknown) {
      return err(
        new AppError('STORAGE_ERROR', 'Failed to get security level', e),
      );
    }
  }

  private mapSecurityLevel(level: Keychain.SECURITY_LEVEL): string {
    switch (level) {
      case Keychain.SECURITY_LEVEL.SECURE_HARDWARE:
        return 'SECURE_HARDWARE';
      case Keychain.SECURITY_LEVEL.SECURE_SOFTWARE:
        return 'SECURE_SOFTWARE';
      case Keychain.SECURITY_LEVEL.ANY:
        return 'ANY';
      default:
        return 'UNKNOWN';
    }
  }
}
