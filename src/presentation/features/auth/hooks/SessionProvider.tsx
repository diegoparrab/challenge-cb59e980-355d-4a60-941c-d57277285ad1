import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {isOk} from '@core/types/result';
import {AuthSession} from '@domain/auth/entities';
import {container} from '@di/container';

export interface SessionContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({children}: SessionProviderProps) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const result = await container.getSessionStateUseCase.execute();
      if (isOk(result)) {
        setSessionState(result.value);
      }
      setIsLoading(false);
    };
    restoreSession();
  }, []);

  const setSession = useCallback((newSession: AuthSession) => {
    setSessionState(newSession);
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
  }, []);

  const value = useMemo(
    () => ({session, isLoading, setSession, clearSession}),
    [session, isLoading, setSession, clearSession],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
