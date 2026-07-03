import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { ok, err } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { createBiometricCapability } from '@domain/biometrics/entities/biometric-capability';
import {
  UseBiometricLoginResult,
  AuthStatus,
} from '../useBiometricLogin';

const mockCheckExecute = jest.fn();
const mockAuthExecute = jest.fn();

jest.mock('@di/container', () => ({
  container: {
    checkBiometricCapabilityUseCase: {
      execute: (...args: unknown[]) => mockCheckExecute(...args),
    },
    authenticateWithBiometricsUseCase: {
      execute: (...args: unknown[]) => mockAuthExecute(...args),
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
  });

  it('transitions idle → authenticating → failed on failed auth', async () => {
    mockAuthExecute.mockResolvedValue(ok({ success: false }));

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    await act(async () => {
      hookResult.login();
    });

    expect(hookResult.status).toBe('failed');
  });

  it('transitions to failed when use case returns error', async () => {
    mockAuthExecute.mockResolvedValue(
      err(new AppError('BIOMETRIC_NOT_AVAILABLE', 'Biometric not available')),
    );

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    await act(async () => {
      hookResult.login();
    });

    expect(hookResult.status).toBe('failed');
  });

  it('reset transitions back to idle', async () => {
    mockAuthExecute.mockResolvedValue(ok({ success: false }));

    await act(async () => {
      renderer = create(React.createElement(TestComponent));
    });

    await act(async () => {
      hookResult.login();
    });

    expect(hookResult.status).toBe('failed');

    act(() => {
      hookResult.reset();
    });

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
