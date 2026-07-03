import {useReducer, useEffect, useCallback, useRef} from 'react';
import {isOk} from '@core/types/result';
import {BiometricCapability} from '@domain/biometrics/entities/biometric-capability';
import {container} from '@di/container';

type State =
  | {status: 'idle'; capability: null; error: null}
  | {status: 'loading'; capability: BiometricCapability | null; error: null}
  | {status: 'success'; capability: BiometricCapability; error: null}
  | {status: 'error'; capability: null; error: string};

type Action =
  | {type: 'DETECT_START'; previousCapability: BiometricCapability | null}
  | {type: 'DETECT_SUCCESS'; capability: BiometricCapability}
  | {type: 'DETECT_ERROR'; error: string};

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case 'DETECT_START':
      return {
        status: 'loading',
        capability: action.previousCapability,
        error: null,
      };
    case 'DETECT_SUCCESS':
      return {status: 'success', capability: action.capability, error: null};
    case 'DETECT_ERROR':
      return {status: 'error', capability: null, error: action.error};
  }
}

const initialState: State = {status: 'idle', capability: null, error: null};

export function useBiometricCapability() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const requestIdRef = useRef(0);

  const detect = useCallback(async () => {
    const currentRequest = ++requestIdRef.current;

    dispatch({type: 'DETECT_START', previousCapability: state.capability});

    const result = await container.checkBiometricCapabilityUseCase.execute();

    if (currentRequest !== requestIdRef.current) {
      return;
    }

    if (isOk(result)) {
      dispatch({type: 'DETECT_SUCCESS', capability: result.value});
    } else {
      dispatch({type: 'DETECT_ERROR', error: result.error.message});
    }
  }, [state.capability]);

  useEffect(() => {
    detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    capability: state.capability,
    loading: state.status === 'loading' || state.status === 'idle',
    error: state.error,
    redetect: detect,
  };
}
