# Especificación: Gestión del Ciclo de Abastecimiento (Cotizaciones de Proveedor y Órdenes de Compra) [HU1 a HU5]

- **ID de Spec:** SPEC-007
- **Estado:** Implementado y Verificado (HU1 a HU5)
- **Fecha:** 2026-10-19
- **Épica:** Gestión del Ciclo de Abastecimiento (Cotizaciones de Proveedor y Órdenes de Compra)
- **Alcance:** Exclusivamente Frontend del Módulo de Compras (`/purchases/quotes`, `/purchases/quotes/create`, `/purchases/quotes/[id]`, `/purchases/quotes/[id]/edit`).
- **Gobernanza:** `constitution.md` (Clean Light UI, Foundly Tokens, Geometría de Píldora) y `agent.md` (Sintaxis EARS, Reglas R1-R5, Protocolo Git Preventivo).

---

## 1. Contexto, Objetivos y Delimitación Estricta de Alcance (Boundary)

### 1.1 Contexto de Negocio
El módulo de **Compras y Abastecimiento** gestiona el flujo completo de aprovisionamiento del ERP Foundly: desde el registro de una Solicitud de Cotización / Presupuesto de Proveedor (`DRAFT` / `RFQ_SENT`), evaluación de costos pactados, condiciones crediticias y control de vigencia frente a variaciones cambiarias del BCV (`HU3`), hasta su aprobación gerencial (`APPROVED`), eventual anulación auditable (`CANCELED`) o conversión definitiva en **Orden de Compra en Firme (`PURCHASE_ORDER`)** con notificación desacoplada de mercancía en tránsito (`stock_en_transito`) para los ítems físicos inventariables.

### 1.2 Delimitación Estricta de Alcance (Boundary)
- **Aislamiento de Módulo:** Este desarrollo se limita **exclusivamente** al módulo de **Compras (`HU1` a `HU5`)**.
- **Prohibición de Modificación Interna:** Queda estrictamente prohibido crear, modificar o alterar las vistas, componentes internos o tablas de los módulos de:
  1. **Directorio de Terceros (Proveedores / Contactos)**.
  2. **Inventario (Catálogo de Productos / Recepción de Almacén)**.
  3. **Cuentas por Pagar (CxP) / Tesorería**.
- **Integración por Servicios y Adaptadores Desacoplados:** Toda comunicación con dominios externos se plantea estrictamente mediante el consumo de endpoints REST o adaptadores de servicio tipados:
  - **Proveedores:** `GET /api/suppliers?search=` (o `/api/terceros?rol=PROVEEDOR`), retornando datos fiscales (`RIF/Cédula`), razón social, rol activo de proveedor, condición de pago predeterminada (`Contado` / `Crédito` y días de crédito), moneda de negociación e indicadores informativos de retención (`IVA` / `ISLR`).
  - **Productos e Insumos:** `GET /api/products`, retornando SKU, nombre, costo estándar/última compra, alícuota impositiva y la bandera `is_physical_stock` (`manages_stock`) que distingue bienes tangibles inventariables de servicios, gastos o *dropshipping*.
  - **Tasa Oficial BCV:** Consumo de la tasa oficial del Banco Central de Venezuela (`tasa_bcv_id`), sincronizada automáticamente mediante CRON diario a las 7:00 AM.
  - **Notificación de Mercancía en Tránsito y CxP:** Al convertir una solicitud aprobada en Orden de Compra (`POST /api/purchases/orders/from-quote/{quote_id}`), el servicio dispara un evento/payload desacoplado hacia Inventario para incrementar `stock_en_transito` (`incoming_stock + cantidad`) únicamente sobre los ítems con `is_physical_stock === true`, dejando la orden habilitada para su posterior Recepción de Almacén y Registro de Factura de Proveedor en Cuentas por Pagar.

### 1.3 Feature Flags Requeridos (Regla R4)
El módulo opera de forma 100% modular gobernado por los siguientes Feature Flags de configuración:

```typescript
export interface PurchasesFeatureFlags {
  // Desglose de Crédito Fiscal (IVA Compras 16% / 8% / Exento). Si es false, opera en modo Costo Neto Universal
  IVA_COMPRAS: boolean;
  // Cálculo opcional de IGTF (3%) para pagos proyectados en divisas o según negociación con el proveedor
  IGTF: boolean;
  // Validación estricta de formato fiscal venezolano (RIF/Cédula ^[VEJG]-\d{8,9}$) e indicadores de Retención IVA/ISLR
  SENIAT_FORMAT: boolean;
  // Modo de notificación de inventario en tránsito al confirmar Orden de Compra ('ENABLED' | 'DISABLED')
  STOCK_TRANSIT_MODE: 'ENABLED' | 'DISABLED';
}
```

---

## 2. Reutilización de Componentes de Plantilla Vuexy (Regla R3)

En cumplimiento de la **Regla R3**, se inspeccionan y reutilizan los patrones probados de `Archivador/full-version` (`apps/invoice` y `apps/ecommerce/orders`) junto con la arquitectura Maestro-Detalle ya estandarizada en `forge-front`:

| Vista / Sección | Patrón de Referencia Vuexy (`Archivador/full-version`) | Adaptación en Foundly Clean Light UI (`constitution.md`) |
| :--- | :--- | :--- |
| **Vista de Listado de Compras (`HU2`)** | `views/apps/invoice/list/InvoiceListTable.tsx` & `TableFilters` | Tabla paginada con filtros por rango de fechas, proveedor y estado (`DRAFT`, `RFQ_SENT`, `APPROVED`, `PURCHASE_ORDER`, `CANCELED`), montos duales (`USD` y `VES`), switch responsivo a tarjetas móviles (< 768px) y Drawer de vista rápida (`PurchaseQuickViewDrawer`). |
| **Tarjetas de Resumen / KPIs de Abastecimiento** | `views/pages/widget-examples/statistics/CardStatsHorizontalWithAvatar` | Tarjetas blancas `#FFFFFF` con borde `#E6E4F0` (`20px` radius) resumiendo Solicitudes Pendientes, Presupuestos por Aprobar, Órdenes de Compra Emitidas y Compromiso Total en `USD` / `VES`. |
| **Formulario Maestro-Detalle (`HU1`)** | `views/apps/invoice/add/AddCard.tsx` & `AddActions.tsx` | Cabecera con selector predictivo debounced de Proveedor (RIF/Cédula/Razón Social), referencia de cotización del proveedor, condiciones de pago heredadas (`Contado`/`Crédito` + días), moneda base, tasa BCV del día y fecha estimada de entrega. |
| **Cuerpo Dinámico de Líneas (Repeater)** | `views/apps/invoice/add/AddCard.tsx` (Repeater de ítems) | Tabla de líneas con columna `#` compacta (`28px`), selector `CustomAutocomplete` de productos/insumos, indicador `Físico (Almacén)` vs `Servicio / Gasto`, inputs de `cantidad`, `costo_unitario`, `%descuento_proveedor`, chip monolínea de alícuota (`16%` / `8%` / `0%`, `22px`) y subtotal neto reactivo. |
| **Pie de Totales Bimonetarios y Crédito Fiscal** | `views/apps/invoice/add` (Resumen financiero) | Tarjeta lateral/inferior (`PurchaseTotalsCard`) con switch único de aplicación de Crédito Fiscal IVA, desglose condicional de Base Imponible, Monto Exento, Crédito Fiscal IVA, IGTF opcional, badges informativos de Retención IVA/ISLR del proveedor y Total General en `USD` y `VES`. |
| **Vista de Detalle y Transiciones (`HU3`, `HU4`, `HU5`)** | `views/apps/invoice/preview` & `views/apps/ecommerce/orders/details` | Ficha completa con navegador secuencial `[ ◄ ] X / N [ ► ]`, banner de alerta de vigencia/tasa BCV desfasada, panel de acciones contextuales (`Aprobar Compra`, `Recalcular con nueva tasa BCV`, `Anular`, `Generar Orden de Compra`) y trazabilidad del correlativo `OC-2026-XXXX`. |
| **Modal de Anulación con Motivo (`HU4`)** | `components/dialogs/ConfirmationDialog` | Modal accesible con *backdrop* translúcido, campo obligatorio `"Motivo de anulación"` y botón de confirmación en píldora carmesí `#EF4444`. |
| **Resiliencia, Skeletons y Fallback UI** | `@mui/material/Skeleton`, `@mui/material/Alert`, `@mui/material/Snackbar` | Esqueletos de carga durante peticiones asíncronas, bloqueo de botones con spinner interno contra doble envío y Fallback UI con botón `"Reintentar"` ante fallos de red o HTTP 500. |

---

## 3. Navegación y Rutas del Sistema (Regla R5 - Dual Menu)

En cumplimiento estricto de la **Regla R5**, las rutas del módulo de **Compras** se registrarán tanto en `src/data/navigation/verticalMenuData.tsx` como en `src/data/navigation/horizontalMenuData.tsx`:

```text
🛒 Compras (tabler-shopping-bag) -> /purchases/quotes
```

**Rutas Completas del Módulo en App Router (`src/app/(dashboard)/purchases/...`):**
- `/purchases/quotes` ➔ Listado general de Solicitudes de Cotización y Órdenes de Compra con filtros, KPIs y Drawer de vista rápida (`HU2`).
- `/purchases/quotes/create` ➔ Formulario Maestro-Detalle para registrar nueva Solicitud de Cotización o Presupuesto de Proveedor (`HU1`).
- `/purchases/quotes/[id]` ➔ Ficha Completa de Detalle, aprobación gerencial, recálculo BCV, anulación y conversión a Orden de Compra (`HU2`, `HU3`, `HU4`, `HU5`).
- `/purchases/quotes/[id]/edit` ➔ Edición de solicitud (habilitada mientras el documento se encuentre en estado `DRAFT` o `RFQ_SENT` previo a aprobación).

---

## 4. Definición de Tipos e Interfaces (TypeScript) y Esquemas de Validación

### 4.1 Interfaces del Dominio de Compras (`src/types/purchasesTypes.ts`)

```typescript
export type CurrencyCode = 'USD' | 'VES';

export type PurchaseStatus =
  | 'DRAFT'           // Borrador inicial interno
  | 'RFQ_SENT'        // Solicitud/Cotización de proveedor registrada (SC-2026-XXXX)
  | 'APPROVED'        // Presupuesto de compra aprobado con costos congelados
  | 'PURCHASE_ORDER'  // Confirmada como Orden de Compra en firme (OC-2026-XXXX)
  | 'CANCELED';       // Anulada mediante Soft Delete con motivo de auditoría

export type PaymentConditionType = 'CONTADO' | 'CREDITO';

export type PurchaseItemNature = 'PHYSICAL_STOCK' | 'SERVICE_EXPENSE' | 'DROPSHIPPING';

export interface BcvRate {
  id: string;
  tasa: number;            // Ej: 36.50
  fecha_valor: string;     // ISO Date YYYY-MM-DD
  fuente: 'BCV_OFICIAL';
  sincronizado_at: string; // ISO Timestamp (CRON 7:00 AM)
}

export interface SupplierLookup {
  id: string;
  identificacion: string;                 // RIF o Cédula: ^[VEJG]-\d{8,9}$ (ej. J-30918273-4)
  razon_social: string;
  nombre_comercial?: string;
  rol_proveedor_activo: boolean;          // Debe ser true para permitir compras
  email: string;
  telefono: string;
  direccion_fiscal: string;
  condicion_pago_default: PaymentConditionType;
  dias_credito_default: number;           // 0 si es CONTADO, ej. 15, 30, 45 si es CREDITO
  moneda_negociacion_default: CurrencyCode;
  retencion_iva_porcentaje?: 75 | 100 | 0; // Informativo SENIAT
  aplica_retencion_islr?: boolean;         // Informativo SENIAT
}

export interface PurchaseProductLookup {
  id: string;
  sku: string;
  nombre: string;
  descripcion?: string;
  uom_code: string;                       // 'un', 'kg', 'L', 'paquete', 'serv'
  naturaleza: PurchaseItemNature;
  is_physical_stock: boolean;             // Equivalente a manages_stock
  manages_stock: boolean;
  costo_unitario_ult_compra_usd: number;
  stock_fisico_actual: number;
  stock_en_transito_actual: number;       // incoming_stock
  alicuota_iva: '16' | '8' | '0' | 'EXEMPT';
}

export interface PurchaseQuoteLine {
  id: string;
  producto_id: string;
  producto_sku: string;
  producto_nombre: string;
  uom_code: string;
  is_physical_stock: boolean;
  cantidad: number;
  costo_unitario: number;                 // En Moneda Base (USD)
  descuento_proveedor_porcentaje: number; // 0 a 100%
  monto_descuento: number;
  subtotal_neto: number;                  // cantidad * (costo_unitario * (1 - descuento/100))
  alicuota_iva: '16' | '8' | '0' | 'EXEMPT';
  monto_credito_fiscal_iva: number;
  total_linea: number;
}

export interface PurchaseQuote {
  id: string;
  correlativo: string;                    // "BORRADOR" en DRAFT, "SC-2026-XXXX" en RFQ_SENT/APPROVED
  correlativo_orden_compra?: string;      // "OC-2026-XXXX" cuando estado === 'PURCHASE_ORDER'
  referencia_proveedor?: string;          // N° de cotización o proforma enviada por el proveedor
  proveedor: SupplierLookup;
  estado: PurchaseStatus;
  condicion_pago: PaymentConditionType;
  dias_credito: number;
  moneda_base: CurrencyCode;
  tasa_bcv: BcvRate;
  fecha_registro: string;                 // ISO Date
  fecha_vencimiento_cotizacion: string;   // ISO Date (control de vigencia de costos del proveedor)
  fecha_estimada_entrega: string;         // ISO Date
  aplica_iva_compras: boolean;
  aplica_igtf?: boolean;
  items: PurchaseQuoteLine[];

  // Totales en Moneda Base (USD)
  subtotal_usd: number;
  descuento_total_usd: number;
  base_imponible_usd: number;
  monto_exento_usd: number;
  credito_fiscal_iva_usd: number;
  igtf_usd: number;
  total_usd: number;

  // Totales en Moneda Local (VES)
  subtotal_ves: number;
  descuento_total_ves: number;
  base_imponible_ves: number;
  monto_exento_ves: number;
  credito_fiscal_iva_ves: number;
  igtf_ves: number;
  total_ves: number;

  // Indicadores informativos de retención (si SENIAT_FORMAT está activo)
  retencion_iva_estimada_ves?: number;

  observaciones?: string;
  terminos_negociacion?: string;
  motivo_anulacion?: string;
  aprobado_por?: string;
  aprobado_at?: string;
  orden_compra_generada_at?: string;
  stock_transito_notificado?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseQuotePayload {
  proveedor_id: string;
  referencia_proveedor?: string;
  condicion_pago: PaymentConditionType;
  dias_credito: number;
  moneda_base: CurrencyCode;
  fecha_vencimiento_cotizacion: string;
  fecha_estimada_entrega: string;
  aplica_iva_compras?: boolean;
  aplica_igtf?: boolean;
  observaciones?: string;
  terminos_negociacion?: string;
  items: {
    producto_id: string;
    cantidad: number;
    costo_unitario: number;
    descuento_proveedor_porcentaje: number;
    alicuota_iva?: '16' | '8' | '0' | 'EXEMPT';
  }[];
  registrar_cotizacion_inmediatamente?: boolean; // false -> DRAFT, true -> RFQ_SENT (SC-2026-XXXX)
}

export interface PurchaseOrderConversionResponse {
  success: boolean;
  purchase_order_id: string;
  correlativo_orden_compra: string;       // Ej: "OC-2026-0019"
  quote_id: string;
  estado: 'PURCHASE_ORDER';
  lineas_fisicas_en_transito: {
    producto_id: string;
    producto_sku: string;
    cantidad_en_transito_sumada: number;
  }[];
  habilitada_recepcion_almacen: boolean;
  habilitada_factura_cxp: boolean;
  message: string;
  created_at: string;
}

export interface PurchasesFilterState {
  search: string;
  estado: PurchaseStatus | 'ALL';
  proveedor_id: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}
```

### 4.2 Esquemas de Validación con Zod (`src/views/purchases/quotes/schemas/purchaseFormSchema.ts`)

```typescript
import { z } from 'zod';

export const venezuelanRifRegex = /^[VEJG]-\d{8,9}(-\d)?$/i;

export const purchaseQuoteLineSchema = z.object({
  producto_id: z.string().min(1, 'Debe seleccionar un producto o servicio'),
  producto_sku: z.string(),
  producto_nombre: z.string(),
  uom_code: z.string().default('un'),
  is_physical_stock: z.boolean(),
  cantidad: z.number().positive('La cantidad debe ser mayor a cero (> 0)'),
  costo_unitario: z.number().positive('El costo unitario debe ser mayor a cero (> 0)'),
  descuento_proveedor_porcentaje: z
    .number()
    .min(0, 'El descuento no puede ser menor a 0%')
    .max(100, 'El descuento no puede superar el 100%')
    .default(0),
  alicuota_iva: z.enum(['16', '8', '0', 'EXEMPT']).default('16')
});

export const createPurchaseQuoteFormSchema = z.object({
  proveedor_id: z.string().min(1, 'Debe seleccionar un proveedor válido'),
  identificacion_proveedor: z.string().optional(),
  referencia_proveedor: z.string().max(60, 'Máximo 60 caracteres').optional(),
  condicion_pago: z.enum(['CONTADO', 'CREDITO']),
  dias_credito: z.number().int().min(0, 'Los días de crédito no pueden ser negativos').max(365),
  moneda_base: z.enum(['USD', 'VES']),
  fecha_vencimiento_cotizacion: z.string().min(1, 'La fecha de vigencia de cotización es obligatoria'),
  fecha_estimada_entrega: z.string().min(1, 'La fecha estimada de entrega es obligatoria'),
  aplica_iva_compras: z.boolean().default(true),
  aplica_igtf: z.boolean().default(false),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  terminos_negociacion: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  items: z
    .array(purchaseQuoteLineSchema)
    .min(1, 'Debe incluir al menos un ítem con cantidad y costo mayores a cero')
});

export const cancelPurchaseQuoteFormSchema = z.object({
  motivo_anulacion: z
    .string()
    .min(5, 'El motivo de anulación es obligatorio (mínimo 5 caracteres)')
    .max(300, 'Máximo 300 caracteres')
});

export type CreatePurchaseQuoteFormValues = z.infer<typeof createPurchaseQuoteFormSchema>;
export type CancelPurchaseQuoteFormValues = z.infer<typeof cancelPurchaseQuoteFormSchema>;
```

---

## 5. Matriz de Requerimientos Funcionales en Sintaxis EARS

### 5.1 Requisitos Ubicuos (Universal)
- **EARS-UB-01 (Filosofía Foundly Clean Light UI):** *The system shall* render all cards, tables, filter bars, and master-detail containers in pure white (`#FFFFFF`) with 1px lavender border (`#E6E4F0`), rounded corners of `20px` to `24px`, and secondary input surfaces in `#F4F3F8` with focus ring `#6C5CE7`, strictly prohibiting dark surfaces in the layout.
- **EARS-UB-02 (Geometría de Píldora):** *The system shall* render all primary and contextual action buttons (`Guardar Borrador`, `Registrar Cotización`, `Aprobar Compra`, `Recalcular con nueva tasa BCV`, `Anular`, `Generar Orden de Compra`), filter tabs, and status chips with full pill geometry (`rounded-full`, `9999px`).
- **EARS-UB-03 (Bimonetarismo Dual en Tiempo Real):** *The system shall* record every Purchase Quote / Order in its `Moneda Base` (`USD`) and simultaneously calculate and display its equivalent in `Moneda Local` (`VES`) using the active official BCV exchange rate (`tasa_bcv_id`) across list tables, quick-view drawers, and detail views.
- **EARS-UB-04 (Tasa BCV Oficial Visible):** *The system shall* display the active BCV rate (`Bs/USD`), its value date (`fecha_valor`), and official source badge in the header of the purchases list, master-detail form, and detail view.
- **EARS-UB-05 (Prevención de Doble Envío):** *The system shall* disable action buttons (`Guardar Borrador`, `Registrar Cotización`, `Aprobar Compra`, `Confirmar Anulación`, `Generar Orden de Compra`) and display an internal loading spinner while any asynchronous request is in flight.
- **EARS-UB-06 (Iconografía Vectorial Tabler):** *The system shall* exclusively use vector Tabler Icons (`tabler-*`) for navigation, KPIs, badges, and row actions, avoiding emojis in UI controls.
- **EARS-UB-07 (Columna de Índice Compacta):** *The system shall* constrain the `#` line-number column in purchase item tables to a compact width (`28px`–`36px`) to maximize horizontal space for product descriptions, quantities, costs, and discounts.
- **EARS-UB-08 (Etiquetas de Alícuota Monolínea):** *The system shall* render line-level tax indicators in a single compact line (`16%`, `8%`, or `0%`) with fixed height `h-[22px]` (`whitespace-nowrap`, `leading-none`).
- **EARS-UB-09 (Aislamiento Estricto de Frontera / Boundary):** *The system shall* consume Supplier, Product, BCV Rate, and Transit Stock notifications exclusively through decoupled service adapters (`purchasesService.ts`), without modifying internal views or tables of Contacts, Inventory, or Accounts Payable.
- **EARS-UB-10 (Registro en Navegación Dual - Regla R5):** *The system shall* register the Purchases module routes in both `src/data/navigation/verticalMenuData.tsx` and `src/data/navigation/horizontalMenuData.tsx`.

### 5.2 Requisitos Basados en Eventos (Event-driven)
- **EARS-EV-01 (Búsqueda Predictiva Debounced de Proveedor - HU1):** *WHEN* the user types in the supplier selector, *the system shall* debounce the input by 300ms, query `GET /api/suppliers?search={query}` (or `/api/terceros?rol=PROVEEDOR`), and display matching suppliers with their `Razón Social` and `RIF/Cédula`.
- **EARS-EV-02 (Herencia de Reglas Comerciales del Proveedor - HU1):** *WHEN* a supplier is selected in the master-detail form, *the system shall* automatically pre-populate the supplier's default payment condition (`CONTADO` / `CREDITO`), credit days (`dias_credito`), negotiation currency (`moneda_base`), and informative retention indicators (`retencion_iva_porcentaje`, `aplica_retencion_islr`).
- **EARS-EV-03 (Selección de Producto y Pre-carga de Costo - HU1):** *WHEN* the user selects a product or service in a purchase line (`GET /api/products`), *the system shall* auto-populate its SKU, unit of measure (`uom_code`), last purchase/standard cost (`costo_unitario`), default VAT rate (`alicuota_iva`), and `is_physical_stock` indicator.
- **EARS-EV-04 (Recálculo Reactivo de Líneas y Totales - HU1):** *WHEN* the user modifies `cantidad`, `costo_unitario`, or `%descuento_proveedor` on any line, *the system shall* immediately recalculate the line net subtotal and the document totals (Subtotal, Descuentos, Crédito Fiscal IVA, IGTF opcional, Total) in both `USD` and `VES`.
- **EARS-EV-05 (Guardar Solicitud en Borrador - HU1):** *WHEN* the user clicks `"Guardar Borrador"` with a valid form, *the system shall* send `POST /api/purchases/quotes` with status `DRAFT`, assign temporary badge `"BORRADOR"`, and display a confirmation Toast: *"Solicitud de compra guardada en borrador"*.
- **EARS-EV-06 (Registrar Cotización de Proveedor - HU1):** *WHEN* the user clicks `"Registrar Cotización"`, *the system shall* persist the quote via `POST /api/purchases/quotes` with status `RFQ_SENT`, generate a unique correlative in format `SC-2026-XXXX`, and emit a success Toast: *"Cotización de proveedor {correlativo} registrada exitosamente"*.
- **EARS-EV-07 (Consulta Rápida en Drawer - HU2):** *WHEN* the user clicks on a purchase row in `/purchases/quotes`, *the system shall* open `PurchaseQuickViewDrawer` displaying supplier details, payment terms, lines summary, dual totals (`USD`/`VES`), and a button to open the full detail view (`/purchases/quotes/[id]`).
- **EARS-EV-08 (Aprobar Presupuesto de Compra - HU3):** *WHEN* the authorized buyer/manager clicks `"Aprobar Compra"` on a valid and up-to-date quote (`PUT /api/purchases/quotes/{id}/status`), *the system shall* transition the status to `APPROVED`, freeze the agreed unit costs, and display a green Toast: *"Presupuesto de compra aprobado exitosamente"*.
- **EARS-EV-09 (Recalcular con Nueva Tasa BCV - HU3):** *WHEN* the user clicks `"Recalcular con nueva tasa BCV"` on a quote with an outdated BCV rate or expired validity, *the system shall* fetch the current active BCV rate, recompute all `VES` amounts, extend the validity date, and allow proceeding with approval.
- **EARS-EV-10 (Anular Solicitud/Orden con Motivo - HU4):** *WHEN* the user clicks `"Anular"`, *the system shall* open `CancelPurchaseModal` requiring a mandatory `"Motivo de anulación"`, and *WHEN* confirmed (`PUT /api/purchases/quotes/{id}/cancel`), *the system shall* perform a soft delete transitioning the status to `CANCELED` while preserving the record for audit.
- **EARS-EV-11 (Convertir a Orden de Compra en Firme - HU5):** *WHEN* the user clicks `"Generar Orden de Compra"` on an `APPROVED` quote (`POST /api/purchases/orders/from-quote/{quote_id}`), *the system shall* create the firm Purchase Order with correlative `OC-2026-XXXX`, transition status to `PURCHASE_ORDER`, dispatch the transit stock increment (`incoming_stock + cantidad`) for all physical items (`is_physical_stock === true`), and enable the order for future Warehouse Receipt and Supplier Invoice registration (Accounts Payable).
- **EARS-EV-12 (Navegación Secuencial en Detalle):** *WHEN* the user clicks `[ ◄ ]` or `[ ► ]` in the header of `/purchases/quotes/[id]`, *the system shall* navigate to the previous or next purchase document in the active list.

### 5.3 Requisitos Basados en Estado (State-driven)
- **EARS-ST-01 (Modularidad de Crédito Fiscal e Impuestos - Regla R4):** *WHILE* the Feature Flags or transactional switches for local taxes (`IVA_COMPRAS` `16%/8%/Exento`, `IGTF 3%`, and informative `Retención IVA / ISLR` badges) are active, *the system shall* breakdown the Tax Credit (`Crédito Fiscal IVA Compras`), taxable base, exempt amount, and totals in both `USD` and `VES`.
- **EARS-ST-02 (Modo Costo Neto Universal - Regla R4):** *WHILE* tax flags (`IVA_COMPRAS`, `IGTF`) are disabled, *the system shall* operate cleanly in universal net cost mode ($\text{Subtotal} - \text{Descuentos} = \text{Total Costo}$) without tax rows or fiscal surcharges.
- **EARS-ST-03 (Validación Fiscal de Proveedor en Contexto VE):** *WHILE* the `SENIAT_FORMAT` Feature Flag is active, *the system shall* verify during supplier selection that the supplier has a valid fiscal identification format (`^[VEJG]-\d{8,9}$`) and has the `Proveedor` role active (`rol_proveedor_activo === true`).
- **EARS-ST-04 (Expectativa de Entrada para Ítems Físicos - HU5):** *WHILE* a line item is physical (`is_physical_stock === true`), *the system shall* display the badge `"Almacenable (Genera Tránsito)"` and, upon conversion to Purchase Order, include its quantity in the `stock_en_transito` (`incoming_stock`) notification payload.
- **EARS-ST-05 (Omisión de Recepción Física para Servicios/Gastos/Dropshipping - HU5):** *WHILE* a line item is a service, non-storable supply, or dropshipping (`is_physical_stock === false`), *the system shall* display the badge `"Servicio / Gasto (Sin Recepción Física)"` and omit the generation of physical warehouse receipt expectations.
- **EARS-ST-06 (Habilitación Condicional de Conversión a OC - HU5):** *WHILE* the document status is strictly `APPROVED`, *the system shall* enable the `"Generar Orden de Compra"` button; in any other status (`DRAFT`, `RFQ_SENT`, `PURCHASE_ORDER`, `CANCELED`), the button shall remain disabled or hidden.
- **EARS-ST-07 (Inmutabilidad de Costos en Documentos Aprobados/Confirmados):** *WHILE* the document status is `APPROVED`, `PURCHASE_ORDER`, or `CANCELED`, *the system shall* lock line editing to guarantee audit integrity of agreed supplier costs.
- **EARS-ST-08 (Esqueletos de Carga):** *WHILE* purchase lists, supplier lookups, or detail records are being fetched, *the system shall* render structured `Skeleton` placeholders preventing layout shift.

### 5.4 Requisitos de Excepción (Unwanted Behavior)
- **EARS-EX-01 (Ítems Vacíos o Valores Inválidos - HU1):** *IF* the `items` array is empty OR any line has `cantidad <= 0` or `costo_unitario <= 0` when attempting to save or register, *THEN the system shall* block submission and display an inline validation error highlighting the offending row.
- **EARS-EX-02 (Proveedor con RIF Inválido o Rol Inactivo):** *IF* `SENIAT_FORMAT` is active and the selected supplier lacks a valid `^[VEJG]-\d{8,9}$` identification or has `rol_proveedor_activo === false`, *THEN the system shall* block form submission and display an error message: *"El proveedor seleccionado no posee un RIF válido o no está activo para compras"*.
- **EARS-EX-03 (Vigencia Expirada o Cambio de Tasa BCV en Aprobación - HU3):** *IF* a user attempts to approve a Purchase Quote whose supplier validity date has expired (`fecha_vencimiento_cotizacion < hoy`) OR whose recorded BCV rate in `VES` changed compared to the current official BCV rate, *THEN the system shall* block immediate approval, display the warning banner *"La tasa BCV o vigencia ha cambiado, actualice los costos del presupuesto"*, and enable the action button `"Recalcular con nueva tasa BCV"`.
- **EARS-EX-04 (Anulación sin Motivo - HU4):** *IF* the user attempts to confirm cancellation without entering a reason (`motivo_anulacion.trim().length < 5`), *THEN the system shall* keep the confirm button disabled and show a required field error.
- **EARS-EX-05 (Manejo de Errores HTTP y Fallback UI):** *IF* an API/service request fails with HTTP 400, 422, or 500, *THEN the system shall* display a descriptive error Toast and, on initial view load failures, render a clean Fallback UI card with a `"Reintentar"` pill button.

---

## 6. Criterios de Aceptación (DoD) Comprobables por Historia de Usuario

### HU1: Crear Solicitud de Cotización / Presupuesto de Compra (`POST /api/purchases/quotes`)
- [x] **CA-HU1-01:** El selector predictivo de proveedor realiza búsqueda *debounced* (300ms) por RIF/Cédula o Razón Social y, al seleccionar un proveedor, pre-carga automáticamente su condición de pago (`Contado`/`Crédito`), días de crédito y moneda de negociación.
- [x] **CA-HU1-02:** El formulario permite ingresar la referencia/proforma del proveedor, fecha de vigencia de cotización y fecha estimada de entrega.
- [x] **CA-HU1-03:** El cuerpo dinámico permite agregar/eliminar líneas de compra (`producto_id`, `cantidad`, `costo_unitario`, `%descuento_proveedor`) distinguiendo visualmente ítems físicos (`is_physical_stock = true`) de servicios/gastos (`is_physical_stock = false`).
- [x] **CA-HU1-04:** Si `items` está vacío o alguna línea tiene cantidad o costo $\le 0$, el sistema bloquea el envío y muestra error inline.
- [x] **CA-HU1-05:** El botón `"Guardar Borrador"` guarda el registro en estado `DRAFT`, mientras que `"Registrar Cotización"` asigna estado `RFQ_SENT` y genera el correlativo único `SC-2026-XXXX`.

### HU2: Consultar y Listar Compras (`GET /api/purchases/quotes` y `GET /api/purchases/quotes/{id}`)
- [x] **CA-HU2-01:** La tabla principal en `/purchases/quotes` muestra las columnas: `Correlativo` (`SC-2026-XXXX` / `OC-2026-XXXX`), `Proveedor (Nombre + RIF)`, `Ref. Proveedor`, `Fecha`, `Costo Base (USD)`, `Costo (VES)` y `Estado`.
- [x] **CA-HU2-02:** Los estados se renderizan con Chips `rounded-full` aplicando los tokens semánticos de `constitution.md`:
  - `DRAFT`: Gris neutro (`#6B7280`).
  - `RFQ_SENT`: Azul info (`#38BDF8` / `#0284C7`).
  - `APPROVED`: Verde esmeralda (`#10B981`).
  - `PURCHASE_ORDER`: Morado primario Foundly (`#6C5CE7`).
  - `CANCELED`: Carmesí error (`#EF4444`).
- [x] **CA-HU2-03:** Incluye filtros combinables por búsqueda textual, rango de fechas, proveedor y estado, además de Drawer lateral de vista rápida al hacer clic en una fila.

### HU3: Actualizar y Aprobar Presupuesto de Compra (`PUT /api/purchases/quotes/{id}/status`)
- [x] **CA-HU3-01:** Si la cotización del proveedor está vigente y la tasa BCV coincide con la tasa oficial del día, el botón `"Aprobar Compra"` cambia el estado a `APPROVED` y congela los costos pactados.
- [x] **CA-HU3-02:** Si la vigencia expiró o la tasa BCV del día cambió respecto a la registrada en el documento, el sistema muestra la advertencia *"La tasa BCV o vigencia ha cambiado, actualice los costos del presupuesto"* y habilita el botón `"Recalcular con nueva tasa BCV"`.

### HU4: Anular Solicitud/Orden de Compra (`PUT /api/purchases/quotes/{id}/cancel`)
- [x] **CA-HU4-01:** Al hacer clic en `"Anular"`, se despliega un modal que exige el campo obligatorio `"Motivo de anulación"`.
- [x] **CA-HU4-02:** Al confirmar, el registro cambia a estado `CANCELED` (Soft Delete) conservando su historial y mostrando el motivo de anulación en un banner de auditoría.

### HU5: Convertir a Orden de Compra en Firme (`POST /api/purchases/orders/from-quote/{quote_id}`)
- [x] **CA-HU5-01:** El botón `"Generar Orden de Compra"` permanece habilitado únicamente mientras `estado === 'APPROVED'`.
- [x] **CA-HU5-02:** Al confirmar la conversión, se genera el correlativo formal `OC-2026-XXXX`, el estado pasa a `PURCHASE_ORDER`, y se dispara la actualización desacoplada de `stock_en_transito` (`incoming_stock + cantidad`) exclusivamente para los ítems con `is_physical_stock === true`.
- [x] **CA-HU5-03:** La ficha de la Orden de Compra muestra los indicadores de estado listos para futura Recepción de Mercancía y Registro de Factura de Proveedor (Cuentas por Pagar).

---

## 7. Plan de Implementación Paso a Paso en el Frontend

1. **Fase 1: Definición de Tipos, Contratos y Esquemas Zod**
   - Crear `src/types/purchasesTypes.ts` con las interfaces `PurchaseQuote`, `PurchaseQuoteLine`, `PurchaseStatus`, `SupplierLookup`, `PurchaseProductLookup`, `BcvRate`, `CreatePurchaseQuotePayload`, `PurchaseOrderConversionResponse` y `PurchasesFeatureFlags`.
   - Crear `src/views/purchases/quotes/schemas/purchaseFormSchema.ts` con las reglas de validación Zod (`createPurchaseQuoteFormSchema`, `cancelPurchaseQuoteFormSchema`, regex de RIF `^[VEJG]-\d{8,9}$`).

2. **Fase 2: Mock Data y Servicio Desacoplado de Compras (Boundary Safe)**
   - Crear `src/data/purchases/mockPurchasesData.ts` con proveedores de prueba (con RIF válido, condiciones de crédito y porcentajes de retención), catálogo de insumos/servicios de lectura y solicitudes/órdenes de compra iniciales en estados `DRAFT`, `RFQ_SENT`, `APPROVED`, `PURCHASE_ORDER` y `CANCELED`.
   - Crear `src/services/purchasesService.ts` implementando los adaptadores desacoplados (`searchSuppliers`, `searchPurchaseProducts`, `getActivePurchaseBcvRate`, `getPurchaseQuotes`, `getPurchaseQuoteById`, `createPurchaseQuote`, `updatePurchaseQuote`, `approvePurchaseQuote`, `recalculatePurchaseQuoteBcv`, `cancelPurchaseQuote`, `convertQuoteToPurchaseOrder`) con persistencia reactiva en `localStorage` y notificación desacoplada de `stock_en_transito`.

3. **Fase 3: Componentes Atómicos y Modulares de Compras (`src/views/purchases/quotes/components/`)**
   - `PurchaseStatusChip.tsx`: Chip `rounded-full` con los colores semánticos de `constitution.md`.
   - `SupplierAutocomplete.tsx`: Buscador predictivo *debounced* por RIF/Cédula/Razón Social con validación de rol e indicador de condiciones comerciales.
   - `PurchaseItemRow.tsx`: Fila del repeater con selector de producto, badge `Físico (Tránsito)` vs `Servicio / Gasto`, cantidad, costo unitario, `% descuento` y chip monolínea de IVA (`16%` / `0%`).
   - `PurchaseTotalsCard.tsx`: Resumen bimonetario (`USD` y `VES`) gobernado por los Feature Flags `IVA_COMPRAS`, `IGTF` y `SENIAT_FORMAT`.
   - `CancelPurchaseModal.tsx`: Modal de anulación con motivo obligatorio.
   - `PurchaseQuickViewDrawer.tsx`: Drawer lateral de vista rápida desde el listado.

4. **Fase 4: Vista de Listado y Filtros (`HU2`)**
   - Crear `PurchasesListFilters.tsx`, `PurchasesTable.tsx`, `PurchasesMobileList.tsx` y `PurchasesListView.tsx`.
   - Crear la ruta `src/app/(dashboard)/purchases/quotes/page.tsx`.

5. **Fase 5: Vista de Formulario Maestro-Detalle (`HU1`)**
   - Crear `PurchaseMasterDetailForm.tsx` y `PurchaseEditWrapper.tsx` con herencia automática de condiciones del proveedor, validación Zod inline y prevención de doble envío.
   - Crear las rutas `src/app/(dashboard)/purchases/quotes/create/page.tsx` y `src/app/(dashboard)/purchases/quotes/[id]/edit/page.tsx`.

6. **Fase 6: Vista de Detalle y Transiciones de Estado (`HU3`, `HU4`, `HU5`)**
   - Crear `PurchaseDetailView.tsx` con navegador secuencial `[ ◄ ] X / N [ ► ]`, control de vigencia y tasa BCV, aprobación de costos, anulación auditable y conversión a Orden de Compra (`OC-2026-XXXX`).
   - Crear la ruta `src/app/(dashboard)/purchases/quotes/[id]/page.tsx`.

7. **Fase 7: Registro en Navegación Dual (Regla R5)**
   - Registrar el módulo **Compras** (`/purchases/quotes` y `/purchases/quotes/create`) en `src/data/navigation/verticalMenuData.tsx` y `src/data/navigation/horizontalMenuData.tsx`.

8. **Fase 8: Verificación Estricta de Tipos y Calidad (`Regla R1 y R2`)**
   - Ejecutar `npx next typegen` y `npx tsc --noEmit` verificando **0 errores** de compilación.
