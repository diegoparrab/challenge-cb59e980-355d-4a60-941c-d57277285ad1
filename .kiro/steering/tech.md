# Tech Stack

## Core

- **Runtime**: React Native 0.86 (New Architecture)
- **Language**: TypeScript 5.8+
- **React**: 19.x
- **Node**: >= 22.11.0

## Key Libraries

- `react-native-safe-area-context` — safe area handling
- `babel-plugin-module-resolver` — path alias resolution at build time
- `eslint-plugin-boundaries` — enforces clean architecture layer constraints

## Build System

- **Metro** bundler (default React Native)
- **Gradle** for Android builds
- **CocoaPods** + Xcode for iOS builds

## Path Aliases

Configured in both `tsconfig.json` and `babel.config.js`:

| Alias | Path |
|-------|------|
| `@core/*` | `src/core/*` |
| `@domain/*` | `src/domain/*` |
| `@data/*` | `src/data/*` |
| `@presentation/*` | `src/presentation/*` |
| `@di/*` | `src/di/*` |

## Common Commands

```bash
# Start Metro bundler
yarn start

# Run on Android
yarn run android

# Run on iOS
yarn run ios

# Lint
yarn run lint

# Run tests
yarn test

# Install iOS pods (after adding native deps)
cd ios && pod install
```

## Code Style

- **Prettier**: single quotes, trailing commas (all), no parens on single-arg arrows
- **ESLint**: extends `@react-native` config with `boundaries` plugin for layer enforcement
- Tests use Jest with `@react-native/jest-preset`
