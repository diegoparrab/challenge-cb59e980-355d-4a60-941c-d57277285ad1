# Requirements Document

## Introduction

Replace the current generic binary success/fail biometric error handling with a complete error taxonomy, structured retry policies, and contextual UI feedback. The system must classify every native biometric failure into a domain error code, apply appropriate retry or recovery logic per category, communicate actionable messages to the user via a BiometricErrorBanner, and provide a lab mode in the Hardware Inspector for manually provoking and logging each error scenario.

## Glossary

- **BiometricErrorEntity**: A domain entity in `domain/biometrics/entities/` representing a classified biometric error with code, metadata, and user-facing message.
- **BiometricErrorCode**: A string union type enumerating all recognized biometric error categories: NO_HARDWARE, NOT_ENROLLED, USER_CANCELLED, SYSTEM_CANCELLED, AUTH_FAILED, LOCKOUT, LOCKOUT_PERMANENT, NOT_AVAILABLE, UNKNOWN.
- **ErrorMetadata**: Structured data associated with each BiometricErrorCode containing `recoverable` flag, `suggestedAction` enum, and localized user message in es-ES.
- **NativeErrorMapper**: A component in the biometrics datasource responsible for translating platform-specific error codes (iOS LAError, Android BiometricPrompt codes, react-native-biometrics strings) into BiometricErrorCode values.
- **RetryPolicy**: Logic within the AuthenticateWithBiometrics use case that governs automatic and user-triggered retry behavior based on error category and prompt failure count.
- **MAX_FAILED_PROMPTS**: A named constant (value: 3) exported from the use case module defining the threshold of consecutive AUTH_FAILED prompts before suggesting an alternative.
- **BiometricErrorBanner**: A shared UI component in `presentation/shared/components/` that displays error messages with a contextual action button based on suggestedAction.
- **LabMode**: A feature of the HardwareInspectorScreen that provides instructions for provoking each biometric error and maintains an in-memory log of observed errors.
- **ErrorLog**: An in-memory array (lost on app close) recording each error observation with native code, domain code, and timestamp.
- **SuggestedAction**: An enum with values RETRY, ENROLL, USE_DEVICE_CREDENTIAL, WAIT, NONE indicating the recovery action to present to the user.
- **AuthenticateWithBiometrics**: The domain use case orchestrating biometric authentication, pre-validation, and retry logic.
- **BiometricRepository**: The domain repository interface (port) for biometric operations.
- **BiometricDatasource**: The data layer implementation providing native biometric bridge communication.

## Requirements

### Requirement 1: Biometric Error Taxonomy

**User Story:** As a developer, I want a complete domain error classification for all biometric failure modes, so that each error can be handled with specific recovery logic and messaging.

#### Acceptance Criteria

1. THE BiometricErrorEntity SHALL define a BiometricErrorCode union type containing exactly: NO_HARDWARE, NOT_ENROLLED, USER_CANCELLED, SYSTEM_CANCELLED, AUTH_FAILED, LOCKOUT, LOCKOUT_PERMANENT, NOT_AVAILABLE, UNKNOWN.
2. THE BiometricErrorEntity SHALL associate each BiometricErrorCode with ErrorMetadata containing a `recoverable` boolean, a `suggestedAction` value, and a user message string in es-ES.
3. WHEN BiometricErrorCode is NO_HARDWARE, THE BiometricErrorEntity SHALL set recoverable to false and suggestedAction to NONE.
4. WHEN BiometricErrorCode is NOT_ENROLLED, THE BiometricErrorEntity SHALL set recoverable to true and suggestedAction to ENROLL.
5. WHEN BiometricErrorCode is USER_CANCELLED, THE BiometricErrorEntity SHALL set recoverable to true and suggestedAction to NONE.
6. WHEN BiometricErrorCode is SYSTEM_CANCELLED, THE BiometricErrorEntity SHALL set recoverable to true and suggestedAction to RETRY.
7. WHEN BiometricErrorCode is AUTH_FAILED, THE BiometricErrorEntity SHALL set recoverable to true and suggestedAction to RETRY.
8. WHEN BiometricErrorCode is LOCKOUT, THE BiometricErrorEntity SHALL set recoverable to true and suggestedAction to WAIT.
9. WHEN BiometricErrorCode is LOCKOUT_PERMANENT, THE BiometricErrorEntity SHALL set recoverable to true and suggestedAction to USE_DEVICE_CREDENTIAL.
10. WHEN BiometricErrorCode is NOT_AVAILABLE, THE BiometricErrorEntity SHALL set recoverable to false and suggestedAction to NONE.
11. WHEN BiometricErrorCode is UNKNOWN, THE BiometricErrorEntity SHALL set recoverable to false and suggestedAction to NONE.

### Requirement 2: Native Error Mapping

**User Story:** As a developer, I want all platform-specific biometric error codes mapped to domain error codes, so that the application handles errors uniformly regardless of OS.

#### Acceptance Criteria

1. WHEN the BiometricDatasource receives iOS `LAError.userCancel` or Android `ERROR_USER_CANCELED` or Android `ERROR_NEGATIVE_BUTTON`, THE NativeErrorMapper SHALL return USER_CANCELLED.
2. WHEN the BiometricDatasource receives iOS `LAError.systemCancel` or iOS `LAError.appCancel` or Android `ERROR_CANCELED`, THE NativeErrorMapper SHALL return SYSTEM_CANCELLED.
3. WHEN the BiometricDatasource receives iOS `LAError.biometryLockout` or Android `ERROR_LOCKOUT`, THE NativeErrorMapper SHALL return LOCKOUT.
4. WHEN the BiometricDatasource receives Android `ERROR_LOCKOUT_PERMANENT`, THE NativeErrorMapper SHALL return LOCKOUT_PERMANENT.
5. WHEN the BiometricDatasource receives iOS `LAError.biometryNotEnrolled` or Android `ERROR_NO_BIOMETRICS`, THE NativeErrorMapper SHALL return NOT_ENROLLED.
6. WHEN the BiometricDatasource receives iOS `LAError.biometryNotAvailable` or Android `ERROR_HW_NOT_PRESENT`, THE NativeErrorMapper SHALL return NO_HARDWARE.
7. WHEN the BiometricDatasource receives Android `ERROR_HW_UNAVAILABLE`, THE NativeErrorMapper SHALL return NOT_AVAILABLE.
8. WHEN the BiometricDatasource receives an error code not present in the mapping table, THE NativeErrorMapper SHALL return UNKNOWN.
9. WHEN the BiometricDatasource receives a null, undefined, or malformed error string from react-native-biometrics, THE NativeErrorMapper SHALL return UNKNOWN without throwing an exception.
10. THE NativeErrorMapper SHALL have a unit test validating correct mapping for each row in the mapping table for both iOS and Android codes.

### Requirement 3: Retry Policy and Lockout Handling

**User Story:** As a user, I want the app to intelligently manage authentication retries and lockouts, so that I receive appropriate guidance instead of repeated failures.

#### Acceptance Criteria

1. THE AuthenticateWithBiometrics use case SHALL perform a pre-validation of biometric capability before each authentication prompt.
2. WHEN the pre-validation detects biometric capability has changed (sensor removed, enrollment deleted), THE AuthenticateWithBiometrics use case SHALL return the corresponding BiometricErrorCode without launching the prompt.
3. WHEN a USER_CANCELLED error occurs, THE AuthenticateWithBiometrics use case SHALL return the error and transition to idle state without automatic retry.
4. WHEN an AUTH_FAILED error occurs, THE AuthenticateWithBiometrics use case SHALL increment the failed prompt counter.
5. WHEN the failed prompt counter reaches MAX_FAILED_PROMPTS (3), THE AuthenticateWithBiometrics use case SHALL return AUTH_FAILED with suggestedAction indicating to use an alternative authentication method.
6. THE AuthenticateWithBiometrics use case SHALL export MAX_FAILED_PROMPTS as a named constant with value 3.
7. WHEN a LOCKOUT error occurs, THE AuthenticateWithBiometrics use case SHALL return the error with suggestedAction WAIT and signal that the biometric authentication option is temporarily disabled.
8. WHEN a LOCKOUT_PERMANENT error occurs, THE AuthenticateWithBiometrics use case SHALL return the error with suggestedAction USE_DEVICE_CREDENTIAL and signal that biometric authentication is disabled until device credential is used.
9. WHEN a SYSTEM_CANCELLED error occurs and no silent retry has been attempted in the current session, THE AuthenticateWithBiometrics use case SHALL perform one silent retry when the app returns to foreground.
10. WHEN a SYSTEM_CANCELLED error occurs and a silent retry has already been attempted in the current session, THE AuthenticateWithBiometrics use case SHALL return the SYSTEM_CANCELLED error without further retry.

### Requirement 4: Error UI with BiometricErrorBanner

**User Story:** As a user, I want to see specific, non-alarming error messages with clear recovery actions, so that I understand what happened and what I can do next.

#### Acceptance Criteria

1. WHEN a USER_CANCELLED error is received, THE BiometricErrorBanner SHALL display a neutral informational message without alarming language.
2. WHEN an AUTH_FAILED error is received and the failed prompt count is below MAX_FAILED_PROMPTS, THE BiometricErrorBanner SHALL display a message indicating the biometric was not recognized with an action button to retry.
3. WHEN an AUTH_FAILED error is received and the failed prompt count has reached MAX_FAILED_PROMPTS, THE BiometricErrorBanner SHALL display a message suggesting an alternative authentication method.
4. WHEN a LOCKOUT error is received, THE BiometricErrorBanner SHALL display a message explaining the temporary lockout and disable the biometric authentication button.
5. WHEN a LOCKOUT_PERMANENT error is received, THE BiometricErrorBanner SHALL display a message instructing the user to unlock with device credentials and disable the biometric authentication button.
6. WHEN a NOT_ENROLLED error is received, THE BiometricErrorBanner SHALL display a message guiding the user to enroll biometrics in device settings.
7. WHEN an UNKNOWN error is received, THE BiometricErrorBanner SHALL display a generic error message and the UI SHALL remain operable.
8. THE BiometricErrorBanner SHALL render a contextual action button whose label and behavior correspond to the suggestedAction value of the received error.
9. THE BiometricErrorBanner SHALL reside in `presentation/shared/components/` to allow consumption by both the auth Login screen and the biometrics HardwareInspector screen.
10. THE BiometricErrorBanner SHALL replace Toast for all biometric error display scenarios; Toast SHALL remain exclusively for success confirmations.

### Requirement 5: Lab Mode in Hardware Inspector

**User Story:** As a developer, I want a lab mode in the Hardware Inspector that guides me through provoking each biometric error scenario and logs the results, so that I can verify the error handling works correctly on real hardware.

#### Acceptance Criteria

1. THE LabMode SHALL display a list of at least 4 provokable error scenarios with step-by-step instructions for each (cancel prompt, use unregistered biometric, fail multiple times, send app to background).
2. WHEN a biometric error is observed during lab mode, THE ErrorLog SHALL record the native error code received, the mapped BiometricErrorCode, and a timestamp.
3. THE ErrorLog SHALL be stored in-memory only and SHALL be lost when the application is closed.
4. THE LabMode SHALL display the accumulated ErrorLog entries to the user within the HardwareInspectorScreen.
5. THE LabMode SHALL allow the user to clear the ErrorLog.
6. WHEN an error scenario is provoked, THE LabMode SHALL display the BiometricErrorBanner with the corresponding error information, demonstrating the same UI the user would see in the Login screen.
