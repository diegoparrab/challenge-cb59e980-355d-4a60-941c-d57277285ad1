# Design Document

## Overview

Reemplazar el manejo genérico de errores biométricos (`AppError` binario éxito/fallo) con un sistema de clasificación basado en lo que la librería `react-native-biometrics` realmente puede reportar a JavaScript. El diseño se basa en un análisis directo del código nativo de la librería (iOS: `ReactNativeBiometrics.m`, Android: `SimplePromptCallback.java`).

## Limitaciones descubiertas de react-native-biometrics

El método `simplePrompt` de la librería tiene un comportamiento muy restrictivo en cuanto a errores:

**iOS (`evaluatePolicy` → callback):**
- `success=true` → éxito
- `LAErrorUserCancel` → resolve con `{ success: false, error: "User cancellation" }`
- **Cualquier otro error** → `reject("biometric_error", NSError.description)` — string localizado impredecible

**Android (`BiometricPrompt.AuthenticationCallback`):**
- `onAuthenticationSucceeded` → éxito
- `ERROR_NEGATIVE_BUTTON` o `ERROR_USER_CANCELED` → resolve con `{ success: false, error: "User cancellation" }`
- **Cualquier otro `onAuthenticationError`** → `reject(errString, errString)` — string localizado del sistema

**Implicación crítica:** `onAuthenticationFailed()` (biometría no reconocida) **nunca llega a JS**. El OS maneja reintentos internamente. Solo `onAuthenticationError()` (errores terminales) y `onAuthenticationSucceeded()` resuelven la promesa.

Por lo tanto, los únicos errores detectables de forma confiable son:
1. **USER_CANCELLED** — vía el campo `error` del resolve (`"User cancellation"`)
2. **LOCKOUT** — heurística sobre strings del reject que contengan "lockout" o "too many attempts"
3. **NO_HARDWARE / NOT_ENROLLED** — vía pre-validación de `checkCapability()`, no durante el prompt
4. **UNKNOWN** — cualquier otro string no reconocible

Los siguientes errores **NO son detectables** con esta librería y fueron eliminados del diseño:
- `AUTH_FAILED` — el OS lo maneja internamente, nunca llega a JS
- `SYSTEM_CANCELLED` — llega como reject con string localizado indistinguible
- `LOCKOUT_PERMANENT` — string localizado sin patrón fiable cross-locale
- `NOT_AVAILABLE` — indistinguible de otros rejects

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ presentation/shared/components/BiometricErrorBanner             │
│ presentation/features/auth/hooks/useBiometricLogin              │
│ presentation/features/auth/screens/LoginScreen                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ consumes Result<BiometricAuthResult, BiometricError>
┌───────────────────────────▼─────────────────────────────────────┐
│ domain/biometrics/usecases/authenticate-with-biometrics.ts      │
│   • pre-validation gate (checkCapability before prompt)          │
│   • LOCKOUT → biometricDisabled flag                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ calls BiometricRepository port
┌───────────────────────────▼─────────────────────────────────────┐
│ data/biometrics/datasources/biometric.datasource.ts             │
│   • mapNativeError (heuristic string matching)                   │
│   • Handles both resolve path (error field) and reject (catch)   │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. BiometricErrorEntity (Domain Layer)

**File:** `src/domain/biometrics/entities/biometric-error.ts`

Taxonomía reducida a errores realmente detectables:

```typescript
export type BiometricErrorCode =
  | 'NO_HARDWARE'
  | 'NOT_ENROLLED'
  | 'USER_CANCELLED'
  | 'LOCKOUT'
  | 'UNKNOWN';

export type SuggestedAction =
  | 'ENROLL'
  | 'WAIT'
  | 'NONE';

export interface ErrorMetadata {
  readonly recoverable: boolean;
  readonly suggestedAction: SuggestedAction;
  readonly message: string;
}

export interface BiometricError {
  readonly code: BiometricErrorCode;
  readonly metadata: ErrorMetadata;
  readonly nativeCode?: string;
  readonly timestamp: number;
}
```

**Metadata por código:**

| Code | Recoverable | SuggestedAction | Cómo se detecta |
|------|-------------|-----------------|------------------|
| `NO_HARDWARE` | false | NONE | Pre-validación `checkCapability()` |
| `NOT_ENROLLED` | true | ENROLL | Pre-validación `checkCapability()` |
| `USER_CANCELLED` | true | NONE | String `"User cancellation"` en resolve path |
| `LOCKOUT` | true | WAIT | Heurística: reject string contiene "lockout" o "too many attempts" |
| `UNKNOWN` | false | NONE | Cualquier otro reject/catch no reconocido |

### 2. NativeErrorMapper (Data Layer)

**File:** `src/data/biometrics/datasources/native-error-mapper.ts`

Función heurística — no usa tabla de mapeo exacto porque los strings nativos son localizados e impredecibles.

```typescript
export function mapNativeError(nativeCode: unknown): BiometricErrorCode {
  if (typeof nativeCode !== 'string' || nativeCode.trim() === '') {
    return 'UNKNOWN';
  }

  const input = nativeCode.trim().toLowerCase();

  // Resolve path: "User cancellation" / "User cancelation"
  if (input.includes('user cancel')) {
    return 'USER_CANCELLED';
  }

  // Reject/catch path: lockout heuristic
  if (input.includes('lockout') || input.includes('too many attempts')) {
    return 'LOCKOUT';
  }

  return 'UNKNOWN';
}
```

**Dos caminos de entrada desde el datasource:**
1. **Resolve path** (`success=false`): el campo `error` contiene `"User cancellation"` en iOS y Android
2. **Reject/catch path**: `e.message` contiene un string localizado del OS (NSError description o Android errString)

### 3. AuthenticateWithBiometrics Use Case

**File:** `src/domain/biometrics/usecases/authenticate-with-biometrics.ts`

Simplificado — sin retry counters ni silent retry (no hay AUTH_FAILED ni SYSTEM_CANCELLED detectables).

```typescript
export interface AuthenticationState {
  readonly biometricDisabled: boolean;
}

export class AuthenticateWithBiometricsUseCase {
  // Pre-validation: checkCapability() → NO_HARDWARE | NOT_ENROLLED sin lanzar prompt
  // LOCKOUT → sets biometricDisabled = true
  // USER_CANCELLED → passthrough (no action)
  // UNKNOWN → passthrough (no action)
}
```

**Comportamiento:**
- Pre-valida capability antes de cada prompt
- Si capability no disponible → retorna error sin invocar `authenticate`
- Si LOCKOUT → marca `biometricDisabled = true` para que la UI deshabilite el botón
- Todos los demás errores → passthrough sin lógica adicional

### 4. BiometricRepository Interface

**File:** `src/domain/biometrics/repositories/biometric.repository.ts`

```typescript
export interface BiometricRepository {
  checkCapability(): Promise<Result<BiometricCapability, AppError>>;
  authenticate(config: PromptConfig): Promise<Result<BiometricAuthResult, BiometricError>>;
}
```

### 5. BiometricDatasource

**File:** `src/data/biometrics/datasources/biometric.datasource.ts`

Maneja ambos caminos de `simplePrompt`:

```typescript
async authenticate(config: PromptConfig): Promise<Result<BiometricAuthResult, BiometricError>> {
  try {
    const { success, error } = await this.rnBiometrics.simplePrompt({...});

    if (success) return ok({ success: true });

    // Resolve path: error field has "User cancellation" (iOS/Android)
    const code = mapNativeError(error);
    return err(createBiometricError(code, error ?? undefined));
  } catch (e: unknown) {
    // Reject path: localized OS error string
    const errorString = e instanceof Error ? e.message : String(e);
    const code = mapNativeError(errorString);
    return err(createBiometricError(code, errorString));
  }
}
```

### 6. BiometricErrorBanner (Presentation Layer)

**File:** `src/presentation/shared/components/BiometricErrorBanner.tsx`

```typescript
interface Props {
  error: BiometricError | null;
  onRetry?: () => void;
  onEnroll?: () => void;
  onDismiss?: () => void;
}
```

Renderiza:
- `null` si no hay error
- Mensaje del `error.metadata.message`
- Botón de acción solo para `ENROLL` → "Ir a Ajustes"
- Sin botón para `WAIT`, `NONE` (no hay acciones ejecutables desde la app)
- Accesibilidad: `accessibilityRole="alert"`, `accessibilityLiveRegion="assertive"`

### 7. useBiometricLogin Hook

**File:** `src/presentation/features/auth/hooks/useBiometricLogin.ts`

```typescript
export interface UseBiometricLoginResult {
  status: AuthStatus;
  capability: BiometricCapability | null;
  biometricError: BiometricError | null;
  biometricDisabled: boolean;
  login: () => void;
  reset: () => void;
  clearError: () => void;
}
```

- Expone `biometricError` en vez de usar Toast para errores
- `biometricDisabled` se activa en LOCKOUT para deshabilitar el botón de login
- Toast se mantiene exclusivamente para confirmación de éxito

## Data Flow

```
User taps login
    │
    ▼
useBiometricLogin.login()
    │
    ▼
AuthenticateWithBiometricsUseCase.execute()
    │
    ├─ checkCapability() → NOT_ENROLLED / NO_HARDWARE → return err (no prompt)
    │
    ▼
BiometricDatasource.authenticate()
    │
    ├─ simplePrompt() → success → ok({ success: true })
    │
    ├─ simplePrompt() → { success: false, error: "User cancellation" }
    │   └─ mapNativeError("User cancellation") → USER_CANCELLED
    │
    └─ simplePrompt() → reject/throw (OS error string)
        └─ mapNativeError(e.message) → LOCKOUT | UNKNOWN
            │
            ▼
        UseCase.handleError()
            ├─ LOCKOUT → biometricDisabled = true
            └─ other → passthrough
                │
                ▼
        useBiometricLogin sets biometricError state
                │
                ▼
        LoginScreen renders BiometricErrorBanner
```

## Error Handling

1. **mapNativeError nunca lanza** — cualquier input (null, undefined, empty, string arbitrario) retorna un `BiometricErrorCode` válido.
2. **Pre-validación evita prompts innecesarios** — si no hay hardware o no hay enrollment, no se invoca `simplePrompt`.
3. **Result type fuerza el manejo** — todos los paths retornan `Result<T, BiometricError>`.
4. **LOCKOUT deshabilita el botón de UI** — previene intentos adicionales contra un sensor bloqueado.
5. **No hay retry automático** — la librería no provee suficiente información para implementar retry inteligente (no se puede distinguir SYSTEM_CANCELLED de un error genérico).

## Testing Strategy

- **Domain entity tests:** `src/domain/biometrics/entities/__tests__/biometric-error.test.ts`
- **NativeErrorMapper tests:** `src/data/biometrics/datasources/__tests__/native-error-mapper.test.ts`
- **Use case tests:** `src/domain/biometrics/usecases/__tests__/authenticate-with-biometrics.test.ts`
- **Hook tests:** `src/presentation/features/auth/hooks/__tests__/useBiometricLogin.test.ts`

Jest con `@react-native/jest-preset`. Tests co-locados en `__tests__/`.

## Correctness Properties

### Property 1: Error Metadata Completeness

*Para todo* valor en `BiometricErrorCode`, `getErrorMetadata(code)` retorna un `ErrorMetadata` con `recoverable` boolean, `SuggestedAction` válido, y `message` no vacío.

### Property 2: mapNativeError Never Throws

*Para cualquier* input (null, undefined, number, empty string, string arbitrario), `mapNativeError(input)` retorna un `BiometricErrorCode` válido sin lanzar excepción.

### Property 3: User Cancellation Detection

*Para cualquier* string que contenga "user cancel" (case-insensitive), `mapNativeError(string)` retorna `'USER_CANCELLED'`.

### Property 4: Pre-validation Gate

*Para toda* autenticación donde `checkCapability()` retorna non-available, el use case retorna el `BiometricError` correspondiente sin invocar `authenticate`.

### Property 5: Lockout Disables Biometric

*Cuando* el use case procesa un error `LOCKOUT`, `getState().biometricDisabled` es `true`.
