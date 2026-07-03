# Spec 04 — Manejo de errores y validaciones

**Fase del reto:** Fase 2
**Depende de:** Spec 03
**Estado:** Pendiente

## Objetivo

Reemplazar el manejo genérico de éxito/fallo por una **taxonomía completa de errores biométricos**, con validaciones, reintentos y mensajes adecuados por caso. La pantalla interactiva debe permitir *provocar* cada error para observar cómo responde el hardware y el SO.

## Contexto

La autenticación biométrica falla de muchas maneras distintas y cada una exige una respuesta diferente: no es lo mismo que el usuario cancele, que el sensor no reconozca la huella, o que el SO bloquee la biometría por demasiados intentos. Tratar todo como "falló" produce apps frustrantes e inseguras. Esta es la fase donde el reto evalúa explícitamente `erroresComunes`.

## Alcance

**Incluye:**
- Jerarquía de errores biométricos en `domain/biometrics/entities/` (en `core/errors` solo vive la base `AppError`; los errores biométricos son conocimiento del feature, no transversales).
- Mapeo de códigos nativos (iOS `LAError`, Android `BiometricPrompt` error codes) a errores de dominio en el datasource.
- Política de reintentos y manejo de lockout en el caso de uso.
- UI de errores en Login: mensajes por categoría + acciones de recuperación.
- **Modo laboratorio** en el Hardware Inspector: instrucciones para provocar cada error en simulador/emulador y bitácora de errores observados.

**No incluye:**
- Fallback a credenciales (PIN/contraseña de la app): llega con el sistema de autenticación en la spec 05. Aquí el fallback documentado es el del propio SO (passcode del dispositivo), como decisión configurable.

## Diseño técnico

### Taxonomía de errores (dominio)

```ts
// domain/biometrics/entities/biometric-error.ts
type BiometricErrorCode =
  | 'NO_HARDWARE'          // el dispositivo no tiene sensor
  | 'NOT_ENROLLED'         // hay sensor pero nada enrolado
  | 'USER_CANCELLED'       // el usuario cerró el prompt
  | 'SYSTEM_CANCELLED'     // el SO canceló (app al background, llamada entrante)
  | 'AUTH_FAILED'          // el sensor no reconoció (intento fallido puntual)
  | 'LOCKOUT'              // demasiados intentos: bloqueado temporalmente
  | 'LOCKOUT_PERMANENT'    // bloqueado hasta desbloquear con credencial del dispositivo
  | 'NOT_AVAILABLE'        // sensor ocupado u otro estado transitorio
  | 'UNKNOWN';
```

Cada código lleva metadatos: `recoverable: boolean`, `suggestedAction: 'RETRY' | 'ENROLL' | 'USE_DEVICE_CREDENTIAL' | 'WAIT' | 'NONE'` y mensaje para el usuario (es-ES).

### Mapeo nativo → dominio (datasource)

Tabla explícita y testeada:

| Origen nativo | Código de dominio |
|---|---|
| iOS `LAError.userCancel` / Android `ERROR_USER_CANCELED`, `ERROR_NEGATIVE_BUTTON` | `USER_CANCELLED` |
| iOS `LAError.systemCancel`, `appCancel` / Android `ERROR_CANCELED` | `SYSTEM_CANCELLED` |
| iOS `LAError.biometryLockout` / Android `ERROR_LOCKOUT` | `LOCKOUT` |
| Android `ERROR_LOCKOUT_PERMANENT` | `LOCKOUT_PERMANENT` |
| iOS `LAError.biometryNotEnrolled` / Android `ERROR_NO_BIOMETRICS` | `NOT_ENROLLED` |
| iOS `LAError.biometryNotAvailable` / Android `ERROR_HW_NOT_PRESENT`, `ERROR_HW_UNAVAILABLE` | `NO_HARDWARE` / `NOT_AVAILABLE` |
| Cualquier código no mapeado | `UNKNOWN` (nunca crashear) |

Nota: `react-native-biometrics` entrega parte de esto como strings en `error`; el datasource debe parsear defensivamente y los tests deben cubrir strings inesperados.

### Validaciones y política de reintentos (caso de uso)

- Pre-validación: verificar capacidad antes de cada prompt (el estado pudo cambiar desde el último check — p. ej. el usuario borró su huella).
- `USER_CANCELLED`: no reintentar automáticamente; volver a estado idle.
- `AUTH_FAILED`: el SO ya gestiona reintentos dentro del prompt; la app cuenta prompts fallidos y tras N=3 sugiere alternativa.
- `LOCKOUT`: deshabilitar el botón biométrico y comunicar el bloqueo; explicar que se resuelve con el credencial del dispositivo.
- `SYSTEM_CANCELLED`: reintento silencioso permitido una sola vez cuando la app vuelve a foreground.

### Presentación

- Login: componente `BiometricErrorBanner` que muestra mensaje + acción según `suggestedAction`. Vive en `presentation/shared/components/`: lo consumen dos features (Login en `auth` y el modo laboratorio en `biometrics`), lo que cumple la regla de `shared/` de la spec 01 — dejarlo en `features/biometrics/` obligaría a un import cruzado entre features que boundaries prohíbe.
- Hardware Inspector — **modo laboratorio**: lista de escenarios ("Cancela el prompt", "Usa un rostro no registrado", "Falla 5 veces seguidas…") con la explicación de qué error produce cada uno; la bitácora registra código nativo recibido, código de dominio y timestamp.

## Criterios de aceptación

1. Cancelar el prompt muestra un mensaje neutro y no un error alarmante.
2. Fallar el match (Non-matching Face / huella incorrecta) N veces produce la sugerencia de alternativa; el lockout del SO se refleja como `LOCKOUT` con el botón deshabilitado.
3. Enviar la app a background durante el prompt produce `SYSTEM_CANCELLED` sin crash.
4. Un string de error desconocido del datasource se mapea a `UNKNOWN` y la UI sigue operable.
5. La tabla de mapeo tiene test unitario por cada fila (ambas plataformas).
6. La bitácora del laboratorio registra correctamente al menos 4 escenarios provocados manualmente.

## Tareas

1. Implementar `BiometricError` con metadatos y mensajes; tests.
2. Implementar el mapeo nativo → dominio en el datasource; tests exhaustivos del parser.
3. Añadir la política de reintentos/lockout a `AuthenticateWithBiometrics`; tests de cada rama.
4. Construir `BiometricErrorBanner` en `presentation/shared/components/` e integrarlo en Login.
5. Construir el modo laboratorio y la bitácora en el Hardware Inspector.
6. Sesión de verificación manual provocando cada escenario en iOS y Android; documentar resultados observados en la bitácora.

## Conceptos a comprender (dimensión educativa)

- **El lockout lo impone el hardware/SO, no la app**: tras ~5 fallos Android bloquea 30 s (`ERROR_LOCKOUT`) y luego permanentemente hasta usar PIN/patrón; iOS bloquea Face/Touch ID hasta ingresar el passcode. La app solo puede detectarlo y comunicar.
- **Cancelación ≠ fallo**: distinguir intención del usuario (cancelar), interferencia del sistema (llamada entrante) y fallo real del sensor cambia por completo el mensaje correcto.
- **Degradación elegante**: por qué una app bancaria nunca debe dejar al usuario sin camino de acceso cuando la biometría falla.
