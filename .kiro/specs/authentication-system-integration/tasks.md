# Implementation Plan: Authentication System Integration

## Overview

Integrates biometric authentication with a simulated credential-based authentication system following Clean Architecture. The implementation progresses bottom-up: dependencies → domain entities → repository interfaces → data layer (FakeAuthBackend, SecureStorage, BiometricKeys) → repository implementations → use cases → DI wiring → presentation (navigation, screens, modals) → educational panel. Property-based tests validate the FakeAuthBackend's security properties and use case contracts.

## Tasks

- [x] 1. Install dependencies and extend error codes
  - [x] 1.1 Install react-native-keychain and fast-check
    - Run `yarn add react-native-keychain` to add secure storage capability
    - Run `yarn add -D fast-check` for property-based testing
    - Run `cd ios && pod install` reminder for native linking
    - _Requirements: 5.1, 5.2, 12.8_

  - [x] 1.2 Extend AppErrorCode with authentication error codes
    - Add new codes to `src/core/errors/app-error.ts`: `BIOMETRIC_KEY_INVALIDATED`, `BIOMETRIC_WEAK_SENSOR`, `AUTH_CHALLENGE_EXPIRED`, `AUTH_CHALLENGE_CONSUMED`, `AUTH_RATE_LIMITED`, `AUTH_ENROLLMENT_FAILED`
    - _Requirements: 4.2, 4.3, 4.4, 8.1_

- [x] 2. Domain entities
  - [x] 2.1 Create AuthSession entity and AuthMethod type
    - Create `src/domain/auth/entities/auth-session.ts` with `AuthMethod` type (`'PASSWORD' | 'BIOMETRIC'`), `AuthSession` interface (userId, token, issuedAt, method), and `createAuthSession` factory function
    - _Requirements: 1.1, 3.4_

  - [x] 2.2 Create Credentials value object
    - Create `src/domain/auth/entities/credentials.ts` with `Credentials` interface (readonly username, password)
    - _Requirements: 1.1, 1.3_

  - [x] 2.3 Create Challenge entity
    - Create `src/domain/auth/entities/challenge.ts` with `Challenge` interface (nonce, issuedAt, expiresAt, consumed)
    - _Requirements: 3.2, 4.1_

  - [x] 2.4 Create barrel export for auth entities
    - Create `src/domain/auth/entities/index.ts` re-exporting all entities
    - _Requirements: 11.1_

- [x] 3. Domain repository interfaces
  - [x] 3.1 Create AuthRepository interface
    - Create `src/domain/auth/repositories/auth.repository.ts` with `loginWithCredentials`, `logout`, `getSession`, `persistSession` methods returning `Promise<Result<T, AppError>>`
    - _Requirements: 1.1, 1.2, 6.1, 6.5_

  - [x] 3.2 Create BiometricEnrollmentRepository interface
    - Create `src/domain/auth/repositories/biometric-enrollment.repository.ts` with `enroll`, `isEnrolled`, `loginWithBiometrics`, `unenroll`, `getPublicKey`, `isEnrollmentRejected`, `rejectEnrollment`, `clearRejection` methods
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 7.1, 7.2, 11.5_

  - [x] 3.3 Create BiometricKeysRepository interface
    - Create `src/domain/biometrics/repositories/biometric-keys.repository.ts` with `createKeys`, `createSignature`, `deleteKeys`, `biometricKeysExist` methods
    - Update barrel export in `src/domain/biometrics/repositories/index.ts`
    - _Requirements: 2.2, 3.3, 7.1, 11.4_

  - [x] 3.4 Create barrel export for auth repositories
    - Create `src/domain/auth/repositories/index.ts` re-exporting all repository interfaces
    - _Requirements: 11.5_

- [x] 4. FakeAuthBackend datasource
  - [x] 4.1 Implement FakeAuthBackend class
    - Create `src/data/auth/datasources/fake-auth-backend.ts`
    - Implement: `validateCredentials`, `issueChallenge`, `verifySignature`, `registerPublicKey`, `deregisterPublicKey`, `getLastSignatureFlow`, `resetFailedAttempts`
    - Use injectable clock function for testable time control
    - Use `crypto.randomUUID()` for challenge nonce generation (polyfill with `react-native-get-random-values` or uuid if needed)
    - Include predefined test users (e.g., username: "user1", password: "password1")
    - Enforce 60-second challenge TTL, single-use consumption, rate limiting (threshold: 5)
    - Store `SignatureFlowRecord` for Hardware Inspector
    - _Requirements: 1.3, 3.2, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 10.1_

  - [ ]* 4.2 Write property tests for FakeAuthBackend — challenge uniqueness
    - **Property 5: Challenges are unique across all generations**
    - Generate N challenges for random userIds and assert all nonces are distinct
    - **Validates: Requirements 3.2, 4.1**

  - [ ]* 4.3 Write property tests for FakeAuthBackend — challenge single-use
    - **Property 7: Challenge single-use invariant**
    - After one verification attempt (success or failure), reuse the same nonce and assert AUTH_CHALLENGE_CONSUMED error
    - **Validates: Requirements 3.5, 4.2**

  - [ ]* 4.4 Write property tests for FakeAuthBackend — challenge expiration
    - **Property 8: Challenge expiration after 60 seconds**
    - Inject a clock that advances > 60s between issue and verify, assert AUTH_CHALLENGE_EXPIRED error
    - **Validates: Requirements 4.3**

  - [ ]* 4.5 Write property tests for FakeAuthBackend — rate limiting
    - **Property 9: Rate limiting blocks verification after threshold**
    - Accumulate 5 failed attempts for a user, then assert any subsequent verification returns AUTH_RATE_LIMITED
    - **Validates: Requirements 4.4**

  - [ ]* 4.6 Write property tests for FakeAuthBackend — valid/invalid credentials
    - **Property 1: Valid credentials produce a PASSWORD session**
    - **Property 2: Invalid credentials produce an authentication error**
    - Generate random credentials and verify result matches validity
    - **Validates: Requirements 1.1, 1.2**

- [~] 5. Checkpoint — FakeAuthBackend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. SecureStorageDatasource
  - [x] 6.1 Implement SecureStorageDatasource class
    - Create `src/data/auth/datasources/secure-storage.datasource.ts`
    - Import `react-native-keychain` — this is the ONLY file that may import it (Req 11.1)
    - Implement: `storeSession`, `getSession`, `clearSession`, `storeEnrollmentFlag`, `getEnrollmentFlag`, `clearEnrollmentFlag`, `storeRejectionFlag`, `getRejectionFlag`, `clearRejectionFlag`, `getSecurityLevel`
    - Configure `accessible: WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`, `accessControl: BIOMETRY_CURRENT_SET`
    - Use distinct service names per item (`com.app.session`, `com.app.enrollment`, `com.app.rejection`)
    - Never store user password
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 11.1_

- [x] 7. BiometricKeysDatasource
  - [x] 7.1 Implement BiometricKeysDatasource class
    - Create `src/data/biometrics/datasources/biometric-keys.datasource.ts`
    - Wrap `react-native-biometrics` key operations: `createKeys`, `createSignature`, `deleteKeys`, `biometricKeysExist`
    - Configure `allowDeviceCredentials: false` for Class 3 biometric-only
    - Map key invalidation errors to `BIOMETRIC_KEY_INVALIDATED` AppError code
    - _Requirements: 5.3, 5.4, 5.6, 8.1, 11.2_

- [ ] 8. Repository implementations
  - [~] 8.1 Implement AuthRepositoryImpl
    - Create `src/data/auth/repositories/auth.repository.impl.ts`
    - Depends on `FakeAuthBackend` and `SecureStorageDatasource`
    - Implement `loginWithCredentials`, `logout`, `getSession`, `persistSession`
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.5_

  - [~] 8.2 Implement BiometricKeysRepositoryImpl
    - Create `src/data/biometrics/repositories/biometric-keys.repository.impl.ts`
    - Delegates to `BiometricKeysDatasource`
    - Update barrel export
    - _Requirements: 2.2, 3.3, 7.1, 11.4_

  - [~] 8.3 Implement BiometricEnrollmentRepositoryImpl
    - Create `src/data/auth/repositories/biometric-enrollment.repository.impl.ts`
    - Depends on `BiometricKeysRepository` (domain interface), `FakeAuthBackend`, `SecureStorageDatasource`
    - Implement `enroll`, `isEnrolled`, `loginWithBiometrics` (challenge→signature→verify flow), `unenroll`, `getPublicKey`, `isEnrollmentRejected`, `rejectEnrollment`, `clearRejection`
    - Handle key invalidation detection and full cleanup
    - No cross-feature data imports (uses domain interface for biometrics)
    - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.4, 8.1, 8.2, 11.3, 11.5_

- [ ] 9. Use cases
  - [~] 9.1 Implement LoginWithCredentialsUseCase
    - Create `src/domain/auth/usecases/login-with-credentials.ts`
    - Calls `authRepository.loginWithCredentials` then `persistSession` on success
    - _Requirements: 1.1, 1.2_

  - [~] 9.2 Implement EnrollBiometricsUseCase
    - Create `src/domain/auth/usecases/enroll-biometrics.ts`
    - Delegates to `enrollmentRepository.enroll(userId)`
    - _Requirements: 2.2, 2.3_

  - [~] 9.3 Implement LoginWithBiometricsUseCase
    - Create `src/domain/auth/usecases/login-with-biometrics.ts`
    - Calls `enrollmentRepository.loginWithBiometrics` then `authRepository.persistSession` on success
    - _Requirements: 3.2, 3.3, 3.4_

  - [~] 9.4 Implement DisableBiometricsUseCase
    - Create `src/domain/auth/usecases/disable-biometrics.ts`
    - Delegates to `enrollmentRepository.unenroll()`
    - _Requirements: 7.1, 7.2_

  - [~] 9.5 Implement LogoutUseCase
    - Create `src/domain/auth/usecases/logout.ts`
    - Calls `authRepository.logout()`
    - _Requirements: 6.1, 6.2_

  - [~] 9.6 Implement GetSessionStateUseCase
    - Create `src/domain/auth/usecases/get-session-state.ts`
    - Calls `authRepository.getSession()`
    - _Requirements: 6.5, 9.1, 9.2_

  - [~] 9.7 Create barrel export for auth use cases
    - Create `src/domain/auth/usecases/index.ts`
    - _Requirements: 11.1_

  - [ ]* 9.8 Write property tests for use cases — login round-trips
    - **Property 6: Biometric login round-trip produces a BIOMETRIC session**
    - Use fake repository implementations; verify enrolled user's biometric login returns AuthSession with method BIOMETRIC
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 9.9 Write property tests for use cases — enrollment produces registered key
    - **Property 3: Enrollment produces a registered key and persisted flag**
    - Use fake repositories; verify enrollment stores publicKey and enrollment flag
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 9.10 Write property tests for use cases — logout preserves enrollment
    - **Property 10: Logout clears session but preserves enrollment**
    - After logout, verify session is null but enrollment flag persists
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 9.11 Write property tests for use cases — disable biometrics cleanup
    - **Property 12: Disable biometrics clears all enrollment state**
    - **Property 13: Disable biometrics clears rejection flag**
    - After unenroll, verify no keys exist, no enrollment flag, no rejection flag
    - **Validates: Requirements 7.1, 7.2, 7.4**

  - [ ]* 9.12 Write property tests for use cases — key invalidation cleanup
    - **Property 14: Key invalidation triggers full enrollment cleanup**
    - Simulate BIOMETRIC_KEY_INVALIDATED during signature; verify enrollment cleared, keys deleted, public key deregistered
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 9.13 Write unit tests for LoginWithCredentials and Logout
    - Test successful login returns AuthSession with method PASSWORD
    - Test failed login returns AUTH_INVALID_CREDENTIALS error
    - Test logout clears session
    - **Validates: Requirements 1.1, 1.2, 6.1**

  - [ ]* 9.14 Write unit tests for EnrollBiometrics and DisableBiometrics
    - Test enrollment success returns public key
    - Test enrollment failure propagates error
    - Test disable deletes keys and clears state
    - **Validates: Requirements 2.2, 7.1, 7.2**

- [~] 10. Checkpoint — Domain and data layers
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. DI container wiring
  - [~] 11.1 Wire authentication dependencies in container.ts
    - Instantiate `BiometricKeysDatasource`, `FakeAuthBackend`, `SecureStorageDatasource`
    - Instantiate `BiometricKeysRepositoryImpl`, `AuthRepositoryImpl`, `BiometricEnrollmentRepositoryImpl`
    - Instantiate all auth use cases: `LoginWithCredentialsUseCase`, `EnrollBiometricsUseCase`, `LoginWithBiometricsUseCase`, `DisableBiometricsUseCase`, `LogoutUseCase`, `GetSessionStateUseCase`
    - Export `fakeAuthBackend` for Hardware Inspector read-only access
    - Preserve existing biometric capability exports
    - _Requirements: 11.3, 11.5_

- [ ] 12. Presentation — hooks and session management
  - [~] 12.1 Implement useSession hook
    - Create `src/presentation/features/auth/hooks/useSession.ts`
    - On mount: call `GetSessionStateUseCase` to restore persisted session
    - Expose: `session`, `isLoading`, `setSession`, `clearSession`
    - Use React state (or context) to drive navigation conditional rendering
    - _Requirements: 6.5, 9.1, 9.2, 9.4_

  - [~] 12.2 Implement useAuth hook
    - Create `src/presentation/features/auth/hooks/useAuth.ts`
    - Expose: `login(credentials)`, `loginWithBiometrics()`, `logout()`, `enrollBiometrics(userId)`, `disableBiometrics()`, `isEnrolled`, `isRejected`, `isLoading`, `error`
    - Wire to use cases from DI container
    - _Requirements: 1.1, 2.1, 3.1, 6.1, 7.1_

- [ ] 13. Presentation — Navigation
  - [~] 13.1 Implement conditional AppNavigator with auth/app stacks
    - Modify `src/presentation/navigation/AppNavigator.tsx`
    - Use `useSession` hook to drive conditional rendering
    - AuthStack: contains LoginScreen
    - AppStack: contains HomeScreen
    - Use `@react-navigation/native-stack` (already installed)
    - No imperative navigation calls — React reconciliation handles transitions
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 14. Presentation — Screens
  - [~] 14.1 Implement LoginScreen
    - Create `src/presentation/features/auth/screens/LoginScreen.tsx`
    - Credential form: username + password TextInputs
    - Login button (credential-based)
    - Conditional biometric login button (visible only when enrolled)
    - Error display using existing error patterns
    - _Requirements: 1.1, 1.2, 3.1, 3.7_

  - [~] 14.2 Implement EnrollmentModal component
    - Create `src/presentation/features/auth/components/EnrollmentModal.tsx`
    - React Native Modal; visible after first credential login when not enrolled and not rejected
    - Accept button: triggers `EnrollBiometricsUseCase`
    - Decline button: calls `rejectEnrollment()` for permanent dismissal
    - Error and loading states
    - _Requirements: 2.1, 2.4, 2.5, 2.6_

  - [~] 14.3 Implement HomeScreen with Settings section
    - Create `src/presentation/features/auth/screens/HomeScreen.tsx`
    - Display session info (userId, method, issuedAt)
    - Biometric toggle (enable/disable)
    - Public key display (truncated, for educational inspection)
    - Simulated session expiration button
    - Logout button
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.3, 10.5_

  - [~] 14.4 Extend Hardware Inspector with Signature Flow panel
    - Add panel to existing biometrics Hardware Inspector
    - Display: last challenge nonce, signature (truncated), verification result (success/failure + reason)
    - Display security level from react-native-keychain via SecureStorageDatasource
    - Read from `fakeAuthBackend.getLastSignatureFlow()` exposed via container
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

- [~] 15. Checkpoint — Presentation layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Integration and final wiring
  - [~] 16.1 Wire App.tsx to use AppNavigator with session provider
    - Update `App.tsx` to render `AppNavigator` with `NavigationContainer`
    - Ensure session context wraps the navigation tree
    - _Requirements: 9.1, 9.4_

  - [ ]* 16.2 Write integration tests for authentication flows
    - Test full credential login → session established → navigation state
    - Test enrollment flow end-to-end with fake repositories
    - Test biometric login challenge→signature→verify with fakes
    - Test logout preserves enrollment, clears session
    - Test disable biometrics clears all state
    - Use Jest with fake implementations (no native modules)
    - **Property 11: Session persistence round-trip**
    - **Property 15: Navigation state is session-driven**
    - **Validates: Requirements 1.1, 3.4, 6.1, 6.2, 6.5, 9.4, 12.4, 12.5, 12.6, 12.7, 12.8**

- [~] 17. Final checkpoint — All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The FakeAuthBackend uses an injectable clock for deterministic testing of time-based logic
- All repository fakes for testing are in-memory implementations without native module dependencies
- No inline comments in code (steering rule); code must be self-explanatory
- `react-native-keychain` is imported ONLY in `SecureStorageDatasource` (Req 11.1)
- `react-native-biometrics` key operations are imported ONLY in `BiometricKeysDatasource` (Req 11.2)
- Cross-feature composition happens exclusively through domain interfaces wired in DI

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4"] },
    { "id": 3, "tasks": ["4.1", "6.1", "7.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6"] },
    { "id": 5, "tasks": ["8.1", "8.2"] },
    { "id": 6, "tasks": ["8.3"] },
    { "id": 7, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7"] },
    { "id": 8, "tasks": ["9.8", "9.9", "9.10", "9.11", "9.12", "9.13", "9.14"] },
    { "id": 9, "tasks": ["11.1"] },
    { "id": 10, "tasks": ["12.1", "12.2"] },
    { "id": 11, "tasks": ["13.1"] },
    { "id": 12, "tasks": ["14.1", "14.2", "14.3", "14.4"] },
    { "id": 13, "tasks": ["16.1"] },
    { "id": 14, "tasks": ["16.2"] }
  ]
}
```
