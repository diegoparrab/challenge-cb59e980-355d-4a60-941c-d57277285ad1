export type AuthMethod = 'PASSWORD' | 'BIOMETRIC';

export interface AuthSession {
  readonly userId: string;
  readonly token: string;
  readonly issuedAt: number;
  readonly method: AuthMethod;
}

export function createAuthSession(
  userId: string,
  token: string,
  method: AuthMethod,
): AuthSession {
  return {userId, token, issuedAt: Date.now(), method};
}
