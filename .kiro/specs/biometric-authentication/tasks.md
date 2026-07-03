# Implementation Plan: Biometric Authentication

## Overview

Extend the existing Clean Architecture biometric detection (spec 02) with full authentication flow: add `authenticate()` to the domain repository, create the `AuthenticateWithBiometrics` use case, replace `useState`-based routing with React Navigation native-stack, and build the presentation layer (hook state machine, screens, components).

## Tasks

- [x] 1. Domain layer extensions
  - [x] 1.1 Create PromptConfig and BiometricAuthResult entities
    - Create `src/domain/biometrics/entities/biometric-auth.ts` with `PromptConfig` and `BiometricAuthResult` interfaces
    - Export from `src/domain/biometrics/entities/index.ts`
    - _Requirements: 1.2_

  - [x] 1.2 Extend BiometricRepository interface with authenticate method
    - Add `authenticate(config: PromptConfig): Promise<Result<BiometricAuthResult, AppError>>` to the existing `BiometricRepository` interface in `src/domain/biometrics/repositories/biometric.repository.ts`
    - _Requirements: 1.1, 1.2_

  - [x] 1.3 Implement AuthenticateWithBiometricsUseCase
    - Create `src/domain/biometrics/usecases/authenticate-with-biometrics.ts`
    - Gate on capability check before invoking authenticate — return `err(AppError)` when `available === false`
    - Pass through repository `authenticate()` result when available
    - Export from `src/domain/biometrics/usecases/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.4 Write unit tests for AuthenticateWithBiometricsUseCase
    - Create `src/domain/biometrics/usecases/__tests__/authenticate-with-biometrics.test.ts`
    - Use a fake `BiometricRepository` implementation
    - Test: success path returns `ok({ success: true })`
    - Test: failure path returns `ok({ success: false })`
    - Test: unavailable capability returns `err` without calling authenticate
    - Test: system error propagation from repository
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 1.5 Write property test: Capability Gate (Property 1)
    - **Property 1: Capability Gate**
    - For any PromptConfig and any BiometricCapability state, verify the use case invokes authenticate if and only if `available === true`; otherwise returns err without calling authenticate
    - **Validates: Requirements 1.1, 1.2, 1.5**

  - [ ]* 1.6 Write property test: Result Faithfulness (Property 2)
    - **Property 2: Result Faithfulness**
    - For any PromptConfig where capability is available, verify the use case maps the repository's authenticate response faithfully (ok→ok, err→err)
    - **Validates: Requirements 1.3, 1.4**

- [x] 2. Data layer extensions
  - [x] 2.1 Add authenticate method to BiometricDatasource
    - Extend `src/data/biometrics/datasources/biometric.datasource.ts` with `authenticate(config: PromptConfig)` method
    - Call `this.rnBiometrics.simplePrompt()` with title and cancelLabel from config
    - Wrap result in `Result<BiometricAuthResult, AppError>`
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 2.2 Add authenticate method to BiometricRepositoryImpl
    - Extend `src/data/biometrics/repositories/biometric.repository.impl.ts` with `authenticate()` that delegates to datasource
    - _Requirements: 1.2_

- [x] 3. DI container update
  - [x] 3.1 Register AuthenticateWithBiometricsUseCase in container
    - Update `src/di/container.ts` to instantiate and export `authenticateWithBiometricsUseCase`
    - _Requirements: 1.1_

- [x] 4. Checkpoint - Domain and data layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [-] 5. Navigation setup with React Navigation
  - [ ] 5.1 Install navigation dependencies and configure
    - Install `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`
    - Run `pod install` for iOS native linking
    - Update `babel.config.js` if any resolver changes are needed
    - _Requirements: 4.1, 4.5_

  - [ ] 5.2 Create navigation types and AppNavigator with native-stack
    - Create `src/presentation/navigation/types.ts` with `RootStackParamList` (Login, Home)
    - Replace `src/presentation/navigation/AppNavigator.tsx` with `NavigationContainer` + native-stack navigator
    - Set Login as initial route, headerShown false
    - _Requirements: 4.1, 4.2, 4.5_

- [ ] 6. Presentation layer — hook and screens
  - [ ] 6.1 Create useBiometricLogin hook with state machine
    - Create `src/presentation/features/auth/hooks/useBiometricLogin.ts`
    - Implement `AuthStatus` type: `'idle' | 'authenticating' | 'success' | 'failed'`
    - Preload capability on mount via `CheckBiometricCapabilityUseCase`
    - `login()`: transition idle→authenticating, call use case, resolve to success|failed
    - `reset()`: transition to idle
    - Return `{ status, capability, login, reset }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 6.2 Write property test: State Machine Invariant (Property 3)
    - **Property 3: State Machine Invariant**
    - For any sequence of `login()` and `reset()` invocations with any use case outcomes, verify status is always one of the 4 valid values
    - **Validates: Requirements 3.1**

  - [ ]* 6.3 Write property test: State Machine Transitions (Property 4)
    - **Property 4: State Machine Transitions**
    - For any invocation of `login()` from idle, verify status transitions to authenticating before resolving, then to success or failed based on result
    - **Validates: Requirements 3.4, 3.5, 3.6, 6.1, 6.3**

  - [ ]* 6.4 Write property test: Re-authentication After Failure (Property 5)
    - **Property 5: Re-authentication After Failure**
    - For any scenario reaching failed state, verify `reset()` then `login()` transitions through the full cycle without stale state
    - **Validates: Requirements 6.1, 6.3**

  - [ ] 6.5 Create LoginScreen with navigation
    - Create `src/presentation/features/auth/screens/LoginScreen.tsx`
    - Use `useBiometricLogin` hook for state
    - Navigate to Home via `navigation.replace('Home')` on success
    - Auto-reset after 3 seconds on failure
    - Compose `BiometricButton` and `EventFeedback` components
    - _Requirements: 2.1, 2.5, 4.3, 5.4_

  - [ ] 6.6 Create HomeScreen with logout
    - Create `src/presentation/features/auth/screens/HomeScreen.tsx`
    - Display simulated account info
    - Logout button resets navigation state via `CommonActions.reset`
    - _Requirements: 4.4_

  - [ ] 6.7 Create BiometricButton component
    - Create `src/presentation/features/auth/components/BiometricButton.tsx`
    - Disabled state when `capability.available === false` or status is authenticating
    - Label adapts to biometryType (Face ID vs fingerprint)
    - Show explanation text when disabled (NO_HARDWARE, NOT_ENROLLED)
    - Accessibility: `accessibilityRole="button"`, `accessibilityState`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 6.8 Create EventFeedback component
    - Create `src/presentation/features/auth/components/EventFeedback.tsx`
    - Render messages based on AuthStatus: authenticating, success, failed
    - Return null for idle
    - `accessibilityLiveRegion="polite"` for screen reader support
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.2_

- [ ] 7. Integration and wiring
  - [ ] 7.1 Update App.tsx to use new AppNavigator
    - Ensure `App.tsx` wraps `<AppNavigator />` inside `<SafeAreaProvider>` (or `<NavigationContainer>` if needed)
    - Remove any old useState-based routing references
    - _Requirements: 4.5_

  - [ ]* 7.2 Write hook tests for useBiometricLogin
    - Create `src/presentation/features/auth/hooks/__tests__/useBiometricLogin.test.ts`
    - Mock DI container use cases
    - Test: initial state is idle with capability loaded
    - Test: login transitions idle→authenticating→success
    - Test: login transitions idle→authenticating→failed
    - Test: reset transitions failed→idle
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_

  - [ ]* 7.3 Write component tests for BiometricButton and EventFeedback
    - Create `src/presentation/features/auth/components/__tests__/BiometricButton.test.tsx`
    - Create `src/presentation/features/auth/components/__tests__/EventFeedback.test.tsx`
    - Test disabled states, labels per biometryType, messages per status
    - _Requirements: 2.2, 2.3, 2.4, 5.1, 5.2, 5.3_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Navigation dependencies require `pod install` on iOS after installation
- The existing `LoginScreen` and `HomeScreen` files will be replaced (they currently accept navigation callbacks as props from the useState-based router)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1"] },
    { "id": 3, "tasks": ["1.4", "1.5", "1.6", "2.2"] },
    { "id": 4, "tasks": ["3.1", "5.1"] },
    { "id": 5, "tasks": ["5.2", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.4", "6.7", "6.8"] },
    { "id": 7, "tasks": ["6.5", "6.6"] },
    { "id": 8, "tasks": ["7.1"] },
    { "id": 9, "tasks": ["7.2", "7.3"] }
  ]
}
```
