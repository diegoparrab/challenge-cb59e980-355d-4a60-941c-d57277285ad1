import ReactNativeBiometrics from 'react-native-biometrics';
import { Result, ok, err } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import {
  BiometricCapability,
  BiometryType,
  createBiometricCapability,
} from '@domain/biometrics/entities/biometric-capability';

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
