# Spec 05 — Integración con el sistema de autenticación

**Fase del reto:** Fase 3
**Depende de:** Spec 04
**Estado:** Pendiente

## Objetivo

Integrar la biometría con un sistema de autenticación de la app (simulado localmente): login tradicional con credenciales, **enrolamiento opt-in** de biometría, y a partir de ahí inicio de sesión biométrico real donde el éxito del sensor desbloquea material criptográfico respaldado por hardware — no un simple booleano.

## Contexto

En las specs anteriores "autenticarse" solo cambiaba de pantalla. En una app bancaria real la biometría no *reemplaza* al sistema de autenticación: lo *complementa*. El patrón estándar es: el usuario inicia sesión con credenciales una vez, decide habilitar biometría, y la app protege el material de sesión (token/llave) de forma que solo un match biométrico pueda liberarlo. Aquí está la lección de hardware más importante del proyecto: **Secure Enclave (iOS) y Keystore/TEE (Android)**.

## Alcance

**Incluye:**
- Sistema de autenticación simulado: `AuthRepository` con usuario/contraseña ficticios (validación local, sin backend) que emite un "token" de sesión ficticio.
- Flujo de **enrolamiento biométrico**: tras login con credenciales, ofrecer "¿Habilitar Face ID/huella para próximos ingresos?".
- Login biométrico basado en **firma con llaves de hardware**: `createKeys()` al enrolar, `createSignature()` al ingresar (la llave privada vive en Secure Enclave/Keystore y solo se usa tras match biométrico).
- Almacenamiento seguro de estado de sesión/preferencias con `react-native-keychain` (Keychain iOS / Keystore Android), con la **configuración obligatoria** definida más abajo (accesibilidad, access control biométrico, verificación de nivel de seguridad).
- Exigencia de biometría **strong (Class 3)** para toda operación criptográfica; sin fallback al credencial del dispositivo (decisión documentada abajo).
- Gestión de sesión: logout, expiración simulada, y **deshabilitar biometría** (borrar llaves).
- Manejo del caso "la biometría del dispositivo cambió" (invalidación de llaves al enrolar nuevas huellas/rostro).
- Panel educativo final: visualización de la llave pública generada y del flujo challenge → firma → verificación.

**No incluye:**
- Backend real (la "verificación de firma" se simula localmente documentando dónde ocurriría en producción).
- Refresh tokens, MFA adicional u otros mecanismos fuera del alcance del reto.

## Diseño técnico

### Dominio

```ts
// domain/auth/entities/auth.ts
interface Credentials { username: string; password: string; }
interface AuthSession { userId: string; token: string; issuedAt: number; method: 'PASSWORD' | 'BIOMETRIC'; }

// domain/auth/repositories/auth.repository.ts
interface AuthRepository {
  loginWithCredentials(c: Credentials): Promise<Result<AuthSession, AppError>>;
  logout(): Promise<Result<void, AppError>>;
}

// domain/auth/repositories/biometric-enrollment.repository.ts (interfaz del puente: vive en el feature consumidor)
interface BiometricEnrollmentRepository {
  enroll(userId: string): Promise<Result<PublicKey, AppError>>;   // createKeys + registro simulado
  isEnrolled(): Promise<Result<boolean, AppError>>;
  loginWithSignature(challenge: string): Promise<Result<AuthSession, AppError>>; // createSignature
  unenroll(): Promise<Result<void, AppError>>;                    // deleteKeys + limpieza
}
```

Casos de uso: `LoginWithCredentials`, `EnrollBiometrics`, `LoginWithBiometrics`, `DisableBiometrics`, `Logout`, `GetSessionState` — todos en `domain/auth/usecases/`. `AuthSession` nace en `domain/auth/entities/`, no en `domain/shared/`: sube a shared solo cuando un segundo feature la necesite (regla anti-preventiva de la spec 01).

### Composición entre features (auth ↔ biometrics)

`EnrollBiometrics` y `LoginWithBiometrics` mezclan ambos features por definición; siguen el patrón de la spec 01 (interfaces en el dominio del consumidor + wiring en DI):

- La interfaz `BiometricEnrollmentRepository` vive en `domain/auth/repositories/` — `auth` es el consumidor.
- Su implementación (`data/auth/repositories/biometric-enrollment.repository.impl.ts`) depende **solo de contratos de dominio** (`domain/auth` y `domain/biometrics`, permitido: capa data → capa domain); nunca importa de `data/biometrics/` — el import cruzado entre features de la misma capa está prohibido.
- `di/` inyecta las implementaciones concretas del feature `biometrics`; es la única zona que conoce ambos features en concreto.

### Flujo de enrolamiento y login biométrico

```
Enrolamiento (una vez):
  login con credenciales ✓
    → createKeys()                  # par de llaves en Secure Enclave / Keystore
    → llave pública → "backend" simulado la asocia al usuario
    → flag biometricEnabled en Keychain

Login biométrico (cada ingreso):
  "backend" emite challenge (nonce simulado)
    → createSignature(challenge)    # el SO muestra el prompt; el match biométrico
                                    # autoriza a la llave privada a firmar
    → "backend" verifica la firma con la llave pública → emite AuthSession
```

La verificación de firma se implementa en un `FakeAuthBackend` local, con comentarios que marcan explícitamente qué parte correría en un servidor real.

**Propiedades obligatorias del challenge (anti-replay)** — aunque el backend sea simulado, estas propiedades son parte del aprendizaje y se implementan igual:

- **Único por intento**: nonce aleatorio generado por el "backend", nunca por el cliente.
- **De un solo uso**: el backend lo marca como consumido al verificar la firma; una segunda firma del mismo challenge se rechaza.
- **Con expiración corta** (~60 s): un challenge emitido y no usado caduca.
- **Verificación y rate limiting del lado del servidor**: el cliente jamás decide si la firma es válida; el `FakeAuthBackend` también limita intentos de verificación fallidos por usuario.

### Configuración de almacenamiento seguro (obligatoria)

Estos parámetros son la diferencia entre usar el hardware de seguridad y solo aparentarlo; ninguno es opcional:

| Aspecto | Configuración | Por qué |
|---|---|---|
| Accesibilidad Keychain (iOS) | `ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY` (o `WHEN_UNLOCKED_THIS_DEVICE_ONLY`) | El item no migra a backups de iCloud/iTunes ni a otros dispositivos; exige passcode configurado. |
| Access control del secreto | `ACCESS_CONTROL.BIOMETRY_CURRENT_SET` sobre el item que guarda la sesión | El Keychain/Keystore exige el match biométrico para **liberar** el item; la app no decide con un flag. Se invalida al cambiar la biometría enrolada. |
| Llaves Android | `setUserAuthenticationRequired(true)` + solo `BIOMETRIC_STRONG` (Class 3) | Una biometría Class 2 (weak) no puede autorizar llaves del Keystore; la app debe rechazarla explícitamente. |
| StrongBox (Android) | Preferir `setIsStrongBoxBacked(true)` con fallback a TEE si el dispositivo no lo soporta | Usa el chip de seguridad dedicado cuando existe. |
| Verificación de nivel | Consultar `getSecurityLevel()` de `react-native-keychain` y exponerlo en el Hardware Inspector | Hay dispositivos Android donde el Keystore es solo software; el usuario debe poder verlo. |
| Fallback a credencial del dispositivo | **Deshabilitado** (`allowDeviceCredentials: false`) | Decisión de banca: el PIN del dispositivo no autoriza operaciones bancarias; la alternativa es el login con credenciales propias de la app. |
| Contraseña del usuario | **Nunca se almacena** — ni cifrada — para "reproducir" el login tras el match | Anti-patrón común en RN. Solo se persisten tokens de sesión y llaves; la biometría libera material de sesión, no credenciales. |

### Datos

- `data/biometrics/datasources/biometric-keys.datasource.ts`: envuelve `createKeys`, `biometricKeysExist`, `createSignature`, `deleteKeys`; su contrato (`BiometricKeysRepository`) se agrega en `domain/biometrics/repositories/`.
- `data/auth/datasources/secure-storage.datasource.ts`: envuelve `react-native-keychain` para flag de enrolamiento y sesión. Nace en `auth` (único consumidor); solo sube a `data/shared/` cuando un segundo feature lo use.
- `data/auth/datasources/fake-auth-backend.ts`: usuarios ficticios, emisión de challenge, verificación de firma, emisión de token.

### Presentación

- LoginScreen final (`presentation/features/auth/screens/`): formulario usuario/contraseña + botón biométrico (visible solo si `isEnrolled`). Reusa todo el manejo de errores de la spec 04.
- Settings como sección dentro de Home (feature `auth`): activar/desactivar biometría, ver estado de sesión, ver llave pública. No se crea un feature `settings` preventivamente.
- Modal post-login de invitación al enrolamiento (`presentation/features/auth/components/`; solo la primera vez, recordar rechazo).
- Panel educativo "Flujo de firma" en el Hardware Inspector (feature `biometrics`): challenge, firma (truncada) y resultado de verificación del último login biométrico.

### Caso borde clave: invalidación de llaves

Si el usuario enrola una nueva huella/rostro en el SO, Android invalida las llaves creadas con `invalidatedByBiometricEnrollment` (y en iOS aplica un comportamiento análogo vía `biometryCurrentSet` según lo soporte la librería). La app debe detectar la falla de firma por llave invalidada, limpiar el enrolamiento y pedir re-login con credenciales. Esto es una **validación de seguridad**, no un bug: se documenta y se muestra en el panel educativo.

## Criterios de aceptación

1. Login con credenciales ficticias válidas entra a Home; inválidas muestran error (reusa `Result`).
2. Tras el primer login se ofrece habilitar biometría; al aceptar, se generan llaves y el siguiente ingreso puede hacerse solo con biometría.
3. El login biométrico ejecuta el flujo challenge → firma → verificación y la sesión resultante indica `method: 'BIOMETRIC'`.
4. Deshabilitar biometría borra las llaves y el botón biométrico desaparece del Login.
5. Logout limpia la sesión pero conserva el enrolamiento biométrico.
6. Cambiar la biometría enrolada en el SO invalida el login biométrico y la app se recupera pidiendo credenciales (verificación manual documentada).
7. Todos los casos de uso nuevos tienen tests unitarios con fakes; el `FakeAuthBackend` tiene tests de verificación de firma **incluyendo replay (challenge reusado → rechazado), expiración y rate limiting**.
8. `react-native-keychain` solo se importa en `data/auth/datasources/`; las APIs de llaves biométricas solo en `data/biometrics/datasources/`; no existe ningún import cruzado entre features de la misma capa (lint de boundaries en verde).
9. Los items del Keychain se crean con la accesibilidad y el access control definidos en la tabla de configuración obligatoria (verificable en el código del datasource y sus tests).
10. En un dispositivo con solo biometría weak (Class 2), el enrolamiento biométrico se rechaza con mensaje explicativo.
11. El Hardware Inspector muestra el `securityLevel` del almacenamiento (SECURE_HARDWARE / SECURE_SOFTWARE) del dispositivo actual.

## Tareas

1. Instalar y configurar `react-native-keychain`.
2. Implementar `FakeAuthBackend` (usuarios, challenge único/expirable/de un solo uso, verificación, rate limiting) + tests.
3. Implementar los datasources (`data/biometrics/` para llaves, `data/auth/` para storage seguro y fake backend) + repositorios, aplicando la tabla de configuración obligatoria (accesibilidad, access control, strong-only, StrongBox, `getSecurityLevel`).
4. Implementar los casos de uso de sesión y enrolamiento + tests.
5. Rediseñar LoginScreen (formulario + biometría condicional) y modal de enrolamiento.
6. Implementar Settings con toggle de biometría y visualización de llave pública.
7. Añadir el panel "Flujo de firma" al Hardware Inspector.
8. Verificación manual end-to-end en iOS y Android, incluyendo el caso de invalidación de llaves.

## Conceptos a comprender (dimensión educativa)

- **Secure Enclave / TEE + Keystore**: procesadores/entornos aislados donde la llave privada nace y muere sin poder ser exportada; el match biométrico solo *autoriza operaciones* con ella.
- **Por qué firma > booleano**: un `if (authenticated)` en JavaScript es manipulable; una firma verificada por el backend prueba criptográficamente que hubo un match biométrico en *ese* dispositivo. Es la diferencia entre biometría decorativa y biometría segura.
- **Biometría como conveniencia, no como identidad**: el sistema de autenticación sigue siendo credenciales + sesión; la biometría es un mecanismo local de desbloqueo. Qué decide el equipo: duración de sesión, cuándo re-pedir credenciales, qué pasa al cambiar de dispositivo.
- **Invalidación por cambio biométrico**: por qué el hardware invalida llaves cuando se enrola una nueva huella y qué protege eso (que un tercero con el PIN del dispositivo agregue su huella y acceda al banco).
