# Requirements Document

## Introduction

This feature detects the biometric hardware capabilities of the device and presents them in an interactive Hardware Inspector screen. It covers the full vertical slice: domain entity and use case, data layer wrapping the native biometric library, a manual DI container, and a React Native screen built with pure native components. The system distinguishes three capability states (no hardware, not enrolled, available) and isolates the native library import to a single datasource file.

## Glossary

- **Hardware_Inspector**: The React Native screen that displays detected biometric capability information, device metadata, and explanatory content to the user.
- **Biometric_Datasource**: The data layer component that directly imports and wraps `react-native-biometrics`, translating native responses into domain models.
- **Biometric_Repository**: The data layer implementation of the domain repository interface that delegates capability detection to the Biometric_Datasource and maps errors to AppError.
- **CheckBiometricCapability_UseCase**: The domain use case that orchestrates biometric capability detection by invoking the repository interface.
- **BiometricCapability_Entity**: The domain entity representing the result of a capability check, including availability status, biometry type, and reason code.
- **DI_Container**: The manual dependency injection module (`src/di/container.ts`) that instantiates datasource, repository, and use case as singletons.
- **Capability_State**: One of three detection outcomes: `NO_HARDWARE` (device lacks biometric sensor), `NOT_ENROLLED` (sensor present but no biometrics registered), `AVAILABLE` (sensor present and biometrics enrolled).
- **Sensor_Card**: UI component displaying the detected sensor icon, name, and status.
- **Explanation_Panel**: UI component showing what native API was consulted and what the operating system responded.
- **Device_Info_Card**: UI component showing platform, OS version, and biometric security level when determinable.
- **Re_Detect_Button**: Interactive button that re-executes the capability detection use case.

## Requirements

### Requirement 1: Domain Entity Definition

**User Story:** As a developer, I want a strongly-typed BiometricCapability entity, so that the domain layer can represent all possible biometric hardware states without depending on native library types.

#### Acceptance Criteria

1. THE BiometricCapability_Entity SHALL expose an `available` boolean field, a `biometryType` field accepting values `FaceID`, `TouchID`, `Fingerprint`, `Face`, `Iris`, `Unknown`, or null, and a `reason` field accepting values `NO_HARDWARE`, `NOT_ENROLLED`, or `AVAILABLE`.
2. THE BiometricCapability_Entity SHALL be defined in `src/domain/biometrics/entities/` with no imports from the data or presentation layers.
3. THE BiometricCapability_Entity SHALL set `available` to true only when `reason` equals `AVAILABLE`.

### Requirement 2: Domain Repository Interface

**User Story:** As a developer, I want a repository interface defined in the domain layer, so that the use case depends on an abstraction and remains decoupled from the native library.

#### Acceptance Criteria

1. THE Biometric_Repository interface SHALL declare a `checkCapability()` method that returns `Promise<Result<BiometricCapability, AppError>>`.
2. THE Biometric_Repository interface SHALL be defined in `src/domain/biometrics/repositories/` with no imports from data or presentation layers.

### Requirement 3: Check Biometric Capability Use Case

**User Story:** As a developer, I want a use case that orchestrates capability detection, so that the presentation layer has a single entry point for checking biometric hardware.

#### Acceptance Criteria

1. THE CheckBiometricCapability_UseCase SHALL expose an `execute()` method that returns `Promise<Result<BiometricCapability, AppError>>`.
2. THE CheckBiometricCapability_UseCase SHALL delegate detection to the Biometric_Repository interface injected via constructor.
3. THE CheckBiometricCapability_UseCase SHALL be defined in `src/domain/biometrics/usecases/`.
4. WHEN the Biometric_Repository returns an error result, THE CheckBiometricCapability_UseCase SHALL propagate the error result without modification.

### Requirement 4: Biometric Datasource Encapsulation

**User Story:** As a developer, I want the native biometric library isolated in a single datasource file, so that no other module in the project depends directly on third-party native APIs.

#### Acceptance Criteria

1. THE Biometric_Datasource SHALL be the only file in the project that imports `react-native-biometrics`.
2. THE Biometric_Datasource SHALL be located at `src/data/biometrics/datasources/`.
3. WHEN `react-native-biometrics` reports a sensor is available, THE Biometric_Datasource SHALL map the native response to a BiometricCapability_Entity with `reason` set to `AVAILABLE` and the corresponding `biometryType`.
4. WHEN `react-native-biometrics` reports no sensor hardware, THE Biometric_Datasource SHALL map the response to a BiometricCapability_Entity with `reason` set to `NO_HARDWARE`, `available` set to false, and `biometryType` set to null.
5. WHEN `react-native-biometrics` reports biometrics not enrolled, THE Biometric_Datasource SHALL map the response to a BiometricCapability_Entity with `reason` set to `NOT_ENROLLED`, `available` set to false, and the detected `biometryType`.
6. IF `react-native-biometrics` throws an unexpected exception, THEN THE Biometric_Datasource SHALL return an error Result with AppError code `BIOMETRIC_NOT_AVAILABLE`.

### Requirement 5: Repository Implementation

**User Story:** As a developer, I want a concrete repository implementation in the data layer, so that it fulfills the domain interface contract and delegates to the datasource.

#### Acceptance Criteria

1. THE Biometric_Repository implementation SHALL be located at `src/data/biometrics/repositories/`.
2. THE Biometric_Repository implementation SHALL implement the domain Biometric_Repository interface.
3. THE Biometric_Repository implementation SHALL delegate capability checks to the Biometric_Datasource.
4. IF the Biometric_Datasource returns an error, THEN THE Biometric_Repository implementation SHALL propagate the error Result to the caller.

### Requirement 6: Manual Dependency Injection Container

**User Story:** As a developer, I want a manual DI container that wires datasource, repository, and use case as singletons, so that dependencies are resolved in one central location without a framework.

#### Acceptance Criteria

1. THE DI_Container SHALL be defined in `src/di/container.ts`.
2. THE DI_Container SHALL instantiate the Biometric_Datasource, Biometric_Repository implementation, and CheckBiometricCapability_UseCase.
3. THE DI_Container SHALL export each instance as a singleton.
4. THE DI_Container SHALL wire the Biometric_Datasource into the Biometric_Repository and the Biometric_Repository into the CheckBiometricCapability_UseCase via constructor injection.

### Requirement 7: Hardware Inspector Screen — Sensor Card

**User Story:** As a user, I want to see which biometric sensor my device has available, so that I understand what authentication method I can use.

#### Acceptance Criteria

1. WHEN Capability_State equals `AVAILABLE`, THE Hardware_Inspector SHALL display the Sensor_Card with the detected sensor name (Face ID, Touch ID, or Fingerprint) and an associated icon.
2. WHEN Capability_State equals `NOT_ENROLLED`, THE Hardware_Inspector SHALL display the Sensor_Card with an indication that biometrics are not enrolled and guidance text directing the user to system settings to enroll.
3. WHEN Capability_State equals `NO_HARDWARE`, THE Hardware_Inspector SHALL display the Sensor_Card with a message indicating no biometric hardware is present on the device.

### Requirement 8: Hardware Inspector Screen — Re-Detect Button

**User Story:** As a user, I want a button to re-check biometric capabilities, so that I can see updated results after enrolling biometrics in system settings.

#### Acceptance Criteria

1. THE Hardware_Inspector SHALL display the Re_Detect_Button at all times regardless of the current Capability_State.
2. WHEN the user presses the Re_Detect_Button, THE Hardware_Inspector SHALL re-execute the CheckBiometricCapability_UseCase and update the displayed information with the new result.
3. WHILE the CheckBiometricCapability_UseCase is executing after a re-detect press, THE Hardware_Inspector SHALL display a loading indicator on the Re_Detect_Button.

### Requirement 9: Hardware Inspector Screen — Explanation Panel

**User Story:** As a user, I want to understand what native API was consulted and what the system responded, so that I learn about the underlying biometric detection mechanisms.

#### Acceptance Criteria

1. THE Hardware_Inspector SHALL display the Explanation_Panel with a description of the native API consulted (`LAContext.canEvaluatePolicy` on iOS, `BiometricManager.canAuthenticate` on Android).
2. THE Explanation_Panel SHALL update its content to reflect the latest detection result each time the CheckBiometricCapability_UseCase is executed.

### Requirement 10: Hardware Inspector Screen — Device Info Card

**User Story:** As a user, I want to see my device platform and OS version, so that I have additional context about my device's biometric support.

#### Acceptance Criteria

1. THE Hardware_Inspector SHALL display the Device_Info_Card showing the device platform (iOS or Android) and the operating system version.
2. WHERE biometric security level is determinable, THE Hardware_Inspector SHALL display the security classification (strong or weak) in the Device_Info_Card.

### Requirement 11: Hardware Inspector Screen Rendering

**User Story:** As a developer, I want the Hardware Inspector screen built with React Native primitives and rendered directly from App.tsx, so that it works without navigation dependencies.

#### Acceptance Criteria

1. THE Hardware_Inspector SHALL be built using only React Native primitive components (View, Text, TouchableOpacity, StyleSheet).
2. THE Hardware_Inspector SHALL be rendered directly from App.tsx without requiring React Navigation or any routing library.
3. THE Hardware_Inspector SHALL be located in `src/presentation/features/biometrics/screens/`.

### Requirement 12: Unit Tests for Use Case

**User Story:** As a developer, I want unit tests for the use case covering all three capability states, so that I can verify business logic independently from native APIs.

#### Acceptance Criteria

1. THE CheckBiometricCapability_UseCase SHALL have unit tests that verify correct behavior when the repository returns an `AVAILABLE` result.
2. THE CheckBiometricCapability_UseCase SHALL have unit tests that verify correct behavior when the repository returns a `NOT_ENROLLED` result.
3. THE CheckBiometricCapability_UseCase SHALL have unit tests that verify correct behavior when the repository returns a `NO_HARDWARE` result.
4. THE CheckBiometricCapability_UseCase unit tests SHALL use a fake repository implementation instead of the real datasource.

### Requirement 13: Layer Boundary Enforcement

**User Story:** As a developer, I want strict import boundaries enforced, so that the architecture remains clean and no layer bypasses its allowed dependencies.

#### Acceptance Criteria

1. THE project SHALL enforce that no file outside `src/data/biometrics/datasources/` imports `react-native-biometrics`.
2. THE domain layer SHALL have no imports from the data layer or the presentation layer.
3. THE presentation layer SHALL access biometric capability detection only through the CheckBiometricCapability_UseCase obtained from the DI_Container.
