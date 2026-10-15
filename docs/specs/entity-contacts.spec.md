# Especificación: Directorio Maestro de Contactos & Entidades (HU-05)

- **ID de Spec:** SPEC-005
- **Estado:** Implementado (Conforme a EARS, Foundly Design System y SpecKit)
- **Fecha:** 2026-10-15
- **Alcance:** Módulo integral de Directorio de Contactos (`/contacts`) y Ficha Completa (`/contacts/[id]`).
- **Gobernanza:** `constitution.md` (Clean Light UI, Foundly Tokens) y `agent.md` (Sintaxis EARS, Reglas R1-R5).

---

## 1. Contexto y Delimitación de Alcance (Boundary)

El módulo **Contactos & Directorio** centraliza la gestión de clientes, proveedores, personas naturales y empresas asociadas:
- Opera como módulo integral desacoplado en la ruta `/contacts` y `/contacts/[id]`.
- No modifica ni interfiere con las reglas de negocio de Ventas, Compras ni Facturación de otros módulos.
- Adopta una arquitectura de doble modo: **Vista Rápida (Drawer lateral)** y **Ficha Completa (`/contacts/[id]`)** con navegación secuencial.

### Componentes de Plantilla Reutilizados (Regla R3)
- `CustomTextField` de `@core/components/mui/TextField`
- `@mui/material/Table`, `TableBody`, `TableCell`, `TableContainer`, `TableHead`, `TableRow`
- `@mui/material/Skeleton` para loaders estructurados (Tabla y Tarjetas móviles)
- `@mui/material/Drawer` lateral (`anchor="right"`)
- `Chip` / `CustomChip` con geometría de píldora (`rounded-full`)
- Íconos vectoriales del sistema: Tabler Icons (`tabler-*`), prohibiendo el uso de emojis informales en selectores y formularios.

---

## 2. Definición de Tipos e Interfaces (TypeScript)

```typescript
export type EntityType = 'EMPRESA' | 'INDIVIDUAL';

export type ContactPersonRole =
  | 'REPRESENTANTE_LEGAL'
  | 'PAGOS_RETENCIONES'
  | 'COMPRAS'
  | 'VENTAS'
  | 'OPERATIVO'
  | 'ADMINISTRATIVO';

export type ContactRole = ContactPersonRole;

export type AddressType = 'FISCAL' | 'ENTREGA' | 'FACTURACION';

export interface EntityAddress {
  id: string;
  tipo: AddressType;
  direccion: string;
  ciudad: string;
  estado: string;
  pais: string;
  codigo_postal?: string;
  is_predeterminada: boolean;
}

export interface ContactPerson {
  id: string;
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
  rol: ContactPersonRole;
  is_principal: boolean;
  cedula_identidad?: string;
}

export type EntityOrigin = 'NACIONAL' | 'EXTRANJERO';

export interface TerceroEntity {
  id: string;
  codigo?: string; // Código comercial o interno (ej. CLI-001, PRV-042)
  origen?: EntityOrigin; // 'NACIONAL' | 'EXTRANJERO'
  tipo: EntityType; // 'EMPRESA' | 'INDIVIDUAL'
  nombre_razon_social: string;
  nombre_comercial?: string;
  identificacion: string; // RIF (J-...) o C.I. (V-..., E-...) o Tax ID
  is_cliente: boolean;
  is_proveedor: boolean;
  is_contacto: boolean;
  telefono_principal: string;
  email_principal: string;
  direccion: string;
  ciudad: string;
  estado: string;
  pais: string;
  codigo_postal?: string;
  contactos_referentes: ContactPerson[];
  direcciones_adicionales: EntityAddress[];
  status: 'ACTIVO' | 'INACTIVO';
  created_at: string;
  updated_at: string;
}
```

---

## 3. Requerimientos Funcionales en Sintaxis EARS

### 3.1 Requisitos Ubicuos
- **EARS-UB-01 (Clean Light UI):** *The system shall* render all cards and tables with pure white background (`#FFFFFF`), 1px lavender border (`#E6E4F0`), rounded corners (`20px`), and soft suspended shadow (`0 4px 18px 0 rgba(108, 92, 231, 0.05)`).
- **EARS-UB-02 (Geometría de Píldora):** *The system shall* render action buttons, classification chips, and role badges with full pill geometry (`rounded-full`).
- **EARS-UB-03 (Sin Tarjetas KPI):** *The system shall* render the contacts directory without metric KPI cards, keeping the view clean and directly focused on the directory table.
- **EARS-UB-04 (Coherencia Visual de Encabezados):** *The system shall* render page headers using `variant="h4"` bold for titles and `variant="body2"` `textSecondary` for subtitles, matching the exact styling of the Inventory catalog.
- **EARS-UB-05 (Consistencia de Íconos):** *The system shall* strictly use vector Tabler Icons (`tabler-*`) for all categories and options, prohibiting Unicode emojis in UI controls.
- **EARS-UB-06 (Altura Uniforme de Filas, Truncado con Puntos Suspensivos y Tooltips):** *The system shall* render all desktop table rows with a uniform height (`height: 64px`, `verticalAlign: 'middle'`), prohibiting multi-line vertical wrapping (`whitespace-nowrap`). Any text exceeding column boundaries (entity names, trade names, related company, location, emails) *the system shall* truncate with ellipsis (`...`) and reveal the complete value upon hover via an accessible tooltip with arrow. Reference person buttons *the system shall* constrain to compact single-line height (`h-7`) with `whitespace-nowrap`.

### 3.2 Requisitos Basados en Eventos
- **EARS-EV-01 (Clic en Fila Interactiva - Vista Rápida de Solo Lectura):** *WHEN* the user clicks anywhere on a table row or card, *the system shall* open the quick view drawer in consultation-only mode (`ContactQuickViewDrawer`) displaying full contact details and an action button labeled strictly `"Ficha Completa"` to access full editing in `/contacts/[id]`, preventing propagation on nested telephone links, email links, and action buttons.
- **EARS-EV-02 (Guardar Contacto):** *WHEN* the user submits the contact form, *the system shall* persist the entity, update the view, and emit a green Toast (`#10B981`): *"Contacto creado exitosamente"* o *"Contacto actualizado exitosamente"*.
- **EARS-EV-03 (Eliminar Contacto):** *WHEN* the user deletes a contact, *the system shall* mark `status: 'INACTIVO'`, remove it from active view, and emit a Toast: *"Contacto eliminado exitosamente"*.
- **EARS-EV-04 (Navegación Secuencial en Ficha Completa):** *WHEN* the user clicks `[ ◄ ]` or `[ ► ]` in `/contacts/[id]`, *the system shall* load the previous or next contact without returning to the main table, displaying the compact position indicator `X / N` without breaking line alignment.
- **EARS-EV-05 (Atajo de Pantalla Completa):** *WHEN* the user clicks `tabler-maximize` in the quick view drawer, *the system shall* close the drawer and navigate to `/contacts/[id]`.
- **EARS-EV-06 (Copiado Rápido de RIF):** *WHEN* the user clicks the copy icon next to the tax identification, *the system shall* copy the identification to the clipboard and display a confirmation toast.
- **EARS-EV-07 (Selección Múltiple y Acciones en Lote en Cabecera Superior):** *WHEN* the user selects one or more rows via checkboxes, *the system shall* render a compact indicator `"{N} seleccionados"` alongside an `"Acciones"` button (with gear icon `tabler-settings`) next to `"Nuevo Contacto"` in the top page header, avoiding table layout shifts. *The system shall* provide a dropdown menu with the option to batch delete with modal confirmation and a deselect action, emitting a toast with format `"X contactos eliminados exitosamente"`.
- **EARS-EV-08 (Visibilidad Dinámica y Optimización de Columnas Sin Scroll Horizontal):** *WHEN* rendering the desktop table, *the system shall* adapt to 100% of the container width (`minWidth: 780px`) without triggering a horizontal scrollbar. *The system shall* conceal the `Clasificación` (Cliente/Proveedor) column by default to save horizontal space (leveraging the top commercial filter dropdowns), while allowing users to toggle it on demand via the "Columnas" dropdown menu alongside `Ubicación`, `Contacto Directo`, and `Empresa / Referentes`.
- **EARS-EV-09 (Ordenamiento Interactivo por Columna):** *WHEN* the user clicks a sortable column header (Nombre, Clasificación/Tipo, Ubicación, Referentes), *the system shall* sort the dataset ascending or descending, displaying directional indicators (`tabler-arrow-up` / `tabler-arrow-down`).
- **EARS-EV-10 (Acceso Rápido a Personas de Contacto de Empresas - Bottom Sheet Móvil y Popover Desktop):** *WHEN* the user taps or clicks the contact persons badge/chip on an enterprise row or mobile card, *the system shall* open an anchored Popover on desktop or an ergonomic Bottom Sheet on mobile (`CompanyContactsPopoverSheet`) showing up to 2 prioritized reference persons (`is_principal` first) with avatar initials, role chips with outline star badge, direct phone calling (`tel:`), direct email (`mailto:`), and copy buttons for both telephone and email. *IF* the enterprise has more than 2 contacts, *THEN the system shall* render a full-width footer button: `"Ver los {N} contactos restantes en Ficha Completa"`.
- **EARS-EV-11 (Acordeón Desplegable de Contactos en Vista Rápida):** *WHEN* the user views company reference contacts inside `ContactQuickViewDrawer`, *the system shall* render each contact as a collapsible card showing their name, role, and avatar, and *WHEN* clicked, *the system shall* expand the card to reveal direct phone, direct email, copy buttons, and action buttons for calling and emailing.
- **EARS-EV-12 (Columna Unificada Empresa / Referentes y Proyección en Búsqueda):** *WHEN* rendering the `"EMPRESA / REFERENTES"` column, *the system shall* unify enterprise link and contact triggers in a single column without empty redundant columns: displaying `{parent_company_name}` for projected contact persons, a compact button `"{N} contactos"` (`h-7`, `whitespace-nowrap`) for company entities, and a dash (`—`) for independent individuals. *WHEN* clicked on a contact person, *the system shall* open the parent company's quick view drawer with that specific contact person auto-expanded in the accordion.
- **EARS-EV-13 (Gestión de Código Interno y Origen Fiscal Nacional/Extranjero):** *WHEN* the user configures an entity in `/contacts/[id]` or the creation drawer, *the system shall* provide dedicated inputs for internal contact code (`codigo`) and fiscal origin (`origen: 'NACIONAL' | 'EXTRANJERO'`), dynamically adjusting the identification label and placeholder (`RIF / Cédula` vs `Tax ID / ID Extranjero`), persisting these attributes upon saving, and keeping the page title header clean without redundant badges.

### 3.3 Requisitos Basados en Estado
- **EARS-ST-01 (Entidad Condicional - Empresa vs Individual):** *WHILE* `tipo === 'EMPRESA'`, *the system shall* enable and display the management of nested reference contact persons and delivery/billing addresses. *WHILE* `tipo === 'INDIVIDUAL'`, *the system shall* hide these nested sections.
- **EARS-ST-02 (Clasificación Comercial Múltiple):** *WHILE* filtering or displaying, *the system shall* allow an entity to be simultaneously marked as `is_cliente: true` and `is_proveedor: true`.
- **EARS-ST-03 (Skeleton Loaders):** *WHILE* data is loading, *the system shall* render responsive skeleton loaders on desktop table and mobile cards.

### 3.4 Requisitos de Excepción
- **EARS-EX-01 (Validación Razón Social & RIF):** *IF* the user submits without `nombre_razon_social` or `identificacion`, *THEN the system shall* block submission and highlight the validation message.
- **EARS-EX-02 (Clasificación Requerida):** *IF* neither `is_cliente`, `is_proveedor`, nor `is_contacto` is selected, *THEN the system shall* prompt the user to mark at least one commercial relationship.
- **EARS-EX-03 (Ubicación Geográfica Obligatoria):** *IF* `direccion`, `ciudad` or `estado` is missing, *THEN the system shall* require completion before persisting.

---

## 4. Criterios de Aceptación (CA-01 a CA-17)

- **CA-01:** Responsive switch at 768px (Desktop Table vs Mobile Cards without horizontal overflow).
- **CA-02:** Table row click opens side drawer seamlessly in read-only consultation mode.
- **CA-03:** Dedicated full-view route `/contacts/[id]` with compact sequential navigator `[ ◄ ] X / N [ ► ]`.
- **CA-04:** Top navigation bar in detail view uses text truncation and `shrink-0` to guarantee that action buttons stay permanently on top on the same line, even with very long entity names.
- **CA-05:** Professional Tabler Icons in select dropdowns (zero cartoon emojis).
- **CA-06:** Multi-classification support (Client & Supplier concurrently).
- **CA-07:** Conditional role assignment restricted to company reference contacts.
- **CA-08:** Zero TypeScript errors (`npx tsc --noEmit` exit code 0).
- **CA-09:** Selección múltiple mediante checkboxes individuales y de cabecera, con indicador compacto `"{N} seleccionados"` y botón con ícono de engranaje en la cabecera superior sin desplazar la tabla.
- **CA-10:** Menú desplegable "Columnas" para ocultar y mostrar columnas dinámicamente con opción de restablecer a la vista compacta sin scroll.
- **CA-11:** Ordenamiento alfabético y numérico bidireccional (A-Z / Z-A / mayor a menor) con flechas indicadoras en las cabeceras de tabla.
- **CA-12:** Acceso directo a personas de contacto de empresas en la lista principal mediante Bottom Sheet en móviles y Popover anclado en desktop, limitando la vista rápida a 2 contactos con priorización de principales y botón hacia Ficha Completa para los restantes.
- **CA-13:** Copiado ágil de teléfono y correo electrónico en tarjetas, tablas y drawers, e interactividad tipo acordeón desplegable para consultar referentes en la vista rápida.
- **CA-14:** Columna unificada inteligente "Empresa / Referentes" que combina el vínculo a la empresa en contactos proyectados y el botón compacto de referentes en empresas sin columnas redundantes ni celdas vacías innecesarias.
- **CA-15:** Altura uniforme y compacta de 64px en todas las filas de la tabla de escritorio, con truncado mediante puntos suspensivos (`...`), tooltips flotantes al pasar el cursor para revelar textos largos, y botón de referentes en una sola línea horizontal compacta (`h-7`).
- **CA-16:** Eliminación total de la barra de desplazamiento horizontal en escritorios estándar gracias al ocultamiento por defecto de la columna de clasificación (sustituida por los filtros superiores) y ajuste fluido al 100% del contenedor.
- **CA-17:** Gestión integral de Código Interno (`codigo`) y Origen Fiscal (`origen: 'NACIONAL' | 'EXTRANJERO'`) en la Ficha Completa (`/contacts/[id]`) y drawers auxiliares, con adaptación contextual de etiquetas tributarias y persistencia sin pérdidas.
