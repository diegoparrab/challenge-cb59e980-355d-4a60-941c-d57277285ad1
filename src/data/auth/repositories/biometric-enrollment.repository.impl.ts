import {Result, ok, err, isOk, isErr} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {AuthSession} from '@domain/auth/entities';
import {BiometricEnrollmentRepository} from '@domain/auth/repositories/biometric-enrollment.repository';
import {BiometricKeysRepository} from '@domain/biometrics/repositories/biometric-keys.repository';
import {FakeAuthBackend} from '@data/auth/datasources/fake-auth-backend';
import {SecureStorageDatasource} from '@data/auth/datasources/secure-storage.datasource';

export class BiometricEnrollmentRepositoryImpl
  implements BiometricEnrollmentRepository
{
  constructor(
    private readonly biometricKeysRepository: BiometricKeysRepository,
    private readonly fakeBackend: FakeAuthBackend,
    private readonly secureStorage: SecureStorageDatasource,
  ) {}

  async enroll(userId: string): Promise<Result<string, AppError>> {
    const keysResult = await this.biometricKeysRepository.createKeys();

    if (isErr(keysResult)) {
      return err(
        new AppError(
          'AUTH_ENROLLMENT_FAILED',
          'Failed to create biometric keys',
          keysResult.error,
        ),
      );
    }

    const publicKey = keysResult.value;
    this.fakeBackend.registerPublicKey(userId, publicKey);

    const storeResult = await this.secureStorage.storeEnrollmentFlag(userId);

    if (isErr(storeResult)) {
      return err(storeResult.error);
    }

    return ok(publicKey);
  }

  async isEnrolled(): Promise<Result<boolean, AppError>> {
    const flagResult = await this.secureStorage.getEnrollmentFlag();

    if (isErr(flagResult)) {
      return err(flagResult.error);
    }

    return ok(!!flagResult.value);
  }

  async loginWithBiometrics(): Promise<Result<AuthSession, AppError>> {
    const flagResult = await this.secureStorage.getEnrollmentFlag();

    if (isErr(flagResult)) {
      return err(flagResult.error);
    }

    const userId = flagResult.value;

    if (!userId) {
      return err(
        new AppError(
          'AUTH_INVALID_CREDENTIALS',
          'No biometric enrollment found',
        ),
      );
    }

    const challengeResult = this.fakeBackend.issueChallenge(userId);

    if (isErr(challengeResult)) {
      return err(challengeResult.error);
    }

    const nonce = challengeResult.value.nonce;

    const signatureResult =
      await this.biometricKeysRepository.createSignature(nonce);

    if (isErr(signatureResult)) {
      if (signatureResult.error.code === 'BIOMETRIC_KEY_INVALIDATED') {
        await this.handleKeyInvalidation(userId);
      }
      return err(signatureResult.error);
    }

    const signature = signatureResult.value;

    return this.fakeBackend.verifySignature(nonce, signature, userId);
  }

  async unenroll(): Promise<Result<void, AppError>> {
    const flagResult = await this.secureStorage.getEnrollmentFlag();

    if (isErr(flagResult)) {
      return err(flagResult.error);
    }

    const userId = flagResult.value;

    if (!userId) {
      return ok(undefined);
    }

    await this.biometricKeysRepository.deleteKeys();
    this.fakeBackend.deregisterPublicKey(userId);
    await this.secureStorage.clearEnrollmentFlag();
    await this.secureStorage.clearRejectionFlag();

    return ok(undefined);
  }

  async getPublicKey(): Promise<Result<string | null, AppError>> {
    const flagResult = await this.secureStorage.getEnrollmentFlag();

    if (isErr(flagResult)) {
      return err(flagResult.error);
    }

    if (!flagResult.value) {
      return ok(null);
    }

    return ok(null);
  }

  async isEnrollmentRejected(): Promise<Result<boolean, AppError>> {
    const flagResult = await this.secureStorage.getRejectionFlag();

    if (isErr(flagResult)) {
      return err(flagResult.error);
    }

    return ok(!!flagResult.value);
  }

  async rejectEnrollment(): Promise<Result<void, AppError>> {
    const storeResult =
      await this.secureStorage.storeRejectionFlag('rejected');

    if (isErr(storeResult)) {
      return err(storeResult.error);
    }

    return ok(undefined);
  }

  async clearRejection(): Promise<Result<void, AppError>> {
    const clearResult = await this.secureStorage.clearRejectionFlag();

    if (isErr(clearResult)) {
      return err(clearResult.error);
    }

    return ok(undefined);
  }

  private async handleKeyInvalidation(userId: string): Promise<void> {
    await this.biometricKeysRepository.deleteKeys();
    this.fakeBackend.deregisterPublicKey(userId);
    await this.secureStorage.clearEnrollmentFlag();
  }
}
