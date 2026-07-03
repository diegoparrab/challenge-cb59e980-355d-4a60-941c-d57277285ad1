# Spec 01 — Scaffolding con Clean Architecture + Feature Namespacing

**Fase del reto:** Fase 0 (configuración del proyecto)
**Depende de:** —
**Estado:** Pendiente

## Objetivo

Limpiar la plantilla base de React Native y establecer una estructura de Clean Architecture con **feature namespacing** en todas las capas, diseñada para escalar a una aplicación con múltiples módulos independientes (biometría, auth, orders, reports, marketing, etc.). Al finalizar, el proyecto compila y arranca mostrando una pantalla propia (no la de la plantilla), con las capas, namespaces y alias de importación listos.

## Contexto

El proyecto actual es la plantilla de React Native 0.86 + TypeScript: `App.tsx` renderiza `NewAppScreen` y no existe carpeta `src/`. Antes de escribir lógica de negocio necesitamos una base que:

1. Separe dominio, datos y presentación (Clean Architecture).
2. Agrupe el código **por feature** dentro de cada capa para evitar carpetas planas inmanejables cuando el proyecto crezca.
3. Permita agregar un módulo nuevo creando subcarpetas con el nombre del feature en las 3 capas + wiring en DI, sin tocar código existente.

La biometría toca módulos nativos y queremos que el dominio nunca dependa de una librería concreta. Además, este proyecto funciona como **boilerplate** para apps que pueden crecer a incluir módulos como orders, reports o métricas de marketing — cada uno con su propia cantidad significativa de screens, componentes y lógica de negocio.

## Alcance

**Incluye:**
- Eliminar código de plantilla (`NewAppScreen`, test de ejemplo).
- Crear la estructura de carpetas con feature namespacing bajo `src/`.
- Configurar alias de importación (`@core`, `@domain`, `@data`, `@presentation`, `@di`) en `tsconfig.json` y `babel.config.js` (via `babel-plugin-module-resolver`).
- Pantalla inicial mínima propia (placeholder de la futura pantalla de login).
- Ajustar Jest para que resuelva los alias.
- Instalar y configurar `eslint-plugin-boundaries` para enforcar las reglas de dependencia entre capas.

**No incluye:**
- Ninguna dependencia biométrica (spec 02).
- Navegación entre pantallas (se introduce cuando exista más de una pantalla, spec 03/05).
- Gestión de estado global (se decidirá cuando haya estado que compartir).

## Diseño técnico

### Estructura de carpetas

```
src/
├── core/                                # Transversal: sin dependencias de otras capas
│   ├── errors/                          # Jerarquía base de errores (AppError)
│   └── types/                           # Result<T, E> y tipos utilitarios
│
├── domain/                              # Reglas de negocio puras (TypeScript sin RN)
│   ├── biometrics/                      # ← namespace por feature
│   │   ├── entities/
│   │   ├── repositories/               # Interfaces (contratos)
│   │   └── usecases/
│   ├── auth/                            # ← namespace por feature
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── usecases/
│   └── shared/                          # Entidades cross-cutting (User, Session)
│       └── entities/
│
├── data/                                # Implementaciones de los contratos del dominio
│   ├── biometrics/                      # ← namespace por feature
│   │   ├── datasources/
│   │   └── repositories/
│   ├── auth/                            # ← namespace por feature
│   │   ├── datasources/
│   │   └── repositories/
│   └── shared/                          # HTTP client, storage genérico
│       └── datasources/
│
├── presentation/                        # Todo lo que toca React / React Native
│   ├── shared/                          # Design system y utilidades de UI
│   │   ├── components/                  # Button, Input, Card, Modal, Divider...
│   │   ├── theme/                       # Colores, espaciado, tipografía
│   │   └── hooks/                       # Hooks genéricos (useAppState, useNetwork...)
│   ├── features/                        # ← feature slicing en presentación
│   │   ├── biometrics/
│   │   │   ├── screens/
│   │   │   ├── components/              # Componentes SOLO de este módulo
│   │   │   └── hooks/
│   │   └── auth/
│   │       ├── screens/
│   │       ├── components/
│   │       └── hooks/
│   └── navigation/                      # Router principal
│
└── di/                                  # Composición: instancia repos y casos de uso
```

### Principio de organización

> Cada feature tiene su namespace (subcarpeta) en `domain/`, `data/` y `presentation/features/`. El código compartido entre features vive en `*/shared/`.

**Regla para `shared/`:** algo solo sube a `shared/` cuando **dos o más features ya lo usan en producción**. No preventivamente.

### Regla de dependencias (entre capas)

```
presentation ──▶ domain ◀── data
        │            ▲          │
        └────────────┴──────────┘  (ambas conocen domain; domain no conoce a nadie)
core ◀── todas (core no importa de ninguna capa)
```

- `domain/` no importa nada de `react`, `react-native` ni librerías nativas.
- `data/` implementa las interfaces de `domain/[feature]/repositories`.
- `presentation/` consume casos de uso a través de hooks; nunca llama datasources directamente.
- `di/` es el único lugar donde se conocen las implementaciones concretas.

### Regla de dependencias (entre features)

- Un feature **no importa directamente** de otro feature al mismo nivel.
- Si `auth` necesita algo de `biometrics`, la comunicación se hace por:
  1. Interfaces en el dominio del feature consumidor.
  2. Wiring en `di/` que conecta la implementación.
- Esto mantiene cada feature desacoplado y eliminable sin efectos cascada.

### Regla de enforcement con eslint-plugin-boundaries

Zonas definidas:

| Zona | Path | Puede importar de |
|------|------|-------------------|
| `core` | `src/core/` | nada |
| `domain` | `src/domain/` | `core` |
| `data` | `src/data/` | `core`, `domain` |
| `presentation` | `src/presentation/` | `core`, `domain` (solo tipos/usecases, no data) |
| `di` | `src/di/` | `core`, `domain`, `data`, `presentation` |

### Manejo de resultados

Los casos de uso devuelven `Result<T, E>` (éxito o error tipado) en lugar de lanzar excepciones. Esto será clave en la spec 04, donde el catálogo de errores biométricos es parte central del aprendizaje.

### Cómo agregar un módulo nuevo (e.g., `orders`)

```bash
# 1. Crear namespaces en las 3 capas
mkdir -p src/domain/orders/{entities,repositories,usecases}
mkdir -p src/data/orders/{datasources,repositories}
mkdir -p src/presentation/features/orders/{screens,components,hooks}

# 2. Registrar dependencias en di/
# 3. Agregar rutas al navigation/

# No se toca ningún archivo de biometrics ni auth.
```

## Criterios de aceptación

1. `npm run ios` y `npm run android` arrancan mostrando la pantalla placeholder propia.
2. No queda ninguna referencia a `@react-native/new-app-screen` (dependencia removida de `package.json`).
3. Un import `@domain/biometrics/...` compila y pasa lint tanto en TypeScript como en Metro/Jest.
4. `npm test` pasa con al menos un test trivial que importe usando alias.
5. `npm run lint` sin errores, incluyendo las reglas de `eslint-plugin-boundaries`.
6. `domain/` no contiene ningún import de `react` o `react-native` (verificable con grep).
7. No existe import cruzado entre features (e.g., `presentation/features/auth/` no importa de `presentation/features/biometrics/`).

## Tareas

1. Remover `NewAppScreen` de `App.tsx` y la dependencia de `package.json`; borrar `__tests__/App.test.tsx` de plantilla.
2. Crear el árbol `src/` con la estructura de feature namespacing y archivos `index.ts` de barril donde aplique.
3. Instalar y configurar `babel-plugin-module-resolver`; agregar `paths` en `tsconfig.json` y `moduleNameMapper` en la config de Jest.
4. Instalar y configurar `eslint-plugin-boundaries` con las zonas y reglas de dependencia definidas.
5. Implementar `core/types/result.ts` (`Result`, `ok()`, `err()`) y `core/errors/app-error.ts` con tests unitarios.
6. Crear `presentation/shared/theme/` básico y la pantalla placeholder `presentation/features/auth/screens/PlaceholderScreen`.
7. Mover `App.tsx` a componer desde `src/` y actualizar `index.js` si es necesario.

## Conceptos a comprender (dimensión educativa)

- **Por qué el dominio debe ser independiente del framework**: el hardware biométrico se accede por módulos nativos que cambian entre librerías y versiones; el contrato (`BiometricRepository`) es estable, la implementación no.
- **Cómo la inversión de dependencias permite testear casos de uso biométricos sin un dispositivo físico** (fakes del repositorio en Jest).
- **Feature namespacing como estrategia de escalabilidad**: co-localizar código por módulo dentro de cada capa facilita ownership, eliminación de features y onboarding — sin sacrificar la separación de responsabilidades de Clean Architecture.
- **Boundaries como enforcement automático**: las reglas de arquitectura no dependen de disciplina manual; el linter las vigila.
