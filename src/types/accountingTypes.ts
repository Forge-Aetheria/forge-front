// Tipos de dominio para el módulo de Contabilidad Bimonetaria, Tesorería y Reportes (SPEC-008)

export type CurrencyCode = 'USD' | 'VES'
export type CurrencyViewMode = 'VES' | 'USD' | 'DUAL'

export type AccountType =
  | 'ASSET_CURRENT'         // 1.1 Activo Corriente (Caja, Banco, CxC, Inventario)
  | 'ASSET_NON_CURRENT'     // 1.2 Activo No Corriente (Mobiliario, Equipos)
  | 'LIABILITY_CURRENT'     // 2.1 Pasivo Corriente (CxP, Impuestos por pagar)
  | 'LIABILITY_NON_CURRENT' // 2.2 Pasivo No Corriente
  | 'EQUITY'                // 3. Patrimonio / Capital
  | 'INCOME'                // 4. Ingresos Operacionales
  | 'COST_OF_GOODS'         // 5. Costo de Ventas
  | 'EXPENSE_OPERATING'     // 6. Gastos Operativos / Administrativos
  | 'EXPENSE_FINANCIAL'     // 6.1 Gastos Financieros / Comisiones / Dif. Cambiario
  | 'INCOME_FINANCIAL'      // 4.1 Ingresos Financieros / Ganancia Cambiaria

export type SpecificAccountType =
  | 'BANCO_CAJA'           // Banco y Caja
  | 'CXC'                  // Cuentas por Cobrar (Clientes)
  | 'INVENTARIO'           // Inventario de Mercancía
  | 'ACTIVO_CORRIENTE'     // Otros Activos Corrientes / Crédito Fiscal
  | 'ACTIVO_FIJO'          // Activos No Corrientes (Mobiliario, Equipos)
  | 'CXP'                  // Cuentas por Pagar (Proveedores)
  | 'PASIVO_CORRIENTE'     // Pasivos Corrientes (Impuestos, Retenciones)
  | 'PASIVO_NO_CORRIENTE'  // Pasivos No Corrientes (Deudas Largo Plazo)
  | 'PATRIMONIO'           // Capital Social y Reservas
  | 'INGRESO_VENTAS'       // Ingresos por Ventas / Operacionales
  | 'INGRESO_FINANCIERO'   // Ingresos Financieros / Ganancia Cambiaria
  | 'COSTO_VENTAS'         // Costo de Ventas
  | 'GASTO_OPERATIVO'      // Gastos Operativos y Administrativos
  | 'GASTO_FINANCIERO'     // Gastos Financieros / Comisiones Bancarias

export interface Account {
  id: string
  codigo: string            // Ej: "1.1.01.01"
  nombre: string            // Ej: "Banesco Banco Universal (VES)"
  tipo: AccountType
  subtipo?: SpecificAccountType
  tipoCuentaNombre?: string // Ej: "Banco y Caja", "Cuentas por Cobrar", "Gastos Operativos"
  moneda: CurrencyCode | 'AMBAS'
  permiteConciliacion: boolean
  saldoUsd: number
  saldoVes: number
  activo: boolean
}

export type JournalType = 'VENTAS' | 'COMPRAS' | 'BANCO' | 'BANCO_VES' | 'BANCO_USD' | 'CAJA' | 'VARIOS'

export interface Journal {
  id: string
  nombre: string
  codigo: string            // Ej: "BN-VES", "FAC-CLI"
  tipo: JournalType
  moneda?: CurrencyCode | 'AMBAS'
  cuentaPorDefectoId: string
  cuentaPorDefectoNombre?: string
  saldoActualUsd: number
  saldoActualVes: number
  colorIdentificador?: string
  icono?: string
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
  numeroAsiento: string     // Ej: "AS-2026-00124"
  fecha: string             // YYYY-MM-DD
  diarioId: string
  diarioNombre: string
  origen: EntrySource
  documentoReferencia?: string // Ej: "INV-0089", "LOTE-PAG-002"
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
export type InvoiceDocumentType = 'FACTURA' | 'NOTA_ENTREGA' | 'RECIBO' | 'NOTA_CREDITO' | 'NOTA_DEBITO'
export type InvoiceStatus = 'DRAFT' | 'POSTED' | 'PAID' | 'CANCELED' | 'REVERSED'

export interface AppliedCreditNote {
  id: string
  notaCreditoId: string
  numeroNotaCredito: string
  fecha: string
  motivo: string
  montoUsd: number
  montoVes: number
  creadoEn: string
}

export interface InvoicePaymentAssociation {
  id: string
  pagoId: string
  numeroPago: string
  fecha: string
  diarioId: string
  diarioNombre: string
  metodoPago: PaymentMethod
  moneda: CurrencyCode
  monto: number
  montoUsd: number
  montoVes: number
  referenciaBancaria?: string
  creadoEn: string
}

export interface InvoiceLine {
  id: string
  productoOConcepto: string
  productoId?: string
  isLandedCost?: boolean
  cuentaContableId: string  // Cuenta de Ingreso (Ventas) o Costo/Gasto/Activo (Compras)
  cuentaContableNombre?: string
  cantidad: number
  precioUnitarioUsd: number
  tasaImpuestoPct: number   // 16, 8, 0
  subtotalUsd: number
  ivaUsd: number
  totalUsd: number
}

export interface AccountingInvoice {
  id: string
  numeroFactura: string     // Ej: "INV-2026-0045"
  tipo: InvoiceAccountingType
  tipoDocumento?: InvoiceDocumentType // 'FACTURA' | 'NOTA_ENTREGA' | 'RECIBO'
  moneda?: CurrencyCode     // 'USD' | 'VES'
  contactoId: string
  contactoNombre: string
  contactoRif: string
  contactoCuentaContableId: string // cuenta_cxc_id o cuenta_cxp_id
  contactoCuentaContableNombre?: string
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
  diarioId: string
  documentoOrigen?: string // Ej: "COT-2026-0042", "ORD-2026-0016", "OC-2026-0019"
  origenQuoteId?: string
  origenPurchaseId?: string
  terminosCondiciones?: string
  notas?: string
  pagosAsociados?: InvoicePaymentAssociation[]
  // Campos de Notas de Crédito y Anulación
  facturaAfectadaId?: string
  facturaAfectadaNumero?: string
  motivoNotaCredito?: string
  motivoAnulacion?: string
  anuladaEn?: string
  anuladaPor?: string
  notasCreditoAplicadas?: AppliedCreditNote[]
}

export type PaymentMethod = 'TRANSFERENCIA' | 'PAGO_MOVIL' | 'EFECTIVO' | 'ZELLE'

export interface PaymentReconciledInvoice {
  facturaId: string
  numeroFactura: string
  tasaBcvOriginal: number
  montoAplicadoUsd: number
  montoAplicadoVes: number
  diferencialCambiarioVes: number // Positivo (+) es ganancia, negativo (-) es pérdida
}

export interface Payment {
  id: string
  numeroPago: string        // Ej: "PAG-2026-0089"
  tipo?: 'CUSTOMER' | 'SUPPLIER'
  fecha: string
  contactoId: string
  contactoNombre: string
  diarioId: string
  diarioNombre: string
  metodoPago: PaymentMethod
  moneda: CurrencyCode
  monto: number
  tasaBcvPago: number
  facturasConciliadas: PaymentReconciledInvoice[]
  aplicaIgtf: boolean
  montoIgtfUsd: number
  montoIgtfVes: number
  referenciaBancaria?: string
  cuentaBancariaId?: string
  cuentaBancariaInfo?: string
  asientoContableId?: string
  estado: 'CONFIRMADO' | 'ANULADO'
  creadoEn: string
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
  seleccionada?: boolean
}

export interface DirectExpenseForm {
  fecha: string
  diarioSalidaId: string    // Banco o Caja
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
  nivel: number             // 1: Grupo mayor, 2: Subgrupo, 3: Cuenta detalle
  esColapsable: boolean
  montoUsd: number
  montoVes: number
  subfilas?: FinancialReportRow[]
}

export interface ContactAccountingConfig {
  contactoId: string
  contactoNombre: string
  contactoRif: string
  cuentaCxcId?: string
  cuentaCxcNombre?: string
  cuentaCxpId?: string
  cuentaCxpNombre?: string
}

export interface AccountingSummaryKpis {
  totalLiquidezUsd: number
  totalLiquidezVes: number
  totalPorCobrarUsd: number
  totalPorCobrarVes: number
  totalPorPagarUsd: number
  totalPorPagarVes: number
  resultadoNetoMesUsd: number
  resultadoNetoMesVes: number
}
