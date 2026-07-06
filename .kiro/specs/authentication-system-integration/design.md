# Design Document

## Overview

This design covers the integration of biometric authentication with a simulated credential-based authentication system. It implements: credential login, opt-in biometric enrollment with hardware-backed keys, challenge→signature→verification biometric login, anti-replay protections, secure storage configuration, session management, and conditional navigation. The FakeAuthBackend simulates server-side behavior while preserving all security properties as learning objectives.

## Architecture

The authentication system integration follows Clean Architecture with feature-based namespacing. The feature spans two vertical slices (`auth` and `biometrics`) composed through domain interfaces and wired in the DI layer. No cross-feature imports occur at the data layer.

```
┌─────────────────────────────────────────────────────────────┐
│  presentation/navigation/AppNavigator.tsx                    │
│    ├── AuthStack (Login_Screen)                             │
│    └── AppStack (Home_Screen + Settings)                    │
│         ↕ conditional rendering based on session state       │
├─────────────────────────────────────────────────────────────┤
│  presentation/features/auth/                                 │
│    ├── screens/LoginScreen.tsx                               │
│    ├── screens/HomeScreen.tsx (includes Settings section)    │
│    ├── components/EnrollmentModal.tsx                        │
│    └── hooks/useAuth.ts, useSession.ts                      │
├─────────────────────────────────────────────────────────────┤
│  domain/auth/                    domain/biometrics/          │
│    ├── entities/                   ├── entities/ (existing)  │
│    ├── repositories/               ├── repositories/         │
│    │   ├── AuthRepository          │   ├── BiometricRepo     │
│    │   └── BiometricEnrollmentRepo │   └── BiometricKeysRepo │
│    └── usecases/                   └── usecases/ (existing)  │
├─────────────────────────────────────────────────────────────┤
│  data/auth/                      data/biometrics/            │
│    ├── datasources/                ├── datasources/           │
│    │   ├── FakeAuthBackend         │   ├── BiometricDatasrc   │
│    │   └── SecureStorageDatasrc    │   └── BiometricKeysDatasrc│
│    └── repositories/               └── repositories/          │
├─────────────────────────────────────────────────────────────┤
│  di/container.ts — wires all concrete implementations        │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Domain Layer — Entities

```typescript
// domain/auth/entities/auth-session.ts
type AuthMethod = 'PASSWORD' | 'BIOMETRIC';

interface AuthSession {
  readonly userId: string;
  readonly token: string;
  readonly issuedAt: number;
  readonly method: AuthMethod;
}

function createAuthSession(
  userId: string,
  token: string,
  method: AuthMethod,
): AuthSession {
  return { userId, token, issuedAt: Date.now(), method };
}
```

```typescript
// domain/auth/entities/credentials.ts
interface Credentials {
  readonly username: string;
  readonly password: string;
}
```

```typescript
// domain/auth/entities/challenge.ts
interface Challenge {
  readonly nonce: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly consumed: boolean;
}
```

### Repository Interfaces

```typescript
// domain/auth/repositories/auth.repository.ts
interface AuthRepository {
  loginWithCredentials(credentials: Credentials): Promise<Result<AuthSession, AppError>>;
  logout(): Promise<Result<void, AppError>>;
  getSession(): Promise<Result<AuthSession | null, AppError>>;
  persistSession(session: AuthSession): Promise<Result<void, AppError>>;
}
```

```typescript
// domain/auth/repositories/biometric-enrollment.repository.ts
interface BiometricEnrollmentRepository {
  enroll(userId: string): Promise<Result<string, AppError>>;
  isEnrolled(): Promise<Result<boolean, AppError>>;
  loginWithBiometrics(): Promise<Result<AuthSession, AppError>>;
  unenroll(): Promise<Result<void, AppError>>;
  getPublicKey(): Promise<Result<string | null, AppError>>;
  isEnrollmentRejected(): Promise<Result<boolean, AppError>>;
  rejectEnrollment(): Promise<Result<void, AppError>>;
  clearRejection(): Promise<Result<void, AppError>>;
}
```

```typescript
// domain/biometrics/repositories/biometric-keys.repository.ts
interface BiometricKeysRepository {
  createKeys(): Promise<Result<string, AppError>>;
  createSignature(payload: string): Promise<Result<string, AppError>>;
  deleteKeys(): Promise<Result<void, AppError>>;
  biometricKeysExist(): Promise<Result<boolean, AppError>>;
}
```

### Use Cases

```typescript
// domain/auth/usecases/login-with-credentials.ts
class LoginWithCredentialsUseCase {
  constructor(
    private authRepository: AuthRepository,
  ) {}

  async execute(credentials: Credentials): Promise<Result<AuthSession, AppError>> {
    const result = await this.authRepository.loginWithCredentials(credentials);
    if (isOk(result)) {
      await this.authRepository.persistSession(result.value);
    }
    return result;
  }
}
```

```typescript
// domain/auth/usecases/enroll-biometrics.ts
class EnrollBiometricsUseCase {
  constructor(
    private enrollmentRepository: BiometricEnrollmentRepository,
  ) {}

  async execute(userId: string): Promise<Result<string, AppError>> {
    return this.enrollmentRepository.enroll(userId);
  }
}
```

```typescript
// domain/auth/usecases/login-with-biometrics.ts
class LoginWithBiometricsUseCase {
  constructor(
    private enrollmentRepository: BiometricEnrollmentRepository,
    private authRepository: AuthRepository,
  ) {}

  async execute(): Promise<Result<AuthSession, AppError>> {
    const result = await this.enrollmentRepository.loginWithBiometrics();
    if (isOk(result)) {
      await this.authRepository.persistSession(result.value);
    }
    return result;
  }
}
```

```typescript
// domain/auth/usecases/disable-biometrics.ts
class DisableBiometricsUseCase {
  constructor(
    private enrollmentRepository: BiometricEnrollmentRepository,
  ) {}

  async execute(): Promise<Result<void, AppError>> {
    return this.enrollmentRepository.unenroll();
  }
}
```

```typescript
// domain/auth/usecases/logout.ts
class LogoutUseCase {
  constructor(
    private authRepository: AuthRepository,
  ) {}

  async execute(): Promise<Result<void, AppError>> {
    return this.authRepository.logout();
  }
}
```

```typescript
// domain/auth/usecases/get-session-state.ts
class GetSessionStateUseCase {
  constructor(
    private authRepository: AuthRepository,
  ) {}

  async execute(): Promise<Result<AuthSession | null, AppError>> {
    return this.authRepository.getSession();
  }
}
```

## Data Models

### FakeAuthBackend

The `FakeAuthBackend` simulates server-side behavior. It is a singleton class managing:
- A user store with predefined credentials
- Challenge lifecycle (generation, expiration, consumption)
- Public key registration per user
- Signature verification (using the public key stored during enrollment)
- Rate limiting per user for failed verification attempts

```typescript
// data/auth/datasources/fake-auth-backend.ts
interface FakeUser {
  readonly userId: string;
  readonly username: string;
  readonly passwordHash: string;
}

interface StoredChallenge {
  readonly nonce: string;
  readonly userId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  consumed: boolean;
}

interface SignatureFlowRecord {
  readonly challenge: string;
  readonly signature: string;
  readonly verified: boolean;
  readonly reason?: string;
  readonly timestamp: number;
}

class FakeAuthBackend {
  private users: Map<string, FakeUser>;
  private challenges: Map<string, StoredChallenge>;
  private publicKeys: Map<string, string>;
  private failedAttempts: Map<string, number>;
  private lastSignatureFlow: SignatureFlowRecord | null;

  private static readonly CHALLENGE_TTL_MS = 60_000;
  private static readonly RATE_LIMIT_THRESHOLD = 5;

  constructor(private clock: () => number = Date.now) {}

  validateCredentials(username: string, password: string): Result<string, AppError> {}
  issueChallenge(userId: string): Result<Challenge, AppError> {}
  verifySignature(nonce: string, signature: string, userId: string): Result<AuthSession, AppError> {}
  registerPublicKey(userId: string, publicKey: string): void {}
  deregisterPublicKey(userId: string): void {}
  getLastSignatureFlow(): SignatureFlowRecord | null {}
  resetFailedAttempts(userId: string): void {}
}
```

**Challenge Generation**: Uses `crypto.randomUUID()` (polyfilled for React Native via `react-native-get-random-values` if needed, or `uuid` library). Each challenge gets a 60-second TTL.

**Signature Verification Logic**: The FakeAuthBackend stores public keys during enrollment. On verification it:
1. Looks up the challenge by nonce → rejects if not found
2. Checks `consumed` → rejects if already used (anti-replay)
3. Checks `expiresAt` vs current time → rejects if expired
4. Marks challenge as consumed (regardless of signature validity)
5. Checks rate limit for user → rejects if threshold exceeded
6. Verifies the signature payload matches the expected nonce signed with the registered public key
7. On success: emits AuthSession with method "BIOMETRIC", resets failed attempts
8. On failure: increments failed attempts counter, returns error

**Injectable Clock**: The constructor accepts an optional `clock` function defaulting to `Date.now`. Tests inject a controllable clock for expiration testing.

### SecureStorageDatasource

```typescript
// data/auth/datasources/secure-storage.datasource.ts
import * as Keychain from 'react-native-keychain';

interface SecureStorageConfig {
  readonly accessible: Keychain.ACCESSIBLE;
  readonly accessControl: Keychain.ACCESS_CONTROL;
}

class SecureStorageDatasource {
  private static readonly CONFIG: SecureStorageConfig = {
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
  };

  async storeSession(session: AuthSession): Promise<Result<void, AppError>> {}
  async getSession(): Promise<Result<AuthSession | null, AppError>> {}
  async clearSession(): Promise<Result<void, AppError>> {}
  async storeEnrollmentFlag(userId: string): Promise<Result<void, AppError>> {}
  async getEnrollmentFlag(): Promise<Result<string | null, AppError>> {}
  async clearEnrollmentFlag(): Promise<Result<void, AppError>> {}
  async storeRejectionFlag(userId: string): Promise<Result<void, AppError>> {}
  async getRejectionFlag(): Promise<Result<string | null, AppError>> {}
  async clearRejectionFlag(): Promise<Result<void, AppError>> {}
  async getSecurityLevel(): Promise<Result<string, AppError>> {}
}
```

All Keychain operations use the mandatory security configuration:
- `accessible: WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`
- `accessControl: BIOMETRY_CURRENT_SET`
- `authenticationType: AuthenticationType.BIOMETRICS` (no device credentials fallback)

Each stored item uses a distinct service name for isolation (e.g., `com.app.session`, `com.app.enrollment`, `com.app.rejection`).

### BiometricKeysDatasource

```typescript
// data/biometrics/datasources/biometric-keys.datasource.ts
import ReactNativeBiometrics from 'react-native-biometrics';

class BiometricKeysDatasource {
  private rnBiometrics: ReactNativeBiometrics;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: false,
    });
  }

  async createKeys(): Promise<Result<string, AppError>> {}
  async createSignature(payload: string): Promise<Result<string, AppError>> {}
  async deleteKeys(): Promise<Result<void, AppError>> {}
  async biometricKeysExist(): Promise<Result<boolean, AppError>> {}
}
```

Key configuration on Android:
- `setUserAuthenticationRequired(true)` — enforced by `react-native-biometrics` when `allowDeviceCredentials: false`
- Only `BIOMETRIC_STRONG` (Class 3) accepted
- StrongBox preferred with TEE fallback (configured via the library's internal handling)

The `createSignature` method maps key invalidation errors (biometric enrollment changed) to a specific `AppError` code `BIOMETRIC_KEY_INVALIDATED` for detection by the enrollment repository.

### Repository Implementations

```typescript
// data/auth/repositories/auth.repository.impl.ts
class AuthRepositoryImpl implements AuthRepository {
  constructor(
    private fakeBackend: FakeAuthBackend,
    private secureStorage: SecureStorageDatasource,
  ) {}

  async loginWithCredentials(credentials: Credentials): Promise<Result<AuthSession, AppError>> {
    return this.fakeBackend.validateCredentials(
      credentials.username,
      credentials.password,
    );
  }

  async logout(): Promise<Result<void, AppError>> {
    return this.secureStorage.clearSession();
  }

  async getSession(): Promise<Result<AuthSession | null, AppError>> {
    return this.secureStorage.getSession();
  }

  async persistSession(session: AuthSession): Promise<Result<void, AppError>> {
    return this.secureStorage.storeSession(session);
  }
}
```

```typescript
// data/auth/repositories/biometric-enrollment.repository.impl.ts
class BiometricEnrollmentRepositoryImpl implements BiometricEnrollmentRepository {
  constructor(
    private biometricKeysRepository: BiometricKeysRepository,
    private fakeBackend: FakeAuthBackend,
    private secureStorage: SecureStorageDatasource,
  ) {}

  async enroll(userId: string): Promise<Result<string, AppError>> {
    const keysResult = await this.biometricKeysRepository.createKeys();
    if (isErr(keysResult)) return keysResult;
    
    this.fakeBackend.registerPublicKey(userId, keysResult.value);
    const storeResult = await this.secureStorage.storeEnrollmentFlag(userId);
    if (isErr(storeResult)) return err(storeResult.error);
    
    return ok(keysResult.value);
  }

  async loginWithBiometrics(): Promise<Result<AuthSession, AppError>> {
    const enrolledResult = await this.secureStorage.getEnrollmentFlag();
    if (isErr(enrolledResult)) return enrolledResult;
    if (!enrolledResult.value) {
      return err(new AppError('AUTH_INVALID_CREDENTIALS', 'Not enrolled'));
    }
    
    const userId = enrolledResult.value;
    const challengeResult = this.fakeBackend.issueChallenge(userId);
    if (isErr(challengeResult)) return challengeResult;
    
    const signatureResult = await this.biometricKeysRepository.createSignature(
      challengeResult.value.nonce,
    );
    
    if (isErr(signatureResult)) {
      if (signatureResult.error.code === 'BIOMETRIC_KEY_INVALIDATED') {
        await this.handleKeyInvalidation(userId);
      }
      return signatureResult;
    }
    
    return this.fakeBackend.verifySignature(
      challengeResult.value.nonce,
      signatureResult.value,
      userId,
    );
  }

  async unenroll(): Promise<Result<void, AppError>> {
    const enrolledResult = await this.secureStorage.getEnrollmentFlag();
    if (isErr(enrolledResult)) return enrolledResult;
    if (!enrolledResult.value) return ok(undefined);
    
    const userId = enrolledResult.value;
    await this.biometricKeysRepository.deleteKeys();
    this.fakeBackend.deregisterPublicKey(userId);
    await this.secureStorage.clearEnrollmentFlag();
    await this.secureStorage.clearRejectionFlag();
    return ok(undefined);
  }

  private async handleKeyInvalidation(userId: string): Promise<void> {
    await this.biometricKeysRepository.deleteKeys();
    this.fakeBackend.deregisterPublicKey(userId);
    await this.secureStorage.clearEnrollmentFlag();
  }
}
```

```typescript
// data/biometrics/repositories/biometric-keys.repository.impl.ts
class BiometricKeysRepositoryImpl implements BiometricKeysRepository {
  constructor(private datasource: BiometricKeysDatasource) {}

  async createKeys(): Promise<Result<string, AppError>> {
    return this.datasource.createKeys();
  }

  async createSignature(payload: string): Promise<Result<string, AppError>> {
    return this.datasource.createSignature(payload);
  }

  async deleteKeys(): Promise<Result<void, AppError>> {
    return this.datasource.deleteKeys();
  }

  async biometricKeysExist(): Promise<Result<boolean, AppError>> {
    return this.datasource.biometricKeysExist();
  }
}
```

## Presentation Layer

### Navigation — Conditional Stack Rendering

```typescript
// presentation/navigation/AppNavigator.tsx
function AppNavigator() {
  const { session, isLoading } = useSession();

  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer>
      {session ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}
```

Session state drives which stack renders. No imperative `navigation.navigate()` calls on login/logout — React's reconciliation handles the transition.

### LoginScreen

Renders:
- Credential form (username + password TextInputs)
- Login button (credential-based)
- Conditional biometric login button (visible only when `isEnrolled === true`)
- Error display using existing error handling patterns from spec 04

```typescript
// presentation/features/auth/screens/LoginScreen.tsx
function LoginScreen() {
  const { login, loginWithBiometrics, isEnrolled, isLoading, error } = useAuth();
  // ...renders credential form + conditional biometric button
}
```

### EnrollmentModal

A React Native `Modal` presented after first credential login when:
- `isEnrolled === false`
- `isRejected === false`

```typescript
// presentation/features/auth/components/EnrollmentModal.tsx
interface EnrollmentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isLoading: boolean;
  error: AppError | null;
}
```

On accept: triggers `EnrollBiometricsUseCase`. On decline: calls `rejectEnrollment()` which persists the flag permanently.

### HomeScreen with Settings Section

The HomeScreen includes a Settings section (not a separate screen) containing:
- Session info display (userId, method, issuedAt)
- Biometric toggle (enable/disable)
- Public key display (educational, truncated with copy option)
- Simulated session expiration button
- Logout button

### Hardware Inspector — Signature Flow Panel

Extends the existing Hardware Inspector (biometrics feature) with a new panel:
- Challenge nonce display
- Signature value (truncated)
- Verification result (success/failure + reason)
- Security level from `react-native-keychain`

The panel reads from a shared observable state (`lastSignatureFlow`) exposed via the DI container.

## DI Wiring

```typescript
// di/container.ts
const biometricDatasource = new BiometricDatasource();
const biometricKeysDatasource = new BiometricKeysDatasource();
const fakeAuthBackend = new FakeAuthBackend();
const secureStorageDatasource = new SecureStorageDatasource();

const biometricRepository = new BiometricRepositoryImpl(biometricDatasource);
const biometricKeysRepository = new BiometricKeysRepositoryImpl(biometricKeysDatasource);
const authRepository = new AuthRepositoryImpl(fakeAuthBackend, secureStorageDatasource);
const biometricEnrollmentRepository = new BiometricEnrollmentRepositoryImpl(
  biometricKeysRepository,
  fakeAuthBackend,
  secureStorageDatasource,
);

const checkBiometricCapabilityUseCase = new CheckBiometricCapabilityUseCase(biometricRepository);
const authenticateWithBiometricsUseCase = new AuthenticateWithBiometricsUseCase(biometricRepository);
const loginWithCredentialsUseCase = new LoginWithCredentialsUseCase(authRepository);
const enrollBiometricsUseCase = new EnrollBiometricsUseCase(biometricEnrollmentRepository);
const loginWithBiometricsUseCase = new LoginWithBiometricsUseCase(biometricEnrollmentRepository, authRepository);
const disableBiometricsUseCase = new DisableBiometricsUseCase(biometricEnrollmentRepository);
const logoutUseCase = new LogoutUseCase(authRepository);
const getSessionStateUseCase = new GetSessionStateUseCase(authRepository);

export const container = {
  checkBiometricCapabilityUseCase,
  authenticateWithBiometricsUseCase,
  loginWithCredentialsUseCase,
  enrollBiometricsUseCase,
  loginWithBiometricsUseCase,
  disableBiometricsUseCase,
  logoutUseCase,
  getSessionStateUseCase,
  fakeAuthBackend,
} as const;
```

The `fakeAuthBackend` is exposed for the Hardware Inspector's signature flow panel (read-only access to `getLastSignatureFlow()`).

## Error Handling

New error codes added to `AppErrorCode`:

```typescript
type AppErrorCode =
  | 'UNKNOWN'
  | 'BIOMETRIC_NOT_AVAILABLE'
  | 'BIOMETRIC_NOT_ENROLLED'
  | 'BIOMETRIC_LOCKOUT'
  | 'BIOMETRIC_CANCELLED'
  | 'BIOMETRIC_KEY_INVALIDATED'
  | 'BIOMETRIC_WEAK_SENSOR'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_CHALLENGE_EXPIRED'
  | 'AUTH_CHALLENGE_CONSUMED'
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_ENROLLMENT_FAILED'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR';
```

All use cases return `Result<T, AppError>` — the presentation layer maps codes to user-facing messages without exposing internal details.

## Data Flow Diagrams

### Credential Login Flow

```
User → LoginScreen → useAuth.login(credentials)
  → LoginWithCredentialsUseCase.execute(credentials)
    → AuthRepository.loginWithCredentials(credentials)
      → FakeAuthBackend.validateCredentials(username, password)
        ← Result<AuthSession(PASSWORD), AppError>
    → AuthRepository.persistSession(session)
      → SecureStorageDatasource.storeSession(session)
  ← session state updates → Navigation re-renders AppStack
```

### Biometric Login Flow

```
User → LoginScreen → useAuth.loginWithBiometrics()
  → LoginWithBiometricsUseCase.execute()
    → BiometricEnrollmentRepository.loginWithBiometrics()
      → SecureStorageDatasource.getEnrollmentFlag() → userId
      → FakeAuthBackend.issueChallenge(userId) → Challenge{nonce, expiresAt}
      → BiometricKeysRepository.createSignature(nonce)
        → BiometricKeysDatasource.createSignature(nonce)
          → [OS biometric prompt] → user match → signature
      → FakeAuthBackend.verifySignature(nonce, signature, userId)
        → mark challenge consumed
        → verify signature against stored public key
        ← Result<AuthSession(BIOMETRIC), AppError>
    → AuthRepository.persistSession(session)
  ← session state updates → Navigation re-renders AppStack
```

### Enrollment Flow

```
User → EnrollmentModal → onAccept
  → EnrollBiometricsUseCase.execute(userId)
    → BiometricEnrollmentRepository.enroll(userId)
      → BiometricKeysRepository.createKeys()
        → BiometricKeysDatasource.createKeys()
          → [OS key generation in Secure Enclave/TEE]
          ← publicKey
      → FakeAuthBackend.registerPublicKey(userId, publicKey)
      → SecureStorageDatasource.storeEnrollmentFlag(userId)
    ← Result<publicKey, AppError>
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid credentials produce a PASSWORD session

*For any* credential pair that matches a registered user in the FakeAuthBackend, calling `loginWithCredentials` SHALL return a Result with kind "ok" containing an AuthSession whose `method` field equals "PASSWORD" and whose `userId` matches the registered user.

**Validates: Requirements 1.1**

### Property 2: Invalid credentials produce an authentication error

*For any* credential pair where the username does not exist or the password does not match, calling `loginWithCredentials` SHALL return a Result with kind "err" containing an AppError with code "AUTH_INVALID_CREDENTIALS".

**Validates: Requirements 1.2**

### Property 3: Enrollment produces a registered key and persisted flag

*For any* valid userId, when enrollment succeeds (createKeys returns a public key), the FakeAuthBackend SHALL have that public key registered for the userId AND the SecureStorageDatasource SHALL have the enrollment flag stored for that userId.

**Validates: Requirements 2.2, 2.3**

### Property 4: Enrollment rejection is permanent until explicit clear

*For any* user who has declined enrollment (rejection flag persisted), calling `isEnrollmentRejected` SHALL return true regardless of how many subsequent credential logins occur, until `clearRejection` is explicitly called.

**Validates: Requirements 2.4**

### Property 5: Challenges are unique across all generations

*For any* set of N challenges generated by the FakeAuthBackend (for the same or different users), all nonce values SHALL be distinct.

**Validates: Requirements 3.2, 4.1**

### Property 6: Biometric login round-trip produces a BIOMETRIC session

*For any* enrolled user with a valid key pair, when the FakeAuthBackend issues a challenge and the BiometricKeysRepository signs it, verification SHALL return a Result with kind "ok" containing an AuthSession whose `method` equals "BIOMETRIC" and whose `userId` matches the enrolled user.

**Validates: Requirements 3.3, 3.4**

### Property 7: Challenge single-use invariant

*For any* challenge that has been used in one verification attempt (whether the verification succeeded or failed), any subsequent verification attempt using the same challenge nonce SHALL return a Result with kind "err" containing an AppError with code "AUTH_CHALLENGE_CONSUMED".

**Validates: Requirements 3.5, 4.2**

### Property 8: Challenge expiration after 60 seconds

*For any* challenge whose age exceeds 60 seconds (current time − issuedAt > 60000ms), a verification attempt using that challenge SHALL return a Result with kind "err" containing an AppError with code "AUTH_CHALLENGE_EXPIRED".

**Validates: Requirements 4.3**

### Property 9: Rate limiting blocks verification after threshold

*For any* user who has accumulated failed verification attempts equal to or exceeding the rate limit threshold (5), any subsequent verification request for that user SHALL return a Result with kind "err" containing an AppError with code "AUTH_RATE_LIMITED", regardless of whether the signature would be valid.

**Validates: Requirements 4.4**

### Property 10: Logout clears session but preserves enrollment

*For any* active session with an enrolled user, after calling `logout`, the stored session SHALL be null AND the enrollment flag SHALL still be present for that user.

**Validates: Requirements 6.1, 6.2**

### Property 11: Session persistence round-trip

*For any* valid AuthSession, storing it via `persistSession` and then retrieving it via `getSession` SHALL return an AuthSession with identical `userId`, `token`, `issuedAt`, and `method` fields.

**Validates: Requirements 6.5**

### Property 12: Disable biometrics clears all enrollment state

*For any* enrolled user, after calling `unenroll`, the BiometricKeysRepository SHALL report no keys exist AND the FakeAuthBackend SHALL have no public key registered for that user AND the SecureStorageDatasource SHALL have no enrollment flag.

**Validates: Requirements 7.1, 7.2**

### Property 13: Disable biometrics clears rejection flag

*For any* user who has both an active enrollment and a previously set rejection flag, after calling `unenroll`, the rejection flag SHALL be cleared (allowing future re-enrollment).

**Validates: Requirements 7.4**

### Property 14: Key invalidation triggers full enrollment cleanup

*For any* enrolled user, when a signature operation returns a "BIOMETRIC_KEY_INVALIDATED" error, the BiometricEnrollmentRepository SHALL clear the enrollment flag, delete the invalidated keys, and deregister the public key from the FakeAuthBackend.

**Validates: Requirements 8.1, 8.2**

### Property 15: Navigation state is session-driven

*For any* session state transition (null → AuthSession or AuthSession → null), the rendered navigation stack SHALL equal "AppStack" when session is non-null and "AuthStack" when session is null, without any imperative navigation call.

**Validates: Requirements 9.4**

## Testing Strategy

### Property-Based Tests (FakeAuthBackend + Use Cases)

The FakeAuthBackend and domain use cases are pure logic with clear input/output behavior — ideal for property-based testing. Tests use Jest with `fast-check` for random input generation.

- **Generators**: Random credentials, random challenge nonces, random userIds, random signatures
- **Injectable clock**: FakeAuthBackend accepts a clock function for deterministic time control
- **Fake implementations**: All repository interfaces have in-memory fake implementations for unit testing without native modules

### Example-Based Tests

- UI conditional rendering (enrollment modal trigger conditions)
- Navigation stack selection based on session state
- Specific error scenarios (key invalidation, weak biometrics rejection)
- Keychain configuration verification

### Integration Points (Manual Verification)

- Biometric prompt appearance on device
- Key invalidation detection after biometric enrollment change in device settings
- StrongBox vs TEE selection on Android
- Keychain accessibility configuration verification
