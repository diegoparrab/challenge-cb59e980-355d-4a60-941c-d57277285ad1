# Flujos de autenticación biométrica — Escenarios

Este documento evidencia gráficamente **todos los escenarios que la aplicación debe contemplar**, agrupados por tipo: satisfactorios, de error, de espera y de revocación. Cada diagrama referencia la spec donde se implementa. Los diagramas usan [Mermaid](https://mermaid.js.org/) y se renderizan directamente en GitHub y VS Code.

## Índice de escenarios

| # | Escenario | Tipo | Spec |
|---|-----------|------|------|
| 0 | [Mapa general de estados de la sesión](#0-mapa-general-de-estados-de-la-sesión) | Visión global | 03–06 |
| 1 | [Detección de capacidades del hardware](#1-detección-de-capacidades-del-hardware) | Satisfactorio / error | 02 |
| 2 | [Primer login y enrolamiento biométrico](#2-primer-login-y-enrolamiento-biométrico-opt-in) | Satisfactorio | 05 |
| 3 | [Login biométrico exitoso (challenge → firma → verificación)](#3-login-biométrico-exitoso) | Satisfactorio | 05 |
| 4 | [Errores durante el prompt biométrico](#4-errores-durante-el-prompt-biométrico) | Error | 04 |
| 5 | [Lockout temporal y permanente](#5-lockout-temporal-y-permanente) | Error / espera | 04 |
| 6 | [Invalidación de llaves por cambio de biometría](#6-invalidación-de-llaves-por-cambio-de-biometría-en-el-so) | Error / seguridad | 05 |
| 7 | [Espera: background, periodo de gracia y re-autenticación](#7-espera-background-periodo-de-gracia-y-re-autenticación) | Espera | 06 |
| 8 | [Revocación: logout, expiración y deshabilitar biometría](#8-revocación-logout-expiración-de-token-y-deshabilitar-biometría) | Revocación | 05–06 |
| 9 | [Step-up: autorización de transferencia](#9-step-up-autorización-de-una-transferencia) | Satisfactorio / error | 06 |
| 10 | [Anti-replay: challenge expirado, reusado y rate limiting](#10-anti-replay-challenge-expirado-reusado-y-rate-limiting) | Error / seguridad | 05 |

---

## 0. Mapa general de estados de la sesión

Visión de conjunto: todos los escenarios siguientes son transiciones dentro de esta máquina de estados.

```mermaid
stateDiagram-v2
    [*] --> SinSesion
    SinSesion --> Autenticando: login con credenciales o biometría
    Autenticando --> SesionActiva: autenticación exitosa
    Autenticando --> SinSesion: error, cancelación o lockout
    SesionActiva --> EnBackground: app pasa a background
    EnBackground --> SesionActiva: regresa dentro del periodo de gracia
    EnBackground --> RequiereReauth: regresa fuera del periodo de gracia
    RequiereReauth --> Autenticando: prompt de re-autenticación
    RequiereReauth --> SinSesion: re-autenticación falla o se cancela
    SesionActiva --> SinSesion: logout manual
    SesionActiva --> SinSesion: expiración absoluta del token
    SesionActiva --> StepUp: operación sensible (transferencia)
    StepUp --> SesionActiva: firma verificada u operación cancelada
```

---

## 1. Detección de capacidades del hardware

**Spec 02.** Primer contacto con el hardware: la app nunca asume que hay biometría; consulta y reacciona a los tres estados posibles, distinguiendo además la clase de seguridad en Android.

```mermaid
flowchart TD
    A["App consulta capacidades<br/>(LAContext / BiometricManager)"] --> B{"¿Existe sensor<br/>biométrico?"}
    B -->|No| C["NO_HARDWARE<br/>Ocultar opciones biométricas.<br/>Solo login con credenciales"]
    B -->|Sí| D{"¿Hay biometría<br/>enrolada en el SO?"}
    D -->|No| E["NOT_ENROLLED<br/>Mostrar guía para enrolar<br/>en ajustes del sistema"]
    E --> F["Botón 'Volver a detectar'"]
    F --> A
    D -->|Sí| G{"¿Clase de seguridad?<br/>(Android)"}
    G -->|"Class 2 (weak)"| H["DISPONIBLE_LIMITADA<br/>No puede autorizar llaves del Keystore.<br/>Se rechaza para flujos bancarios<br/>con mensaje explicativo"]
    G -->|"Class 3 (strong) /<br/>Face ID / Touch ID"| I["AVAILABLE<br/>Habilitar flujos biométricos.<br/>Mostrar tipo de sensor en UI"]

    style C fill:#8B0000,color:#fff
    style E fill:#B8860B,color:#fff
    style H fill:#B8860B,color:#fff
    style I fill:#1B5E20,color:#fff
```

---

## 2. Primer login y enrolamiento biométrico (opt-in)

**Spec 05.** La biometría nunca se activa sola: el usuario entra primero con credenciales y decide habilitarla. Aquí nacen las llaves en el hardware seguro.

```mermaid
flowchart TD
    A["Usuario ingresa<br/>usuario + contraseña"] --> B{"¿Credenciales<br/>válidas?"}
    B -->|No| C["Error de credenciales.<br/>Permanece en Login"] --> A
    B -->|Sí| D["Backend emite AuthSession<br/>(method: PASSWORD)"]
    D --> E{"¿Capacidad biométrica<br/>strong disponible?"}
    E -->|No| F["Entra a Home<br/>sin oferta biométrica"]
    E -->|Sí| G{"¿Ya enrolado o<br/>rechazó antes?"}
    G -->|Sí| F
    G -->|No| H["Modal: '¿Habilitar Face ID / huella<br/>para próximos ingresos?'"]
    H -->|Rechaza| I["Guardar rechazo<br/>(no volver a preguntar)"] --> F
    H -->|Acepta| J["createKeys()<br/>Par de llaves nace en<br/>Secure Enclave / Keystore"]
    J --> K["Llave pública → backend<br/>la asocia al usuario"]
    K --> L["Flag de enrolamiento en Keychain<br/>(WHEN_PASSCODE_SET_THIS_DEVICE_ONLY)"]
    L --> M["Home. Próximo login<br/>puede ser biométrico"]

    style C fill:#8B0000,color:#fff
    style M fill:#1B5E20,color:#fff
    style F fill:#1B5E20,color:#fff
```

---

## 3. Login biométrico exitoso

**Spec 05.** El happy path completo. La clave del diseño: el éxito no es un booleano — es una **firma** que solo puede producirse si el hardware confirmó el match.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant App as App (JS)
    participant SO as SO + Hardware<br/>(Secure Enclave / Keystore)
    participant BE as Backend (simulado)

    U->>App: Tap "Ingresar con Face ID / huella"
    App->>BE: Solicitar challenge
    BE-->>App: nonce único (expira en 60 s)
    App->>SO: createSignature(challenge)
    SO->>U: Prompt biométrico nativo
    Note over U,SO: El sensor lee el rostro/huella.<br/>Los datos biométricos NUNCA<br/>salen del hardware seguro
    U->>SO: Match ✓
    SO->>SO: La llave privada firma el challenge<br/>(autorizada por el match)
    SO-->>App: Firma
    App->>BE: userId + firma
    BE->>BE: Verifica firma con la llave pública.<br/>Marca el challenge como consumido
    BE-->>App: AuthSession (method: BIOMETRIC)
    App->>U: Navega a Home
```

---

## 4. Errores durante el prompt biométrico

**Spec 04.** Taxonomía completa: cada salida del prompt exige una respuesta distinta. Tratar todo como "falló" es el anti-patrón que esta spec elimina. Incluye el escenario de espera "app interrumpida durante el prompt".

```mermaid
flowchart TD
    A["Prompt biométrico visible<br/>(el SO controla esta UI)"] --> B{"Resultado"}

    B -->|"Usuario cierra el prompt"| C["USER_CANCELLED<br/>Mensaje neutro. Sin reintento<br/>automático. Estado idle"]
    B -->|"Llamada entrante /<br/>app a background"| D["SYSTEM_CANCELLED"]
    D --> E{"¿Primera vez y app<br/>volvió a foreground?"}
    E -->|Sí| F["Reintento silencioso<br/>(una sola vez)"] --> A
    E -->|No| C2["Volver a idle.<br/>El usuario decide reintentar"]
    B -->|"Sensor no reconoce<br/>(intento fallido)"| G["AUTH_FAILED<br/>El SO gestiona reintentos<br/>dentro del prompt"]
    G --> H{"¿N ≥ 3 prompts<br/>fallidos en la app?"}
    H -->|No| I["Permitir nuevo intento"] --> A
    H -->|Sí| J["Sugerir login con<br/>credenciales"]
    B -->|"Demasiados fallos<br/>a nivel de SO"| K["LOCKOUT<br/>→ ver diagrama 5"]
    B -->|"Código no reconocido"| L["UNKNOWN<br/>Mensaje genérico. Nunca crash.<br/>UI sigue operable"]

    style C fill:#B8860B,color:#fff
    style C2 fill:#B8860B,color:#fff
    style G fill:#8B0000,color:#fff
    style K fill:#8B0000,color:#fff
    style L fill:#4A4A4A,color:#fff
    style J fill:#1B5E20,color:#fff
```

---

## 5. Lockout temporal y permanente

**Spec 04.** El bloqueo lo impone el **hardware/SO**, no la app: la app solo puede detectarlo, comunicarlo y ofrecer alternativas. Es un escenario de error *y* de espera.

```mermaid
flowchart TD
    A["Fallos de match repetidos<br/>(~5 intentos)"] --> B{"Plataforma"}

    B -->|Android| C["ERROR_LOCKOUT<br/>Bloqueo temporal de 30 s"]
    C --> D["App: deshabilitar botón biométrico.<br/>Mensaje: 'Demasiados intentos,<br/>espera 30 s o usa tu contraseña'"]
    D --> E{"¿Sigue fallando<br/>tras el bloqueo?"}
    E -->|Sí| F["ERROR_LOCKOUT_PERMANENT<br/>Bloqueado hasta desbloquear el<br/>dispositivo con PIN / patrón"]
    E -->|No| G["Sensor disponible de nuevo.<br/>Rehabilitar botón"]

    B -->|iOS| H["biometryLockout<br/>Face ID / Touch ID bloqueado hasta<br/>ingresar el passcode del dispositivo"]

    F --> I["La app NO puede desbloquearlo.<br/>Ofrecer login con credenciales.<br/>Re-detectar capacidad al volver a foreground"]
    H --> I
    G --> J["Flujo normal"]

    style C fill:#B8860B,color:#fff
    style F fill:#8B0000,color:#fff
    style H fill:#8B0000,color:#fff
    style I fill:#1B5E20,color:#fff
    style J fill:#1B5E20,color:#fff
```

---

## 6. Invalidación de llaves por cambio de biometría en el SO

**Spec 05.** Escenario de seguridad crítico: alguien (o el propio usuario) enrola una nueva huella/rostro en el sistema. El hardware invalida las llaves a propósito — protege contra un tercero que, conociendo el PIN del dispositivo, agregue su huella para acceder al banco.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant SO as SO + Hardware
    participant App as App
    participant BE as Backend (simulado)

    Note over U,SO: El usuario (o un tercero) enrola<br/>una nueva huella/rostro en ajustes del SO
    SO->>SO: Invalida las llaves creadas con<br/>BIOMETRY_CURRENT_SET /<br/>invalidatedByBiometricEnrollment

    U->>App: Intenta login biométrico
    App->>BE: Solicitar challenge
    BE-->>App: nonce
    App->>SO: createSignature(challenge)
    SO-->>App: ✗ Error: llave invalidada
    App->>App: Detecta invalidación.<br/>Limpia enrolamiento local<br/>(deleteKeys + flag del Keychain)
    App->>BE: Revocar llave pública del usuario
    BE-->>App: Llave revocada
    App->>U: "Tu biometría cambió. Por seguridad,<br/>ingresa con tu contraseña"
    U->>App: Login con credenciales ✓
    App->>U: Ofrecer re-enrolamiento biométrico<br/>(vuelve al diagrama 2)
```

---

## 7. Espera: background, periodo de gracia y re-autenticación

**Spec 06.** La sesión es parte de la superficie de ataque: qué pasa cuando el usuario cambia de app y vuelve. El periodo de gracia balancea seguridad y fricción.

```mermaid
flowchart TD
    A["Sesión activa en Home"] --> B["App pasa a background<br/>(se registra timestamp<br/>y se activa privacy screen)"]
    B --> C["Usuario regresa a la app"]
    C --> D{"¿Tiempo en background<br/>≤ periodo de gracia (60 s)?"}
    D -->|Sí| E["Continúa la sesión<br/>sin fricción"]
    D -->|No| F{"¿Sesión aún vigente?<br/>(expiración absoluta 15 min)"}
    F -->|No| G["Sesión expirada<br/>→ Login (diagrama 8)"]
    F -->|Sí| H{"¿Biometría enrolada?"}
    H -->|Sí| I["Prompt de re-autenticación<br/>biométrica"]
    H -->|No| G
    I -->|Match ✓| E
    I -->|"Cancelación / fallo /<br/>lockout"| G

    A --> J["Expiración absoluta alcanzada<br/>incluso en foreground"] --> G

    style E fill:#1B5E20,color:#fff
    style G fill:#8B0000,color:#fff
```

---

## 8. Revocación: logout, expiración de token y deshabilitar biometría

**Specs 05–06.** Tres disparadores distintos con limpiezas distintas. La diferencia clave: el logout conserva el enrolamiento biométrico; deshabilitar biometría destruye las llaves.

```mermaid
flowchart TD
    subgraph T["Disparadores de revocación"]
        A["Logout manual<br/>(botón 'Cerrar sesión')"]
        B["Expiración absoluta<br/>del token de sesión"]
        C["Usuario desactiva biometría<br/>en Settings"]
        D["Llaves invalidadas por el SO<br/>(diagrama 6)"]
    end

    A --> E["Invalidar token en backend.<br/>Borrar sesión del Keychain"]
    B --> E
    E --> F{"¿Conservar<br/>enrolamiento?"}
    F -->|"Logout / expiración: SÍ"| G["Llaves intactas.<br/>Próximo login puede<br/>ser biométrico"]

    C --> H["Prompt biométrico de confirmación<br/>(evitar desactivación por un tercero<br/>con el teléfono desbloqueado)"]
    H -->|Match ✓| I["deleteKeys() en hardware.<br/>Revocar llave pública en backend.<br/>Borrar flag del Keychain"]
    H -->|"Cancela / falla"| J["Biometría sigue activa.<br/>Sin cambios"]
    D --> I
    I --> K["Botón biométrico desaparece del Login.<br/>Solo credenciales hasta re-enrolar"]

    G --> L["Pantalla de Login"]
    K --> L

    style G fill:#1B5E20,color:#fff
    style J fill:#B8860B,color:#fff
    style I fill:#8B0000,color:#fff
```

---

## 9. Step-up: autorización de una transferencia

**Spec 06.** Una sesión activa **no basta** para operaciones sensibles: cada transferencia exige su propio match biométrico (llave *auth-per-use*) y la firma cubre el payload de la operación — se aprueba *esta* transferencia, no un permiso genérico.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant App as App (sesión activa)
    participant BE as Backend (simulado)
    participant SO as SO + Hardware

    U->>App: Transferir $500 a "Cuenta X"
    App->>BE: Iniciar operación (monto + destino)
    BE-->>App: Challenge ligado al payload<br/>{nonce, monto, destino}
    App->>SO: createSignature(payload)
    SO->>U: Prompt: "Confirma la transferencia<br/>de $500 a Cuenta X"

    alt Match exitoso
        U->>SO: Biometría ✓
        SO-->>App: Firma del payload
        App->>BE: Firma
        BE->>BE: Verifica firma y que el payload<br/>coincida con la operación iniciada
        BE-->>App: Transferencia ejecutada
        App->>U: Comprobante
    else Usuario cancela o falla el match
        U->>SO: Cancelar ✗
        SO-->>App: USER_CANCELLED / AUTH_FAILED
        App->>BE: Abortar operación
        App->>U: "Transferencia no realizada".<br/>Sin efectos. Sesión sigue activa
    end
```

---

## 10. Anti-replay: challenge expirado, reusado y rate limiting

**Spec 05.** Las defensas del lado del "servidor": aunque el backend sea simulado, estas propiedades se implementan porque **son el aprendizaje** — la verdad siempre vive en el servidor, nunca en el cliente.

```mermaid
sequenceDiagram
    participant App as App / Atacante
    participant BE as Backend (simulado)

    rect rgba(118, 209, 127, 1)
        Note over App,BE: Escenario A — Challenge expirado
        App->>BE: Solicitar challenge
        BE-->>App: nonce (expira en 60 s)
        Note over App: Pasan más de 60 s<br/>(usuario dudó frente al prompt)
        App->>BE: Firma del challenge vencido
        BE-->>App: ✗ RECHAZADO: challenge expirado
        Note over App: La app solicita un challenge<br/>nuevo y reintenta con un prompt fresco
    end

    rect rgba(246, 190, 190, 1)
        Note over App,BE: Escenario B — Replay (challenge reusado)
        App->>BE: Firma válida del challenge C1
        BE->>BE: Verifica ✓ y marca C1 como consumido
        BE-->>App: AuthSession emitida
        App->>BE: La MISMA firma de C1 otra vez<br/>(intento de replay)
        BE-->>App: ✗ RECHAZADO: challenge ya consumido
    end

    rect rgba(218, 237, 238, 1)
        Note over App,BE: Escenario C — Rate limiting
        loop Firmas inválidas consecutivas
            App->>BE: Firma inválida
            BE-->>App: ✗ Firma no verificada
        end
        BE->>BE: Umbral superado para este usuario
        BE-->>App: ✗ BLOQUEADO temporalmente.<br/>Demasiados intentos fallidos.<br/>Login biométrico suspendido,<br/>usar credenciales
    end
```

---

## Cobertura de escenarios por tipo

| Tipo | Escenarios cubiertos |
|------|---------------------|
| **Satisfactorios** | Detección exitosa (1), enrolamiento (2), login biométrico (3), re-auth dentro de gracia (7), transferencia autorizada (9) |
| **Error** | Sin hardware / sin enrolar / weak (1), credenciales inválidas (2), cancelaciones y fallos de match (4), lockout (5), llave invalidada (6), firma inválida (10) |
| **Espera** | Bloqueo temporal de 30 s (5), background + periodo de gracia (7), reintento silencioso tras interrupción del sistema (4), challenge expirado por duda del usuario (10) |
| **Revocación** | Logout, expiración de token, deshabilitar biometría, revocación de llave pública (8), invalidación por cambio biométrico (6) |
| **Seguridad / ataque** | Replay de firma (10), rate limiting (10), tercero agrega su huella (6), tercero intenta desactivar biometría (8) |

Si al implementar aparece un escenario no contemplado aquí, se agrega su diagrama a este documento en el mismo PR.
