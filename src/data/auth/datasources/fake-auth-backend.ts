import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';
import {AppError} from '@core/errors/app-error';
import {Result, ok, err} from '@core/types/result';
import {AuthSession, AuthMethod} from '@domain/auth/entities/auth-session';
import {Challenge} from '@domain/auth/entities/challenge';

export interface SignatureFlowRecord {
  readonly challenge: string;
  readonly signature: string;
  readonly verified: boolean;
  readonly reason?: string;
  readonly timestamp: number;
}

interface FakeUser {
  readonly userId: string;
  readonly username: string;
  readonly password: string;
}

interface StoredChallenge {
  readonly nonce: string;
  readonly userId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  consumed: boolean;
}

export class FakeAuthBackend {
  private users: Map<string, FakeUser>;
  private challenges: Map<string, StoredChallenge>;
  private publicKeys: Map<string, string>;
  private failedAttempts: Map<string, number>;
  private lastSignatureFlow: SignatureFlowRecord | null;

  private static readonly CHALLENGE_TTL_MS = 60_000;
  private static readonly RATE_LIMIT_THRESHOLD = 5;

  constructor(private clock: () => number = Date.now) {
    this.users = new Map<string, FakeUser>([
      ['user1', {userId: 'user-1', username: 'user1', password: 'password1'}],
      ['user2', {userId: 'user-2', username: 'user2', password: 'password2'}],
    ]);
    this.challenges = new Map<string, StoredChallenge>();
    this.publicKeys = new Map<string, string>();
    this.failedAttempts = new Map<string, number>();
    this.lastSignatureFlow = null;
  }

  validateCredentials(
    username: string,
    password: string,
  ): Result<AuthSession, AppError> {
    const user = this.users.get(username);

    if (!user || user.password !== password) {
      return err(
        new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid username or password'),
      );
    }

    const session: AuthSession = {
      userId: user.userId,
      token: uuidv4(),
      issuedAt: this.clock(),
      method: 'PASSWORD' as AuthMethod,
    };
    return ok(session);
  }

  issueChallenge(userId: string): Result<Challenge, AppError> {
    const now = this.clock();
    const nonce = uuidv4();
    const expiresAt = now + FakeAuthBackend.CHALLENGE_TTL_MS;

    const storedChallenge: StoredChallenge = {
      nonce,
      userId,
      issuedAt: now,
      expiresAt,
      consumed: false,
    };

    this.challenges.set(nonce, storedChallenge);

    const challenge: Challenge = {
      nonce,
      issuedAt: now,
      expiresAt,
      consumed: false,
    };

    return ok(challenge);
  }

  verifySignature(
    nonce: string,
    signature: string,
    userId: string,
  ): Result<AuthSession, AppError> {
    const challenge = this.challenges.get(nonce);

    if (!challenge) {
      this.recordSignatureFlow(nonce, signature, false, 'Challenge not found');
      return err(
        new AppError('AUTH_CHALLENGE_EXPIRED', 'Challenge not found'),
      );
    }

    if (challenge.consumed) {
      this.recordSignatureFlow(nonce, signature, false, 'Challenge already consumed');
      return err(
        new AppError('AUTH_CHALLENGE_CONSUMED', 'Challenge has already been used'),
      );
    }

    const now = this.clock();

    if (now > challenge.expiresAt) {
      challenge.consumed = true;
      this.recordSignatureFlow(nonce, signature, false, 'Challenge expired');
      return err(
        new AppError('AUTH_CHALLENGE_EXPIRED', 'Challenge has expired'),
      );
    }

    challenge.consumed = true;

    const attempts = this.failedAttempts.get(userId) ?? 0;
    if (attempts >= FakeAuthBackend.RATE_LIMIT_THRESHOLD) {
      this.recordSignatureFlow(nonce, signature, false, 'Rate limit exceeded');
      return err(
        new AppError('AUTH_RATE_LIMITED', 'Too many failed attempts'),
      );
    }

    const publicKey = this.publicKeys.get(userId);
    if (!publicKey || !signature) {
      this.failedAttempts.set(userId, attempts + 1);
      this.recordSignatureFlow(
        nonce,
        signature,
        false,
        'Invalid signature or missing public key',
      );
      return err(
        new AppError('AUTH_INVALID_CREDENTIALS', 'Signature verification failed'),
      );
    }

    this.failedAttempts.set(userId, 0);
    this.recordSignatureFlow(nonce, signature, true);

    const session: AuthSession = {
      userId,
      token: uuidv4(),
      issuedAt: this.clock(),
      method: 'BIOMETRIC' as AuthMethod,
    };

    return ok(session);
  }

  registerPublicKey(userId: string, publicKey: string): void {
    this.publicKeys.set(userId, publicKey);
  }

  deregisterPublicKey(userId: string): void {
    this.publicKeys.delete(userId);
  }

  getLastSignatureFlow(): SignatureFlowRecord | null {
    return this.lastSignatureFlow;
  }

  resetFailedAttempts(userId: string): void {
    this.failedAttempts.set(userId, 0);
  }

  private recordSignatureFlow(
    challenge: string,
    signature: string,
    verified: boolean,
    reason?: string,
  ): void {
    this.lastSignatureFlow = {
      challenge,
      signature,
      verified,
      reason,
      timestamp: this.clock(),
    };
  }
}
