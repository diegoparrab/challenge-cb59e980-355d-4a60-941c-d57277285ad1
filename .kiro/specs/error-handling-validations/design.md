# Design Document

## Overview

This design replaces the current generic `AppError`-based biometric failure handling with a structured error taxonomy, platform-aware native error mapping, retry policies with lockout awareness, a shared UI banner component, and a lab mode for manual error provocation. The architecture follows Clean Architecture layer boundaries: domain entities define the taxonomy, data layer maps native codes, domain use case orchestrates retry logic, and presentation renders contextual feedback.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ presentation/shared/components/BiometricErrorBanner             │
│ presentation/features/auth/hooks/useBiometricLogin (updated)    │
│ presentation/features/biometrics/hooks/useLabMode (new)         │
│ presentation/features/biometrics/screens/HardwareInspectorScreen│
└───────────────────────────┬─────────────────────────────────────┘
                            │ consumes Result<BiometricAuthResult, BiometricError>
┌───────────────────────────▼─────────────────────────────────────┐
│ domain/biometrics/usecases/authenticate-with-biometrics.ts      │
│   • pre-validation gate                                          │
│   • retry counter (MAX_FAILED_PROMPTS = 3)                       │
│   • SYSTEM_CANCELLED single-retry logic                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ calls BiometricRepository port
┌───────────────────────────▼─────────────────────────────────────┐
│ data/biometrics/datasources/biometric.datasource.ts             │
│   • NativeErrorMapper (mapNativeError function)                  │
│   • Defensive parsing of react-native-biometrics error strings   │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. BiometricErrorEntity (Domain Layer)

**File:** `src/domain/biometrics/entities/biometric-error.ts`

Defines the error taxonomy as pure data — no framework dependencies.

```typescript
// domain/biometrics/entities/biometric-error.ts

export type BiometricErrorCode =
  | 'NO_HARDWARE'
  | 'NOT_ENROLLED'
  | 'USER_CANCELLED'
  | 'SYSTEM_CANCELLED'
  | 'AUTH_FAILED'
  | 'LOCKOUT'
  | 'LOCKOUT_PERMANENT'
  | 'NOT_AVAILABLE'
  | 'UNKNOWN';

export type SuggestedAction =
  | 'RETRY'
  | 'ENROLL'
  | 'USE_DEVICE_CREDENTIAL'
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

const ERROR_METADATA_MAP: Record<BiometricErrorCode, ErrorMetadata> = {
  NO_HARDWARE: {
    recoverable: false,
    suggestedAction: 'NONE',
    message: 'Este dispositivo no cuenta con sensor biométrico.',
  },
  NOT_ENROLLED: {
    recoverable: true,
    suggestedAction: 'ENROLL',
    message: 'No hay datos biométricos registrados. Configúralos en Ajustes.',
  },
  USER_CANCELLED: {
    recoverable: true,
    suggestedAction: 'NONE',
    message: 'Autenticación cancelada.',
  },
  SYSTEM_CANCELLED: {
    recoverable: true,
    suggestedAction: 'RETRY',
    message: 'La autenticación fue interrumpida por el sistema. Intenta de nuevo.',
  },
  AUTH_FAILED: {
    recoverable: true,
    suggestedAction: 'RETRY',
    message: 'No se reconoció tu biometría. Intenta de nuevo.',
  },
  LOCKOUT: {
    recoverable: true,
    suggestedAction: 'WAIT',
    message: 'Demasiados intentos fallidos. Espera un momento antes de reintentar.',
  },
  LOCKOUT_PERMANENT: {
    recoverable: true,
    suggestedAction: 'USE_DEVICE_CREDENTIAL',
    message: 'Biometría bloqueada. Desbloquea tu dispositivo con PIN o patrón para reactivarla.',
  },
  NOT_AVAILABLE: {
    recoverable: false,
    suggestedAction: 'NONE',
    message: 'El sensor biométrico no está disponible en este momento.',
  },
  UNKNOWN: {
    recoverable: false,
    suggestedAction: 'NONE',
    message: 'Ocurrió un error inesperado. Intenta más tarde.',
  },
};

export function getErrorMetadata(code: BiometricErrorCode): ErrorMetadata {
  return ERROR_METADATA_MAP[code];
}

export function createBiometricError(
  code: BiometricErrorCode,
  nativeCode?: string,
): BiometricError {
  return {
    code,
    metadata: getErrorMetadata(code),
    nativeCode,
    timestamp: Date.now(),
  };
}
```

### 2. NativeErrorMapper (Data Layer)

**File:** `src/data/biometrics/datasources/native-error-mapper.ts`

Pure function — no side effects, fully testable. Lives alongside the datasource that uses it.

```typescript
// data/biometrics/datasources/native-error-mapper.ts

import { BiometricErrorCode } from '@domain/biometrics/entities/biometric-error';

/**
 * Mapping table: native error identifiers → domain BiometricErrorCode.
 * Covers iOS LAError codes, Android BiometricPrompt error codes,
 * and react-native-biometrics string representations.
 */
const NATIVE_ERROR_MAP: Record<string, BiometricErrorCode> = {
  // USER_CANCELLED
  'LAError.userCancel': 'USER_CANCELLED',
  ERROR_USER_CANCELED: 'USER_CANCELLED',
  ERROR_NEGATIVE_BUTTON: 'USER_CANCELLED',
  userCancel: 'USER_CANCELLED',

  // SYSTEM_CANCELLED
  'LAError.systemCancel': 'SYSTEM_CANCELLED',
  'LAError.appCancel': 'SYSTEM_CANCELLED',
  ERROR_CANCELED: 'SYSTEM_CANCELLED',
  systemCancel: 'SYSTEM_CANCELLED',
  appCancel: 'SYSTEM_CANCELLED',

  // LOCKOUT
  'LAError.biometryLockout': 'LOCKOUT',
  ERROR_LOCKOUT: 'LOCKOUT',

  // LOCKOUT_PERMANENT
  ERROR_LOCKOUT_PERMANENT: 'LOCKOUT_PERMANENT',

  // NOT_ENROLLED
  'LAError.biometryNotEnrolled': 'NOT_ENROLLED',
  ERROR_NO_BIOMETRICS: 'NOT_ENROLLED',
  biometryNotEnrolled: 'NOT_ENROLLED',

  // NO_HARDWARE
  'LAError.biometryNotAvailable': 'NO_HARDWARE',
  ERROR_HW_NOT_PRESENT: 'NO_HARDWARE',

  // NOT_AVAILABLE
  ERROR_HW_UNAVAILABLE: 'NOT_AVAILABLE',
};

/**
 * Maps a native error code/string to a domain BiometricErrorCode.
 * Never throws — returns UNKNOWN for null, undefined, or unmapped values.
 */
export function mapNativeError(nativeCode: unknown): BiometricErrorCode {
  if (typeof nativeCode !== 'string' || nativeCode.trim() === '') {
    return 'UNKNOWN';
  }

  return NATIVE_ERROR_MAP[nativeCode] ?? 'UNKNOWN';
}

/** Exported for test validation of mapping completeness. */
export const KNOWN_NATIVE_CODES = Object.keys(NATIVE_ERROR_MAP);
```

### 3. AuthenticateWithBiometrics Use Case (Updated)

**File:** `src/domain/biometrics/usecases/authenticate-with-biometrics.ts`

Adds retry policy, failed prompt counter, and SYSTEM_CANCELLED single-retry logic.

```typescript
// domain/biometrics/usecases/authenticate-with-biometrics.ts

import { Result, err, ok } from '@core/types/result';
import {
  BiometricError,
  createBiometricError,
} from '../entities/biometric-error';
import { BiometricAuthResult, PromptConfig } from '../entities/biometric-auth';
import { BiometricRepository } from '../repositories/biometric.repository';

export const MAX_FAILED_PROMPTS = 3;

export interface AuthenticationState {
  readonly failedPromptCount: number;
  readonly silentRetryAttempted: boolean;
  readonly biometricDisabled: boolean;
}

export class AuthenticateWithBiometricsUseCase {
  private state: AuthenticationState = {
    failedPromptCount: 0,
    silentRetryAttempted: false,
    biometricDisabled: false,
  };

  constructor(private readonly repository: BiometricRepository) {}

  getState(): AuthenticationState {
    return { ...this.state };
  }

  resetState(): void {
    this.state = {
      failedPromptCount: 0,
      silentRetryAttempted: false,
      biometricDisabled: false,
    };
  }

  async execute(
    config: PromptConfig,
  ): Promise<Result<BiometricAuthResult, BiometricError>> {
    // Pre-validation: check capability before prompt
    const capabilityResult = await this.repository.checkCapability();

    if (capabilityResult.kind === 'err') {
      return err(createBiometricError('UNKNOWN', undefined));
    }

    const capability = capabilityResult.value;
    if (!capability.available) {
      const code = capability.reason === 'NOT_ENROLLED'
        ? 'NOT_ENROLLED'
        : 'NO_HARDWARE';
      return err(createBiometricError(code, undefined));
    }

    // Attempt authentication
    const authResult = await this.repository.authenticate(config);

    if (authResult.kind === 'ok') {
      this.state = { ...this.state, failedPromptCount: 0 };
      return authResult;
    }

    // Handle error based on the BiometricError returned from repository
    const biometricError = authResult.error;
    return this.handleError(biometricError);
  }

  async handleSystemCancelledRetry(
    config: PromptConfig,
  ): Promise<Result<BiometricAuthResult, BiometricError> | null> {
    if (this.state.silentRetryAttempted) {
      return null; // No further retry allowed
    }
    this.state = { ...this.state, silentRetryAttempted: true };
    return this.execute(config);
  }

  private handleError(
    error: BiometricError,
  ): Result<BiometricAuthResult, BiometricError> {
    switch (error.code) {
      case 'AUTH_FAILED': {
        const newCount = this.state.failedPromptCount + 1;
        this.state = { ...this.state, failedPromptCount: newCount };

        if (newCount >= MAX_FAILED_PROMPTS) {
          return err({
            ...error,
            metadata: {
              ...error.metadata,
              suggestedAction: 'USE_DEVICE_CREDENTIAL',
              message: 'Múltiples intentos fallidos. Usa un método alternativo.',
            },
          });
        }
        return err(error);
      }

      case 'LOCKOUT':
        this.state = { ...this.state, biometricDisabled: true };
        return err(error);

      case 'LOCKOUT_PERMANENT':
        this.state = { ...this.state, biometricDisabled: true };
        return err(error);

      case 'SYSTEM_CANCELLED':
      case 'USER_CANCELLED':
      default:
        return err(error);
    }
  }
}
```

### 4. Updated BiometricRepository Interface

**File:** `src/domain/biometrics/repositories/biometric.repository.ts`

The `authenticate` method now returns `BiometricError` instead of generic `AppError`.

```typescript
// domain/biometrics/repositories/biometric.repository.ts

import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricCapability } from '../entities/biometric-capability';
import { PromptConfig, BiometricAuthResult } from '../entities/biometric-auth';
import { BiometricError } from '../entities/biometric-error';

export interface BiometricRepository {
  checkCapability(): Promise<Result<BiometricCapability, AppError>>;
  authenticate(config: PromptConfig): Promise<Result<BiometricAuthResult, BiometricError>>;
}
```

### 5. BiometricErrorBanner (Presentation Layer — Shared)

**File:** `src/presentation/shared/components/BiometricErrorBanner.tsx`

```typescript
// presentation/shared/components/BiometricErrorBanner.tsx

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BiometricError, SuggestedAction } from '@domain/biometrics/entities/biometric-error';

interface Props {
  error: BiometricError | null;
  failedPromptCount: number;
  onRetry?: () => void;
  onEnroll?: () => void;
  onUseDeviceCredential?: () => void;
  onDismiss?: () => void;
}

export function BiometricErrorBanner({
  error,
  failedPromptCount,
  onRetry,
  onEnroll,
  onUseDeviceCredential,
  onDismiss,
}: Props) {
  if (!error) {
    return null;
  }

  const actionLabel = getActionLabel(error.metadata.suggestedAction);
  const actionHandler = getActionHandler(
    error.metadata.suggestedAction,
    { onRetry, onEnroll, onUseDeviceCredential, onDismiss },
  );

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text style={styles.message}>{error.metadata.message}</Text>
      {actionLabel && actionHandler && (
        <Pressable
          style={styles.actionButton}
          onPress={actionHandler}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function getActionLabel(action: SuggestedAction): string | null {
  switch (action) {
    case 'RETRY':
      return 'Reintentar';
    case 'ENROLL':
      return 'Ir a Ajustes';
    case 'USE_DEVICE_CREDENTIAL':
      return 'Usar PIN/Patrón';
    case 'WAIT':
      return null; // No action during wait
    case 'NONE':
    default:
      return null;
  }
}

function getActionHandler(
  action: SuggestedAction,
  handlers: {
    onRetry?: () => void;
    onEnroll?: () => void;
    onUseDeviceCredential?: () => void;
    onDismiss?: () => void;
  },
): (() => void) | null {
  switch (action) {
    case 'RETRY':
      return handlers.onRetry ?? null;
    case 'ENROLL':
      return handlers.onEnroll ?? null;
    case 'USE_DEVICE_CREDENTIAL':
      return handlers.onUseDeviceCredential ?? null;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  message: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

### 6. Lab Mode Hook

**File:** `src/presentation/features/biometrics/hooks/useLabMode.ts`

```typescript
// presentation/features/biometrics/hooks/useLabMode.ts

import { useState, useCallback, useRef } from 'react';
import { BiometricError } from '@domain/biometrics/entities/biometric-error';

export interface ErrorLogEntry {
  readonly nativeCode: string | undefined;
  readonly domainCode: string;
  readonly timestamp: number;
}

export interface LabScenario {
  readonly id: string;
  readonly title: string;
  readonly instructions: string;
  readonly expectedError: string;
}

export const LAB_SCENARIOS: readonly LabScenario[] = [
  {
    id: 'cancel-prompt',
    title: 'Cancelar el prompt',
    instructions: 'Presiona el botón de cancelar cuando aparezca el diálogo biométrico.',
    expectedError: 'USER_CANCELLED',
  },
  {
    id: 'unregistered-biometric',
    title: 'Usar biometría no registrada',
    instructions: 'Presenta un dedo/rostro que no esté registrado en el dispositivo.',
    expectedError: 'AUTH_FAILED',
  },
  {
    id: 'multiple-failures',
    title: 'Fallar múltiples veces',
    instructions: 'Falla la autenticación 5+ veces seguidas para provocar lockout del SO.',
    expectedError: 'LOCKOUT',
  },
  {
    id: 'background-cancel',
    title: 'Enviar app a segundo plano',
    instructions: 'Con el prompt visible, envía la app a background (botón home o gesto).',
    expectedError: 'SYSTEM_CANCELLED',
  },
];

export function useLabMode() {
  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>([]);
  const [lastError, setLastError] = useState<BiometricError | null>(null);

  const logError = useCallback((error: BiometricError) => {
    const entry: ErrorLogEntry = {
      nativeCode: error.nativeCode,
      domainCode: error.code,
      timestamp: error.timestamp,
    };
    setErrorLog(prev => [...prev, entry]);
    setLastError(error);
  }, []);

  const clearLog = useCallback(() => {
    setErrorLog([]);
    setLastError(null);
  }, []);

  return {
    scenarios: LAB_SCENARIOS,
    errorLog,
    lastError,
    logError,
    clearLog,
  };
}
```

## Data Models

### BiometricErrorCode (Union Type)

| Code | Recoverable | Suggested Action | Use Case |
|------|-------------|-----------------|----------|
| `NO_HARDWARE` | false | NONE | Device lacks biometric sensor |
| `NOT_ENROLLED` | true | ENROLL | Sensor present but nothing enrolled |
| `USER_CANCELLED` | true | NONE | User dismissed prompt intentionally |
| `SYSTEM_CANCELLED` | true | RETRY | OS interrupted (background, call) |
| `AUTH_FAILED` | true | RETRY | Sensor didn't recognize biometric |
| `LOCKOUT` | true | WAIT | Too many attempts, temporary block |
| `LOCKOUT_PERMANENT` | true | USE_DEVICE_CREDENTIAL | Blocked until device credential |
| `NOT_AVAILABLE` | false | NONE | Sensor busy or transient unavailability |
| `UNKNOWN` | false | NONE | Unmapped or malformed native error |

### Native Error Mapping Table

| Native Code | Platform | Domain Code |
|-------------|----------|-------------|
| `LAError.userCancel` | iOS | USER_CANCELLED |
| `ERROR_USER_CANCELED` | Android | USER_CANCELLED |
| `ERROR_NEGATIVE_BUTTON` | Android | USER_CANCELLED |
| `LAError.systemCancel` | iOS | SYSTEM_CANCELLED |
| `LAError.appCancel` | iOS | SYSTEM_CANCELLED |
| `ERROR_CANCELED` | Android | SYSTEM_CANCELLED |
| `LAError.biometryLockout` | iOS | LOCKOUT |
| `ERROR_LOCKOUT` | Android | LOCKOUT |
| `ERROR_LOCKOUT_PERMANENT` | Android | LOCKOUT_PERMANENT |
| `LAError.biometryNotEnrolled` | iOS | NOT_ENROLLED |
| `ERROR_NO_BIOMETRICS` | Android | NOT_ENROLLED |
| `LAError.biometryNotAvailable` | iOS | NO_HARDWARE |
| `ERROR_HW_NOT_PRESENT` | Android | NO_HARDWARE |
| `ERROR_HW_UNAVAILABLE` | Android | NOT_AVAILABLE |
| Any other / null / undefined | — | UNKNOWN |

### ErrorLogEntry

```typescript
interface ErrorLogEntry {
  readonly nativeCode: string | undefined;
  readonly domainCode: string;
  readonly timestamp: number;
}
```

### AuthenticationState (Use Case Internal)

```typescript
interface AuthenticationState {
  failedPromptCount: number;      // resets on success
  silentRetryAttempted: boolean;  // per-session flag
  biometricDisabled: boolean;    // set on LOCKOUT / LOCKOUT_PERMANENT
}
```

### 7. Updated BiometricDatasource

The datasource's `authenticate` method uses `mapNativeError` internally and returns `BiometricError` on failure:

```typescript
async authenticate(config: PromptConfig): Promise<Result<BiometricAuthResult, BiometricError>> {
  try {
    const { success, error } = await this.rnBiometrics.simplePrompt({
      promptMessage: config.title,
      cancelButtonText: config.cancelLabel,
    });

    if (success) {
      return ok({ success: true });
    }

    const code = mapNativeError(error);
    return err(createBiometricError(code, error ?? undefined));
  } catch (e: unknown) {
    const errorString = e instanceof Error ? e.message : String(e);
    const code = mapNativeError(errorString);
    return err(createBiometricError(code, errorString));
  }
}
```

### 8. BiometricErrorBanner Props

```typescript
interface BiometricErrorBannerProps {
  error: BiometricError | null;
  failedPromptCount: number;
  onRetry?: () => void;
  onEnroll?: () => void;
  onUseDeviceCredential?: () => void;
  onDismiss?: () => void;
}
```

## Error Handling

1. **NativeErrorMapper never throws** — any input (null, undefined, empty string, arbitrary string) returns a valid `BiometricErrorCode`.
2. **Use case always pre-validates** — capability changes between checks are detected before launching the native prompt.
3. **Result type enforces handling** — all paths return `Result<T, BiometricError>`, forcing callers to address both success and failure.
4. **Lockout disables the UI button** — prevents users from triggering more prompts against an already-locked sensor.
5. **SYSTEM_CANCELLED gets one retry** — handles the common "app backgrounded during prompt" scenario gracefully without infinite retry loops.

## Testing Strategy

- **Domain entities tests:** `src/domain/biometrics/entities/__tests__/biometric-error.test.ts`
- **NativeErrorMapper tests:** `src/data/biometrics/datasources/__tests__/native-error-mapper.test.ts`
- **Use case tests:** `src/domain/biometrics/usecases/__tests__/authenticate-with-biometrics.test.ts`
- **Banner tests:** `src/presentation/shared/components/__tests__/BiometricErrorBanner.test.tsx`
- **Lab mode hook tests:** `src/presentation/features/biometrics/hooks/__tests__/useLabMode.test.ts`

All tests co-located in `__tests__/` directories. Jest with `@react-native/jest-preset`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Error Metadata Completeness

*For any* value in the BiometricErrorCode union type, `getErrorMetadata(code)` SHALL return an `ErrorMetadata` object containing a boolean `recoverable` field, a valid `SuggestedAction` value, and a non-empty `message` string in es-ES.

**Validates: Requirements 1.1, 1.2**

### Property 2: Native Error Mapping Correctness

*For any* `(nativeCode, expectedDomainCode)` pair defined in the native error mapping table, `mapNativeError(nativeCode)` SHALL return exactly `expectedDomainCode`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

### Property 3: Unmapped Input Falls Back to UNKNOWN

*For any* input that is not a string present in the known native codes set (including null, undefined, empty string, and arbitrary strings), `mapNativeError(input)` SHALL return `'UNKNOWN'` without throwing an exception.

**Validates: Requirements 2.8, 2.9**

### Property 4: Pre-validation Gate

*For any* authentication attempt where `checkCapability()` returns a non-available capability, the use case SHALL return the corresponding `BiometricError` without invoking the `authenticate` method on the repository.

**Validates: Requirements 3.1, 3.2**

### Property 5: Failed Prompt Counter and Threshold

*For any* sequence of N consecutive `AUTH_FAILED` results (where 1 ≤ N ≤ MAX_FAILED_PROMPTS), the use case's `failedPromptCount` SHALL equal N. When N reaches `MAX_FAILED_PROMPTS` (3), the returned error's `suggestedAction` SHALL change to indicate an alternative authentication method.

**Validates: Requirements 3.4, 3.5**

### Property 6: SYSTEM_CANCELLED Single Retry Invariant

*For any* session, the first `SYSTEM_CANCELLED` error SHALL permit exactly one silent retry attempt. *For any* subsequent `SYSTEM_CANCELLED` error in the same session (after a retry was already attempted), the use case SHALL propagate the error without further retry.

**Validates: Requirements 3.9, 3.10**

### Property 7: Banner Action Button Matches SuggestedAction

*For any* `BiometricError` rendered in the `BiometricErrorBanner`, the action button label returned by `getActionLabel(error.metadata.suggestedAction)` SHALL correspond to the `suggestedAction` value: RETRY → "Reintentar", ENROLL → "Ir a Ajustes", USE_DEVICE_CREDENTIAL → "Usar PIN/Patrón", WAIT → null, NONE → null.

**Validates: Requirements 4.2, 4.8**

### Property 8: ErrorLog Entry Completeness

*For any* `BiometricError` logged via the lab mode's `logError` function, the resulting `ErrorLogEntry` SHALL contain the original `nativeCode`, the mapped `domainCode` (equal to `error.code`), and a numeric `timestamp` (equal to `error.timestamp`).

**Validates: Requirements 5.2**
