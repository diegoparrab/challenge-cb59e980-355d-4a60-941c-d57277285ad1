# Spec 03 — Autenticación biométrica básica

**Fase del reto:** Fase 1 (segunda mitad: "el usuario puede iniciar sesión con Face ID o huella")
**Depende de:** Spec 02
**Estado:** Pendiente

## Objetivo

Permitir que el usuario dispare el prompt biométrico del sistema y obtenga un resultado de autenticación exitoso o fallido, desde una pantalla de **Login** de la app bancaria simulada. El "happy path" completo: detectar → solicitar → autenticar → entrar.

## Contexto

Con la detección de la spec 02 resuelta, este paso invoca la UI nativa de autenticación (`BiometricPrompt` en Android, `LAContext.evaluatePolicy` en iOS). El sistema operativo dibuja el prompt — la app no controla esa UI ni accede al sensor — y responde con éxito o error. En esta spec el manejo de errores es mínimo (éxito/fallo genérico); la taxonomía completa llega en la spec 04.

## Alcance

**Incluye:**
- Caso de uso `AuthenticateWithBiometrics` (envuelve el prompt del sistema).
- Pantalla de **Login** con botón biométrico (habilitado solo si hay capacidad disponible) y pantalla **Home** simulada ("saldo" de la cuenta ficticia) a la que se entra tras autenticar.
- Navegación mínima entre Login, Home y Hardware Inspector (`@react-navigation/native` + native-stack).
- Extensión del panel "¿Qué acaba de pasar?" mostrando el resultado crudo del prompt.

**No incluye:**
- Distinción fina de errores/cancelaciones ni reintentos (spec 04).
- Sesiones, tokens o llaves criptográficas (spec 05). Aquí el "login" solo cambia de pantalla.

## Diseño técnico

### Dominio

```ts
// domain/biometrics/repositories/biometric.repository.ts (extender)
interface BiometricRepository {
  checkCapability(): Promise<Result<BiometricCapability, AppError>>;
  authenticate(prompt: PromptConfig): Promise<Result<BiometricAuthResult, AppError>>;
}

// domain/biometrics/entities/biometric-auth.ts
interface PromptConfig {
  title: string;          // "Ingresa a tu banca móvil"
  cancelLabel: string;
}

interface BiometricAuthResult {
  success: boolean;
}
```

- `AuthenticateWithBiometrics` primero verifica capacidad (reutiliza `CheckBiometricCapability`) y solo entonces solicita el prompt: regla de negocio en el dominio, no en la UI.

### Presentación

- `presentation/features/auth/screens/LoginScreen`: logo del "banco", botón principal "Ingresar con \{Face ID|huella\}" (el texto se adapta al sensor detectado, dato que ya provee la spec 02) y acceso secundario al Hardware Inspector.
- `presentation/features/auth/hooks/useBiometricLogin`: orquesta el caso de uso y expone `{ status: 'idle' | 'authenticating' | 'success' | 'failed', login() }`.
- `presentation/features/auth/screens/HomeScreen`: pantalla post-login con datos bancarios ficticios y botón "Cerrar sesión" que regresa al Login. Home vive en `auth` mientras no amerite feature propio (regla anti-preventiva de la spec 01).
- Navegación: stack `Login → Home` en `presentation/navigation/`, con Hardware Inspector (feature `biometrics`) accesible desde ambas.

**Ownership y boundaries:** el flujo de login pertenece al feature `auth`; el Hardware Inspector al feature `biometrics`. `presentation/features/auth/` puede importar casos de uso de `domain/biometrics/` — son capas distintas, permitido por las reglas de la spec 01. Lo prohibido es el import entre features de la misma capa (`features/auth` → `features/biometrics`).

### Nota Android

`react-native-biometrics` usa `BiometricPrompt` de androidx; la Activity debe extender `FragmentActivity` (verificar `MainActivity` — con RN 0.86 y `ReactActivity` ya se cumple, pero se valida al implementar).

## Criterios de aceptación

1. Con Face ID/huella enrolada, pulsar "Ingresar" muestra el prompt **nativo** del sistema y, al autenticar, navega a Home.
2. Si el usuario cancela el prompt, permanece en Login con un mensaje neutro (sin crash).
3. El botón biométrico aparece deshabilitado (con explicación) cuando la capacidad es `NO_HARDWARE` o `NOT_ENROLLED`.
4. El texto del botón refleja el sensor real ("Ingresar con Face ID" vs "Ingresar con huella").
5. Tests unitarios de `AuthenticateWithBiometrics`: éxito, fallo y bloqueo por falta de capacidad (con fakes, sin dispositivo).
6. Flujo completo verificado en simulador iOS (Features → Face ID → Matching / Non-matching Face) y emulador Android (huella del emulador).

## Tareas

1. Instalar y configurar `@react-navigation/native`, `react-native-screens` y dependencias; montar el stack.
2. Extender contrato, datasource y repositorio con `authenticate()`.
3. Implementar `AuthenticateWithBiometrics` + tests.
4. Construir LoginScreen, HomeScreen y el hook `useBiometricLogin`.
5. Integrar el panel de eventos con el resultado del prompt.
6. Verificación manual en ambas plataformas (matching y non-matching).

## Conceptos a comprender (dimensión educativa)

- **La UI biométrica pertenece al SO**: la app solicita, el sistema pregunta al hardware y responde. Ni la huella ni el rostro pasan por JavaScript en ningún momento.
- **Simuladores**: cómo iOS Simulator y Android Emulator simulan biometría (enrolamiento y match/no-match) y qué diferencias hay frente a un dispositivo físico.
- **Decisión de producto**: cuándo disparar el prompt automáticamente al abrir la app vs. esperar el tap del usuario (esta spec elige el tap explícito, y la spec documenta por qué: control del usuario y evitar prompts sorpresivos).
