import { useState, useEffect, useCallback } from 'react';
import { BiometricCapability } from '@domain/biometrics/entities/biometric-capability';
import { container } from '@di/container';

export type AuthStatus = 'idle' | 'authenticating' | 'success' | 'failed';

export interface UseBiometricLoginResult {
  status: AuthStatus;
  capability: BiometricCapability | null;
  login: () => void;
  reset: () => void;
}

export function useBiometricLogin(): UseBiometricLoginResult {
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [capability, setCapability] = useState<BiometricCapability | null>(
    null,
  );

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

  const login = useCallback(async () => {
    setStatus('authenticating');

    const result = await container.authenticateWithBiometricsUseCase.execute({
      title: 'Accede a tu banca móvil',
      cancelLabel: 'Cancelar',
    });

    if (result.kind === 'ok' && result.value.success) {
      setStatus('success');
    } else {
      setStatus('failed');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
  }, []);

  return { status, capability, login, reset };
}
