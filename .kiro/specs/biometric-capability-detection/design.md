# Design Document — Biometric Capability Detection

## Overview

This design describes the architecture for detecting biometric hardware capabilities on iOS and Android, and presenting results in an interactive Hardware Inspector screen. The implementation follows Clean Architecture with strict layer boundaries, using the existing `Result<T, E>` type and `AppError` class for explicit error handling.

The feature spans four layers: domain (entity + use case), data (datasource + repository), DI (wiring), and presentation (screen + hook + components).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  App.tsx                                                        │
│    └── HardwareInspectorScreen                                  │
│           └── useBiometricCapability (hook)                     │
│                  └── CheckBiometricCapabilityUseCase (from DI)  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ execute()
┌──────────────────────────────▼──────────────────────────────────┐
│  Domain Layer                                                    │
│    CheckBiometricCapabilityUseCase                               │
│      → BiometricRepository (interface)                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ checkCapability()
┌──────────────────────────────▼──────────────────────────────────┐
│  Data Layer                                                      │
│    BiometricRepositoryImpl                                       │
│      → BiometricDatasource                                       │
│           → react-native-biometrics (ONLY import point)          │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Domain Layer

#### BiometricCapability Entity

```typescript
// src/domain/biometrics/entities/biometric-capability.ts

export type BiometryType =
  | 'FaceID'
  | 'TouchID'
  | 'Fingerprint'
  | 'Face'
  | 'Iris'
  | 'Unknown';

export type CapabilityReason = 'NO_HARDWARE' | 'NOT_ENROLLED' | 'AVAILABLE';

export interface BiometricCapability {
  readonly available: boolean;
  readonly biometryType: BiometryType | null;
  readonly reason: CapabilityReason;
}

/**
 * Factory function enforcing the invariant:
 * available === true if and only if reason === 'AVAILABLE'
 */
export function createBiometricCapability(
  reason: CapabilityReason,
  biometryType: BiometryType | null,
): BiometricCapability {
  return {
    available: reason === 'AVAILABLE',
    biometryType,
    reason,
  };
}
```

The factory function `createBiometricCapability` enforces the core invariant: `available` is derived from `reason`, never set independently. This eliminates invalid states where `available: true` but `reason: 'NO_HARDWARE'`.

#### BiometricRepository Interface

```typescript
// src/domain/biometrics/repositories/biometric.repository.ts

import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricCapability } from '../entities/biometric-capability';

export interface BiometricRepository {
  checkCapability(): Promise<Result<BiometricCapability, AppError>>;
}
```

#### CheckBiometricCapabilityUseCase

```typescript
// src/domain/biometrics/usecases/check-biometric-capability.ts

import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricCapability } from '../entities/biometric-capability';
import { BiometricRepository } from '../repositories/biometric.repository';

export class CheckBiometricCapabilityUseCase {
  constructor(private readonly repository: BiometricRepository) {}

  execute(): Promise<Result<BiometricCapability, AppError>> {
    return this.repository.checkCapability();
  }
}
```

The use case is intentionally thin — it delegates directly to the repository. This layer exists to serve as the single entry point from presentation and to allow future orchestration (e.g., caching, analytics) without touching the repository.

### Data Layer

#### BiometricDatasource

```typescript
// src/data/biometrics/datasources/biometric.datasource.ts

import ReactNativeBiometrics from 'react-native-biometrics';
import { Result, ok, err } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import {
  BiometricCapability,
  BiometryType,
  createBiometricCapability,
} from '@domain/biometrics/entities/biometric-capability';

export class BiometricDatasource {
  private rnBiometrics: ReactNativeBiometrics;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics();
  }

  async checkCapability(): Promise<Result<BiometricCapability, AppError>> {
    try {
      const { available, biometryType, error } =
        await this.rnBiometrics.isSensorAvailable();

      if (available && biometryType) {
        return ok(
          createBiometricCapability('AVAILABLE', this.mapBiometryType(biometryType)),
        );
      }

      if (error?.includes('NOT_ENROLLED') || error?.includes('not enrolled')) {
        return ok(
          createBiometricCapability(
            'NOT_ENROLLED',
            biometryType ? this.mapBiometryType(biometryType) : null,
          ),
        );
      }

      return ok(createBiometricCapability('NO_HARDWARE', null));
    } catch (e: unknown) {
      return err(
        new AppError(
          'BIOMETRIC_NOT_AVAILABLE',
          'Failed to check biometric capability',
          e,
        ),
      );
    }
  }

  private mapBiometryType(nativeType: string): BiometryType {
    switch (nativeType) {
      case 'FaceID':
        return 'FaceID';
      case 'TouchID':
        return 'TouchID';
      case 'Biometrics':
        return 'Fingerprint';
      default:
        return 'Unknown';
    }
  }
}
```

This is the **only** file that imports `react-native-biometrics`. The `mapBiometryType` method translates native string values into the domain's `BiometryType` union. Any unexpected exception is caught and wrapped in a `BIOMETRIC_NOT_AVAILABLE` AppError.

#### BiometricRepositoryImpl

```typescript
// src/data/biometrics/repositories/biometric.repository.impl.ts

import { Result } from '@core/types/result';
import { AppError } from '@core/errors/app-error';
import { BiometricCapability } from '@domain/biometrics/entities/biometric-capability';
import { BiometricRepository } from '@domain/biometrics/repositories/biometric.repository';
import { BiometricDatasource } from '../datasources/biometric.datasource';

export class BiometricRepositoryImpl implements BiometricRepository {
  constructor(private readonly datasource: BiometricDatasource) {}

  checkCapability(): Promise<Result<BiometricCapability, AppError>> {
    return this.datasource.checkCapability();
  }
}
```

The repository delegates to the datasource. In this feature it's a simple passthrough; future features (caching, retry logic) would add behavior here without modifying the domain layer.

### Dependency Injection

```typescript
// src/di/container.ts

import { BiometricDatasource } from '@data/biometrics/datasources/biometric.datasource';
import { BiometricRepositoryImpl } from '@data/biometrics/repositories/biometric.repository.impl';
import { CheckBiometricCapabilityUseCase } from '@domain/biometrics/usecases/check-biometric-capability';

const biometricDatasource = new BiometricDatasource();
const biometricRepository = new BiometricRepositoryImpl(biometricDatasource);
const checkBiometricCapabilityUseCase = new CheckBiometricCapabilityUseCase(
  biometricRepository,
);

export const container = {
  checkBiometricCapabilityUseCase,
} as const;
```

All instances are module-level singletons created at import time. The `container` object exposes only use cases to the presentation layer — datasources and repositories stay private to the module.

### Presentation Layer

#### useBiometricCapability Hook

```typescript
// src/presentation/features/biometrics/hooks/useBiometricCapability.ts

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { isOk } from '@core/types/result';
import { BiometricCapability } from '@domain/biometrics/entities/biometric-capability';
import { container } from '@di/container';

interface BiometricCapabilityState {
  capability: BiometricCapability | null;
  loading: boolean;
  error: string | null;
  platformInfo: {
    platform: string;
    osVersion: string;
  };
}

export function useBiometricCapability() {
  const [state, setState] = useState<BiometricCapabilityState>({
    capability: null,
    loading: true,
    error: null,
    platformInfo: {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
    },
  });

  const detect = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const result = await container.checkBiometricCapabilityUseCase.execute();

    if (isOk(result)) {
      setState(prev => ({ ...prev, capability: result.value, loading: false }));
    } else {
      setState(prev => ({
        ...prev,
        error: result.error.message,
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    detect();
  }, [detect]);

  return { ...state, redetect: detect };
}
```

The hook runs detection on mount and exposes a `redetect` callback for the re-detect button. It reads the use case from the DI container.

#### Component Breakdown

```
HardwareInspectorScreen
├── SensorCard           — displays sensor type, icon, and status
├── ReDetectButton       — triggers re-detection
├── ExplanationPanel     — explains which native API was consulted
└── DeviceInfoCard       — shows platform, OS version, security level
```

#### SensorCard Component

```typescript
// src/presentation/features/biometrics/components/SensorCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BiometricCapability } from '@domain/biometrics/entities/biometric-capability';

interface Props {
  capability: BiometricCapability;
}

export function SensorCard({ capability }: Props) {
  const { reason, biometryType } = capability;

  const sensorName = biometryType
    ? getSensorDisplayName(biometryType)
    : 'Sin sensor';

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{getSensorIcon(reason, biometryType)}</Text>
      <Text style={styles.title}>{sensorName}</Text>
      <Text style={styles.status}>{getStatusMessage(reason)}</Text>
      {reason === 'NOT_ENROLLED' && (
        <Text style={styles.guidance}>
          Ve a Ajustes del sistema para registrar tu biometría.
        </Text>
      )}
    </View>
  );
}

function getSensorDisplayName(type: string): string {
  switch (type) {
    case 'FaceID': return 'Face ID';
    case 'TouchID': return 'Touch ID';
    case 'Fingerprint': return 'Huella dactilar';
    case 'Face': return 'Reconocimiento facial';
    case 'Iris': return 'Iris';
    default: return 'Biometría desconocida';
  }
}

function getSensorIcon(reason: string, type: string | null): string {
  if (reason === 'NO_HARDWARE') return '🚫';
  if (reason === 'NOT_ENROLLED') return '⚠️';
  switch (type) {
    case 'FaceID':
    case 'Face': return '🧑';
    case 'TouchID':
    case 'Fingerprint': return '👆';
    case 'Iris': return '👁️';
    default: return '🔐';
  }
}

function getStatusMessage(reason: string): string {
  switch (reason) {
    case 'AVAILABLE': return 'Disponible';
    case 'NOT_ENROLLED': return 'No registrada';
    case 'NO_HARDWARE': return 'Sin hardware biométrico';
    default: return 'Desconocido';
  }
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 12, backgroundColor: '#f8f9fa', alignItems: 'center', marginBottom: 16 },
  icon: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '600', color: '#212529' },
  status: { fontSize: 14, color: '#6c757d', marginTop: 4 },
  guidance: { fontSize: 13, color: '#495057', marginTop: 12, textAlign: 'center', fontStyle: 'italic' },
});
```

#### ReDetectButton Component

```typescript
// src/presentation/features/biometrics/components/ReDetectButton.tsx

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  onPress: () => void;
  loading: boolean;
}

export function ReDetectButton({ onPress, loading }: Props) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Volver a detectar capacidades biométricas"
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>Volver a detectar</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: '#0d6efd', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', marginVertical: 16 },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

#### ExplanationPanel Component

```typescript
// src/presentation/features/biometrics/components/ExplanationPanel.tsx

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BiometricCapability } from '@domain/biometrics/entities/biometric-capability';

interface Props {
  capability: BiometricCapability;
}

export function ExplanationPanel({ capability }: Props) {
  const apiName = Platform.OS === 'ios'
    ? 'LAContext.canEvaluatePolicy'
    : 'BiometricManager.canAuthenticate';

  const responseDescription = getResponseDescription(capability.reason);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>¿Qué acaba de pasar?</Text>
      <Text style={styles.body}>
        Se consultó <Text style={styles.code}>{apiName}</Text> del sistema operativo.
      </Text>
      <Text style={styles.body}>Respuesta: {responseDescription}</Text>
    </View>
  );
}

function getResponseDescription(reason: string): string {
  switch (reason) {
    case 'AVAILABLE':
      return 'El sensor biométrico está disponible y tiene datos biométricos registrados.';
    case 'NOT_ENROLLED':
      return 'Se detectó hardware biométrico, pero no hay biometría registrada en el dispositivo.';
    case 'NO_HARDWARE':
      return 'No se detectó hardware biométrico en este dispositivo.';
    default:
      return 'Estado desconocido.';
  }
}

const styles = StyleSheet.create({
  panel: { padding: 16, borderRadius: 10, backgroundColor: '#e9ecef', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: '#212529', marginBottom: 8 },
  body: { fontSize: 14, color: '#495057', marginBottom: 4, lineHeight: 20 },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#0d6efd' },
});
```

#### DeviceInfoCard Component

```typescript
// src/presentation/features/biometrics/components/DeviceInfoCard.tsx

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface Props {
  platform: string;
  osVersion: string;
  securityLevel?: 'strong' | 'weak';
}

export function DeviceInfoCard({ platform, osVersion, securityLevel }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ficha del dispositivo</Text>
      <Text style={styles.row}>Plataforma: {platform === 'ios' ? 'iOS' : 'Android'}</Text>
      <Text style={styles.row}>Versión OS: {osVersion}</Text>
      {securityLevel && (
        <Text style={styles.row}>
          Nivel de seguridad: {securityLevel === 'strong' ? 'Fuerte (Class 3)' : 'Débil (Class 2)'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 10, backgroundColor: '#f8f9fa', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: '#212529', marginBottom: 8 },
  row: { fontSize: 14, color: '#495057', marginBottom: 4 },
});
```

#### HardwareInspectorScreen

```typescript
// src/presentation/features/biometrics/screens/HardwareInspectorScreen.tsx

import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useBiometricCapability } from '../hooks/useBiometricCapability';
import { SensorCard } from '../components/SensorCard';
import { ReDetectButton } from '../components/ReDetectButton';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { DeviceInfoCard } from '../components/DeviceInfoCard';

export function HardwareInspectorScreen() {
  const { capability, loading, error, platformInfo, redetect } =
    useBiometricCapability();

  if (loading && !capability) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Detectando capacidades...</Text>
      </View>
    );
  }

  if (error && !capability) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <ReDetectButton onPress={redetect} loading={loading} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Hardware Inspector</Text>

      {capability && <SensorCard capability={capability} />}

      <ReDetectButton onPress={redetect} loading={loading} />

      {capability && <ExplanationPanel capability={capability} />}

      <DeviceInfoCard
        platform={platformInfo.platform}
        osVersion={platformInfo.osVersion}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  heading: { fontSize: 28, fontWeight: '700', color: '#212529', marginBottom: 24 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6c757d' },
  errorText: { fontSize: 16, color: '#dc3545', textAlign: 'center', marginBottom: 16 },
});
```

## Data Models

### BiometricCapability

| Field | Type | Description |
|-------|------|-------------|
| `available` | `boolean` | `true` only when `reason === 'AVAILABLE'` |
| `biometryType` | `BiometryType \| null` | Detected sensor type, `null` when no hardware |
| `reason` | `CapabilityReason` | One of `NO_HARDWARE`, `NOT_ENROLLED`, `AVAILABLE` |

### Native Response Mapping

| `react-native-biometrics` response | Domain `reason` | `biometryType` |
|--------------------------------------|-----------------|----------------|
| `{ available: true, biometryType: 'FaceID' }` | `AVAILABLE` | `FaceID` |
| `{ available: true, biometryType: 'TouchID' }` | `AVAILABLE` | `TouchID` |
| `{ available: true, biometryType: 'Biometrics' }` | `AVAILABLE` | `Fingerprint` |
| `{ available: false, error: 'NOT_ENROLLED...' }` | `NOT_ENROLLED` | mapped type or `null` |
| `{ available: false }` (no sensor) | `NO_HARDWARE` | `null` |
| Exception thrown | Error Result | `BIOMETRIC_NOT_AVAILABLE` |

### Key Interfaces Summary

| Interface | Method | Returns |
|-----------|--------|---------|
| `BiometricRepository` | `checkCapability()` | `Promise<Result<BiometricCapability, AppError>>` |
| `BiometricDatasource` | `checkCapability()` | `Promise<Result<BiometricCapability, AppError>>` |
| `useBiometricCapability` | hook return | `{ capability, loading, error, platformInfo, redetect }` |

## Error Handling

| Scenario | Error Code | Handling |
|----------|------------|----------|
| Native library throws exception | `BIOMETRIC_NOT_AVAILABLE` | Datasource catches, wraps in `AppError`, returns `err(...)` |
| Repository receives error from datasource | — | Propagates the error Result unchanged |
| Use case receives error from repository | — | Propagates the error Result unchanged |
| Hook receives error Result | — | Sets `error` state, displays error message and re-detect button |

The error propagation follows a strict "bubble up" pattern — no layer swallows or transforms errors. The datasource is the only layer that creates `AppError` instances from native exceptions.

## Testing Strategy

### Unit Tests (Fake Repository)

Tests for `CheckBiometricCapabilityUseCase` use a `FakeBiometricRepository` that can be configured to return any `Result<BiometricCapability, AppError>`:

```typescript
class FakeBiometricRepository implements BiometricRepository {
  private result: Result<BiometricCapability, AppError>;

  constructor(result: Result<BiometricCapability, AppError>) {
    this.result = result;
  }

  setResult(result: Result<BiometricCapability, AppError>): void {
    this.result = result;
  }

  async checkCapability(): Promise<Result<BiometricCapability, AppError>> {
    return this.result;
  }
}
```

Test cases cover:
- Repository returns `AVAILABLE` with each biometry type → use case forwards correctly
- Repository returns `NOT_ENROLLED` → use case forwards correctly
- Repository returns `NO_HARDWARE` → use case forwards correctly
- Repository returns error → use case propagates error unchanged

### Datasource Tests (Mocked Native Module)

Jest mock of `react-native-biometrics` to test:
- Each native response maps to the correct domain entity
- Exceptions produce `BIOMETRIC_NOT_AVAILABLE` errors

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Available field invariant

*For any* BiometricCapability created with a given `reason`, the `available` field SHALL equal `true` if and only if `reason` equals `AVAILABLE`. In other words: `createBiometricCapability(reason, type).available === (reason === 'AVAILABLE')` for all valid `reason` and `biometryType` combinations.

**Validates: Requirements 1.3**

### Property 2: Error propagation through layers

*For any* `AppError` returned by the datasource, the error SHALL propagate unchanged through the repository and use case to the caller. That is, if the datasource returns `err(appError)`, then `useCase.execute()` resolves to `err(appError)` with the same code and message.

**Validates: Requirements 3.4, 5.4**

### Property 3: Datasource exception-to-error mapping

*For any* exception thrown by the `react-native-biometrics` native module during `isSensorAvailable()`, the datasource SHALL catch the exception and return an error Result with AppError code `BIOMETRIC_NOT_AVAILABLE`, never throwing to the caller.

**Validates: Requirements 4.6**

### Property 4: Sensor card displays correct name for biometry type

*For any* `BiometricCapability` with `reason === 'AVAILABLE'` and a non-null `biometryType`, the SensorCard component SHALL render a display string that corresponds to the human-readable name of that biometry type (e.g., `FaceID` → "Face ID", `Fingerprint` → "Huella dactilar").

**Validates: Requirements 7.1**

### Property 5: Re-detect button always visible

*For any* `CapabilityState` value (`NO_HARDWARE`, `NOT_ENROLLED`, or `AVAILABLE`), the Hardware Inspector screen SHALL render the Re-Detect Button in the component tree.

**Validates: Requirements 8.1**
