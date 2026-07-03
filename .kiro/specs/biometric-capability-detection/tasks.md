# Implementation Plan: Biometric Capability Detection

## Overview

Implement the full vertical slice for biometric hardware capability detection following Clean Architecture. The implementation order is: native library installation → domain layer → domain tests → data layer → data tests → DI wiring → presentation layer → App.tsx integration.

## Tasks

- [x] 1. Install react-native-biometrics and configure native platforms
  - [x] 1.1 Install react-native-biometrics and configure iOS/Android
    - Run `npm install react-native-biometrics`
    - Add `NSFaceIDUsageDescription` to `ios/rnbiometricsauth/Info.plist`
    - Add `<uses-permission android:name="android.permission.USE_BIOMETRIC"/>` to `android/app/src/main/AndroidManifest.xml`
    - Run `pod install` in `ios/` directory
    - _Requirements: 4.1, 4.2_

- [x] 2. Implement domain layer
  - [x] 2.1 Create BiometricCapability entity with factory function
    - Create `src/domain/biometrics/entities/biometric-capability.ts`
    - Define `BiometryType` union type: `'FaceID' | 'TouchID' | 'Fingerprint' | 'Face' | 'Iris' | 'Unknown'`
    - Define `CapabilityReason` type: `'NO_HARDWARE' | 'NOT_ENROLLED' | 'AVAILABLE'`
    - Define `BiometricCapability` interface with `available`, `biometryType`, `reason` fields
    - Implement `createBiometricCapability(reason, biometryType)` factory that derives `available` from `reason === 'AVAILABLE'`
    - Export barrel index at `src/domain/biometrics/entities/index.ts`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Create BiometricRepository interface
    - Create `src/domain/biometrics/repositories/biometric.repository.ts`
    - Declare `BiometricRepository` interface with `checkCapability(): Promise<Result<BiometricCapability, AppError>>`
    - Import `Result` from `@core/types/result` and `AppError` from `@core/errors/app-error`
    - Export barrel index at `src/domain/biometrics/repositories/index.ts`
    - _Requirements: 2.1, 2.2_

  - [x] 2.3 Create CheckBiometricCapabilityUseCase
    - Create `src/domain/biometrics/usecases/check-biometric-capability.ts`
    - Implement class with constructor receiving `BiometricRepository` interface
    - Implement `execute()` method that delegates to `repository.checkCapability()`
    - Export barrel index at `src/domain/biometrics/usecases/index.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 2.4 Write property test for available field invariant
    - **Property 1: Available field invariant**
    - For all valid `reason` and `biometryType` combinations, `createBiometricCapability(reason, type).available === (reason === 'AVAILABLE')`
    - Create test at `src/domain/biometrics/entities/__tests__/biometric-capability.property.test.ts`
    - Generate all combinations of reason × biometryType (including null) and assert invariant holds
    - **Validates: Requirements 1.3**

- [x] 3. Domain layer unit tests
  - [x] 3.1 Write unit tests for CheckBiometricCapabilityUseCase
    - Create `src/domain/biometrics/usecases/__tests__/check-biometric-capability.test.ts`
    - Implement `FakeBiometricRepository` implementing `BiometricRepository` interface with configurable result
    - Test: repository returns AVAILABLE with FaceID → use case forwards correctly
    - Test: repository returns AVAILABLE with TouchID → use case forwards correctly
    - Test: repository returns AVAILABLE with Fingerprint → use case forwards correctly
    - Test: repository returns NOT_ENROLLED → use case forwards correctly
    - Test: repository returns NO_HARDWARE → use case forwards correctly
    - Test: repository returns error → use case propagates error unchanged
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 3.2 Write property test for error propagation through layers
    - **Property 2: Error propagation through layers**
    - For any `AppError` returned by the fake repository, the use case `execute()` resolves to the same `err(appError)` with identical code and message
    - Create test at `src/domain/biometrics/usecases/__tests__/check-biometric-capability.property.test.ts`
    - Generate random AppError codes and messages, assert use case propagates them unchanged
    - **Validates: Requirements 3.4, 5.4**

- [x] 4. Checkpoint — Domain layer verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement data layer
  - [x] 5.1 Create BiometricDatasource
    - Create `src/data/biometrics/datasources/biometric.datasource.ts`
    - Import `ReactNativeBiometrics` from `react-native-biometrics` (ONLY import point in project)
    - Implement `checkCapability()` that calls `rnBiometrics.isSensorAvailable()`
    - Map `{ available: true, biometryType }` → `createBiometricCapability('AVAILABLE', mappedType)`
    - Map not-enrolled error → `createBiometricCapability('NOT_ENROLLED', mappedType or null)`
    - Map no hardware → `createBiometricCapability('NO_HARDWARE', null)`
    - Catch exceptions → `err(new AppError('BIOMETRIC_NOT_AVAILABLE', ...))`
    - Implement `mapBiometryType()` private method: 'FaceID'→'FaceID', 'TouchID'→'TouchID', 'Biometrics'→'Fingerprint', default→'Unknown'
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.2 Create BiometricRepositoryImpl
    - Create `src/data/biometrics/repositories/biometric.repository.impl.ts`
    - Implement `BiometricRepository` interface
    - Constructor receives `BiometricDatasource`
    - `checkCapability()` delegates to `datasource.checkCapability()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.3 Write datasource tests with mocked native module
    - Create `src/data/biometrics/datasources/__tests__/biometric.datasource.test.ts`
    - Jest mock `react-native-biometrics` module
    - Test: native returns `{ available: true, biometryType: 'FaceID' }` → maps to AVAILABLE/FaceID
    - Test: native returns `{ available: true, biometryType: 'TouchID' }` → maps to AVAILABLE/TouchID
    - Test: native returns `{ available: true, biometryType: 'Biometrics' }` → maps to AVAILABLE/Fingerprint
    - Test: native returns `{ available: false, error: 'NOT_ENROLLED' }` → maps to NOT_ENROLLED
    - Test: native returns `{ available: false }` → maps to NO_HARDWARE
    - Test: native throws exception → returns err with BIOMETRIC_NOT_AVAILABLE
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.4 Write property test for datasource exception-to-error mapping
    - **Property 3: Datasource exception-to-error mapping**
    - For any exception thrown by `isSensorAvailable()`, the datasource never throws and always returns an error Result with code `BIOMETRIC_NOT_AVAILABLE`
    - Create test at `src/data/biometrics/datasources/__tests__/biometric.datasource.property.test.ts`
    - Mock native module to throw various error types (Error, TypeError, string, null), assert datasource always returns err Result
    - **Validates: Requirements 4.6**

- [x] 6. Checkpoint — Data layer verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Wire DI container
  - [x] 7.1 Register biometric dependencies in DI container
    - Update `src/di/container.ts`
    - Instantiate `BiometricDatasource` as singleton
    - Instantiate `BiometricRepositoryImpl` with datasource as singleton
    - Instantiate `CheckBiometricCapabilityUseCase` with repository as singleton
    - Export `checkBiometricCapabilityUseCase` on the container object
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Implement presentation layer
  - [x] 8.1 Create useBiometricCapability hook
    - Create `src/presentation/features/biometrics/hooks/useBiometricCapability.ts`
    - Define `BiometricCapabilityState` interface with `capability`, `loading`, `error`, `platformInfo` fields
    - Implement `detect` callback using `container.checkBiometricCapabilityUseCase.execute()`
    - Run detection on mount via `useEffect`
    - Expose `redetect` for re-detection button
    - Use `Platform.OS` and `Platform.Version` for platform info
    - _Requirements: 8.2, 11.1, 13.3_

  - [x] 8.2 Create SensorCard component
    - Create `src/presentation/features/biometrics/components/SensorCard.tsx`
    - Accept `BiometricCapability` as prop
    - Display sensor icon, display name, and status message based on `reason`
    - Show guidance text when `reason === 'NOT_ENROLLED'`
    - Show "Sin hardware biométrico" when `reason === 'NO_HARDWARE'`
    - Use only React Native primitives (View, Text, StyleSheet)
    - _Requirements: 7.1, 7.2, 7.3, 11.1_

  - [x] 8.3 Create ReDetectButton component
    - Create `src/presentation/features/biometrics/components/ReDetectButton.tsx`
    - Accept `onPress` and `loading` props
    - Show `ActivityIndicator` when loading, "Volver a detectar" text otherwise
    - Include `accessibilityRole` and `accessibilityLabel`
    - Use only React Native primitives (TouchableOpacity, Text, ActivityIndicator, StyleSheet)
    - _Requirements: 8.1, 8.2, 8.3, 11.1_

  - [x] 8.4 Create ExplanationPanel component
    - Create `src/presentation/features/biometrics/components/ExplanationPanel.tsx`
    - Accept `BiometricCapability` as prop
    - Display platform-specific API name (`LAContext.canEvaluatePolicy` on iOS, `BiometricManager.canAuthenticate` on Android)
    - Show response description based on `reason`
    - Use only React Native primitives (View, Text, StyleSheet, Platform)
    - _Requirements: 9.1, 9.2, 11.1_

  - [x] 8.5 Create DeviceInfoCard component
    - Create `src/presentation/features/biometrics/components/DeviceInfoCard.tsx`
    - Accept `platform`, `osVersion`, and optional `securityLevel` props
    - Display platform name, OS version, and security level when available
    - Use only React Native primitives (View, Text, StyleSheet)
    - _Requirements: 10.1, 10.2, 11.1_

  - [x] 8.6 Create HardwareInspectorScreen
    - Create `src/presentation/features/biometrics/screens/HardwareInspectorScreen.tsx`
    - Compose `SensorCard`, `ReDetectButton`, `ExplanationPanel`, `DeviceInfoCard` using `useBiometricCapability` hook
    - Show loading indicator during initial detection
    - Show error state with re-detect button on failure
    - Use `ScrollView` for content layout
    - Use only React Native primitives
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 9.1, 9.2, 10.1, 10.2, 11.1, 11.3_

  - [ ]* 8.7 Write property test for sensor card display name mapping
    - **Property 4: Sensor card displays correct name for biometry type**
    - For all `BiometryType` values with `reason === 'AVAILABLE'`, `getSensorDisplayName` returns the correct human-readable name
    - Create test at `src/presentation/features/biometrics/components/__tests__/SensorCard.property.test.ts`
    - Map each BiometryType to expected display name, assert mapping is correct for all values
    - **Validates: Requirements 7.1**

  - [ ]* 8.8 Write property test for re-detect button always visible
    - **Property 5: Re-detect button always visible**
    - For all CapabilityState values (NO_HARDWARE, NOT_ENROLLED, AVAILABLE), HardwareInspectorScreen renders the ReDetectButton
    - Create test at `src/presentation/features/biometrics/screens/__tests__/HardwareInspectorScreen.property.test.ts`
    - Render screen with each capability state and assert ReDetectButton is present in the tree
    - **Validates: Requirements 8.1**

- [x] 9. Wire screen in App.tsx
  - [x] 9.1 Render HardwareInspectorScreen from App.tsx
    - Import `HardwareInspectorScreen` in `App.tsx`
    - Render it directly (no navigation required)
    - Wrap with `SafeAreaProvider` if not already present
    - _Requirements: 11.2_

- [x] 10. Final checkpoint — Full feature verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The only file that imports `react-native-biometrics` is the datasource (Requirement 13.1)
- Domain layer has zero imports from data or presentation (Requirement 13.2)
- Presentation accesses biometric capability only through the use case from DI container (Requirement 13.3)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4"] },
    { "id": 3, "tasks": ["3.1", "3.2"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 8, "tasks": ["8.6", "8.7", "8.8"] },
    { "id": 9, "tasks": ["9.1"] }
  ]
}
```
