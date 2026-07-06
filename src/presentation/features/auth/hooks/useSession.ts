import {useContext} from 'react';
import {SessionContext, SessionContextValue} from './SessionProvider';

export type UseSessionResult = SessionContextValue;

export function useSession(): UseSessionResult {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
