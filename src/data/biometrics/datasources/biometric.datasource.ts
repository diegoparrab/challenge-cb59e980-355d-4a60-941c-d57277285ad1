import ReactNativeBiometrics from 'react-native-biometrics';
import { Result, ok, err } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import {
  BiometricCapability,
  BiometryType,
  createBiometricCapability,
} from '@domain/biometrics/entities/biometric-capability';
import {
  PromptConfig,
  BiometricAuthResult,
} from '@domain/biometrics/entities/biometric-auth';
import {
  BiometricError,
  createBiometricError,
} from '@domain/biometrics/entities/biometric-error';
import { mapNativeError } from './native-error-mapper';

export class BiometricDatasource {
  private rnBiometrics: ReactNativeBiometrics;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics();
  }

  async checkCapability(): Promise<Result<BiometricCapability, AppError>> {
    try {
      const { available, biometryType, error } =
        await this.rnBiometrics.isSensorAvailable();

      if (available && biometryType) {
        return ok(
          createBiometricCapability(
            'AVAILABLE',
            this.mapBiometryType(biometryType),
          ),
        );
      }

      if (error?.includes('NOT_ENROLLED') || error?.includes('not enrolled')) {
        return ok(
          createBiometricCapability(
            'NOT_ENROLLED',
            biometryType ? this.mapBiometryType(biometryType) : null,
          ),
        );
      }

      return ok(createBiometricCapability('NO_HARDWARE', null));
    } catch (e: unknown) {
      return err(
        new AppError(
          'BIOMETRIC_NOT_AVAILABLE',
          'Failed to check biometric capability',
          e,
        ),
      );
    }
  }

  async authenticate(
    config: PromptConfig,
  ): Promise<Result<BiometricAuthResult, BiometricError>> {
    try {
      const { success, error } = await this.rnBiometrics.simplePrompt({
        promptMessage: config.title,
        cancelButtonText: config.cancelLabel,
      });

      if (success) {
        return ok({ success: true });
      }

      const code = mapNativeError(error);
      return err(createBiometricError(code, error ?? undefined));
    } catch (e: unknown) {
      const errorString = e instanceof Error ? e.message : String(e);
      const code = mapNativeError(errorString);
      return err(createBiometricError(code, errorString));
    }
  }

  private mapBiometryType(nativeType: string): BiometryType {
    switch (nativeType) {
      case 'FaceID':
        return 'FaceID';
      case 'TouchID':
        return 'TouchID';
      case 'Biometrics':
        return 'Fingerprint';
      default:
        return 'Unknown';
    }
  }
}
