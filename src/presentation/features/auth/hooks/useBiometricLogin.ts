import { useState, useEffect, useCallback } from 'react';
import { BiometricCapability } from '@domain/biometrics/entities/biometric-capability';
import { BiometricError } from '@domain/biometrics/entities/biometric-error';
import { container } from '@di/container';

export type AuthStatus = 'idle' | 'authenticating' | 'success' | 'failed';

export interface UseBiometricLoginResult {
  status: AuthStatus;
  capability: BiometricCapability | null;
  biometricError: BiometricError | null;
  biometricDisabled: boolean;
  login: () => void;
  reset: () => void;
  clearError: () => void;
}

export function useBiometricLogin(): UseBiometricLoginResult {
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [capability, setCapability] = useState<BiometricCapability | null>(
    null,
  );
  const [biometricError, setBiometricError] = useState<BiometricError | null>(
    null,
  );
  const [biometricDisabled, setBiometricDisabled] = useState(false);

  useEffect(() => {
    const loadCapability = async () => {
      const result =
        await container.checkBiometricCapabilityUseCase.execute();
      if (result.kind === 'ok') {
        setCapability(result.value);
      }
    };
    loadCapability();
  }, []);

  const syncState = useCallback(() => {
    const state = container.authenticateWithBiometricsUseCase.getState();
    setBiometricDisabled(state.biometricDisabled);
  }, []);

  const login = useCallback(async () => {
    setStatus('authenticating');
    setBiometricError(null);

    const result =
      await container.authenticateWithBiometricsUseCase.execute({
        title: 'Accede a tu banca móvil',
        cancelLabel: 'Cancelar',
      });

    if (result.kind === 'ok' && result.value.success) {
      setStatus('success');
      syncState();
      return;
    }

    if (result.kind === 'err') {
      const error = result.error;

      if (error.code === 'LOCKOUT') {
        setBiometricDisabled(true);
      }

      setBiometricError(error);
      setStatus('failed');
      syncState();
    }
  }, [syncState]);

  const reset = useCallback(() => {
    setStatus('idle');
    container.authenticateWithBiometricsUseCase.resetState();
    setBiometricError(null);
    setBiometricDisabled(false);
  }, []);

  const clearError = useCallback(() => {
    setBiometricError(null);
    setStatus('idle');
  }, []);

  return {
    status,
    capability,
    biometricError,
    biometricDisabled,
    login,
    reset,
    clearError,
  };
}
