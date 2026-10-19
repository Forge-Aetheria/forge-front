import { BcvRate, ClientLookup, ProductLookup, Quote, SalesFeatureFlags } from '@/types/salesQuotesTypes';

export const defaultSalesFeatureFlags: SalesFeatureFlags = {
  TAXES_ENABLED: true,
  IVA_RATE: 16,
  IGTF_ENABLED: false, // Inactivo por defecto, activable si el cliente lo requiere
  SENIAT_FORMAT_VALIDATION: true,
  STOCK_VALIDATION_MODE: 'STRICT'
};

export const initialMockBcvRate: BcvRate = {
  id: 'bcv-2026-10-15',
  tasa: 36.50,
  fecha_valor: '2026-10-15',
  fuente: 'BCV_OFICIAL',
  sincronizado_at: '2026-10-15T07:00:00.000Z'
};

export const mockClientsLookup: ClientLookup[] = [
  {
    id: 'ter-001',
    identificacion: 'J-00041372-8',
    nombre_razon_social: 'Inversiones Polar C.A.',
    nombre_comercial: 'Alimentos Polar',
    email: 'atencion@polar.com',
    telefono: '02122023111',
    direccion: '4ta Transversal de Los Cortijos de Lourdes, Edif. Fundación Polar',
    ciudad: 'Caracas',
    estado: 'Miranda'
  },
  {
    id: 'ter-002',
    identificacion: 'J-00020200-1',
    nombre_razon_social: 'Farmatodo C.A.',
    nombre_comercial: 'Farmatodo Venezuela',
    email: 'contacto@farmatodo.com',
    telefono: '08003276286',
    direccion: 'Av. Principal de Los Ruices, Centro Los Ruices',
    ciudad: 'Caracas',
    estado: 'Miranda'
  },
  {
    id: 'ter-003',
    identificacion: 'J-30491823-4',
    nombre_razon_social: 'Distribuidora Los Andes C.A.',
    nombre_comercial: 'Los Andes Suministros',
    email: 'ventas@losandessum.com',
    telefono: '02742441029',
    direccion: 'Av. Las Américas, Edif. Los Andes, Nivel PB',
    ciudad: 'Mérida',
    estado: 'Mérida'
  },
  {
    id: 'ter-004',
    identificacion: 'V-18765432',
    nombre_razon_social: 'Alejandro Silva',
    nombre_comercial: 'Consultoría Silva & Asociados',
    email: 'alejandro.silva@gmail.com',
    telefono: '04129876543',
    direccion: 'Urb. El Rosal, Av. Tamanaco, Torre Credicard, Piso 8',
    ciudad: 'Caracas',
    estado: 'Distrito Capital'
  }
];

export const mockProductsLookup: ProductLookup[] = [
  {
    id: 'prod-001',
    sku: 'TEX-POL-001',
    nombre: 'Camisa Polo Algodón Pima',
    descripcion: 'Polo corporativo en algodón peinado pima 100%, cuello reforzado',
    tipo: 'PHYSICAL',
    is_physical_stock: true,
    manages_stock: true,
    stock_fisico: 45,
    stock_comprometido: 10,
    stock_disponible: 35,
    precio_unitario_base: 22.00,
    alicuota_iva: '16'
  },
  {
    id: 'prod-002',
    sku: 'FER-TAL-002',
    nombre: 'Taladro Percutor Inalámbrico 20V',
    descripcion: 'Taladro percutor industrial 20V con 2 baterías de litio y maletín rígido',
    tipo: 'PHYSICAL',
    is_physical_stock: true,
    manages_stock: true,
    stock_fisico: 12,
    stock_comprometido: 2,
    stock_disponible: 10,
    precio_unitario_base: 89.50,
    alicuota_iva: '16'
  },
  {
    id: 'prod-003',
    sku: 'SER-MNT-003',
    nombre: 'Servicio de Mantenimiento Preventivo Especializado',
    descripcion: 'Revisión técnica de sistemas industriales, calibración y reporte de diagnóstico',
    tipo: 'SERVICE',
    is_physical_stock: false,
    manages_stock: false,
    stock_fisico: 0,
    stock_comprometido: 0,
    stock_disponible: 999,
    precio_unitario_base: 150.00,
    alicuota_iva: '16'
  },
  {
    id: 'prod-004',
    sku: 'QUI-RES-004',
    nombre: 'Resina Epóxica Industrial de Alto Impacto 5L',
    descripcion: 'Galón bicomponente de resina epoxi autonivelante para pisos',
    tipo: 'PHYSICAL',
    is_physical_stock: true,
    manages_stock: true,
    stock_fisico: 3,
    stock_comprometido: 3,
    stock_disponible: 0,
    precio_unitario_base: 64.00,
    alicuota_iva: '16'
  },
  {
    id: 'prod-005',
    sku: 'TEC-LAP-005',
    nombre: 'Laptop Corporativa UltraPro 16 (Bajo Pedido)',
    descripcion: 'Equipo de cómputo Core i7 32GB RAM SSD 1TB (Modalidad Dropshipping)',
    tipo: 'DROPSHIPPING',
    is_physical_stock: false,
    manages_stock: false,
    stock_fisico: 0,
    stock_comprometido: 0,
    stock_disponible: 999,
    precio_unitario_base: 1250.00,
    alicuota_iva: '16'
  },
  {
    id: 'prod-006',
    sku: 'MED-KIT-006',
    nombre: 'Insumos Médicos Básicos (Exento de IVA)',
    descripcion: 'Material de curación y primeros auxilios exento de IVA según ley tributaria',
    tipo: 'PHYSICAL',
    is_physical_stock: true,
    manages_stock: true,
    stock_fisico: 50,
    stock_comprometido: 5,
    stock_disponible: 45,
    precio_unitario_base: 35.00,
    alicuota_iva: 'EXEMPT'
  }
];

export const initialMockQuotes: Quote[] = [
  {
    id: 'quote-001',
    correlativo: 'COT-2026-0041',
    cliente: mockClientsLookup[0],
    estado: 'APPROVED',
    moneda_base: 'USD',
    tasa_bcv: initialMockBcvRate,
    vigencia_dias: 15,
    aplica_iva: true,
    fecha_emision: '2026-10-10',
    fecha_vencimiento: '2026-10-25',
    items: [
      {
        id: 'item-001',
        producto_id: 'prod-001',
        producto_sku: 'TEX-POL-001',
        producto_nombre: 'Camisa Polo Algodón Pima',
        is_physical_stock: true,
        cantidad: 10,
        precio_unitario: 22.00,
        descuento_porcentaje: 5,
        monto_descuento: 11.00,
        subtotal_neto: 209.00,
        alicuota_iva: '16',
        monto_iva: 33.44,
        total_linea: 242.44,
        stock_disponible_al_momento: 35
      },
      {
        id: 'item-002',
        producto_id: 'prod-002',
        producto_sku: 'FER-TAL-002',
        producto_nombre: 'Taladro Percutor Inalámbrico 20V',
        is_physical_stock: true,
        cantidad: 2,
        precio_unitario: 89.50,
        descuento_porcentaje: 0,
        monto_descuento: 0,
        subtotal_neto: 179.00,
        alicuota_iva: '16',
        monto_iva: 28.64,
        total_linea: 207.64,
        stock_disponible_al_momento: 10
      }
    ],
    subtotal_usd: 399.00,
    descuento_total_usd: 11.00,
    iva_total_usd: 62.08,
    igtf_total_usd: 0,
    total_usd: 450.08,

    subtotal_ves: 14563.50,
    descuento_total_ves: 401.50,
    iva_total_ves: 2265.92,
    igtf_total_ves: 0,
    total_ves: 16427.92,

    observaciones: 'Presupuesto corporativo para dotación de personal y mantenimiento.',
    terminos_condiciones: 'Precios garantizados durante la vigencia del documento. Entrega en 3 días hábiles.',
    version: 1,
    created_at: '2026-10-10T14:30:00.000Z',
    updated_at: '2026-10-12T09:15:00.000Z'
  },
  {
    id: 'quote-002',
    correlativo: 'COT-2026-0042',
    cliente: mockClientsLookup[1],
    estado: 'ISSUED',
    moneda_base: 'USD',
    tasa_bcv: initialMockBcvRate,
    vigencia_dias: 15,
    aplica_iva: true,
    fecha_emision: '2026-10-14',
    fecha_vencimiento: '2026-10-29',
    items: [
      {
        id: 'item-003',
        producto_id: 'prod-003',
        producto_sku: 'SER-MNT-003',
        producto_nombre: 'Servicio de Mantenimiento Preventivo Especializado',
        is_physical_stock: false,
        cantidad: 1,
        precio_unitario: 150.00,
        descuento_porcentaje: 0,
        monto_descuento: 0,
        subtotal_neto: 150.00,
        alicuota_iva: '16',
        monto_iva: 24.00,
        total_linea: 174.00,
        stock_disponible_al_momento: 999
      },
      {
        id: 'item-004',
        producto_id: 'prod-001',
        producto_sku: 'TEX-POL-001',
        producto_nombre: 'Camisa Polo Algodón Pima',
        is_physical_stock: true,
        cantidad: 5,
        precio_unitario: 22.00,
        descuento_porcentaje: 0,
        monto_descuento: 0,
        subtotal_neto: 110.00,
        alicuota_iva: '16',
        monto_iva: 17.60,
        total_linea: 127.60,
        stock_disponible_al_momento: 35
      }
    ],
    subtotal_usd: 260.00,
    descuento_total_usd: 0,
    iva_total_usd: 41.60,
    igtf_total_usd: 0,
    total_usd: 301.60,

    subtotal_ves: 9490.00,
    descuento_total_ves: 0,
    iva_total_ves: 1518.40,
    igtf_total_ves: 0,
    total_ves: 11008.40,

    observaciones: 'Cotización emitida para la sucursal Centro Los Ruices.',
    terminos_condiciones: 'Condición de pago: Crédito comercial a 15 días tras recepción de factura.',
    version: 1,
    created_at: '2026-10-14T11:00:00.000Z',
    updated_at: '2026-10-14T11:00:00.000Z'
  },
  {
    id: 'quote-003',
    correlativo: 'BORRADOR-003',
    cliente: mockClientsLookup[2],
    estado: 'DRAFT',
    moneda_base: 'USD',
    tasa_bcv: initialMockBcvRate,
    vigencia_dias: 15,
    aplica_iva: false, // Cotización en régimen exento / sin IVA
    fecha_emision: '2026-10-15',
    fecha_vencimiento: '2026-10-30',
    items: [
      {
        id: 'item-005',
        producto_id: 'prod-005',
        producto_sku: 'TEC-LAP-005',
        producto_nombre: 'Laptop Corporativa UltraPro 16 (Bajo Pedido)',
        is_physical_stock: false,
        cantidad: 2,
        precio_unitario: 1250.00,
        descuento_porcentaje: 8,
        monto_descuento: 200.00,
        subtotal_neto: 2300.00,
        alicuota_iva: 'EXEMPT',
        monto_iva: 0,
        total_linea: 2300.00,
        stock_disponible_al_momento: 999
      }
    ],
    subtotal_usd: 2500.00,
    descuento_total_usd: 200.00,
    iva_total_usd: 0,
    igtf_total_usd: 0,
    total_usd: 2300.00,

    subtotal_ves: 91250.00,
    descuento_total_ves: 7300.00,
    iva_total_ves: 0,
    igtf_total_ves: 0,
    total_ves: 83950.00,

    observaciones: 'Borrador exento de IVA negociado con el cliente.',
    version: 1,
    created_at: '2026-10-15T09:00:00.000Z',
    updated_at: '2026-10-15T09:00:00.000Z'
  },
  {
    id: 'quote-004',
    correlativo: 'COT-2026-0038',
    cliente: mockClientsLookup[3],
    estado: 'EXPIRED',
    moneda_base: 'USD',
    tasa_bcv: {
      id: 'bcv-old-rate',
      tasa: 35.20,
      fecha_valor: '2026-09-20',
      fuente: 'BCV_OFICIAL',
      sincronizado_at: '2026-09-20T07:00:00.000Z'
    },
    vigencia_dias: 15,
    aplica_iva: true,
    fecha_emision: '2026-09-20',
    fecha_vencimiento: '2026-10-05', // Vencida
    items: [
      {
        id: 'item-006',
        producto_id: 'prod-002',
        producto_sku: 'FER-TAL-002',
        producto_nombre: 'Taladro Percutor Inalámbrico 20V',
        is_physical_stock: true,
        cantidad: 1,
        precio_unitario: 89.50,
        descuento_porcentaje: 0,
        monto_descuento: 0,
        subtotal_neto: 89.50,
        alicuota_iva: '16',
        monto_iva: 14.32,
        total_linea: 103.82,
        stock_disponible_al_momento: 10
      }
    ],
    subtotal_usd: 89.50,
    descuento_total_usd: 0,
    iva_total_usd: 14.32,
    igtf_total_usd: 0,
    total_usd: 103.82,

    subtotal_ves: 3150.40,
    descuento_total_ves: 0,
    iva_total_ves: 504.06,
    igtf_total_ves: 0,
    total_ves: 3654.46,

    observaciones: 'Cotización con tasa previa de 35.20 VES/USD.',
    version: 1,
    created_at: '2026-09-20T10:00:00.000Z',
    updated_at: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'quote-005',
    correlativo: 'COT-2026-0035',
    cliente: mockClientsLookup[0],
    estado: 'CANCELED',
    moneda_base: 'USD',
    tasa_bcv: initialMockBcvRate,
    vigencia_dias: 15,
    aplica_iva: true,
    fecha_emision: '2026-09-15',
    fecha_vencimiento: '2026-09-30',
    items: [
      {
        id: 'item-007',
        producto_id: 'prod-001',
        producto_sku: 'TEX-POL-001',
        producto_nombre: 'Camisa Polo Algodón Pima',
        is_physical_stock: true,
        cantidad: 20,
        precio_unitario: 22.00,
        descuento_porcentaje: 10,
        monto_descuento: 44.00,
        subtotal_neto: 396.00,
        alicuota_iva: '16',
        monto_iva: 63.36,
        total_linea: 459.36,
        stock_disponible_al_momento: 35
      }
    ],
    subtotal_usd: 440.00,
    descuento_total_usd: 44.00,
    iva_total_usd: 63.36,
    igtf_total_usd: 0,
    total_usd: 459.36,

    subtotal_ves: 16060.00,
    descuento_total_ves: 1606.00,
    iva_total_ves: 2312.64,
    igtf_total_ves: 0,
    total_ves: 16766.64,

    motivo_anulacion: 'El cliente postergó la compra para la planificación presupuestaria del siguiente trimestre fiscal.',
    version: 1,
    created_at: '2026-09-15T15:00:00.000Z',
    updated_at: '2026-09-22T11:30:00.000Z'
  }
];
