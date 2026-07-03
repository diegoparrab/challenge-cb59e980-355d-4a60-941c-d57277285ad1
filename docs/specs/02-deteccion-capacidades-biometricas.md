# Spec 02 — Detección de capacidades biométricas (Hardware Inspector)

**Fase del reto:** Fase 1 (primera mitad: "identificar las capacidades biométricas disponibles")
**Depende de:** Spec 01
**Estado:** Pendiente

## Objetivo

Detectar qué hardware biométrico ofrece el dispositivo y **mostrarlo de forma interactiva** en una pantalla "Hardware Inspector". Esta pantalla es el corazón educativo del proyecto: convierte llamadas a módulos nativos en información visible sobre el hardware real del teléfono.

## Contexto

Antes de autenticar hay que saber si se puede. Las capacidades varían por dispositivo (Face ID vs Touch ID en iOS; huella, rostro o iris en Android), por estado (biometría no enrolada, deshabilitada, bloqueada) y por nivel de seguridad (Android distingue biometría *strong* — Class 3 — de *weak* — Class 2). Manejar estos casos es una de las pistas explícitas del reto.

## Decisión de librería

Se usará **`react-native-biometrics`** como dependencia principal:

- Expone `isSensorAvailable()` con el tipo de sensor (`TouchID`, `FaceID`, `Biometrics`).
- Además de `simplePrompt()`, ofrece `createKeys()` / `createSignature()`, que generan pares de llaves **respaldadas por hardware** (Secure Enclave en iOS, Keystore/TEE en Android). Esto habilita el aprendizaje de la spec 05 (autenticación basada en firma, no en un booleano).

Si al integrarla hay incompatibilidad con RN 0.86 / nueva arquitectura, la alternativa es `expo-local-authentication` (instalable sin Expo completo) — la decisión se registra en la spec al implementar. El diseño no cambia: la librería queda aislada en `data/datasources/`.

**iOS:** requiere `NSFaceIDUsageDescription` en `Info.plist`.
**Android:** requiere permiso `USE_BIOMETRIC` en `AndroidManifest.xml` (minSdk de RN 0.86 ya es suficiente).

## Alcance

**Incluye:**
- Entidad de dominio `BiometricCapability` y caso de uso `CheckBiometricCapability`.
- Datasource + repositorio que envuelven la librería nativa.
- Pantalla **Hardware Inspector** con la información detectada y explicaciones.
- Manejo del caso "dispositivo sin biometría" y "biometría no enrolada".

**No incluye:**
- Disparar el prompt de autenticación (spec 03).
- Manejo exhaustivo de errores (spec 04 lo formaliza; aquí solo se distinguen los estados de capacidad).

## Diseño técnico

### Dominio

```ts
// domain/biometrics/entities/biometric-capability.ts
type BiometryType = 'FaceID' | 'TouchID' | 'Fingerprint' | 'Face' | 'Iris' | 'Unknown';

interface BiometricCapability {
  available: boolean;
  biometryType: BiometryType | null;
  reason: 'NO_HARDWARE' | 'NOT_ENROLLED' | 'AVAILABLE';
}

// domain/biometrics/repositories/biometric.repository.ts
interface BiometricRepository {
  checkCapability(): Promise<Result<BiometricCapability, AppError>>;
}

// domain/biometrics/usecases/check-biometric-capability.ts
```

### Datos

- `data/biometrics/datasources/biometric.datasource.ts`: único archivo que importa `react-native-biometrics`. Traduce la respuesta cruda (`{ available, biometryType, error }`) al modelo de dominio.
- `data/biometrics/repositories/biometric.repository.impl.ts`: implementa el contrato, mapea errores nativos a `AppError`.

### Presentación — pantalla Hardware Inspector

La pantalla, sus componentes y el hook `useBiometricCapability` viven en `presentation/features/biometrics/` (namespace del feature, según spec 01).

Elementos interactivos:

1. **Tarjeta de sensor**: icono y nombre del sensor detectado (Face ID / Touch ID / Huella), o estado "sin hardware biométrico" / "sin biometría enrolada" con instrucciones para enrolar en ajustes del sistema.
2. **Botón "Volver a detectar"**: re-ejecuta el caso de uso (útil al enrolar huella en el simulador/emulador y volver a la app).
3. **Panel "¿Qué acaba de pasar?"**: texto corto que explica qué API nativa se consultó (`LAContext.canEvaluatePolicy` en iOS, `BiometricManager.canAuthenticate` en Android) y qué respondió el sistema operativo. Este panel se reutilizará en specs posteriores como bitácora de eventos.
4. **Ficha del dispositivo**: plataforma, versión de OS y nivel de seguridad biométrica cuando sea determinable.

## Criterios de aceptación

1. En un iPhone/simulador con Face ID enrolado, la pantalla muestra "Face ID disponible".
2. En un emulador Android con huella configurada, muestra "Huella dactilar disponible".
3. Sin biometría enrolada, muestra el estado `NOT_ENROLLED` con guía para enrolar (y el botón de re-detección funciona tras enrolar).
4. En un dispositivo sin hardware, muestra `NO_HARDWARE` sin crashear.
5. `CheckBiometricCapability` tiene tests unitarios con un repositorio fake cubriendo los tres estados.
6. Ningún archivo fuera de `data/biometrics/datasources/` importa `react-native-biometrics`.

## Tareas

1. Instalar la librería biométrica elegida y configurar `Info.plist` / `AndroidManifest.xml`; `pod install`.
2. Implementar entidad, contrato y caso de uso en `domain/` con tests.
3. Implementar datasource y repositorio en `data/` con tests del mapeo.
4. Registrar el repositorio en `di/`.
5. Construir la pantalla Hardware Inspector con su hook `useBiometricCapability` en `presentation/features/biometrics/`.
6. Probar los cuatro estados en simulador iOS y emulador Android (Features → Face ID / fingerprint del emulador).

## Conceptos a comprender (dimensión educativa)

- **Dónde vive la biometría**: los datos biométricos nunca salen del dispositivo; el SO solo responde "sí/no/estado" a través de APIs (LocalAuthentication en iOS, BiometricPrompt en Android). La app jamás ve la huella o el rostro.
- **Clases de seguridad en Android**: biometría Class 3 (strong) vs Class 2 (weak) y por qué solo la strong puede desbloquear llaves del Keystore.
- **Disponible ≠ enrolado ≠ utilizable**: los tres estados que todo flujo biométrico debe distinguir.
