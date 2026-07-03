# Project Structure

## Architecture

Clean Architecture with feature-based namespacing. Layers have strict import boundaries enforced by ESLint:

```
core ← domain ← data
                ↑
core ← domain ← presentation
                
di can import from all layers
```

## Source Layout

```
src/
├── core/              # Shared primitives (no business logic)
│   ├── errors/        # AppError base class and error codes
│   └── types/         # Result<T,E> type, shared type utilities
│
├── domain/            # Business rules — pure, no framework deps
│   ├── auth/
│   │   ├── entities/
│   │   ├── repositories/   # Interfaces (ports)
│   │   └── usecases/
│   ├── biometrics/
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── usecases/
│   └── shared/
│       └── entities/
│
├── data/              # Infrastructure — implements domain interfaces
│   ├── auth/
│   │   ├── datasources/
│   │   └── repositories/
│   ├── biometrics/
│   │   ├── datasources/
│   │   └── repositories/
│   └── shared/
│       └── datasources/
│
├── presentation/      # UI layer — React Native components
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── screens/
│   │   └── biometrics/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── screens/
│   ├── navigation/
│   └── shared/
│       ├── components/
│       ├── hooks/
│       └── theme/
│
└── di/                # Dependency injection / wiring
```

## Conventions

- **Error handling**: Use `Result<T, E>` type (no thrown exceptions for expected failures). `AppError` with typed codes for all error cases.
- **Layer boundaries**: domain never imports from data or presentation. Presentation never imports from data — it goes through domain use cases.
- **Tests**: Co-located in `__tests__/` directories next to the code they test.
- **Entities/Repositories**: Domain defines repository interfaces (ports); data implements them (adapters).
- **Features**: Each feature (auth, biometrics) has its own vertical slice across all layers.

## Documentation

```
docs/
├── flujos-biometria.md       # Mermaid diagrams of all auth scenarios
└── specs/
    ├── README.md             # Execution order and status
    ├── 01-scaffolding-clean-architecture.md
    ├── 02-deteccion-capacidades-biometricas.md
    ├── 03-autenticacion-biometrica.md
    ├── 04-manejo-errores-validaciones.md
    ├── 05-integracion-sistema-autenticacion.md
    └── 06-endurecimiento-estandares-seguridad.md
```

Specs are implemented in sequence. Each must be complete (code + tests) before moving to the next.
