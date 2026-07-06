# Implementation Plan: Error Handling & Validations

## Overview

Implementar clasificación de errores biométricos limitada a lo que react-native-biometrics puede reportar a JavaScript, mapeo heurístico de errores nativos, pre-validación con manejo de lockout, y un BiometricErrorBanner para feedback contextual en la UI.

## Tasks

- [x] 1. Create BiometricError entity and error taxonomy
  - [x] 1.1 Create `src/domain/biometrics/entities/biometric-error.ts`
    - Define `BiometricErrorCode` union type with 5 codes: NO_HARDWARE, NOT_ENROLLED, USER_CANCELLED, LOCKOUT, UNKNOWN
    - Define `SuggestedAction` type with 3 values: ENROLL, WAIT, NONE
    - Define `ErrorMetadata` and `BiometricError` interfaces
    - Implement `ERROR_METADATA_MAP` with es-ES messages, recoverable flags, and suggested actions
    - Export `getErrorMetadata` and `createBiometricError` factory functions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 2. Implement NativeErrorMapper
  - [x] 2.1 Create `src/data/biometrics/datasources/native-error-mapper.ts`
    - Implement `mapNativeError(nativeCode: unknown): BiometricErrorCode` using heuristic string matching
    - Match "user cancel" (case-insensitive) → USER_CANCELLED
    - Match "lockout" or "too many attempts" (case-insensitive) → LOCKOUT
    - Return UNKNOWN for null, undefined, empty, or unrecognized strings
    - Never throws for any input
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Update AuthenticateWithBiometrics use case
  - [x] 3.1 Update `src/domain/biometrics/repositories/biometric.repository.ts`
    - Change `authenticate` return type to `Promise<Result<BiometricAuthResult, BiometricError>>`
    - _Requirements: 3.1_

  - [x] 3.2 Rewrite `src/domain/biometrics/usecases/authenticate-with-biometrics.ts`
    - Define `AuthenticationState` with single field: `biometricDisabled: boolean`
    - Pre-validate capability before prompt
    - On LOCKOUT → set biometricDisabled = true
    - On USER_CANCELLED / UNKNOWN → passthrough (no state change)
    - Expose `getState()` and `resetState()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.3 Update `src/data/biometrics/datasources/biometric.datasource.ts`
    - Use `mapNativeError` in authenticate method
    - Handle resolve path (error field) and reject/catch path
    - Return `Result<BiometricAuthResult, BiometricError>`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Update `src/data/biometrics/repositories/biometric.repository.impl.ts`
    - Align with updated BiometricRepository interface
    - _Requirements: 3.1_

- [x] 4. Implement BiometricErrorBanner
  - [x] 4.1 Create `src/presentation/shared/components/BiometricErrorBanner.tsx`
    - Accept props: error, onRetry, onEnroll, onDismiss
    - Render null when error is null
    - Display error.metadata.message
    - Render "Ir a Ajustes" button only for ENROLL action
    - No button for WAIT and NONE
    - Use `accessibilityRole="alert"` and `accessibilityLiveRegion="assertive"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5. Integration: update useBiometricLogin and Login screen
  - [x] 5.1 Update `src/presentation/features/auth/hooks/useBiometricLogin.ts`
    - Expose `biometricError: BiometricError | null` state
    - Expose `biometricDisabled: boolean` from use case state
    - On LOCKOUT, set biometricDisabled locally
    - Expose `clearError` callback
    - _Requirements: 3.3, 3.4, 4.7_

  - [x] 5.2 Integrate BiometricErrorBanner into Login screen
    - Pass biometricError from useBiometricLogin
    - Wire onDismiss to clearError
    - Disable biometric login button when biometricDisabled is true
    - Remove Toast for biometric errors (keep Toast for success only)
    - _Requirements: 4.7, 4.8, 4.9_

  - [x] 5.3 Verify DI container `src/di/container.ts`
    - Confirm AuthenticateWithBiometricsUseCase is correctly wired
    - _Requirements: 3.1_

## Notes

- All tasks are complete — implementation reflects the reduced taxonomy based on react-native-biometrics limitations
- Codes AUTH_FAILED, SYSTEM_CANCELLED, LOCKOUT_PERMANENT, NOT_AVAILABLE were eliminated (not detectable via simplePrompt)
- Lab Mode and ParameterStore were removed (no longer part of scope)
- The mapper uses heuristic matching (includes) instead of exact string table because native error strings are localized and unpredictable

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["3.1", "3.2"] },
    { "id": 2, "tasks": ["3.3", "3.4", "4.1"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3"] }
  ]
}
```
