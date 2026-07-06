import ReactNativeBiometrics from 'react-native-biometrics';
import { Result, ok, err } from '@core/types/result';
import { AppError } from '@core/errors/app-error';

export class BiometricKeysDatasource {
  private rnBiometrics: ReactNativeBiometrics;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: false,
    });
  }

  async createKeys(): Promise<Result<string, AppError>> {
    try {
      const { publicKey } = await this.rnBiometrics.createKeys();
      return ok(publicKey);
    } catch (e: unknown) {
      return err(
        new AppError(
          'BIOMETRIC_NOT_AVAILABLE',
          'Failed to create biometric keys',
          e,
        ),
      );
    }
  }

  async createSignature(payload: string): Promise<Result<string, AppError>> {
    try {
      const { success, signature, error } =
        await this.rnBiometrics.createSignature({
          promptMessage: 'Confirm identity',
          payload,
        });

      if (success && signature) {
        return ok(signature);
      }

      if (error && this.isUserCancellation(error)) {
        return err(
          new AppError('BIOMETRIC_CANCELLED', 'User cancelled biometric', error),
        );
      }

      return err(
        new AppError(
          'BIOMETRIC_NOT_AVAILABLE',
          error ?? 'Signature creation failed',
        ),
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);

      if (this.isKeyInvalidated(message)) {
        return err(
          new AppError(
            'BIOMETRIC_KEY_INVALIDATED',
            'Biometric key invalidated due to enrollment change',
            e,
          ),
        );
      }

      if (this.isUserCancellation(message)) {
        return err(
          new AppError('BIOMETRIC_CANCELLED', 'User cancelled biometric', e),
        );
      }

      return err(
        new AppError(
          'BIOMETRIC_NOT_AVAILABLE',
          'Failed to create signature',
          e,
        ),
      );
    }
  }

  async deleteKeys(): Promise<Result<void, AppError>> {
    try {
      await this.rnBiometrics.deleteKeys();
      return ok(undefined);
    } catch (e: unknown) {
      return err(
        new AppError(
          'BIOMETRIC_NOT_AVAILABLE',
          'Failed to delete biometric keys',
          e,
        ),
      );
    }
  }

  async biometricKeysExist(): Promise<Result<boolean, AppError>> {
    try {
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      return ok(keysExist);
    } catch (e: unknown) {
      return err(
        new AppError(
          'BIOMETRIC_NOT_AVAILABLE',
          'Failed to check biometric keys existence',
          e,
        ),
      );
    }
  }

  private isKeyInvalidated(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('key permanently invalidated') ||
      lower.includes('keypermanentlyinvalidatedexception') ||
      lower.includes('key invalidated')
    );
  }

  private isUserCancellation(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes('user cancel');
  }
}
