import { Result, err } from '@core/types/result';
import {
  BiometricError,
  createBiometricError,
} from '../entities/biometric-error';
import { BiometricAuthResult, PromptConfig } from '../entities/biometric-auth';
import { BiometricRepository } from '../repositories/biometric.repository';

export interface AuthenticationState {
  readonly biometricDisabled: boolean;
}

export class AuthenticateWithBiometricsUseCase {
  private state: AuthenticationState = {
    biometricDisabled: false,
  };

  constructor(private readonly repository: BiometricRepository) {}

  getState(): AuthenticationState {
    return { ...this.state };
  }

  resetState(): void {
    this.state = {
      biometricDisabled: false,
    };
  }

  async execute(
    config: PromptConfig,
  ): Promise<Result<BiometricAuthResult, BiometricError>> {
    const capabilityResult = await this.repository.checkCapability();

    if (capabilityResult.kind === 'err') {
      return err(createBiometricError('UNKNOWN', undefined));
    }

    const capability = capabilityResult.value;
    if (!capability.available) {
      const code =
        capability.reason === 'NOT_ENROLLED' ? 'NOT_ENROLLED' : 'NO_HARDWARE';
      return err(createBiometricError(code, undefined));
    }

    const authResult = await this.repository.authenticate(config);

    if (authResult.kind === 'ok') {
      return authResult;
    }

    return this.handleError(authResult.error);
  }

  private handleError(
    error: BiometricError,
  ): Result<BiometricAuthResult, BiometricError> {
    switch (error.code) {
      case 'LOCKOUT':
        this.state = { ...this.state, biometricDisabled: true };
        return err(error);

      case 'USER_CANCELLED':
      default:
        return err(error);
    }
  }
}
