# Foundly Frontend Constitution & Governance (`constitution.md`)

**Versión:** 1.0.0  
**Metodología:** Spec-Driven Development (SDD) con Sintaxis EARS  
**Entorno:** Frontend ERP (`forge-front` - Next.js 16 App Router, React 19, MUI v7, Tailwind CSS v4)  
**Estado:** Inviolable — todo código, especificación o interfaz debe cumplir estrictamente esta constitución.

---

## 1. Principios de Arquitectura & Identidad Visual (Design System Contract)

### 1.1 Filosofía Foundly Clean Light UI
- **Estricto Clean Light UI:** El sistema opera exclusivamente en modo claro. Quedan prohibidas las superficies o paneles oscuros en el layout principal, navegación, tarjetas o tablas. El único elemento oscuro permitido es el *backdrop* translúcido de modales o drawers.
- **Gradiente Vertical de Pantalla:** Toda pantalla debe incluir el gradiente vertical sutil desde el 0% (lavanda `#C8B6FF` / `#D8B4FE`) difuminando hacia el cuerpo claro en 28–30% (`#FAFAFC` / `#F4F3F8`).
- **Tarjetas Suspendidas (`Card`):** Contenedores en blanco purificado (`#FFFFFF`), bordes ultrafinos lavanda de 1px (`#E6E4F0`), radios redondeados generosos de `20px` a `24px` y sombras suspendidas sutiles (`opacity ≤ 0.05`).
- **Superficies Secundarias & Inputs:** Fondo `#F4F3F8`, borde `#DCD8EC`, radio de `16px` y focus ring en morado de marca `#6C5CE7`.
- **Gramática de Píldora (`rounded-full`):** Los botones principales de acción, badges, chips y botones flotantes (FAB) deben tener radio completo (`9999px`).
- **Tokens Semánticos:**
  - `accent` / `primary`: `#6C5CE7` (Glow: `rgba(108, 92, 231, 0.35)`).
  - `income` / `success`: `#10B981` (Verde esmeralda para valores positivos e ingresos).
  - `expense` / `error`: `#EF4444` (Carmesí para valores negativos y gastos).
  - `gold` / `warning`: `#F59E0B`.
  - `info`: `#38BDF8`.
  - `text-primary`: `#1E1B2E` (alto contraste sobre superficies claras).
  - `text-secondary`: `#6B7280`.

---

## 2. Metodología SDD & Sintaxis EARS (Easy Approach to Requirements Syntax)

Toda especificación funcional previa a codificar debe redactarse formalmente en `docs/specs/<feature>.spec.md` estructurada bajo los patrones EARS:

| Patrón EARS | Sintaxis | Ejemplo en Frontend |
| :--- | :--- | :--- |
| **Ubiquitous (Universal)** | `The <system> shall <action>.` | *The system shall display all cards with 1px border #E6E4F0 and white background.* |
| **Event-driven (Por evento)** | `WHEN <trigger>, the <system> shall <action>.` | *WHEN the user clicks the payment button, the system shall open the dual-currency modal.* |
| **State-driven (Por estado)** | `WHILE <in state>, the <system> shall <action>.` | *WHILE the fiscal flag is disabled, the system shall hide all SENIAT tax indicators.* |
| **Unwanted Behavior (Excepciones)** | `IF <error/condition>, THEN the <system> shall <action>.` | *IF the cash received is lower than the total, THEN the system shall disable the confirm button.* |

---

## 3. Protocolo Git & Verificación de Ramas

### 3.1 Verificación de Integridad contra `main` (Obligatorio)
- **Regla:** Antes de iniciar cualquier trabajo, creación de rama o implementación, el agente debe:
  1. Ejecutar `git fetch origin` y verificar el estado actual.
  2. Ejecutar un `git diff` o `git log` comparativo contra `origin/main` (o la rama base) para detectar código faltante, commits pendientes de merge o discrepancias antes de proponer cambios.
- **Razón:** Prevenir divergencias accidentales, código desactualizado o reescritura de funcionalidades ya existentes en `main`.

### 3.2 Protocolo de Commits y PRs
- Commits atómicos y descriptivos siguiendo Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`).
- Toda entrega significativa se canaliza a través de un Pull Request con su checklist de verificación.

---

## 4. Reglas Permanentes de Desarrollo (Higiene & Calidad)

### 4.1 Cero Código Muerto o Archivos Redundantes (Regla R1)
- Prohibido dejar archivos `.bak`, `*V2.tsx`, mocks huérfanos o código no utilizado. Todo archivo en `src/` debe tener un propósito activo.

### 4.2 Reutilización de Componentes de Plantilla (Regla R3)
- Antes de crear componentes visuales desde cero, inspeccionar y adaptar las soluciones probadas en `Archivador/full-version` (tablas, paginación, filtros, estadísticas).

### 4.3 Modularidad Fiscal y Feature Flags (Regla R4)
- Toda lógica o indicador impositivo local (SENIAT, IVA 16%/8%, IGTF 3%, retenciones) debe ser estrictamente condicional y gobernada por configuración (`Feature Flags`), permitiendo que el ERP opere limpiamente en modo universal sin sobrecarga tributaria.

### 4.4 Integridad en la Navegación
- Toda nueva ruta o módulo funcional debe registrarse explícitamente tanto en el menú vertical (`verticalMenuData.tsx`) como en el horizontal (`horizontalMenuData.tsx`).

### 4.5 Type Safety Estricto
- Ningún cambio o commit se considera finalizado sin verificar compilación limpia al 100% mediante `npx tsc --noEmit`.
