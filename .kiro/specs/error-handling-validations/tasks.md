# Implementation Plan: Error Handling & Validations

## Overview

Implement structured biometric error taxonomy, platform-aware native error mapping, retry policies with lockout awareness, a shared BiometricErrorBanner component, and a lab mode for manual error provocation. Tasks follow Clean Architecture layer order: domain entities → data layer mapper → domain use case updates → presentation components → integration wiring.

## Tasks

- [ ] 1. Create BiometricError entity and error taxonomy
  - [ ] 1.1 Create `src/domain/biometrics/entities/biometric-error.ts`
    - Define `BiometricErrorCode` union type with all 9 codes
    - Define `SuggestedAction` type
    - Define `ErrorMetadata` and `BiometricError` interfaces
    - Implement `ERROR_METADATA_MAP` with es-ES messages, recoverable flags, and suggested actions
    - Export `getErrorMetadata` and `createBiometricError` factory functions
    - Export the entity from `src/domain/biometrics/entities/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11_

  - [ ]* 1.2 Write property test for error metadata completeness
    - **Property 1: Error Metadata Completeness**
    - For every value in the BiometricErrorCode union, `getErrorMetadata(code)` returns an object with boolean `recoverable`, valid `SuggestedAction`, and non-empty `message`
    - Test file: `src/domain/biometrics/entities/__tests__/biometric-error.test.ts`
    - **Validates: Requirements 1.1, 1.2**

  - [ ]* 1.3 Write unit tests for BiometricError entity
    - Validate each code's specific metadata values (recoverable, suggestedAction per Req 1.3–1.11)
    - Verify `createBiometricError` returns correct structure with timestamp
    - Test file: `src/domain/biometrics/entities/__tests__/biometric-error.test.ts`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11_

- [ ] 2. Implement NativeErrorMapper
  - [ ] 2.1 Create `src/data/biometrics/datasources/native-error-mapper.ts`
    - Define `NATIVE_ERROR_MAP` with all iOS LAError, Android BiometricPrompt, and react-native-biometrics string entries
    - Implement `mapNativeError(nativeCode: unknown): BiometricErrorCode` — never throws
    - Export `KNOWN_NATIVE_CODES` for test use
    - Export from `src/data/biometrics/datasources/index.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 2.2 Write property test for native error mapping correctness
    - **Property 2: Native Error Mapping Correctness**
    - For each `(nativeCode, expectedDomainCode)` pair in the mapping table, `mapNativeError(nativeCode)` returns exactly `expectedDomainCode`
    - Test file: `src/data/biometrics/datasources/__tests__/native-error-mapper.test.ts`
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

  - [ ]* 2.3 Write property test for unmapped input fallback
    - **Property 3: Unmapped Input Falls Back to UNKNOWN**
    - For any input not in the known native codes set (null, undefined, empty string, arbitrary strings), `mapNativeError(input)` returns `'UNKNOWN'` without throwing
    - Test file: `src/data/biometrics/datasources/__tests__/native-error-mapper.test.ts`
    - **Validates: Requirements 2.8, 2.9**

  - [ ]* 2.4 Write exhaustive unit tests for NativeErrorMapper
    - One test case per mapping row (14 rows) verifying correct domain code
    - Edge cases: null, undefined, empty string, random strings → UNKNOWN
    - Verify no exceptions thrown for any input
    - Test file: `src/data/biometrics/datasources/__tests__/native-error-mapper.test.ts`
    - _Requirements: 2.10_

- [ ] 3. Checkpoint - Domain and data layer verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Update AuthenticateWithBiometrics use case with retry policy
  - [ ] 4.1 Update `src/domain/biometrics/repositories/biometric.repository.ts`
    - Change `authenticate` return type to `Promise<Result<BiometricAuthResult, BiometricError>>`
    - Import `BiometricError` from the new entity
    - _Requirements: 3.1_

  - [ ] 4.2 Rewrite `src/domain/biometrics/usecases/authenticate-with-biometrics.ts`
    - Export `MAX_FAILED_PROMPTS = 3` named constant
    - Add `AuthenticationState` interface (failedPromptCount, silentRetryAttempted, biometricDisabled)
    - Implement pre-validation gate (check capability before prompt)
    - Implement AUTH_FAILED counter with threshold logic
    - Implement LOCKOUT / LOCKOUT_PERMANENT disabling biometric option
    - Implement SYSTEM_CANCELLED single silent retry
    - Implement USER_CANCELLED passthrough (no retry)
    - Reset counter on success
    - Export from `src/domain/biometrics/usecases/index.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [ ] 4.3 Update `src/data/biometrics/datasources/biometric.datasource.ts`
    - Import and use `mapNativeError` in the `authenticate` method
    - Return `Result<BiometricAuthResult, BiometricError>` using `createBiometricError`
    - Handle both `simplePrompt` error field and caught exceptions
    - _Requirements: 2.1, 2.8, 2.9_

  - [ ] 4.4 Update `src/data/biometrics/repositories/biometric.repository.impl.ts`
    - Align implementation with updated `BiometricRepository` interface signature
    - _Requirements: 3.1_

  - [ ]* 4.5 Write property test for pre-validation gate
    - **Property 4: Pre-validation Gate**
    - When `checkCapability()` returns non-available, use case returns error without calling `authenticate`
    - Test file: `src/domain/biometrics/usecases/__tests__/authenticate-with-biometrics.test.ts`
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 4.6 Write property test for failed prompt counter and threshold
    - **Property 5: Failed Prompt Counter and Threshold**
    - After N consecutive AUTH_FAILED results, failedPromptCount equals N; at MAX_FAILED_PROMPTS, suggestedAction changes
    - Test file: `src/domain/biometrics/usecases/__tests__/authenticate-with-biometrics.test.ts`
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 4.7 Write property test for SYSTEM_CANCELLED single retry invariant
    - **Property 6: SYSTEM_CANCELLED Single Retry Invariant**
    - First SYSTEM_CANCELLED permits one retry; subsequent ones propagate error without retry
    - Test file: `src/domain/biometrics/usecases/__tests__/authenticate-with-biometrics.test.ts`
    - **Validates: Requirements 3.9, 3.10**

  - [ ]* 4.8 Write unit tests for use case retry policy
    - Test USER_CANCELLED passthrough (no retry, idle state)
    - Test LOCKOUT sets biometricDisabled = true
    - Test LOCKOUT_PERMANENT sets biometricDisabled = true
    - Test counter resets on success
    - Test resetState() clears all state
    - Test file: `src/domain/biometrics/usecases/__tests__/authenticate-with-biometrics.test.ts`
    - _Requirements: 3.3, 3.6, 3.7, 3.8_

- [ ] 5. Checkpoint - Use case and data layer integration verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement BiometricErrorBanner shared component
  - [ ] 6.1 Create `src/presentation/shared/components/BiometricErrorBanner.tsx`
    - Accept props: error, failedPromptCount, onRetry, onEnroll, onUseDeviceCredential, onDismiss
    - Render null when error is null
    - Display error.metadata.message
    - Render contextual action button based on suggestedAction (RETRY→Reintentar, ENROLL→Ir a Ajustes, USE_DEVICE_CREDENTIAL→Usar PIN/Patrón, WAIT/NONE→no button)
    - Use `accessibilityRole="alert"` and `accessibilityLiveRegion="assertive"`
    - Export `getActionLabel` helper for testability
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 6.2 Write property test for banner action button mapping
    - **Property 7: Banner Action Button Matches SuggestedAction**
    - For any BiometricError, `getActionLabel(suggestedAction)` returns correct label or null per mapping
    - Test file: `src/presentation/shared/components/__tests__/BiometricErrorBanner.test.tsx`
    - **Validates: Requirements 4.2, 4.8**

  - [ ]* 6.3 Write unit tests for BiometricErrorBanner
    - Renders null when error is null
    - Displays correct message for each error type
    - Shows "Reintentar" button for RETRY action
    - Shows "Ir a Ajustes" button for ENROLL action
    - Shows "Usar PIN/Patrón" button for USE_DEVICE_CREDENTIAL action
    - Hides button for WAIT and NONE actions
    - Fires onRetry/onEnroll/onUseDeviceCredential handlers on press
    - Accessibility attributes are present
    - Test file: `src/presentation/shared/components/__tests__/BiometricErrorBanner.test.tsx`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [ ] 7. Implement Lab Mode hook and integrate into HardwareInspectorScreen
  - [ ] 7.1 Create `src/presentation/features/biometrics/hooks/useLabMode.ts`
    - Define `ErrorLogEntry` interface (nativeCode, domainCode, timestamp)
    - Define `LabScenario` interface and export `LAB_SCENARIOS` array (4+ scenarios)
    - Implement hook returning: scenarios, errorLog, lastError, logError, clearLog
    - In-memory only (state resets on unmount)
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ] 7.2 Update `src/presentation/features/biometrics/screens/HardwareInspectorScreen.tsx`
    - Import and use `useLabMode` hook
    - Render lab scenario list with instructions
    - Trigger biometric prompt from scenario cards
    - On error, call `logError` and display `BiometricErrorBanner`
    - Display accumulated ErrorLog entries
    - Add "Clear log" button calling `clearLog`
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6_

  - [ ]* 7.3 Write property test for ErrorLog entry completeness
    - **Property 8: ErrorLog Entry Completeness**
    - For any BiometricError logged via `logError`, the resulting entry contains nativeCode, domainCode equal to error.code, and numeric timestamp equal to error.timestamp
    - Test file: `src/presentation/features/biometrics/hooks/__tests__/useLabMode.test.ts`
    - **Validates: Requirements 5.2**

  - [ ]* 7.4 Write unit tests for useLabMode hook
    - Verify scenarios list has at least 4 items
    - Verify logError appends entry with correct fields
    - Verify clearLog resets errorLog and lastError
    - Verify initial state is empty
    - Test file: `src/presentation/features/biometrics/hooks/__tests__/useLabMode.test.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ] 8. Integration: update useBiometricLogin and Login screen
  - [ ] 8.1 Update `src/presentation/features/auth/hooks/useBiometricLogin.ts`
    - Consume the updated `AuthenticateWithBiometricsUseCase` with retry policy
    - Expose `biometricError: BiometricError | null` state
    - Expose `failedPromptCount` from use case state
    - Handle SYSTEM_CANCELLED retry via `handleSystemCancelledRetry`
    - Set `biometricDisabled` flag on LOCKOUT/LOCKOUT_PERMANENT
    - Replace Toast-based error display with BiometricError state propagation
    - _Requirements: 3.3, 3.4, 3.5, 3.7, 3.8, 3.9, 4.10_

  - [ ] 8.2 Integrate BiometricErrorBanner into Login screen
    - Import `BiometricErrorBanner` in the Login screen component
    - Pass biometricError and failedPromptCount from useBiometricLogin
    - Wire onRetry to re-trigger authentication
    - Wire onDismiss to clear error state
    - Disable biometric login button when biometricDisabled is true
    - Remove Toast usage for biometric errors (keep Toast for success only)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.9, 4.10_

  - [ ] 8.3 Update DI container `src/di/container.ts`
    - Ensure `AuthenticateWithBiometricsUseCase` is registered with updated constructor
    - Verify datasource and repository bindings reflect new return types
    - _Requirements: 3.1_

  - [ ]* 8.4 Write unit tests for useBiometricLogin hook updates
    - Test error state is set on authentication failure
    - Test biometricDisabled flag on lockout
    - Test SYSTEM_CANCELLED triggers one retry
    - Test error state clears on success
    - Test file: `src/presentation/features/auth/hooks/__tests__/useBiometricLogin.test.ts`
    - _Requirements: 3.3, 3.5, 3.7, 3.9, 4.10_

- [ ] 9. Final checkpoint - Full integration verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All test files co-located in `__tests__/` directories per project convention
- TypeScript is the implementation language (project standard)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["4.1", "4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4"] },
    { "id": 4, "tasks": ["4.5", "4.6", "4.7", "4.8", "6.1", "7.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3"] },
    { "id": 8, "tasks": ["8.4"] }
  ]
}
```
