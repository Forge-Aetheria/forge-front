# Agent Directives & Architecture Rules (`agent.md`)

Este archivo y [`constitution.md`](./constitution.md) definen las reglas de arquitectura, diseño, convenciones técnicas y restricciones del proyecto `forge-front`. El asistente de IA debe seguir estas directrices de manera obligatoria en todas las interacciones.

---

## 1. Metodología de Desarrollo: SDD (Spec-Driven Development) con Sintaxis EARS

1. **Especificación previa a la implementación:**
   * Antes de codificar cualquier característica, componente nuevo o refactor significativo, se debe redactar un archivo de especificación en `docs/specs/<feature-name>.spec.md`.
   * La especificación debe redactarse utilizando **Sintaxis EARS** (patrones *Ubiquitous*, *Event-driven*, *State-driven*, *Unwanted Behavior* definidos en `constitution.md`).
   * La especificación debe detallar:
     - Contexto y objetivos.
     - Requisitos funcionales y de UI/UX (Clean Light UI, touch-friendly, breakpoints).
     - Decisiones de arquitectura y dependencias afectadas.
     - Criterios de aceptación comprobables.
     - Plan de implementación paso a paso.
   * **No se escribe código de producción sin la aprobación explícita del usuario sobre la Spec.**

2. **Protocolo Git Preventivo (Verificación contra `main`):**
   * Antes de iniciar una nueva rama o implementación, el agente debe verificar el árbol de Git con `git fetch origin` y ejecutar un `git diff` o `git log` comparativo contra `origin/main` (o la rama base) para detectar código faltante o divergencias antes de proceder.

3. **Mecanismo de Consulta de Reglas (Interactive Rule Prompt):**
   * Cada vez que el usuario emita una preferencia, corrección o restricción sobre decisiones de código o arquitectura, el agente debe preguntar proactivamente:
     > *"¿Deseas que agregue esta decisión como regla permanente en `agent.md` y `constitution.md`?"*

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

### R3. Reutilización de Componentes de la Plantilla
* **Regla:** Antes de crear cualquier componente de interfaz (tablas de datos, tarjetas estadísticas KPI, filtros, modales, drawers, formularios), se debe verificar y reutilizar la implementación y patrones ya existentes en `Archivador/full-version`.
* **Justificación:** Vuexy ya incluye soluciones probadas y estilizadas (`card-statistics`, `ProductListTable`, `TablePaginationComponent`, `TableFilters`, etc.). No reinventar la rueda; adaptar los componentes existentes a las necesidades del ERP.

### R4. Localización Fiscal y Cálculos Opcionales (Feature Flags)
* **Regla:** Toda lógica de negocio, campo de formulario, cálculo de costos/márgenes o indicador visual relacionado con impuestos locales (SENIAT, alícuotas de IVA 16%/8%/exento, IGTF, retenciones ISLR) debe ser estrictamente modular y opcional, gobernada por configuración o Feature Flags.
* **Justificación:** El ERP debe ser capaz de operar en modo neto universal para cualquier cliente o país. Si los impuestos están desactivados, los precios, márgenes y reportes operan limpiamente con precios base sin sobrecarga de cálculos fiscales.

### R5. Integridad de Rutas en la Navegación (Dual Menu)



### R6. Jerarquía de Políticas Comerciales y de Control (Product Override > System Default)
* **Regla:** Toda política comercial de facturación (cantidades pedidas vs. entregadas) o control de compras (cantidades pedidas vs. recibidas) debe evaluar prioritariamente la política individual asignada al producto en el catálogo. Si el producto tiene configurada la opción `'DEFAULT'` o no está definida, se hereda la política global configurada a nivel de empresa/sistema.
* **Justificación:** Proporciona flexibilidad operativa para manejar simultáneamente servicios (facturación inmediata sobre orden) y mercancías físicas (facturación contra entrega/recepción de almacén) sin duplicar configuraciones ni romper los flujos de trabajo.
* **Regla:** Toda nueva ruta, página funcional o módulo del sistema debe registrarse explícitamente tanto en el menú lateral vertical (`src/data/navigation/verticalMenuData.tsx`) como en el menú horizontal (`src/data/navigation/horizontalMenuData.tsx`).
* **Justificación:** Garantiza coherencia en la experiencia de navegación del usuario independientemente de la vista o modo de layout activo.

---

## 3. Estructura de Documentación de Specs

```text
docs/
└── specs/
    └── <feature-name>.spec.md
```
