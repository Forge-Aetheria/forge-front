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
- **Geometría de Botones del Sistema (Estándar ERP Profesional):** Los botones interactivos (`Button`) adoptan el radio rectangular suavizado de la plantilla (`8px` / `theme.shape.borderRadius`), proporcionando una estética limpia, profesional y consistente para aplicaciones empresariales. La forma de píldora (`rounded-full` / `9999px`) queda reservada **únicamente** para Chips (`CustomChip`), Badges, pastillas de selección múltiple y toggles de estado.
- **Estandarización Estricta de Botones Recurrentes:**
  - **Botón `Volver`:** Siempre se ubica en la cabecera superior izquierda al lado del título. Se implementa con `variant="tonal"` (o `IconButton` con tooltip), icono `tabler-arrow-left` y texto `"Volver"`.
  - **Botón `Nuevo`:** Siempre `variant="contained" color="primary"`, icono `tabler-plus` y etiqueta concisa `"Nuevo"` (o `"+ Nuevo"`).
  - **Prohibición de Botones de Salto al lado de "Nuevo":** Queda estrictamente prohibido colocar botones secundarios de navegación rápida (ej. *"Ver Almacenes"*, *"Ver Kárdex"*, *"Panel Operativo"*) al lado del botón primario *"Nuevo"*. Toda navegación colateral se realiza a través de la barra lateral, breadcrumbs o la Command Palette (`Cmd + K`).
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

### 4.2 Obligatoriedad Estricta de Componentes de Plantilla (Regla R3 — Bloqueante)
- **Verificación Previa Obligatoria:** Cada vez que se planifique una vista (`docs/specs/*.spec.md`) o se inicie su integración/refactorización, es obligatorio inspeccionar y utilizar exclusivamente los componentes oficiales de la plantilla (`src/@core/components/mui/*` como `CustomTextField`, `CustomAutocomplete`, `CustomAvatar`, `CustomChip`, `CustomIconButton`, `CustomTabList`, `OptionMenu`, `TablePaginationComponent`, `card-statistics`, `dialogs` y los patrones de vistas en `Archivador/full-version/src/views/apps/*`).
- **Prohibición de Componentes Ad-Hoc:** Queda estrictamente prohibido crear componentes visuales artesanales, inputs/botones HTML improvisados o patrones fuera del catálogo de la plantilla.
- **Condición de Bloqueo:** Si no se consigue el directorio de la plantilla (`Archivador/full-version`) o un componente requerido no existe en ella, **no se permite crear componentes propios por cuenta del agente**; se debe detener la creación y consultar explícitamente al usuario.
- **Saneamiento de Vistas Existentes:** Todo componente o vista que haya sido creado previamente sin seguir los átomos y bloques de la plantilla debe migrarse a los componentes oficiales de Vuexy/Foundly durante su intervención.

### 4.3 Modularidad Fiscal y Feature Flags (Regla R4)
- Toda lógica o indicador impositivo local (SENIAT, IVA 16%/8%, IGTF 3%, retenciones) debe ser estrictamente condicional y gobernada por configuración (`Feature Flags`), permitiendo que el ERP opere limpiamente en modo universal sin sobrecarga tributaria.

### 4.4 Integridad en la Navegación
- Toda nueva ruta o módulo funcional debe registrarse explícitamente tanto en el menú vertical (`verticalMenuData.tsx`) como en el horizontal (`horizontalMenuData.tsx`).

### 4.5 Type Safety Estricto
- Ningún cambio o commit se considera finalizado sin verificar compilación limpia al 100% mediante `npx tsc --noEmit`.

### 4.6 Regla de Formulario Independiente (Regla R5 — Bloqueante)
- **Criterio de Obligatoriedad:** Todo formulario de creación o edición que contenga **más de 3 inputs**, o que teniendo **3 o menos inputs contenga al menos un ComboBox / Autocomplete / Selector**, **DEBE** ser implementado como una vista independiente de página completa (`/modulo/create`, `/modulo/[id]`, etc.) y **NUNCA** como un Drawer lateral ni Dialog modal.
- **Ámbito Permitido para Drawers y Modales:** Los Drawers y Dialogs quedan estrictamente restringidos a:
  1. Diálogos de confirmación de acción (ej. anulación de documentos, confirmación destructiva de eliminación).
  2. Visualizadores rápidos de solo lectura (QuickView Drawer informativo de un registro).
  3. Formularios ultra-atómicos de máximo 1 o 2 inputs de texto plano sin selectores dependientes.
- **Arquetipo Maestro Obligatorio (`contacts/create`):** Toda vista de formulario independiente bajo la Regla R5 debe implementar la arquitectura y estructura de `/contacts/create` (unificada con la vista detalle bajo el flag `isCreate: id === 'create'`, botón `Volver` tonal en cabecera superior izquierda, barra de acciones `Cancelar` y `Guardar` en cabecera superior derecha, cuerpo en tarjetas limpias y pestañas organizadas para entidades secundarias).
- **Cláusula de Consulta Obligatoria para Nuevas Iteraciones:** Queda terminantemente prohibido asumir o inventar una estructura visual alternativa para nuevos formularios sin antes consultar explícitamente al usuario si se mantiene la estructura de `/contacts/create` o si se requiere un diseño diferente.

---

## 5. Estándar de Tablas y Listados Maestros (DataGrid Standard Contract)

Toda tabla o listado de registros principales en el ERP (Contactos, Ventas, Compras, Catálogo de Inventario, Operaciones de Almacén) debe implementar uniformemente el **Patrón Maestro de Tablas Foundly**:

### 5.1 Selección Múltiple y Estado Indeterminado
- **Checkbox Maestro en Cabecera:** Ubicado en la primera columna (`padding="checkbox"`, ancho `44px`), con soporte de tres estados (`checked`, `unchecked` e `indeterminate` o guion cuando hay selección parcial de registros).
- **Checkboxes de Fila:** Checkbox individual por fila con evento `stopPropagation()` para evitar la activación involuntaria del click en fila (apertura de Drawer o navegación).
- **Feedback de Selección:** Toda fila seleccionada debe reflejar la clase o estilo de selección sutil de marca (`rgba(108, 92, 231, 0.08)` o `.Mui-selected`).

### 5.2 Barra de Herramientas & Acciones en Lote (Batch Actions)
- **Indicador de Selección Activa:** Cuando `selectedIds.length > 0`, se despliega una pastilla interactiva animada con formato `X seleccionados` en fondo lavanda `#F3F0FF`, texto y borde `#6C5CE7` con botón `X` de deselección inmediata.
- **Botón `Acciones`:** Botón de píldora (`rounded-full`, borde `#E6E4F0`, fondo blanco `#FFFFFF`, tipografía `#1E1B2E` font-semibold, icono `tabler-settings` y chevron hacia abajo) que abre un menú flotante con:
  1. *Copiar Códigos/Correlativos Seleccionados* (hacia el portapapeles con feedback en Toast).
  2. *Acción de Estado Masivo / Anulación / Validación en Lote* (acompañado de modal `Dialog` de confirmación destructiva en caso de cancelaciones).
  3. *Deseleccionar* (limpia la selección activa).

### 5.3 Control Dinámico de Visibilidad de Columnas (`Columnas`)
- **Botón `Columnas`:** Botón de píldora estilizado (`variant="outlined"`, `rounded-full`, borde `#E6E4F0`, texto e ícono `tabler-layout-columns` en morado de marca `#6C5CE7`) ubicado en la barra superior o cabecera de la tabla junto al contador de registros.
- **Menú Interactivo:** Despliega un menú con checkboxes que permite ocultar o mostrar dinámicamente columnas de datos secundarias para optimizar el espacio de lectura.
- **Opción de Restablecimiento:** Incluye al pie del menú la opción destacada `Restablecer Columnas` con icono `tabler-rotate` para revertir rápidamente al diseño de columnas por defecto del sistema.

### 5.4 Botón Primario Conciso ("Nuevo") y Encabezados Compactos
- **Botón de Creación Primario:** El botón de acción principal de creación debe etiquetarse de manera concisa y uniforme como `"Nuevo"` (o `"+ Nuevo"`, acompañado del ícono semántico vectorial correspondiente, ej. `tabler-plus`), evitando frases redundantes o excesivamente largas como *"Nueva Recepción"*, *"Nueva Entrega"*, *"Nueva Solicitud / Cotización"* o *"Nuevo Producto"*.
- **Subtítulos de Sección Compactos:** Los textos explicativos situados inmediatamente debajo del título de cada vista o apartado deben ser concisos, directos y de una sola línea (máximo ~50 caracteres), preservando el espacio vertical de la pantalla para el trabajo operativo útil y evitando párrafos redundantes.
- **Búsqueda Contextual Vía Command Palette (`Cmd + K`):** Queda prohibido añadir controles o selects dispersos de "Agrupar por" que distorsionen o sobrecarguen la cabecera de las tablas. La búsqueda avanzada, segmentación o filtrado específico por módulo se canaliza a través de la Command Palette (`Cmd + K` / `⌘K`), la cual detecta el módulo activo para ofrecer búsquedas y filtros contextuales directos.

