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
  correlativo_orden?: string;
  version: number;
  creado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQuotePayload {
  cliente_id: string;
  moneda_base: CurrencyCode;
  vigencia_dias: number;
  aplica_iva?: boolean; // Control opcional de IVA en cotización
  observaciones?: string;
  terminos_condiciones?: string;
  items: {
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
    descuento_porcentaje: number;
    alicuota_iva?: string;
  }[];
  emitir_inmediatamente?: boolean;
}

export interface SalesOrderConversionResponse {
  success: boolean;
  orden_id: string;
  correlativo_orden: string;
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

export interface SalesFeatureFlags {
  TAXES_ENABLED: boolean;
  IVA_RATE: number; // e.g. 16
  IGTF_ENABLED: boolean; // e.g. 3
  SENIAT_FORMAT_VALIDATION: boolean;
  STOCK_VALIDATION_MODE: 'STRICT' | 'FLEXIBLE';
}

export interface QuoteTotalsCalculation {
  subtotal_usd: number;
  descuento_usd: number;
  base_imponible_usd: number;
  monto_exento_usd: number;
  neto_imponible_usd: number;
  iva_usd: number;
  igtf_usd: number;
  total_usd: number;

  subtotal_ves: number;
  descuento_ves: number;
  base_imponible_ves: number;
  monto_exento_ves: number;
  neto_imponible_ves: number;
  iva_ves: number;
  igtf_ves: number;
  total_ves: number;
}

export interface QuoteVisibleColumns {
  cliente?: boolean;
  emision?: boolean;
  vencimiento?: boolean;
  montoUsd?: boolean;
  montoVes?: boolean;
  estado?: boolean;
}
