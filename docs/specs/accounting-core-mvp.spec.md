# Especificación Formal: Módulo de Contabilidad Bimonetaria, Tesorería por Lotes y Reportes Financieros (MVP Frontend)

- **ID de Spec:** SPEC-008
- **Épica:** Interfaz del Módulo de Contabilidad Bimonetaria, Tesorería por Lotes y Reportes Financieros (MVP Frontend)
- **Estado:** Propuesta (Esperando Aprobación del Usuario)
- **Fecha:** 2026-10-19
- **Autor:** Antigravity (Pair Programming con Usuario)
- **Marco Metodológico:** Spec-Driven Development (SDD) conforme a `agent.md` y `constitution.md`.

---

## 1. Contexto, Objetivos y Límite Estricto de Alcance (Boundary)

### 1.1 Contexto de Negocio
El ERP requiere un sistema de control contable y tesorería moderno, bimonetario (`USD` / `VES`) y centrado en la usabilidad operativa al estilo Odoo / Foundly Clean Light UI. 
Los flujos comerciales (Ventas, Compras, POS) generan transacciones que deben reflejarse en apuntes contables automáticos sin sobrecargar al usuario con terminología técnica compleja. Al mismo tiempo, la tesorería diaria exige pagos individuales ágiles con cálculo transparente de diferencial cambiario (debido a fluctuaciones en la tasa oficial BCV), consolidación de pagos a proveedores por lotes con generación de nómina bancaria o pago móvil, registro directo de gastos menores (sin factura previa) y consulta instantánea de los estados financieros (`Balance General`, `P&L`, `Libro Mayor`, `Libro Diario`, `Balance de Comprobación`) con alternancia inmediata entre moneda local (`VES`), moneda dura (`USD`) y vista dual comparativa.

### 1.2 ⚠️ Restricción Estricta de Alcance (Frontend-Only & Boundary)
1. **Exclusivo Frontend (`forge-front`):**
   - El desarrollo se restringe a las páginas dentro de `src/app/(dashboard)/accounting/...`, vistas de componentes en `src/views/accounting/...`, capa de servicios cliente en `src/services/accountingService.ts`, tipado en `src/types/accountingTypes.ts` y componentes reutilizables auxiliares.
   - Si los endpoints del backend GraphQL (`forge-backend`) no se encuentran desplegados aún, se proveerá una capa de servicios desacoplada con almacenamiento local / semillas tipadas (`localStorage` + mock data reactiva) garantizando navegación 100% interactiva y funcional.
2. **Aislamiento de Módulos Operativos:**
   - **NO** se deben modificar ni alterar las pantallas internas de Ventas (`/sales`), Compras (`/purchases`), Inventario (`/inventory`), POS (`/pos`) ni Directorio de Contactos (`/entities` o `/contacts`).
   - La parametrización contable de un tercero (cuentas `cuenta_cxc_id` y `cuenta_cxp_id`) se expondrá a través de un componente reutilizable aislado (`<ContactAccountingSelector />`) y mediante el subpanel de *Mapeo Contable de Contactos* dentro de `/accounting/chart-of-accounts`.
3. **Identidad Visual Foundly Clean Light UI (`constitution.md`):**
   - Prohibido el modo oscuro.
   - Tarjetas suspendidas en `#FFFFFF`, borde ultrafino `#E6E4F0`, radios de `20px` a `24px`.
   - Botones primarios en píldora (`rounded-full`), morado de marca `#6C5CE7`, verde esmeralda de ingresos `#10B981` y carmesí de egresos `#EF4444`.
4. **Gobernanza de Feature Flags (Regla R4):**
   - El soporte impositivo venezolano (SENIAT, IVA 16%/8%/exento, IGTF 3%, retenciones) se encuentra gobernado por el flag `SENIAT_TAXES`. Cuando este flag esté inactivo, la interfaz operará en modo neto universal.
   - La alternancia de moneda en reportes y formularios se gobierna mediante el flag `DUAL_CURRENCY_VIEW`.
5. **Navegación Dual (Regla R5):**
   - Registro de las rutas de `/accounting` en `src/data/navigation/verticalMenuData.tsx` y `src/data/navigation/horizontalMenuData.tsx`.

---

## 2. Mapeo de Componentes Reutilizados (Regla R3 - Vuexy & Foundly)

Para garantizar consistencia y acelerar el desarrollo sin reinventar la rueda, se reutilizarán los siguientes componentes del proyecto:

| Componente | Origen | Propósito en el Módulo Contable |
| :--- | :--- | :--- |
| `HorizontalWithSubtitle.tsx` | `src/components/card-statistics/` | Tarjetas KPI de liquidez bancaria, cuentas por cobrar, cuentas por pagar y resultado neto del mes. |
| `CustomTextField.tsx` | `src/@core/components/mui/TextField.tsx` | Inputs de formularios, buscadores con iconos y selectores con diseño limpio. |
| `CustomChip.tsx` / `Chip` | `@mui/material/Chip` | Indicadores de estado (`DRAFT`, `POSTED`, `PAID`, `CANCELED`, `Cuadrado`, `Descuadrado`). |
| `Tabs`, `Tab` | `@mui/material/Tabs` | Conmutador de Líneas vs. Apuntes Contables en Facturas, y selector de reportes. |
| `TablePaginationComponent` | Patrón estándar Foundly | Paginación y control de registros por página en diarios, facturas y asientos. |
| `Drawer` & `Dialog` | `@mui/material` | Paneles laterales para creación de cuentas contables, modal de pago individual y modal de lote bancario. |
| `Skeleton` | `@mui/material/Skeleton` | Skeleton loaders de tarjetas y tablas para prevenir saltos de layout durante carga. |
| `Snackbar` & `Alert` | `@mui/material` | Notificaciones Toast de confirmación de asientos, pagos y errores de cuadre. |

---

## 3. Arquitectura de Vistas y Componentes UI (`/accounting`)

```text
src/
├── app/(dashboard)/accounting/
│   ├── layout.tsx                                 # Layout contenedor con verificación de sesión
│   ├── page.tsx                                   # Redirección a /accounting/dashboard
│   ├── dashboard/page.tsx                         # Dashboard Contable & Grid de Diarios
│   ├── invoices/page.tsx                          # Facturas contables (Clientes y Proveedores)
│   ├── payments/page.tsx                          # Gestión de Pagos y Gastos Directos
│   ├── payments/batches/page.tsx                  # Lotes de Pago a Proveedores (Batch Payments)
│   ├── journal-entries/page.tsx                   # Asientos Contables (Diario General)
│   ├── chart-of-accounts/page.tsx                 # Plan Único de Cuentas (PUC) & Mapeo
│   └── reports/page.tsx                           # Centro de Reportes Financieros Bimonetarios
├── views/accounting/
│   ├── dashboard/
│   │   ├── AccountingDashboardView.tsx            # Vista principal del dashboard
│   │   ├── components/AccountingKpiRow.tsx        # Fila de 4 tarjetas estadísticas de liquidez
│   │   └── components/JournalCardGrid.tsx         # Tarjetas de diarios tipo Odoo
│   ├── invoices/
│   │   ├── InvoicesListView.tsx                   # DataGrid con filtros por tipo y estado
│   │   ├── InvoiceDetailModal.tsx                 # Detalle con Tabs: Líneas vs. Asiento Reactivo
│   │   └── components/AutomaticEntryPreview.tsx   # Asiento contable en vivo generado desde la factura
│   ├── payments/
│   │   ├── PaymentsListView.tsx                   # Listado histórico de pagos
│   │   ├── SinglePaymentDrawer.tsx                # Pago individual + Cálculo de Dif. Cambiario
│   │   ├── DirectExpenseModal.tsx                 # Modal de Gasto Directo sin factura
│   │   └── batches/
│   │       ├── BatchPaymentsView.tsx              # Selección múltiple y Barra Flotante
│   │       └── BatchConfirmationModal.tsx         # Resumen bancario de 20 dígitos / Pago Móvil
│   ├── journal-entries/
│   │   ├── JournalEntriesListView.tsx             # Listado de Asientos con filtros de diario/estado
│   │   ├── JournalEntryFormModal.tsx              # Creador/Editor con Partida Doble en tiempo real
│   │   └── components/DoubleEntryBalanceBar.tsx   # Indicador visual de Asiento Cuadrado/Descuadrado
│   ├── chart-of-accounts/
│   │   ├── ChartOfAccountsView.tsx                # Tabla jerárquica del PUC por grupos (1 al 6)
│   │   ├── AccountCreateEditDrawer.tsx            # Drawer para crear/editar cuenta contable
│   │   └── ContactAccountingMappingDrawer.tsx     # Selector de cuentas CxC/CxP por tercero
│   └── reports/
│       ├── FinancialReportsView.tsx               # Contenedor con barra superior unificada
│       ├── components/ReportCurrencyToggle.tsx    # Píldora VES / USD / Dual
│       ├── components/BalanceSheetTable.tsx       # Balance General jerárquico colapsable
│       ├── components/ProfitAndLossTable.tsx      # Estado de Resultados (P&L)
│       ├── components/GeneralLedgerTable.tsx      # Libro Mayor con links clicables a origen
│       └── components/TrialBalanceTable.tsx       # Balance de Comprobación
├── types/
│   └── accountingTypes.ts                         # Tipos TypeScript del dominio contable
└── services/
    └── accountingService.ts                       # Servicio desacoplado con mocks persistentes
```

---

## 4. Definición de Modelos y Contratos de Datos (TypeScript)

Los contratos de datos se formalizarán en `src/types/accountingTypes.ts`:

```typescript
// Tipos de dominio para el módulo de Contabilidad y Tesorería (SPEC-008)

export type CurrencyCode = 'USD' | 'VES'
export type CurrencyViewMode = 'VES' | 'USD' | 'DUAL'

export type AccountType = 
  | 'ASSET_CURRENT'        // 1.1 Activo Corriente (Caja, Banco, CxC, Inventario)
  | 'ASSET_NON_CURRENT'    // 1.2 Activo No Corriente (Mobiliario, Equipos)
  | 'LIABILITY_CURRENT'    // 2.1 Pasivo Corriente (CxP, Impuestos por pagar)
  | 'LIABILITY_NON_CURRENT'// 2.2 Pasivo No Corriente
  | 'EQUITY'               // 3. Patrimonio / Capital
  | 'INCOME'               // 4. Ingresos Operacionales
  | 'COST_OF_GOODS'        // 5. Costo de Ventas
  | 'EXPENSE_OPERATING'    // 6. Gastos Operativos / Administrativos
  | 'EXPENSE_FINANCIAL'    // 6.1 Gastos Financieros / Comisiones / Dif. Cambiario
  | 'INCOME_FINANCIAL'     // 4.1 Ingresos Financieros / Ganancia Cambiaria

export interface Account {
  id: string
  codigo: string           // Ej: "1.1.01.01"
  nombre: string           // Ej: "Banesco Banco Universal (VES)"
  tipo: AccountType
  moneda: CurrencyCode | 'AMBAS'
  permiteConciliacion: boolean
  saldoUsd: number
  saldoVes: number
  activo: boolean
}

export type JournalType = 'VENTAS' | 'COMPRAS' | 'BANCO_VES' | 'BANCO_USD' | 'CAJA' | 'VARIOS'

export interface Journal {
  id: string
  nombre: string
  codigo: string           // Ej: "BN-VES", "FAC-CLI"
  tipo: JournalType
  cuentaPorDefectoId: string
  saldoActualUsd: number
  saldoActualVes: number
  colorIdentificador?: string
}

export type EntryStatus = 'DRAFT' | 'POSTED' | 'CANCELED'
export type EntrySource = 'FACTURA' | 'PAGO' | 'PAGO_LOTE' | 'GASTO_DIRECTO' | 'MANUAL'

export interface JournalItem {
  id: string
  cuentaId: string
  cuentaCodigo: string
  cuentaNombre: string
  contactoId?: string
  contactoNombre?: string
  etiqueta: string
  debeUsd: number
  haberUsd: number
  debeVes: number
  haberVes: number
}

export interface JournalEntry {
  id: string
  numeroAsiento: string    // Ej: "AS-2026-00124"
  fecha: string            // YYYY-MM-DD
  diarioId: string
  diarioNombre: string
  origen: EntrySource
  documentoReferencia?: string // Ej: "FAC-0089", "LOTE-PAG-002"
  estado: EntryStatus
  tasaBcv: number
  totalDebeUsd: number
  totalHaberUsd: number
  totalDebeVes: number
  totalHaberVes: number
  lineas: JournalItem[]
  notas?: string
  creadoPor: string
  creadoEn: string
}

export type InvoiceAccountingType = 'CUSTOMER' | 'SUPPLIER'
export type InvoiceStatus = 'DRAFT' | 'POSTED' | 'PAID' | 'CANCELED'

export interface InvoiceLine {
  id: string
  productoOConcepto: string
  cuentaContableId: string // Cuenta de Ingreso (Ventas) o Costo/Gasto (Compras)
  cantidad: number
  precioUnitarioUsd: number
  tasaImpuestoPct: number   // 16, 8, 0
  subtotalUsd: number
  ivaUsd: number
  totalUsd: number
}

export interface AccountingInvoice {
  id: string
  numeroFactura: string    // Ej: "INV-2026-0045"
  tipo: InvoiceAccountingType
  contactoId: string
  contactoNombre: string
  contactoRif: string
  contactoCuentaContableId: string // cuenta_cxc_id o cuenta_cxp_id
  fechaEmision: string
  fechaVencimiento: string
  tasaBcv: number
  estado: InvoiceStatus
  lineas: InvoiceLine[]
  totalNetoUsd: number
  totalIvaUsd: number
  totalUsd: number
  totalVes: number
  saldoPendienteUsd: number
  saldoPendienteVes: number
  asientoAsociadoId?: string
}

export type PaymentMethod = 'TRANSFERENCIA' | 'PAGO_MOVIL' | 'EFECTIVO' | 'ZELLE'

export interface Payment {
  id: string
  numeroPago: string       // Ej: "PAG-2026-0089"
  fecha: string
  contactoId: string
  contactoNombre: string
  diarioId: string
  diarioNombre: string
  metodoPago: PaymentMethod
  moneda: CurrencyCode
  monto: number
  tasaBcvPago: number
  facturasConciliadas: {
    facturaId: string
    numeroFactura: string
    tasaBcvOriginal: number
    montoAplicadoUsd: number
    montoAplicadoVes: number
    diferencialCambiarioVes: number // Ganancia (+) o Pérdida (-) en VES
  }[]
  aplicaIgtf: boolean
  montoIgtfUsd: number
  montoIgtfVes: number
  referenciaBancaria?: string
  asientoContableId?: string
  estado: 'CONFIRMADO' | 'ANULADO'
}

export interface SupplierBatchItem {
  facturaId: string
  numeroFactura: string
  proveedorId: string
  proveedorNombre: string
  proveedorRif: string
  bancoDestino?: string
  cuentaBancaria20Digitos?: string
  telefonoPagoMovil?: string
  montoPendienteUsd: number
  montoPendienteVes: number
  montoAPagarUsd: number
  montoAPagarVes: number
}

export interface DirectExpenseForm {
  fecha: string
  diarioSalidaId: string   // Banco o Caja
  beneficiario?: string
  conceptoGeneral: string
  moneda: CurrencyCode
  tasaBcv: number
  lineas: {
    id: string
    cuentaGastoId: string
    descripcion: string
    monto: number
    aplicaIva: boolean
  }[]
  aplicaIgtf: boolean
}

export interface FinancialReportRow {
  codigo?: string
  concepto: string
  nivel: number            // 1: Grupo mayor, 2: Subgrupo, 3: Cuenta detalle
  esColapsable: boolean
  montoUsd: number
  montoVes: number
  subfilas?: FinancialReportRow[]
}
```

---

## 5. Matriz de Requisitos de Frontend en Sintaxis EARS

### 5.1 Dashboard Contable & Tarjetas de Diarios (`/accounting/dashboard`)
- **EARS-DASH-01 (Ubiquitous):** The system shall render 4 top statistic cards displaying: Total Liquidity across Bank Journals (in USD and VES), Total Accounts Receivable (`#10B981`), Total Accounts Payable (`#EF4444`) and Net Monthly Income.
- **EARS-DASH-02 (Ubiquitous):** The system shall render suspended journal cards (`#FFFFFF`, border `1px #E6E4F0`, border-radius `24px`) for each configured journal (Sales, Purchases, VES Bank, USD Bank, General Cash).
- **EARS-DASH-03 (Event-driven):** WHEN the user clicks a quick action button inside a journal card (`"Nueva Factura"`, `"Nuevo Pago"`, `"Registrar Gasto"`), the system shall open the corresponding modal or navigate to the creation view pre-selecting that journal.

### 5.2 Facturas Contables & Previsualización de Asiento (`/accounting/invoices`)
- **EARS-INV-01 (Event-driven):** WHEN the user selects a Contact in the invoice creation drawer, the system shall automatically fetch and bind the Contact's default `cuenta_cxc_id` (for customers) or `cuenta_cxp_id` (for suppliers) to the invoice state.
- **EARS-INV-02 (State-driven):** WHILE in the Invoice Detail view, the system shall render two tabs: `"Líneas de Factura"` and `"Apuntes Contables (Asiento Automático)"`.
- **EARS-INV-03 (Event-driven):** WHEN any invoice line amount, quantity, tax rate or account is modified in Tab 1, the system shall reactively update Tab 2 in real time, showing the exact debit/credit entries in both `USD` and `VES` that will be generated upon confirmation.
- **EARS-INV-04 (Unwanted Behavior):** IF an invoice line does not have an assigned revenue/expense accounting account, THEN the system shall mark the line in red (`#EF4444`), display an inline warning and disable the `"Confirmar Factura"` button.

### 5.3 Pagos Individuales & Diferencial Cambiario (`/accounting/payments`)
- **EARS-PAY-01 (Event-driven):** WHEN the user selects an invoice to reconcile whose issuance BCV rate differs from the current payment BCV rate, the system shall calculate the exchange rate variance in VES and display an informative badge indicating the exact variance and destination account (`4.1.01 Ganancia Cambiaria` o `6.1.02 Pérdida Cambiaria`).
- **EARS-PAY-02 (State-driven):** WHILE the fiscal feature flag `SENIAT_TAXES` is enabled and the payment currency is `USD`, the system shall render an optional toggle for IGTF (3%), adding the corresponding IGTF tax line to the payment summary before posting.
- **EARS-PAY-03 (State-driven):** WHILE `SENIAT_TAXES` is disabled, the system shall hide the IGTF toggle and all withholding input fields.

### 5.4 Pagos por Lotes a Proveedores (`/accounting/payments/batches`)
- **EARS-BATCH-01 (State-driven):** WHILE the user selects 2 or more pending supplier invoices via table checkboxes, the system shall render a floating bottom action card displaying: number of invoices selected, accumulated total in `USD` and `VES`, paying bank selector, and the primary pill button `"Generar y Contabilizar Lote"`.
- **EARS-BATCH-02 (Event-driven):** WHEN the user clicks `"Generar y Contabilizar Lote"`, the system shall open the Batch Confirmation Modal grouped by supplier with their 20-digit bank account number or Pago Móvil details, allowing copy-to-clipboard for online banking execution.
- **EARS-BATCH-03 (Event-driven):** WHEN the user confirms the batch execution, the system shall mark all selected invoices as paid, create the aggregated journal entry for the paying bank, display a success toast notification and clear the selection bar.

### 5.5 Gastos Directos en Cuenta (`Direct Expense`)
- **EARS-EXP-01 (Ubiquitous):** The system shall provide an agile Direct Expense modal to log immediate outflows (bank fees, petty cash expenses, utilities) without an existing prior invoice.
- **EARS-EXP-02 (Event-driven):** WHEN lines are added with specific expense accounts (`6.x.xx`) and amounts, the system shall display a live double-entry preview showing the credit from the bank/cash journal and the debit to the expense accounts in USD and VES.

### 5.6 Asientos Contables & Partida Doble en Vivo (`/accounting/journal-entries`)
- **EARS-JE-01 (State-driven):** WHILE the user creates or edits lines in a manual journal entry, the system shall calculate in real time the total debit and credit in both `USD` and `VES`.
- **EARS-JE-02 (Unwanted Behavior):** IF `Total Debe != Total Haber` (variance `> 0.01` in either USD or VES), THEN the system shall highlight the totals row in `#EF4444`, display a warning pill indicating the exact difference, and disable the `"Publicar Asiento"` button.
- **EARS-JE-03 (State-driven):** WHILE an entry has `POSTED` status, all input fields shall be `readOnly`/`disabled`, the edit/save buttons shall be hidden, and a `"Revertir Asiento (Crear Contraasiento)"` button shall be rendered.

### 5.7 Plan de Cuentas (PUC) & Mapeo de Contactos (`/accounting/chart-of-accounts`)
- **EARS-COA-01 (Ubiquitous):** The system shall render the Chart of Accounts grouped into 6 standard categories: `1. Activo`, `2. Pasivo`, `3. Patrimonio`, `4. Ingresos`, `5. Costos`, `6. Gastos`, with live search by code or account name.
- **EARS-COA-02 (Event-driven):** WHEN the user edits an account or adds a new one, the system shall validate that the code follows a valid hierarchical dot-notation (e.g. `1.1.01.05`).
- **EARS-COA-03 (Ubiquitous):** The system shall provide a dedicated drawer `"Mapeo Contable de Contactos"` allowing the accountant to map default CxC/CxP accounts globally or specifically per client/supplier.

### 5.8 Centro de Reportes Financieros Bimonetarios (`/accounting/reports`)
- **EARS-REP-01 (Ubiquitous):** The system shall render a common top header for all financial reports containing: Report Tab Selector (`Balance General`, `P&L`, `Libro Mayor`, `Libro Diario`, `Balance de Comprobación`), Date Range Picker, and Export Buttons (`PDF` / `Excel`).
- **EARS-REP-02 (Event-driven):** WHEN the user toggles the currency selector pill between `🇻🇪 Moneda Legal (VES)`, `🇺🇸 Moneda Dura (USD)` and `🔄 Vista Dual Comparativa (VES + USD)`, the financial report table shall update immediately without triggering a full page reload.
- **EARS-REP-03 (State-driven):** WHILE viewing the `Balance General` or `P&L`, the system shall render collapsible hierarchical accordion rows (Class -> Group -> Account) with visual semantic colors (`#10B981` positive/income, `#EF4444` expense/loss).
- **EARS-REP-04 (Ubiquitous):** In the `Libro Mayor` and `Libro Diario` reports, every transaction row shall include a clickable link (`Link`) that directly opens the source journal entry or invoice in a preview drawer.

---

## 6. Criterios de Aceptación (BDD)

### Escenario 1: Asiento automático reactivo en Factura de Cliente
```gherkin
GIVEN que el usuario se encuentra en el formulario de creación de Factura Contable
WHEN selecciona el cliente "Inversiones Caroní C.A." que tiene asignada la cuenta "1.1.02.01 - Clientes Nacionales"
  AND agrega una línea de producto por $100.00 con cuenta de ingreso "4.1.01.01 - Venta de Mercancía" e IVA 16%
  AND la tasa BCV activa es de 54.00 Bs/USD
  AND hace clic en la pestaña "Apuntes Contables (Asiento Automático)"
THEN la vista previa debe mostrar:
  | Cuenta                           | Debe (USD) | Haber (USD) | Debe (VES) | Haber (VES) |
  | 1.1.02.01 - Clientes Nacionales | $116.00    | $0.00       | 6,264.00   | 0.00        |
  | 4.1.01.01 - Venta de Mercancía  | $0.00      | $100.00     | 0.00       | 5,400.00    |
  | 2.1.03.01 - Débito Fiscal IVA   | $0.00      | $16.00      | 0.00       | 864.00      |
  AND la suma total del Debe y Haber debe ser exactamente igual en USD ($116.00) y en VES (6,264.00 Bs.)
```

### Escenario 2: Diferencial cambiario en conciliación de pago individual
```gherkin
GIVEN una factura a proveedor emitida originalmente a una tasa BCV de 50.00 Bs/USD por $1,000.00 (50,000.00 Bs.)
WHEN el usuario abre el modal de Pago Individual con fecha de hoy a una tasa BCV de 54.00 Bs/USD
  AND selecciona cancelar el 100% en Bolívares desde el diario "Banesco VES"
THEN la interfaz debe calcular un desembolso real de 54,000.00 Bs. ($1,000.00 USD)
  AND debe mostrar una alerta informativa en amarillo:
    "Diferencial cambiario detectado: Pérdida en cambio de 4,000.00 Bs. que se registrará en '6.1.02 - Pérdida por Diferencial Cambiario'."
  AND al confirmar, el asiento debe cuadrar debitando $1,000.00 en CxP, acreditando 54,000.00 Bs. en Banco y debitando 4,000.00 Bs. en Gasto por Diferencial Cambiario.
```

### Escenario 3: Generación de pago a proveedores por lotes
```gherkin
GIVEN el listado de facturas por pagar a proveedores en `/accounting/payments/batches`
WHEN el usuario marca los checkboxes de 3 facturas de diferentes proveedores que suman $2,450.00
THEN debe aparecer en la parte inferior de la pantalla la Barra Flotante de Lote indicando:
  "3 facturas seleccionadas | Total: $2,450.00 USD (132,300.00 VES)"
WHEN hace clic en "Generar y Contabilizar Lote"
THEN se abre el modal de confirmación con el desglose por proveedor:
  - Nombre del proveedor, RIF, Banco, Número de cuenta de 20 dígitos y monto
  - Botón "Copiar TXT / Listado Bancario"
WHEN hace clic en "Confirmar y Contabilizar Lote"
THEN las 3 facturas pasan a estado "PAGADA", se descuenta el saldo del banco seleccionado y se genera un único asiento contable de lote agrupado.
```

### Escenario 4: Alternancia de moneda en Reportes Financieros sin recarga
```gherkin
GIVEN que el usuario está consultando el "Balance General" en `/accounting/reports` en modo "VES"
WHEN hace clic en la píldora de moneda "USD (Moneda Dura)"
THEN todos los saldos de Activo, Pasivo y Patrimonio deben recalcularse y mostrarse inmediatamente en dólares con el símbolo "$"
  AND la página no debe recargarse ni perder la posición de scroll
WHEN hace clic en "Dual (Comparativa)"
THEN la tabla debe mostrar dos columnas por cuenta: "Monto USD" y "Monto VES".
```

---

## 7. Plan de Implementación Paso a Paso (Fase de Ejecución)

> [!NOTE]
> Este plan describe las fases de desarrollo una vez aprobada esta especificación formal. **No se creará código antes de dicha confirmación.**

### Paso 1: Tipos de Dominio y Contratos (`src/types/accountingTypes.ts`)
- Declaración completa de interfaces para cuentas, diarios, facturas, asientos, pagos, lotes y reportes.

### Paso 2: Capa de Servicio y Mocks Semilla (`src/services/accountingService.ts`)
- Implementación de métodos CRUD y generadores automáticos de asientos para:
  - Plan Único de Cuentas estándar (PUC venezolano/universal con ~35 cuentas base).
  - Diarios predeterminados (Ventas, Compras, Bancos USD/VES, Caja, Varios).
  - Facturas contables de prueba con apuntes automáticos precalculados.
  - Generador de Balance General, P&L y Libros Mayor/Diario con soporte de tasas históricas.

### Paso 3: Componente Reutilizable `<ContactAccountingSelector />`
- Selector de cuentas contables para clientes y proveedores compatible con los formularios de facturas y pagos.

### Paso 4: Vistas del Módulo `/accounting`
1. **Dashboard & Diarios (`/accounting/dashboard`):** Fila de KPIs + Cards de diarios con botones de acción rápida.
2. **Facturas Contables (`/accounting/invoices`):** Listado + Detalle en Tabs (Líneas vs. Asiento en vivo).
3. **Tesorería y Pagos (`/accounting/payments`):** Pago individual con diferencial cambiario + Modal de Gasto Directo.
4. **Lotes de Pago (`/accounting/payments/batches`):** Selección múltiple + Barra flotante + Modal de confirmación bancaria.
5. **Asientos Contables (`/accounting/journal-entries`):** Tabla + Creador con balanceo de partida doble en tiempo real.
6. **Plan de Cuentas (`/accounting/chart-of-accounts`):** Árbol PUC por categorías + Drawer de mapeo por tercero.
7. **Reportes Financieros (`/accounting/reports`):** Cabecera común con toggle bimonetario + Tablas jerárquicas colapsables y exportación.

### Paso 5: Sincronización del Menú Dual (Regla R5)
- Registro en `verticalMenuData.tsx` y `horizontalMenuData.tsx` bajo la sección **"Contabilidad"** con submenús para Dashboard, Facturas, Pagos/Lotes, Asientos, Plan de Cuentas y Reportes.

### Paso 6: Verificación de Calidad
- Ejecución de `npx tsc --noEmit` para garantizar **0 errores de TypeScript**.
- Verificación de la navegación fluida y renderizado en `http://localhost:3000/accounting`.
