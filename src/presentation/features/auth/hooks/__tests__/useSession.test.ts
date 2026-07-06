import React from 'react';
import {act, create, ReactTestRenderer} from 'react-test-renderer';
import {ok, err} from '@core/types/result';
import {AppError} from '@core/errors/app-error';
import {AuthSession} from '@domain/auth/entities';
import {UseSessionResult} from '../useSession';

const mockGetSessionExecute = jest.fn();

jest.mock('@di/container', () => ({
  container: {
    getSessionStateUseCase: {
      execute: (...args: unknown[]) => mockGetSessionExecute(...args),
    },
  },
}));

import {useSession} from '../useSession';
import {SessionProvider} from '../SessionProvider';

let hookResult: UseSessionResult;

function TestComponent() {
  hookResult = useSession();
  return null;
}

function renderWithProvider() {
  return create(
    React.createElement(SessionProvider, null, React.createElement(TestComponent)),
  );
}

const mockSession: AuthSession = {
  userId: 'user-1',
  token: 'token-abc',
  issuedAt: 1700000000000,
  method: 'PASSWORD',
};

describe('useSession', () => {
  let renderer: ReactTestRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSessionExecute.mockResolvedValue(ok(null));
  });

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer.unmount();
      });
    }
  });

  it('restores persisted session on mount', async () => {
    mockGetSessionExecute.mockResolvedValue(ok(mockSession));

    await act(async () => {
      renderer = renderWithProvider();
    });

    expect(hookResult.session).toEqual(mockSession);
    expect(hookResult.isLoading).toBe(false);
  });

  it('sets isLoading false when no session exists', async () => {
    mockGetSessionExecute.mockResolvedValue(ok(null));

    await act(async () => {
      renderer = renderWithProvider();
    });

    expect(hookResult.session).toBeNull();
    expect(hookResult.isLoading).toBe(false);
  });

  it('sets isLoading false on error result', async () => {
    mockGetSessionExecute.mockResolvedValue(
      err(new AppError('STORAGE_ERROR', 'Failed to read')),
    );

    await act(async () => {
      renderer = renderWithProvider();
    });

    expect(hookResult.session).toBeNull();
    expect(hookResult.isLoading).toBe(false);
  });

  it('setSession updates session state', async () => {
    mockGetSessionExecute.mockResolvedValue(ok(null));

    await act(async () => {
      renderer = renderWithProvider();
    });

    expect(hookResult.session).toBeNull();

    act(() => {
      hookResult.setSession(mockSession);
    });

    expect(hookResult.session).toEqual(mockSession);
  });

  it('clearSession sets session to null', async () => {
    mockGetSessionExecute.mockResolvedValue(ok(mockSession));

    await act(async () => {
      renderer = renderWithProvider();
    });

    expect(hookResult.session).toEqual(mockSession);

    act(() => {
      hookResult.clearSession();
    });

    expect(hookResult.session).toBeNull();
  });

  it('requires SessionProvider wrapper', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      act(() => {
        create(React.createElement(TestComponent));
      });
    }).toThrow('useSession must be used within a SessionProvider');

    (console.error as jest.Mock).mockRestore();
  });
});
