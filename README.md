# Implementar Autenticación Biométrica en una Aplicación

Una aplicación de banca móvil necesita implementar un sistema de autenticación biométrica para mejorar la seguridad y la experiencia del usuario. El sistema debe utilizar las capacidades nativas de Face ID y huella dactilar disponibles en dispositivos móviles. La autenticación biométrica es esencial para garantizar que solo el propietario legítimo del dispositivo pueda acceder a la cuenta bancaria.

## Informacion General

| Campo | Valor |
|-------|-------|
| **Tema** | Autenticación con biometría en aplicaciones |
| **Nivel** | junior-l3 |
| **Tipo** | practical |
| **Tiempo estimado** | 3-4 horas |

## Fases del Reto

### Fase 0: Configuración del Proyecto

**Objetivo:** Obtener el proyecto base funcional enviando el Código Base a un asistente de IA, que lo analizará, corregirá errores y generará un ZIP listo para usar.

**Tiempo estimado:** 15-30 minutos

**Instrucciones:**

- Asegúrate de tener instalado para ejecutar el proyecto: Node.js 18+, npm, VS Code o similar.
- Copia todo el contenido del campo **Código Base** de este reto — incluyendo el texto de instrucciones que aparece al inicio.
- Abre un asistente de IA (Claude en claude.ai, ChatGPT o Gemini — se recomienda Claude), pega el contenido copiado en el chat y envíalo.
- El asistente analizará los archivos, corregirá errores y generará un archivo ZIP descargable. Descárgalo y extráelo en la carpeta donde quieras trabajar.
- Ejecuta `npm install && npm run build` (o `npm start`). Si no hay errores, estás listo.

**Entregable:** El proyecto compila/arranca sin errores.

<details>
<summary>Pistas de conocimiento</summary>

- Copia el Código Base completo incluyendo el texto de instrucciones al inicio — esas instrucciones le indican al asistente exactamente qué hacer con los archivos.
- Si el asistente no genera el ZIP automáticamente al terminar el análisis, escríbele: "genera el ZIP ahora".
- Si el proyecto tiene errores al arrancar, comparte el mensaje de error con el mismo asistente para que lo corrija.

</details>

### Fase 1: Configurar la Autenticación Biométrica

**Objetivo:** Configurar y probar la autenticación biométrica utilizando Face ID y huella dactilar.

**Tiempo estimado:** 1 hora

**Instrucciones:**

- Identificar las capacidades biométricas disponibles en el dispositivo.
- Configurar la autenticación biométrica para que el usuario pueda iniciar sesión utilizando Face ID o huella dactilar.

**Entregable:** Una aplicación que permite al usuario autenticarse utilizando Face ID o huella dactilar.

<details>
<summary>Pistas de conocimiento</summary>

- Las capacidades biométricas pueden variar entre dispositivos.
- Es importante manejar los casos en los que el dispositivo no tiene capacidades biométricas.

</details>

### Fase 2: Manejo de Errores y Validaciones

**Objetivo:** Implementar el manejo de errores y validaciones para la autenticación biométrica.

**Tiempo estimado:** 1 hora

**Instrucciones:**

- Identificar posibles errores durante la autenticación biométrica.
- Implementar validaciones para asegurar que la autenticación sea segura y confiable.

**Entregable:** Una aplicación que maneja errores y validaciones durante la autenticación biométrica.

<details>
<summary>Pistas de conocimiento</summary>

- Los errores pueden incluir dispositivos sin capacidades biométricas, fallos en la lectura de la huella o Face ID.
- Las validaciones deben asegurar que la autenticación sea realizada correctamente.

</details>

### Fase 3: Integración con el Sistema de Autenticación

**Objetivo:** Integrar la autenticación biométrica con el sistema de autenticación existente de la aplicación.

**Tiempo estimado:** 1 hora

**Instrucciones:**

- Integrar la autenticación biométrica con el sistema de autenticación existente.
- Asegurar que la autenticación biométrica sea una opción de inicio de sesión válida.

**Entregable:** Una aplicación que integra la autenticación biométrica con el sistema de autenticación existente.

<details>
<summary>Pistas de conocimiento</summary>

- La integración debe ser transparente para el usuario.
- Asegúrate de que la autenticación biométrica sea una opción de inicio de sesión válida y segura.

</details>

## Dimensiones Evaluadas

- **queEs**: ¿Qué es la autenticación biométrica y por qué es importante en una aplicación de banca móvil?
- **comoSeUsa**: ¿Cómo se usa la autenticación biométrica en la aplicación?
- **erroresComunes**: ¿Cuáles son los errores comunes que pueden ocurrir durante la autenticación biométrica y cómo se manejan?
- **queDecisionesImplica**: ¿Qué decisiones implica la implementación de la autenticación biométrica en la aplicación?

## Criterios de Evaluacion

- Configurar la autenticación biométrica utilizando Face ID y huella dactilar.
- Implementar el manejo de errores y validaciones para la autenticación biométrica.
- Integrar la autenticación biométrica con el sistema de autenticación existente.

---

*Reto generado automaticamente por Challenge Generator - Pragma*
