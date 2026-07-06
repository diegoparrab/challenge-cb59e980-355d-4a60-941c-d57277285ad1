# Requirements Document

## Introduction

Reemplazar el manejo binario genérico de errores biométricos (éxito/fallo con Toast) con un sistema de clasificación de errores basado en lo que `react-native-biometrics` puede reportar a JavaScript. El sistema clasifica errores nativos en códigos de dominio, muestra mensajes contextuales al usuario, y deshabilita la biometría cuando hay lockout.

**Alcance limitado por la librería:** Basado en análisis del código nativo de `react-native-biometrics` (iOS: `ReactNativeBiometrics.m`, Android: `SimplePromptCallback.java`), solo se manejan los errores que la librería efectivamente reporta a JS. Errores como AUTH_FAILED, SYSTEM_CANCELLED, y LOCKOUT_PERMANENT no llegan al runtime de JavaScript y por lo tanto no se incluyen.

## Glossary

- **BiometricErrorCode**: Union type con los 5 códigos de error detectables: NO_HARDWARE, NOT_ENROLLED, USER_CANCELLED, LOCKOUT, UNKNOWN.
- **ErrorMetadata**: Datos asociados a cada código: flag `recoverable`, `suggestedAction`, y mensaje localizado en es-ES.
- **NativeErrorMapper**: Función heurística que traduce strings nativos a BiometricErrorCode. Usa `includes()` en vez de match exacto porque los strings de reject son localizados.
- **BiometricErrorBanner**: Componente compartido que muestra el error con un botón de acción contextual.
- **SuggestedAction**: Enum con valores ENROLL, WAIT, NONE — las únicas acciones que tienen sentido con los errores detectables.
- **Pre-validación**: Verificación de capability antes de lanzar el prompt biométrico nativo.

## Requirements

### Requirement 1: Biometric Error Taxonomy

**User Story:** As a developer, I want a domain error classification limited to errors that react-native-biometrics actually reports to JavaScript, so that the taxonomy reflects reality and doesn't contain dead code.

#### Acceptance Criteria

1. THE BiometricErrorEntity SHALL define a BiometricErrorCode union type containing exactly: NO_HARDWARE, NOT_ENROLLED, USER_CANCELLED, LOCKOUT, UNKNOWN.
2. THE BiometricErrorEntity SHALL associate each BiometricErrorCode with ErrorMetadata containing a `recoverable` boolean, a `suggestedAction` value, and a user message string in es-ES.
3. WHEN BiometricErrorCode is NO_HARDWARE, THE metadata SHALL set recoverable to false and suggestedAction to NONE.
4. WHEN BiometricErrorCode is NOT_ENROLLED, THE metadata SHALL set recoverable to true and suggestedAction to ENROLL.
5. WHEN BiometricErrorCode is USER_CANCELLED, THE metadata SHALL set recoverable to true and suggestedAction to NONE.
6. WHEN BiometricErrorCode is LOCKOUT, THE metadata SHALL set recoverable to true and suggestedAction to WAIT.
7. WHEN BiometricErrorCode is UNKNOWN, THE metadata SHALL set recoverable to false and suggestedAction to NONE.
8. THE SuggestedAction type SHALL contain exactly: ENROLL, WAIT, NONE.

### Requirement 2: Native Error Mapping

**User Story:** As a developer, I want native error strings mapped to domain codes using heuristics, so that the app handles the unpredictable localized strings from the OS gracefully.

#### Acceptance Criteria

1. WHEN the datasource receives a string containing "user cancel" (case-insensitive) via the resolve path, THE mapNativeError function SHALL return USER_CANCELLED.
2. WHEN the datasource receives a string containing "lockout" or "too many attempts" (case-insensitive) via the reject/catch path, THE mapNativeError function SHALL return LOCKOUT.
3. WHEN the datasource receives null, undefined, empty string, or any unrecognized string, THE mapNativeError function SHALL return UNKNOWN without throwing an exception.
4. THE mapNativeError function SHALL never throw for any input type.

### Requirement 3: Pre-validation and Lockout Handling

**User Story:** As a user, I want the app to check biometric availability before showing the prompt and disable biometrics when locked out, so that I don't get stuck in unrecoverable flows.

#### Acceptance Criteria

1. THE AuthenticateWithBiometrics use case SHALL call checkCapability() before each authentication prompt.
2. WHEN checkCapability() indicates biometrics are not available (NO_HARDWARE or NOT_ENROLLED), THE use case SHALL return the corresponding BiometricError without launching the native prompt.
3. WHEN a LOCKOUT error is received, THE use case SHALL set biometricDisabled to true in its internal state.
4. WHEN a USER_CANCELLED error is received, THE use case SHALL return the error without modifying internal state.
5. THE use case SHALL expose a `getState()` method returning `{ biometricDisabled: boolean }`.
6. THE use case SHALL expose a `resetState()` method that sets biometricDisabled back to false.

### Requirement 4: Error UI with BiometricErrorBanner

**User Story:** As a user, I want to see contextual error messages when biometric authentication fails, so that I understand what happened.

#### Acceptance Criteria

1. THE BiometricErrorBanner SHALL render null when error is null.
2. THE BiometricErrorBanner SHALL display the error's metadata.message text.
3. WHEN suggestedAction is ENROLL, THE BiometricErrorBanner SHALL render an action button labeled "Ir a Ajustes".
4. WHEN suggestedAction is WAIT or NONE, THE BiometricErrorBanner SHALL NOT render an action button.
5. THE BiometricErrorBanner SHALL use `accessibilityRole="alert"` and `accessibilityLiveRegion="assertive"`.
6. THE BiometricErrorBanner SHALL reside in `presentation/shared/components/` for reuse across screens.
7. THE LoginScreen SHALL render BiometricErrorBanner with the error from useBiometricLogin.
8. THE LoginScreen SHALL disable the biometric login button when biometricDisabled is true.
9. THE LoginScreen SHALL use Toast exclusively for success confirmation, not for errors.
