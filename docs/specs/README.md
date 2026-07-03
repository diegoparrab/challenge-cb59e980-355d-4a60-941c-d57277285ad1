# Specs — Autenticación Biométrica en React Native

Este directorio contiene las especificaciones del proyecto en el **orden en que deben ejecutarse**. Cada spec es autocontenida: define objetivo, alcance, diseño técnico, criterios de aceptación y los conceptos de hardware que se busca comprender al implementarla.

## Objetivo del proyecto

Construir una **aplicación interactiva de banca móvil simulada** que sirva como laboratorio de aprendizaje sobre el uso del hardware biométrico de los dispositivos móviles (Face ID, Touch ID, huella dactilar en Android). La app no solo debe autenticar: debe **exponer y explicar** lo que ocurre a nivel de hardware (sensores disponibles, Secure Enclave / TEE, llaves criptográficas respaldadas por hardware) para que el desarrollador comprenda las decisiones que implica implementar biometría en una app real.

## Orden de ejecución

| # | Spec | Fase del reto | Estado |
|---|------|---------------|--------|
| 01 | [Scaffolding con Clean Architecture + Feature Namespacing](./01-scaffolding-clean-architecture.md) | Fase 0 | Pendiente |
| 02 | [Detección de capacidades biométricas (Hardware Inspector)](./02-deteccion-capacidades-biometricas.md) | Fase 1 | Pendiente |
| 03 | [Autenticación biométrica básica](./03-autenticacion-biometrica.md) | Fase 1 | Pendiente |
| 04 | [Manejo de errores y validaciones](./04-manejo-errores-validaciones.md) | Fase 2 | Pendiente |
| 05 | [Integración con el sistema de autenticación](./05-integracion-sistema-autenticacion.md) | Fase 3 | Pendiente |
| 06 | [Endurecimiento y estándares de seguridad](./06-endurecimiento-estandares-seguridad.md) | Transversal / cierre | Pendiente |

## Documentos relacionados

- [Flujos de autenticación biométrica — Escenarios](../flujos-biometria.md): diagramas de flujo de todos los escenarios (satisfactorios, de error, de espera, revocación y seguridad), referenciando la spec donde se implementa cada uno.

## Convenciones

- Cada spec se implementa completa (código + pruebas) antes de pasar a la siguiente.
- Las decisiones de arquitectura viven en la spec 01; las specs posteriores la referencian y no la contradicen.
- Al terminar una spec se actualiza su estado en esta tabla (`Pendiente` → `En progreso` → `Hecha`).
