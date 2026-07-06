import { useState, useEffect, useCallback } from 'react';
import { isOk } from '@core/types/result';
import { fakeAuthBackend, secureStorageDatasource } from '@di/container';
import { SignatureFlowRecord } from '@data/auth/datasources/fake-auth-backend';

interface SignatureFlowState {
  flow: SignatureFlowRecord | null;
  securityLevel: string;
  loading: boolean;
}

export function useSignatureFlow() {
  const [state, setState] = useState<SignatureFlowState>({
    flow: null,
    securityLevel: 'UNKNOWN',
    loading: true,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    const flow = fakeAuthBackend.getLastSignatureFlow();
    const levelResult = await secureStorageDatasource.getSecurityLevel();

    const securityLevel = isOk(levelResult) ? levelResult.value : 'UNKNOWN';

    setState({ flow, securityLevel, loading: false });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    flow: state.flow,
    securityLevel: state.securityLevel,
    loading: state.loading,
    refresh,
  };
}
