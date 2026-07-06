import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { ok, err } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { createBiometricCapability } from '@domain/biometrics/entities/biometric-capability';
import { createBiometricError } from '@domain/biometrics/entities/biometric-error';
import { UseBiometricLoginResult } from '../useBiometricLogin';

const mockCheckExecute = jest.fn();
const mockAuthExecute = jest.fn();
const mockGetState = jest.fn();
const mockResetState = jest.fn();

jest.mock('@di/container', () => ({
  container: {
    checkBiometricCapabilityUseCase: {
      execute: (...args: unknown[]) => mockCheckExecute(...args),
    },
    authenticateWithBiometricsUseCase: {
      execute: (...args: unknown[]) => mockAuthExecute(...args),
      getState: () => mockGetState(),
      resetState: () => mockResetState(),
    },
  },
}));

// Import after mock
import { useBiometricLogin } from '../useBiometricLogin';

// Helper component to capture hook results
let hookResult: UseBiometricLoginResult;

function TestComponent() {
  hookResult = useBiometricLogin();
  return null;
}

describe('useBiometricLogin', () => {
  let renderer: ReactTestRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckExecute.mockResolvedValue(
      ok(createBiometricCapability('AVAILABLE', 'FaceID')),
    );
    mockGetState.mockReturnValue({
      biometricDisabled: false,
    });
  });

  afterEach(() => {
    act(() => {
      renderer.unmount();
    });
  });

  it('initializes with idle status and null capability', async () => {
    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    expect(hookResult.status).toBe('idle');
    expect(hookResult.biometricError).toBeNull();
    expect(hookResult.biometricDisabled).toBe(false);
  });

  it('preloads capability on mount', async () => {
    const capability = createBiometricCapability('AVAILABLE', 'FaceID');
    mockCheckExecute.mockResolvedValue(ok(capability));

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    expect(mockCheckExecute).toHaveBeenCalledTimes(1);
    expect(hookResult.capability).toEqual(capability);
  });

  it('does not set capability when check returns error', async () => {
    mockCheckExecute.mockResolvedValue(
      err(new AppError('BIOMETRIC_NOT_AVAILABLE', 'No hardware')),
    );

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    expect(hookResult.capability).toBeNull();
  });

  it('transitions idle → authenticating → success on successful auth', async () => {
    mockAuthExecute.mockResolvedValue(ok({ success: true }));

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    await act(async () => {
      hookResult.login();
    });

    expect(hookResult.status).toBe('success');
    expect(hookResult.biometricError).toBeNull();
  });

  it('transitions to failed and exposes biometricError on USER_CANCELLED', async () => {
    const error = createBiometricError('USER_CANCELLED', 'User cancellation');
    mockAuthExecute.mockResolvedValue(err(error));
    mockGetState.mockReturnValue({ biometricDisabled: false });

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    await act(async () => {
      hookResult.login();
    });

    expect(hookResult.status).toBe('failed');
    expect(hookResult.biometricError).toEqual(error);
  });

  it('sets biometricDisabled on LOCKOUT error', async () => {
    const error = createBiometricError('LOCKOUT');
    mockAuthExecute.mockResolvedValue(err(error));
    mockGetState.mockReturnValue({ biometricDisabled: true });

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    await act(async () => {
      hookResult.login();
    });

    expect(hookResult.biometricDisabled).toBe(true);
  });

  it('exposes UNKNOWN error for unrecognized native errors', async () => {
    const error = createBiometricError('UNKNOWN', 'some random error');
    mockAuthExecute.mockResolvedValue(err(error));
    mockGetState.mockReturnValue({ biometricDisabled: false });

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    await act(async () => {
      hookResult.login();
    });

    expect(hookResult.status).toBe('failed');
    expect(hookResult.biometricError?.code).toBe('UNKNOWN');
  });

  it('reset clears all state', async () => {
    const error = createBiometricError('LOCKOUT');
    mockAuthExecute.mockResolvedValue(err(error));
    mockGetState.mockReturnValue({ biometricDisabled: true });

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    await act(async () => {
      hookResult.login();
    });

    expect(hookResult.status).toBe('failed');

    mockGetState.mockReturnValue({ biometricDisabled: false });

    act(() => {
      hookResult.reset();
    });

    expect(hookResult.status).toBe('idle');
    expect(hookResult.biometricError).toBeNull();
    expect(hookResult.biometricDisabled).toBe(false);
    expect(mockResetState).toHaveBeenCalled();
  });

  it('clearError sets biometricError to null and status to idle', async () => {
    const error = createBiometricError('USER_CANCELLED', 'User cancellation');
    mockAuthExecute.mockResolvedValue(err(error));
    mockGetState.mockReturnValue({ biometricDisabled: false });

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    await act(async () => {
      hookResult.login();
    });

    expect(hookResult.biometricError).toEqual(error);

    act(() => {
      hookResult.clearError();
    });

    expect(hookResult.biometricError).toBeNull();
    expect(hookResult.status).toBe('idle');
  });

  it('passes correct prompt config to authenticate use case', async () => {
    mockAuthExecute.mockResolvedValue(ok({ success: true }));

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    await act(async () => {
      hookResult.login();
    });

    expect(mockAuthExecute).toHaveBeenCalledWith({
      title: 'Accede a tu banca móvil',
      cancelLabel: 'Cancelar',
    });
  });
});
