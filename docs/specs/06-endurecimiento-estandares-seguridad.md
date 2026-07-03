# Spec 06 — Endurecimiento y estándares de seguridad

**Fase del reto:** Transversal / cierre (eleva lo construido en Fases 1–3 al estándar de una app bancaria real)
**Depende de:** Spec 05
**Estado:** Pendiente

## Objetivo

Endurecer la aplicación aplicando las prácticas que los estándares de seguridad móvil exigen alrededor de la biometría — ciclo de vida de sesión, re-autenticación para operaciones sensibles, protección de pantalla y política de logging — y cerrar el proyecto con una **auditoría contra OWASP MASVS** que verifique todo lo construido. La lección final: la biometría segura no es solo el prompt; es todo lo que la rodea.

## Contexto

Las specs 02–05 dejan una autenticación biométrica criptográficamente correcta, pero una app bancaria se evalúa contra marcos concretos:

- **OWASP MASVS/MASTG**: el estándar de facto para verificación de seguridad móvil. Los grupos `MASVS-AUTH` (autenticación) y `MASVS-STORAGE` (almacenamiento) mapean directamente a este proyecto; `MASVS-PLATFORM` cubre la protección de UI.
- **NIST SP 800-63B**: define la biometría como factor válido solo cuando está ligada a la posesión demostrada del dispositivo — exactamente lo que prueba la firma de la spec 05. También exige límites de intentos y manejo de sesión.
- **FIDO2/WebAuthn**: el patrón challenge → firma → verificación que imitamos; sirve como referencia de diseño, no como certificación.

Esta spec convierte esos marcos en requisitos verificables sobre nuestra app.

## Alcance

**Incluye:**
- **Ciclo de vida de sesión**: expiración absoluta, y re-autenticación al volver de background tras un periodo de gracia.
- **Step-up authentication**: una transferencia bancaria simulada que exige un nuevo match biométrico aunque la sesión esté activa, usando una llave *auth-per-use*.
- **Privacy screen**: ocultar el contenido en el app switcher (`FLAG_SECURE` en Android, overlay al pasar a inactivo en iOS).
- **Política de logging**: logger central con sanitización; la bitácora educativa del Hardware Inspector queda restringida a builds de desarrollo y marcada como anti-patrón de producción.
- **Decisión documentada sobre root/jailbreak** (ADR).
- **Checklist MASVS** de cierre en `docs/security/masvs-checklist.md`.

**No incluye:**
- Certificate pinning y seguridad de red (no hay backend real; se documenta como pendiente para producción en el checklist).
- Ofuscación de código / RASP (fuera del alcance educativo; se registra en el ADR).
- Detección activa de root/jailbreak como código (ver ADR abajo — se documenta la decisión, no se implementa salvo que el ADR concluya lo contrario al momento de implementar).

## Diseño técnico

### Ciclo de vida de sesión (dominio)

```ts
// domain/auth/entities/session-policy.ts
interface SessionPolicy {
  maxAgeMinutes: number;              // expiración absoluta de la sesión (ej. 15)
  backgroundGraceSeconds: number;     // margen al volver de background (ej. 60)
}

// domain/auth/usecases/validate-session.ts
// → 'VALID' | 'EXPIRED' | 'REQUIRES_REAUTH'
```

- `presentation/features/auth/hooks/useSessionGuard` (montado desde `presentation/navigation/`): escucha `AppState`; registra el timestamp al pasar a background y ejecuta `ValidateSession` al volver. `REQUIRES_REAUTH` dispara el prompt biométrico (si está enrolado) o navega a Login.
- La política vive en el dominio y se testea sin UI: expiración absoluta, dentro del periodo de gracia, fuera del periodo de gracia.

### Step-up authentication (transferencia simulada)

**`transfers` se crea como feature nuevo siguiendo el playbook de la spec 01** («Cómo agregar un módulo nuevo»): `domain/transfers/{entities,repositories,usecases}`, `data/transfers/`, `presentation/features/transfers/`, wiring en `di/` y ruta en `navigation/` — sin modificar archivos existentes de `biometrics` ni `auth`. Esta spec es la validación práctica de la promesa de escalabilidad del scaffolding. `AuthorizeSensitiveOperation` vive en `domain/transfers/usecases/`; el contrato de firma que necesita se define en `domain/transfers/repositories/` (feature consumidor, mismo patrón del puente de la spec 05) y `di/` lo conecta con la implementación respaldada por los contratos de `biometrics`.

```
TransferScreen (monto + destinatario ficticios)
  → AuthorizeSensitiveOperation(operation)
      → backend emite challenge ligado a la operación (monto+destino en el payload firmado)
      → createSignature() con prompt "Confirma la transferencia de $X"
      → backend verifica firma y ejecuta la operación simulada
```

- **Llave auth-per-use**: cada firma exige su propio match biométrico (en Android, `setUserAuthenticationParameters(0, AUTH_BIOMETRIC_STRONG)`); una sesión activa NO basta para transferir.
- Firmar el payload de la operación (no un nonce genérico) enseña **autorización de transacción** vs. autenticación: la firma prueba *qué* se aprobó, no solo *quién*.
- Cancelar el prompt aborta la operación sin efectos; reusa la taxonomía de errores de la spec 04.

### Privacy screen

- **Android**: `FLAG_SECURE` en la ventana (bloquea screenshots y la vista en recientes). Decisión documentada: se aplica globalmente por simplicidad de app bancaria.
- **iOS**: componente `PrivacyShield` (`presentation/shared/components/`) que cubre la UI con un overlay (logo del banco) cuando `AppState` pasa a `inactive`/`background`.
- Implementación en `presentation/` + configuración nativa mínima; sin lógica de negocio.

### Política de logging

- `core/logging/logger.ts`: logger central con niveles y lista de campos prohibidos (tokens, firmas completas, challenges, datos de usuario). Es el único punto de logging permitido — se elimina todo `console.*` directo.
- La **bitácora del Hardware Inspector** (specs 02–05) pasa a estar detrás de `__DEV__`: en release no se registra ningún evento de autenticación. La pantalla lo explica: "esta bitácora existe para aprender; en producción registrar resultados biométricos es un hallazgo de seguridad".
- Test/verificación: en build de release, ningún log contiene material de autenticación.

### ADR — Root/jailbreak detection

Se escribe `docs/security/adr-001-root-detection.md` evaluando: qué amenaza mitiga (Keystore/Keychain comprometidos, hooking), qué tan evadible es, costo de falsos positivos, y qué haría una banca real (librería tipo `jail-monkey` + señales del lado del servidor + attestation — Play Integrity / App Attest). La conclusión esperada para este proyecto educativo es **documentar sin implementar**, dejando Play Integrity/App Attest señalados como el mecanismo correcto en producción; si al implementar se decide lo contrario, el ADR se actualiza.

### Checklist MASVS

`docs/security/masvs-checklist.md` con los controles relevantes de `MASVS-AUTH`, `MASVS-STORAGE` y `MASVS-PLATFORM`, cada uno con estado (`Cumple` / `No aplica` / `Pendiente producción`), evidencia (link a spec/código/test) y notas. Los controles de red quedan `Pendiente producción` con su justificación.

## Criterios de aceptación

1. Con sesión activa, enviar la app a background más allá del periodo de gracia y volver exige re-autenticación; dentro del periodo de gracia no la exige. La expiración absoluta cierra la sesión aunque la app esté en foreground.
2. La transferencia simulada exige match biométrico propio (con sesión activa y recién autenticada); cancelar el prompt aborta sin efectos y el payload firmado incluye monto y destinatario.
3. En el app switcher de iOS y en recientes de Android no se ve el saldo ni datos de la cuenta; en Android el screenshot está bloqueado.
4. En build de release no se emite ningún log con tokens, challenges, firmas o resultados biométricos (verificación manual documentada + test del sanitizador del logger).
5. `ValidateSession` y `AuthorizeSensitiveOperation` tienen tests unitarios de todas sus ramas (expiración, gracia, reauth, cancelación, firma inválida).
6. Existen `docs/security/masvs-checklist.md` (sin controles en blanco) y `docs/security/adr-001-root-detection.md`.
7. `npm test` y `npm run lint` pasan; no queda ningún `console.*` fuera del logger central.
8. El feature `transfers` se agregó sin modificar archivos existentes de los namespaces `biometrics` y `auth` en `domain/` y `data/` (verificable en el diff del PR), validando el playbook de la spec 01.

## Tareas

1. Implementar `SessionPolicy`, `ValidateSession` y `useSessionGuard` + tests.
2. Crear el feature `transfers` completo (domain, data, presentation, DI, ruta) siguiendo el playbook de la spec 01; implementar `AuthorizeSensitiveOperation`, la llave auth-per-use y `TransferScreen` + tests.
3. Aplicar `FLAG_SECURE` (Android) y `PrivacyShield` (iOS); verificar en ambas plataformas.
4. Implementar el logger central con sanitización, migrar los `console.*` existentes y condicionar la bitácora a `__DEV__`.
5. Redactar el ADR de root/jailbreak.
6. Completar el checklist MASVS auditando specs 01–06 con evidencia.
7. Verificación manual end-to-end de los criterios 1–4 en iOS y Android, documentada.

## Conceptos a comprender (dimensión educativa)

- **Autenticación vs. autorización de transacción**: por qué firmar el payload de la operación (monto, destino) protege contra manipulación incluso con sesión válida, y cómo el hardware exige un match biométrico *por firma* con llaves auth-per-use.
- **La sesión es parte de la superficie de ataque**: una biometría perfecta con sesiones eternas es inseguridad con extra pasos; qué balancea el periodo de gracia (seguridad vs. fricción al cambiar de app).
- **Qué piden los estándares y por qué**: leer MASVS-AUTH con una app propia delante convierte controles abstractos en decisiones que ya tomaste — o que te faltaron.
- **Los límites del cliente**: root detection, ofuscación y attestation muestran que el dispositivo nunca es totalmente confiable; por eso la verdad (verificación de firma, rate limiting, sesión) siempre vive en el servidor.
