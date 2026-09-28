# Agent Directives & Architecture Rules (`agent.md`)

Este archivo define las reglas de arquitectura, convenciones técnicas y restricciones del proyecto `forge-front`. El asistente de IA debe seguir estas directrices de manera obligatoria en todas las interacciones.

---

## 1. Metodología de Desarrollo: SDD (Spec-Driven Development)

1. **Especificación previa a la implementación:**
   * Antes de codificar cualquier característica, componente nuevo o refactor significativo, se debe redactar un archivo de especificación en `docs/specs/<feature-name>.spec.md`.
   * La especificación debe detallar:
     - Contexto y objetivos.
     - Requisitos funcionales y de UI/UX (accesibilidad, touch-friendly, breakpoints).
     - Decisiones de arquitectura y dependencias afectadas.
     - Criterios de aceptación comprobables.
     - Plan de implementación paso a paso.
   * **No se escribe código de producción sin la aprobación explícita del usuario sobre la Spec.**

2. **Mecanismo de Consulta de Reglas (Interactive Rule Prompt):**
   * Cada vez que el usuario emita una preferencia, corrección o restricción sobre decisiones de código o arquitectura (por ejemplo: "no uses X librería", "prefiere tal patrón", "evita tal sintaxis"), el agente debe preguntar proactivamente:
     > *"¿Deseas que agregue esta decisión como regla permanente en `agent.md`?"*
   * Tras la confirmación del usuario, la regla se integrará formalmente en la sección de **Reglas Permanentes** de este archivo.

---

## 2. Reglas Permanentes del Proyecto

### R1. Cero código muerto, backups o archivos sin usar (Higiene del repositorio)
* **Regla:** Queda estrictamente prohibido dejar archivos de backup (`*V2.tsx`, `*.bak`, carpetas temporales, etc.) o código no referenciado en el proyecto.
* **Justificación:** La plantilla completa de referencia se encuentra preservada en la carpeta `Archivador/` (fuera del repositorio de producción), por lo que no es necesario almacenar copias de seguridad de componentes o vistas no utilizadas dentro de `forge-front`. Todo archivo en `src/` debe tener un propósito activo en el sistema.

### R2. Compatibilidad del Stack Tecnológico
* **Framework:** Next.js 16 (App Router) + React 19.
* **Componentes UI & Tema:** MUI v7 (Material UI + `@mui/lab`) junto con el sistema de theming propio de Vuexy.
* **Estilos:** Tailwind CSS v4 + Emotion (para componentes styled de MUI).
* **Iconografía:** Iconify (con prefijo de bundle o clases estándar tipo `tabler-*`).
* **Lenguaje:** TypeScript estricto. Toda nueva funcionalidad debe compilar limpiamente con `tsc --noEmit`.

---

## 3. Estructura de Documentación de Specs

```text
docs/
└── specs/
    └── <feature-name>.spec.md
```
