# Especificación: Gestión del Ciclo Comercial (Ventas y Cotizaciones) [HU1 a HU5]

- **ID de Spec:** SPEC-006
- **Estado:** Implementado (Verificado con `npx tsc --noEmit`)
- **Fecha:** 2026-10-15
- **Épica:** Gestión del Ciclo Comercial (Ventas y Cotizaciones)
- **Alcance:** Exclusivamente Frontend del Módulo de Ventas y Cotizaciones (`/sales/quotes`, `/sales/quotes/create`, `/sales/quotes/[id]`, `/sales/quotes/[id]/edit`).
- **Gobernanza:** `constitution.md` (Clean Light UI, Foundly Tokens, Geometría de Píldora) y `agent.md` (Sintaxis EARS, Reglas R1-R5).

---

## 1. Contexto, Objetivos y Delimitación Estricta de Alcance (Boundary)

### 1.1 Contexto de Negocio
El módulo de **Ventas y Cotizaciones** gestiona el ciclo comercial inicial del ERP Foundly: desde la creación de un presupuesto borrador o emitido, negociación y control de vigencia ante variaciones cambiarias, hasta su aprobación y conversión final en Orden de Venta con reserva de inventario para el posterior proceso de facturación y despacho.

### 1.2 Delimitación Estricta de Alcance (Boundary)
- **Aislamiento de Módulo:** Este desarrollo se circunscribe estrictamente al dominio de Cotizaciones y Órdenes de Venta.
- **Prohibición de Modificación Interna:** Queda terminantemente prohibido crear, modificar o alterar las tablas, vistas y esquemas de base de datos de los módulos de **Directorio de Terceros (Clientes)**, **Inventario (Productos/Almacén)** y **Facturación**.
- **Integración por Servicios Desacoplados:** Toda interacción con módulos externos se realiza exclusivamente mediante endpoints REST o adaptadores de servicio fuertemente tipados:
  - Clientes: `GET /api/clients?search=` (búsqueda debounced por RIF/Cédula/Nombre).
  - Catálogo de Productos y Existencias: `GET /api/products` (retornando banderas de stock, disponibilidad y precios).
  - Tasa Cambiaria: Consumo de la tasa oficial del Banco Central de Venezuela (BCV), sincronizada diariamente vía CRON a las 7:00 AM (`tasa_bcv_id`).
  - Reserva de Stock y Facturación: Disparo de eventos en la conversión a orden de venta (`POST /api/sales/orders/from-quote/{quote_id}`) que actualizan el `stock_comprometido` y dejan la orden lista para la facturación externa.

### 1.3 Feature Flags Requeridos (Regla R4)
El módulo opera condicionalmente según los siguientes Feature Flags configurables a nivel de tenant/organización:
```typescript
export interface SalesFeatureFlags {
  // Flag global para activar localización tributaria venezolana
  TAXES_ENABLED: boolean; // Si es false, opera en modo neto universal
  IVA_RATE: number; // Por defecto 16% (o 8% reducido / 0% exento)
  IGTF_ENABLED: boolean; // 3% sobre pagos o transacciones en divisas
  SENIAT_FORMAT_VALIDATION: boolean; // Si es true, valida RIF/Cédula ^[VEJG]-\d{8,9}$
  STOCK_VALIDATION_MODE: 'STRICT' | 'FLEXIBLE'; // STRICT bloquea; FLEXIBLE advierte pero permite en ítems físicos
}
```

---

## 2. Reutilización de Componentes de Plantilla Vuexy (Regla R3)

Para evitar reinventar componentes de interfaz, se reutilizan y adaptan los patrones probados de Vuexy (`Archivador/full-version` - `apps/invoice` y `apps/ecommerce`):

| Vista / Sección | Patrón de Referencia Vuexy | Adaptación en Foundly Clean Light UI |
| :--- | :--- | :--- |
| **Listado de Cotizaciones (`HU2`)** | `apps/invoice/list` (`InvoiceListTable`, `TablePagination`) | Tabla responsiva (switch a tarjetas a 768px), chips de estado `rounded-full`, columnas duales USD/VES, Drawer lateral de vista rápida (`QuoteQuickViewDrawer`). |
| **Formulario Maestro-Detalle (`HU1`)** | `apps/invoice/add` (`InvoiceAddCard`, `InvoiceActions`) | Cabecera suspendida (`Card` blanca, 20px radius, 1px `#E6E4F0`), selector predictivo de cliente con `CustomAutocomplete`, selector de moneda/tasa BCV, repeater de ítems dinámicos con eliminación y cálculo reactivo. |
| **Líneas de Ítems (Repeater)** | `apps/invoice/add/AddCard` (sección repeater de productos) | Filas con `CustomAutocomplete` de productos, selector de cantidad con popover de inventario, columna `#` ultra-compacta (28px), badge monolínea de alícuota (`16%` / `0%`, 22px), inputs numéricos estilizados y cálculo reactivo de subtotales. |
| **Resumen de Totales Bimonetario** | `apps/invoice/add` (bloque de totales finales) | Desglose claro con doble moneda (USD / VES), switch interactivo único para activar/desactivar IVA en el presupuesto, renglones fiscales condicionales (IVA / IGTF) gobernados por Feature Flags, y total destacado con tipografía `h5` bold en morado `#6C5CE7`. |
| **Detalle de Cotización (`HU3-HU5`)** | `apps/invoice/preview` & `apps/ecommerce/orders/details` | Ficha completa con barra superior de navegación secuencial `[ ◄ ] X / N [ ► ]`, timeline de ciclo de vida (`DRAFT` → `ISSUED` → `APPROVED` → `ORDER`), panel sticky de acciones (`Aprobar`, `Recalcular`, `Anular`, `Generar Orden`). |
| **Modal de Anulación (`HU4`)** | `components/dialogs/ConfirmationDialog` | Modal accesible con fondo translúcido, campo de texto obligatorio `"Motivo de anulación"` (`CustomTextField` multilínea) y botón píldora carmesí `#EF4444`. |
| **Carga y Resiliencia** | `@mui/material/Skeleton`, `@core/components/mui/Alert` | Skeletons estructurados para tabla y formulario maestro; Toast (`Snackbar` + `Alert`) para eventos de éxito y errores HTTP. |

---

## 3. Navegación y Rutas del Sistema (Regla R5)

Las rutas del módulo se registran explícitamente tanto en el menú vertical (`src/data/navigation/verticalMenuData.tsx`) como en el menú horizontal (`src/data/navigation/horizontalMenuData.tsx`):

```text
/sales/quotes             -> Listado de cotizaciones, filtros y acceso a vista rápida
/sales/quotes/create      -> Formulario Maestro-Detalle de creación (Borrador / Emisión)
/sales/quotes/[id]        -> Ficha Completa de consulta, trazabilidad y transiciones de estado
/sales/quotes/[id]/edit   -> Edición de cotización (permitida solo en estado DRAFT)
```

**Ícono de Navegación del Sistema:** `tabler-file-invoice` o `tabler-file-dollar` (exclusivamente Tabler Icons, sin emojis).

---

## 4. Definición de Tipos e Interfaces (TypeScript) y Esquemas de Validación

### 4.1 Tipos del Dominio Comercial
```typescript
export type CurrencyCode = 'USD' | 'VES';

export type QuoteStatus = 'DRAFT' | 'ISSUED' | 'APPROVED' | 'EXPIRED' | 'CANCELED';

export type ProductItemType = 'PHYSICAL' | 'DROPSHIPPING' | 'SERVICE';

export interface BcvRate {
  id: string;
  tasa: number; // e.g. 36.50
  fecha_valor: string; // ISO Date YYYY-MM-DD
  fuente: 'BCV_OFICIAL';
  sincronizado_at: string; // ISO Timestamp
}

export interface ClientLookup {
  id: string;
  identificacion: string; // RIF (J-12345678-9) o C.I. (V-12345678)
  nombre_razon_social: string;
  nombre_comercial?: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad?: string;
  estado?: string;
}

export interface ProductLookup {
  id: string;
  sku: string;
  nombre: string;
  descripcion?: string;
  tipo: ProductItemType;
  is_physical_stock: boolean; // Si es true, requiere control de existencias
  manages_stock: boolean;
  stock_fisico: number;
  stock_comprometido: number;
  stock_disponible: number; // stock_fisico - stock_comprometido
  precio_unitario_base: number; // en USD
  alicuota_iva?: '16' | '8' | '0' | 'EXEMPT';
}

export interface QuoteLine {
  id: string;
  producto_id: string;
  producto_sku: string;
  producto_nombre: string;
  is_physical_stock: boolean;
  cantidad: number;
  precio_unitario: number; // en Moneda Base (USD)
  descuento_porcentaje: number; // 0 a 100%
  monto_descuento: number;
  subtotal_neto: number; // cantidad * (precio_unitario * (1 - descuento/100))
  alicuota_iva?: string;
  monto_iva?: number;
  total_linea: number;
  stock_disponible_al_momento?: number;
}

export interface Quote {
  id: string;
  correlativo: string; // Ej: COT-2026-0042 o "BORRADOR" si DRAFT
  cliente: ClientLookup;
  estado: QuoteStatus;
  moneda_base: CurrencyCode;
  tasa_bcv: BcvRate;
  vigencia_dias: number;
  aplica_iva: boolean; // Si es false, la cotización opera exenta de IVA
  fecha_emision: string; // ISO Date
  fecha_vencimiento: string; // ISO Date
  items: QuoteLine[];
  
  // Totales en Moneda Base (USD)
  subtotal_usd: number;
  descuento_total_usd: number;
  base_imponible_usd?: number;
  monto_exento_usd?: number;
  iva_total_usd: number;
  igtf_total_usd?: number;
  total_usd: number;

  // Totales en Moneda Local (VES)
  subtotal_ves: number;
  descuento_total_ves: number;
  base_imponible_ves?: number;
  monto_exento_ves?: number;
  iva_total_ves: number;
  igtf_total_ves?: number;
  total_ves: number;

  observaciones?: string;
  terminos_condiciones?: string;
  motivo_anulacion?: string;
  orden_venta_id?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateQuotePayload {
  cliente_id: string;
  moneda_base: CurrencyCode;
  vigencia_dias: number;
  aplica_iva?: boolean; // Control opcional de IVA a nivel de documento
  observaciones?: string;
  terminos_condiciones?: string;
  items: {
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
    descuento_porcentaje: number;
    alicuota_iva?: string; // '16' | '0' | 'EXEMPT'
  }[];
  emitir_inmediatamente?: boolean; // true genera estado ISSUED con correlativo
}

export interface SalesOrderConversionResponse {
  success: boolean;
  orden_id: string;
  correlativo_orden: string; // Ej: ORD-2026-0015
  quote_id: string;
  estado: 'GENERATED';
  stock_comprometido_actualizado: boolean;
  message: string;
  created_at: string;
}

export interface QuotesFilterState {
  search: string;
  estado: QuoteStatus | 'ALL';
  fecha_desde?: string;
  fecha_hasta?: string;
  cliente_id?: string;
}
```

### 4.2 Esquemas de Validación con Zod
```typescript
import { z } from 'zod';

export const quoteLineItemSchema = z.object({
  producto_id: z.string().min(1, 'Debe seleccionar un producto'),
  producto_sku: z.string(),
  producto_nombre: z.string(),
  is_physical_stock: z.boolean(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().min(0, 'El precio no puede ser negativo'),
  descuento_porcentaje: z.number().min(0).max(100, 'El descuento debe ser entre 0% y 100%'),
  stock_disponible: z.number().optional()
});

export const createQuoteFormSchema = z.object({
  cliente_id: z.string().min(1, 'Debe seleccionar un cliente'),
  identificacion_cliente: z.string().optional(),
  moneda_base: z.enum(['USD', 'VES']),
  vigencia_dias: z.number().int().min(1, 'La vigencia mínima es de 1 día').max(90, 'La vigencia máxima es de 90 días'),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  terminos_condiciones: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  items: z.array(quoteLineItemSchema).min(1, 'Debe agregar al menos una línea de producto o servicio')
});

export const cancelQuoteFormSchema = z.object({
  motivo_anulacion: z.string().min(5, 'El motivo de anulación debe tener al menos 5 caracteres').max(300)
});

export type CreateQuoteFormValues = z.infer<typeof createQuoteFormSchema>;
export type CancelQuoteFormValues = z.infer<typeof cancelQuoteFormSchema>;
```

---

## 5. Matriz de Requerimientos Funcionales en Sintaxis EARS

### 5.1 Requisitos Ubicuos (Universal)
- **EARS-UB-01 (Clean Light UI Design System):** *The system shall* render all cards, panels, and data surfaces in pure white (`#FFFFFF`) with 1px lavender border (`#E6E4F0`), rounded corners of 20px, and suspended elevation (`opacity ≤ 0.05`), prohibiting dark panels or dark containers in the workspace.
- **EARS-UB-02 (Geometría de Píldora):** *The system shall* render all action buttons (`Guardar Borrador`, `Emitir`, `Aprobar`, `Anular`, `Generar Orden`), status chips, and quantity pills with full pill geometry (`rounded-full`, 9999px).
- **EARS-UB-03 (Bimonetarismo Dual Simultáneo):** *The system shall* display financial amounts (subtotales, descuentos, impuestos y totales) simultaneously in Base Currency (`USD`) and Local Currency (`VES`) across list tables, detail views, and quick view drawers.
- **EARS-UB-04 (Tasa Oficial BCV Visible):** *The system shall* display the active official BCV rate with its value date (`fecha_valor`), source badge, and last synchronization timestamp in the header bar of both the creation form and the detail view.
- **EARS-UB-05 (Prevención de Doble Envío):** *The system shall* disable any action button (`Guardar Borrador`, `Emitir`, `Aprobar Presupuesto`, `Confirmar Anulación`, `Generar Orden de Venta`) and render an internal loading spinner while the asynchronous HTTP request is in progress.
- **EARS-UB-06 (Iconografía Vectorial Tabler):** *The system shall* strictly use vector Tabler Icons (`tabler-*`) for all categories, buttons, and status indicators, prohibiting Unicode emojis in UI controls.
- **EARS-UB-07 (Truncado y Tooltips de Accesibilidad):** *The system shall* truncate long client names and product descriptions with ellipsis (`...`) on table rows while exposing the complete text in accessible tooltips upon hover.
- **EARS-UB-08 (Columna de Índice Angosta):** *The system shall* restrict the `#` index column in item tables to a compact width of 28px (`minWidth: 28px, maxWidth: 32px, px: 0.5`) to preserve maximum horizontal canvas for product selectors, quantity, and pricing fields.
- **EARS-UB-09 (Etiquetas de Alícuota Monolínea Compactas):** *The system shall* render item-level VAT indicators strictly in a single compact line displaying `16%` (gravado) or `0%` (exento / sin IVA) with fixed height (`h-[22px]`, `whitespace-nowrap`, `leading-none`), preventing line breaks or vertical stretching of table rows.
- **EARS-UB-10 (Control Unificado de Régimen de IVA en Totales):** *The system shall* locate the general quote VAT toggle switch exclusively inside the sticky summary card (`QuoteTotalsCard`), prohibiting redundant duplicate switches in master detail header cards.

### 5.2 Requisitos Basados en Eventos (Event-driven)
- **EARS-EV-01 (Búsqueda Predictiva de Cliente Debounced):** *WHEN* the user types in the client selection field, *the system shall* debounce the query by 300ms, call `GET /api/clients?search={query}`, and display matching contacts showing identity document (RIF/C.I.), trade name, and commercial contact.
- **EARS-EV-02 (Selección de Producto y Auto-completado):** *WHEN* the user selects a product in an item row, *the system shall* auto-populate the line's unit base price, VAT rate, stock availability badge, and physical stock flag.
- **EARS-EV-03 (Recálculo Reactivo de Totales):** *WHEN* the user changes quantity, unit price, or discount on any item row, *the system shall* immediately recompute the line's subtotal, order subtotal, discounts, conditional taxes, and total amounts in both `USD` and `VES` without requiring manual submission.
- **EARS-EV-04 (Guardar Borrador - HU1):** *WHEN* the user clicks `"Guardar Borrador"`, *the system shall* validate the form, persist the quote with status `DRAFT` via `POST /api/sales/quotes`, assign temporary status indicator `"BORRADOR"`, and emit a green Toast: *"Cotización guardada en borrador exitosamente"*.
- **EARS-EV-05 (Emitir Cotización - HU1):** *WHEN* the user clicks `"Emitir Presupuesto"`, *the system shall* persist the quote with status `ISSUED`, generate a unique formal consecutive code format `COT-2026-XXXX`, calculate expiration date (`fecha_emision + vigencia_dias`), freeze commercial prices, and redirect to the detail view with a confirmation Toast: *"Cotización emitida exitosamente con correlativo {correlativo}"*.
- **EARS-EV-06 (Apertura de Vista Rápida - HU2):** *WHEN* the user clicks anywhere on a quote table row, *the system shall* open the consultation drawer (`QuoteQuickViewDrawer`) showing client summary, dual totals, lines breakdown, and a primary button labeled `"Ficha Completa"` navigating to `/sales/quotes/[id]`.
- **EARS-EV-07 (Aprobar Cotización - HU3):** *WHEN* the user clicks `"Aprobar Presupuesto"` and the quote is within its validity period, *the system shall* prompt for confirmation, update status to `APPROVED` via `PUT /api/sales/quotes/{id}/status`, lock commercial conditions, and emit a green Toast: *"Presupuesto aprobado exitosamente"*.
- **EARS-EV-08 (Recalcular con Nueva Tasa BCV - HU3):** *WHEN* the user clicks `"Recalcular con nueva tasa BCV"` on an expired or outdated quote, *the system shall* fetch the current active BCV rate, recalculate the VES totals according to the new exchange rate, update `fecha_vencimiento` according to `vigencia_dias`, and emit a notification Toast: *"Presupuesto recalculado con la tasa BCV actual ({tasa} VES/USD)"*.
- **EARS-EV-09 (Anular Cotización - HU4):** *WHEN* the user clicks `"Anular"`, *the system shall* open a confirmation modal requiring a mandatory reason for cancellation (`motivo_anulacion`), and *WHEN* confirmed, *the system shall* update the status to `CANCELED` via soft delete, remove active actions, and emit a warning Toast: *"Cotización anulada"*.
- **EARS-EV-10 (Convertir a Orden de Venta - HU5):** *WHEN* the user clicks `"Generar Orden de Venta"`, *the system shall* call `POST /api/sales/orders/from-quote/{quote_id}`, verify real-time physical warehouse stock, reserve inventory (`stock_comprometido`), link `orden_venta_id`, and redirect to the created sales order with a success Toast: *"Orden de venta {correlativo_orden} generada exitosamente"*.
- **EARS-EV-11 (Navegación Secuencial en Ficha):** *WHEN* the user clicks `[ ◄ ]` or `[ ► ]` in `/sales/quotes/[id]`, *the system shall* seamlessly load the previous or next quote without losing current filter context in the list table.
- **EARS-EV-12 (Alternar Aplicación de IVA en Cotización o Línea):** *WHEN* the user toggles the quote-level "Aplica IVA" switch or alters a line item's tax status between "Gravado (16%)" and "Exento (0%)", *the system shall* reactively recompute taxable base, exempt base, and VAT in both `USD` and `VES` without page reload.

### 5.3 Requisitos Basados en Estado (State-driven)
- **EARS-ST-01 (Desglose Fiscal Modular - Feature Flag R4):** *WHILE* `TAXES_ENABLED` is `true`, *the system shall* calculate, breakdown, and display VAT (`IVA 16%` o alícuota correspondiente) and `IGTF 3%` (if applicable) in the totals card in both USD and VES.
- **EARS-ST-02 (Modo Neto Universal - Feature Flag R4):** *WHILE* `TAXES_ENABLED` is `false`, *the system shall* operate strictly in universal net mode ($\text{Subtotal} - \text{Descuentos} = \text{Total}$), completely hiding any SENIAT tax indicator, tax chip, or tax breakdown row.
- **EARS-ST-03 (Control de Stock Físico en Tiempo Real):** *WHILE* an item has `is_physical_stock === true`, *the system shall* display a stock pill (`Disponible: {stock_disponible}`) and validate that `cantidad <= stock_disponible` (`stock_fisico - stock_comprometido`).
- **EARS-ST-04 (Omisión de Control de Stock para Servicios y Dropshipping):** *WHILE* an item has `is_physical_stock === false` (`tipo === 'SERVICE'` o `tipo === 'DROPSHIPPING'`), *the system shall* omit warehouse availability checks and display a neutral badge (`Servicio` o `Bajo Pedido`).
- **EARS-ST-05 (Bloqueo de Conversión a Orden):** *WHILE* quote status is not `APPROVED`, *the system shall* keep the `"Generar Orden de Venta"` action button disabled.
- **EARS-ST-06 (Inmutabilidad de Cotizaciones Emitidas/Aprobadas):** *WHILE* quote status is `ISSUED`, `APPROVED`, `EXPIRED`, or `CANCELED`, *the system shall* render the master form in read-only consultation mode, prohibiting direct modification of lines, quantities, or prices (forcing recálculo or nueva cotización si expira).
- **EARS-ST-07 (Skeletons Durante Carga):** *WHILE* quotes data, client lookups, or product catalogs are loading, *the system shall* render responsive skeleton loaders on tables, cards, and detail summaries.
- **EARS-ST-08 (Régimen Exento o Sin IVA):** *WHILE* `aplica_iva` is `false` or an item is marked as exempt (`alicuota_iva === 'EXEMPT' || alicuota_iva === '0'`), *the system shall* compute VAT as 0.00 for the respective base, display a compact "0%" badge, and keep the total equal to Subtotal minus Discounts.

### 5.4 Requisitos de Excepción (Unwanted Behavior)
- **EARS-EX-01 (Líneas Vacías):** *IF* the user attempts to save a draft or emit a quote with zero item lines (`items.length === 0`), *THEN the system shall* block submission and display an inline validation alert: *"Debe agregar al menos una línea de producto o servicio antes de continuar"*.
- **EARS-EX-02 (Validación de RIF Venezolano):** *IF* `SENIAT_FORMAT_VALIDATION` is active and the client's identification does not match the regex `^[VEJG]-\d{8,9}$`, *THEN the system shall* highlight the field in crimson `#EF4444` and block submission.
- **EARS-EX-03 (Exceso de Stock Físico en Ítems Almacenables):** *IF* the quoted quantity of a physical item exceeds `stock_disponible` and `STOCK_VALIDATION_MODE === 'STRICT'`, *THEN the system shall* flag the row in crimson `#EF4444`, display the message *"Cantidad excede existencias disponibles ({stock_disponible})"*, and disable emission and conversion.
- **EARS-EX-04 (Tasa BCV Desfasada o Expiración en Aprobación - HU3):** *IF* a user attempts to approve a quote whose `fecha_vencimiento < current_date` OR whose recorded BCV rate differs from the current active official rate, *THEN the system shall* block direct approval, display a warning banner: *"La cotización ha expirado o la tasa oficial BCV ha cambiado. Recalcule el presupuesto para continuar"*, and prominently display the button `"Recalcular con nueva tasa BCV"`.
- **EARS-EX-05 (Anulación sin Motivo - HU4):** *IF* the user submits the cancellation dialog without filling `motivo_anulacion` (or with fewer than 5 characters), *THEN the system shall* disable the confirmation button and show an error helper text.
- **EARS-EX-06 (Falla de Red o Error HTTP):** *IF* any endpoint responds with HTTP 400, 422, or 500, *THEN the system shall* trap the error, display an error Toast with the server message, and keep user inputs intact without causing loss of filled form data.

---

## 6. Criterios de Aceptación (DoD) Comprobables por Historia de Usuario

### HU1: Crear y Emitir Cotización
- [x] **CA-HU1-01:** El formulario maestro-detalle permite seleccionar el cliente mediante `CustomAutocomplete` con búsqueda debounced (`GET /api/clients?search=`).
- [x] **CA-HU1-02:** El usuario puede agregar y remover líneas dinámicamente con selección predictiva de productos, inputs compactos de 34px y popover de stock interactivo junto a cantidad.
- [x] **CA-HU1-03:** Los totales en USD y VES se calculan reactivamente en tiempo real al modificar cantidades, precios y porcentajes de descuento.
- [x] **CA-HU1-04:** La acción `"Guardar Borrador"` persiste la entidad con estado `DRAFT` y correlativo provisional `"BORRADOR"`.
- [x] **CA-HU1-05:** La acción `"Emitir Presupuesto"` genera el correlativo formal `COT-2026-XXXX`, calcula la fecha de vencimiento y congela los precios base.
- [x] **CA-HU1-06:** El sistema bloquea el guardado si no hay ítems en la tabla.
- [x] **CA-HU1-07:** El usuario puede alternar la aplicación de IVA a nivel general de cotización mediante el switch `"Aplica Impuesto IVA (16%)"` ubicado en la tarjeta de totales y a nivel individual de cada línea (`16%` vs `0%`).
- [x] **CA-HU1-08:** Cuando aplican ítems exentos o cotización sin IVA, el sistema desglosa Base Gravada, Base Exenta y calcula el IVA únicamente sobre los montos gravados.
- [x] **CA-HU1-09:** La columna `#` de numeración de ítems en la tabla posee ancho ultra-compacto (`28px`, `minWidth: 28px, maxWidth: 32px, px: 0.5`) para maximizar el espacio de los campos interactivos.
- [x] **CA-HU1-10:** Las etiquetas de alícuota en cada fila son monolínea compactas (`h-[22px]`, `whitespace-nowrap`, `leading-none`) mostrando exclusivamente `16%` o `0%` sin desbordar ni provocar altura vertical excesiva en la fila.
- [x] **CA-HU1-11:** El control general de activación del régimen de IVA se centraliza exclusivamente en `QuoteTotalsCard`, eliminando duplicaciones en la cabecera del maestro.

### HU2: Consultar y Listar Cotizaciones
- [x] **CA-HU2-01:** La tabla de cotizaciones muestra columnas: `Correlativo`, `Cliente`, `Fecha Emisión`, `Vencimiento`, `Monto USD`, `Monto VES`, `Estado` y acciones discretas estandarizadas (`tabler-eye`, `tabler-arrow-up-right`, `tabler-edit`, `tabler-ban`).
- [x] **CA-HU2-02:** Los estados se representan con Chips `rounded-full` de acuerdo a los tokens semánticos:
  - `DRAFT`: Gris neutro (`#6B7280`).
  - `ISSUED`: Azul info (`#38BDF8`).
  - `APPROVED`: Verde esmeralda (`#10B981`).
  - `EXPIRED`: Ámbar warning (`#F59E0B`).
  - `CANCELED`: Carmesí error (`#EF4444`).
- [x] **CA-HU2-03:** Al hacer clic en cualquier fila o en el botón de vista rápida se despliega el Drawer lateral de consulta rápida (`QuoteQuickViewDrawer`) sin romper la tabla.
- [x] **CA-HU2-04:** Switch responsivo automático en 768px: en dispositivos móviles la tabla transmuta a tarjetas limpias sin scroll horizontal (`QuotesMobileList`).
- [x] **CA-HU2-05:** Filtros unificados con altura de 38px, alineación base limpia y búsqueda general por cliente/correlativo (`QuotesListFilters`).

### HU3: Actualizar y Aprobar Cotización
- [x] **CA-HU3-01:** En `/sales/quotes/[id]`, el botón `"Aprobar Presupuesto"` cambia el estado a `APPROVED` si la cotización está vigente.
- [x] **CA-HU3-02:** Si la cotización venció o la tasa BCV ha cambiado, el botón de aprobación directa se deshabilita y se activa el banner explicativo junto con el botón `"Recalcular con nueva tasa BCV"`.
- [x] **CA-HU3-03:** El recálculo actualiza los montos en VES con la nueva tasa oficial y reextiende la vigencia en días configurada.
- [x] **CA-HU3-04:** Incorporación de navegador secuencial `[ ◄ ] X / N [ ► ]` en la barra superior para explorar cotizaciones y pestañas de contenido en el cuerpo de la ficha.

### HU4: Anular Cotización (Soft Delete)
- [x] **CA-HU4-01:** Al presionar `"Anular"`, se abre un modal de diálogo solicitando el motivo obligatorio (`CancelQuoteModal`).
- [x] **CA-HU4-02:** La anulación actualiza el estado a `CANCELED` preservando el historial en base de datos (cero borrado físico).
- [x] **CA-HU4-03:** La cotización anulada muestra un banner con el motivo y la fecha de anulación.

### HU5: Convertir a Orden de Venta
- [x] **CA-HU5-01:** El botón `"Generar Orden de Venta"` solo está habilitado cuando `estado === 'APPROVED'`.
- [x] **CA-HU5-02:** Antes de confirmar la conversión, el sistema valida que todos los ítems con `is_physical_stock === true` posean stock suficiente.
- [x] **CA-HU5-03:** Al completar la conversión (`POST /api/sales/orders/from-quote/{quote_id}`), se registra la reserva de existencias (`stock_comprometido`) y se enlaza la orden resultante.

### Requisitos Generales de Sistema y Calidad
- [x] **CA-GEN-01:** Cumplimiento del 100% de las pautas de Foundly Clean Light UI (`#FFFFFF`, bordes `#E6E4F0`, inputs `#F4F3F8`, botones píldora `rounded-full`, íconos `tabler-*`).
- [x] **CA-GEN-02:** Deshabilitación de botones con feedback visual de spinner durante operaciones asíncronas para prevenir doble clic.
- [x] **CA-GEN-03:** Navegación registrada y visible en menú vertical y horizontal (`/sales/quotes`).
- [x] **CA-GEN-04:** Cero errores de compilación y tipado estricto verificado con `npx tsc --noEmit`.

---

## 7. Plan de Implementación Paso a Paso en Frontend

1. **Fase 1: Tipos, Contratos y Esquemas de Validación**
   - Crear `src/types/salesQuotesTypes.ts` con todos los contratos de dominio, filtros y payloads.
   - Crear `src/views/sales/quotes/schemas/quoteFormSchema.ts` con validaciones Zod para creación y anulación.
2. **Fase 2: Capa de Servicios y Adaptadores Desacoplados**
   - Crear `src/services/salesQuotesService.ts` simulando/conectando los endpoints REST con clientes y productos mock.
   - Crear `src/data/sales/quotes/mockQuotesData.ts` con registros representativos en distintos estados (`DRAFT`, `ISSUED`, `APPROVED`, etc.).
3. **Fase 3: Componentes UI Atómicos y Reutilizables**
   - `QuoteStatusChip.tsx`: Chip con geometría `rounded-full` y tokens semánticos.
   - `BcvRateBadge.tsx`: Indicador visual de tasa oficial y sincronización.
   - `ClientAutocomplete.tsx`: Selector predictivo con debounce de 300ms.
   - `QuoteTotalsCard.tsx`: Resumen de subtotales, impuestos condicionales y totales duales USD/VES.
   - `CancelQuoteModal.tsx`: Diálogo modal con validación de motivo de anulación.
4. **Fase 4: Vista de Listado y Vista Rápida (`HU2`)**
   - `QuotesTable.tsx`: Tabla paginada de escritorio con ordenamiento y badges.
   - `QuotesMobileList.tsx`: Renderizado responsivo para pantallas < 768px.
   - `QuoteQuickViewDrawer.tsx`: Drawer lateral de lectura ágil.
   - `QuotesListFilters.tsx`: Barra de filtros por fecha, estado y buscador general.
   - `src/app/(dashboard)/sales/quotes/page.tsx`: Ruta principal del listado.
5. **Fase 5: Formulario Maestro-Detalle de Creación / Edición (`HU1`)**
   - `QuoteMasterDetailForm.tsx`: Componente maestro con cabecera de cliente/moneda/vigencia y repeater de ítems.
   - `QuoteItemRow.tsx`: Fila interactiva de producto con validación de existencias.
   - `src/app/(dashboard)/sales/quotes/create/page.tsx`: Ruta de nueva cotización.
   - `src/app/(dashboard)/sales/quotes/[id]/edit/page.tsx`: Ruta de edición de borrador.
6. **Fase 6: Ficha Completa y Transición de Estados (`HU3, HU4, HU5`)**
   - `QuoteDetailView.tsx`: Ficha integral con navegador `[ ◄ ] X / N [ ► ]`, panel de acciones contextuales (`Aprobar`, `Recalcular`, `Anular`, `Generar Orden de Venta`).
   - `src/app/(dashboard)/sales/quotes/[id]/page.tsx`: Ruta de detalle.
7. **Fase 7: Registro en Menús y Gobernanza (Reglas R1, R4, R5)**
   - Registrar la entrada en `src/data/navigation/verticalMenuData.tsx` y `src/data/navigation/horizontalMenuData.tsx`.
   - Limpieza de cualquier archivo temporal o huérfano.
8. **Fase 8: Verificación de Tipos y Calidad**
   - Ejecutar `npx tsc --noEmit` garantizando 0 errores.
   - Verificación de checklist contra `constitution.md`.
