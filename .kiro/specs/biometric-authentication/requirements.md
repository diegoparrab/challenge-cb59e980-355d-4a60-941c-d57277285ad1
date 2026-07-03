# Requirements Document

## Introduction

Biometric Authentication enables users of the simulated banking app to log in using the device's native biometric prompt (Face ID on iOS, fingerprint on Android). This spec covers the full "happy path": detect capability → show native prompt → authenticate → navigate to Home screen. Navigation is migrated from a `useState`-based approach to React Navigation native-stack. Error handling is limited to success/generic-failure; fine-grained error taxonomy is deferred to spec 04.

## Glossary

- **App**: The React Native simulated banking application (rn-biometrics-auth)
- **Login_Screen**: The initial screen of the App where the user triggers biometric authentication
- **Home_Screen**: The post-authentication screen showing simulated account information
- **Biometric_Button**: The primary action button on Login_Screen that invokes the biometric prompt
- **Native_Prompt**: The operating system's built-in biometric authentication dialog (BiometricPrompt on Android, LAContext on iOS)
- **AuthenticateWithBiometrics_UseCase**: The domain use case that verifies capability and then invokes the Native_Prompt
- **useBiometricLogin_Hook**: The presentation-layer hook that orchestrates the authentication state machine
- **Auth_State_Machine**: The finite state machine with states: idle, authenticating, success, failed
- **BiometricCapability**: The entity from spec 02 describing hardware availability and enrollment status
- **Event_Feedback_Component**: An inline/toast UI element on Login_Screen that displays the result of the biometric prompt
- **Navigation_Stack**: The React Navigation native-stack navigator replacing the current useState-based routing
- **Result_Pattern**: The `Result<T, E>` type used for explicit error handling without exceptions

## Requirements

### Requirement 1: Biometric Authentication Use Case

**User Story:** As a banking app user, I want to authenticate using my device's biometric sensor, so that I can securely access the Home screen without entering credentials.

#### Acceptance Criteria

1. WHEN the user triggers authentication, THE AuthenticateWithBiometrics_UseCase SHALL verify biometric capability before invoking the Native_Prompt.
2. WHEN BiometricCapability indicates available is true, THE AuthenticateWithBiometrics_UseCase SHALL invoke the Native_Prompt with a configured title and cancel label.
3. WHEN the Native_Prompt returns a successful result, THE AuthenticateWithBiometrics_UseCase SHALL return a Result with kind "ok" containing a BiometricAuthResult with success set to true.
4. WHEN the Native_Prompt returns a failure result, THE AuthenticateWithBiometrics_UseCase SHALL return a Result with kind "ok" containing a BiometricAuthResult with success set to false.
5. IF BiometricCapability indicates available is false, THEN THE AuthenticateWithBiometrics_UseCase SHALL return a Result with kind "err" containing an AppError without invoking the Native_Prompt.

### Requirement 2: Login Screen with Biometric Button

**User Story:** As a banking app user, I want a login screen with a biometric button that reflects my device's sensor type, so that I know what authentication method is available.

#### Acceptance Criteria

1. THE Login_Screen SHALL display the Biometric_Button as the primary authentication action.
2. WHILE BiometricCapability reason is "NO_HARDWARE" or "NOT_ENROLLED", THE Biometric_Button SHALL appear in a disabled state with a descriptive explanation visible to the user.
3. WHILE BiometricCapability reason is "AVAILABLE" and biometryType is "FaceID", THE Biometric_Button SHALL display the text "Login with Face ID".
4. WHILE BiometricCapability reason is "AVAILABLE" and biometryType is "TouchID" or "Fingerprint", THE Biometric_Button SHALL display the text "Login with fingerprint".
5. WHEN the user presses the Biometric_Button in enabled state, THE Login_Screen SHALL invoke the useBiometricLogin_Hook login function to begin authentication.

### Requirement 3: Authentication State Machine Hook

**User Story:** As a developer, I want a hook that manages the full authentication lifecycle as a state machine, so that the UI can react to each authentication phase deterministically.

#### Acceptance Criteria

1. THE useBiometricLogin_Hook SHALL expose a state property with exactly four possible values: "idle", "authenticating", "success", "failed".
2. THE useBiometricLogin_Hook SHALL initialize the Auth_State_Machine in the "idle" state.
3. WHEN the hook mounts, THE useBiometricLogin_Hook SHALL preload BiometricCapability and expose it for button text and disabled-state decisions.
4. WHEN the login function is invoked, THE useBiometricLogin_Hook SHALL transition the state from "idle" to "authenticating".
5. WHEN the AuthenticateWithBiometrics_UseCase returns a successful authentication, THE useBiometricLogin_Hook SHALL transition the state from "authenticating" to "success".
6. WHEN the AuthenticateWithBiometrics_UseCase returns a failed authentication or an error, THE useBiometricLogin_Hook SHALL transition the state from "authenticating" to "failed".

### Requirement 4: Navigation with React Navigation Native-Stack

**User Story:** As a developer, I want proper stack-based navigation replacing the current useState routing, so that the app supports standard navigation patterns and screen transitions.

#### Acceptance Criteria

1. THE Navigation_Stack SHALL use @react-navigation/native with native-stack as the navigator implementation.
2. THE Navigation_Stack SHALL define Login_Screen as the initial route.
3. WHEN the Auth_State_Machine transitions to "success", THE Navigation_Stack SHALL navigate from Login_Screen to Home_Screen.
4. WHEN the user triggers logout from Home_Screen, THE Navigation_Stack SHALL navigate back to Login_Screen and reset the navigation state.
5. THE Navigation_Stack SHALL replace the current useState-based AppNavigator entirely.

### Requirement 5: Event Feedback Component

**User Story:** As a banking app user, I want to see feedback about the biometric prompt result, so that I understand what happened after interacting with the native dialog.

#### Acceptance Criteria

1. WHEN the Auth_State_Machine transitions to "failed", THE Event_Feedback_Component SHALL display a neutral message indicating authentication was not completed.
2. WHEN the Auth_State_Machine transitions to "success", THE Event_Feedback_Component SHALL display a confirmation message indicating successful authentication.
3. WHILE the Auth_State_Machine is in "authenticating" state, THE Event_Feedback_Component SHALL display a loading indicator or message.
4. THE Event_Feedback_Component SHALL render as an inline element or toast on Login_Screen, separate from the existing ExplanationPanel in the biometrics feature.

### Requirement 6: Cancellation Handling

**User Story:** As a banking app user, I want the app to remain stable when I cancel the biometric prompt, so that I can retry or choose another action.

#### Acceptance Criteria

1. WHEN the user cancels the Native_Prompt, THE App SHALL remain on Login_Screen without crashing or navigating.
2. WHEN the user cancels the Native_Prompt, THE Event_Feedback_Component SHALL display a neutral message without error severity.
3. WHEN the user cancels the Native_Prompt, THE Auth_State_Machine SHALL transition to "failed" state allowing the user to attempt login again.

### Requirement 7: Unit Tests for AuthenticateWithBiometrics

**User Story:** As a developer, I want unit tests covering the core authentication scenarios, so that I can verify business logic without a physical device.

#### Acceptance Criteria

1. THE AuthenticateWithBiometrics_UseCase tests SHALL verify that a successful biometric prompt returns a Result with BiometricAuthResult success equal to true.
2. THE AuthenticateWithBiometrics_UseCase tests SHALL verify that a failed biometric prompt returns a Result with BiometricAuthResult success equal to false.
3. THE AuthenticateWithBiometrics_UseCase tests SHALL verify that when BiometricCapability is not available, the use case returns a Result with kind "err" without invoking the Native_Prompt.
4. THE AuthenticateWithBiometrics_UseCase tests SHALL use fake implementations of BiometricRepository without depending on device hardware.

### Requirement 8: Platform Verification

**User Story:** As a developer, I want to verify the complete authentication flow on both platforms, so that I can confirm biometric integration works end-to-end.

#### Acceptance Criteria

1. THE App SHALL complete the full login flow (button press → native prompt → Home_Screen navigation) on the iOS simulator with enrolled Face ID.
2. THE App SHALL complete the full login flow (button press → native prompt → Home_Screen navigation) on the Android emulator with enrolled fingerprint.
3. WHEN the iOS simulator is configured with "Non-matching Face", THE App SHALL remain on Login_Screen with the Event_Feedback_Component showing a neutral failure message.
4. WHEN the Android emulator fingerprint authentication fails, THE App SHALL remain on Login_Screen with the Event_Feedback_Component showing a neutral failure message.
