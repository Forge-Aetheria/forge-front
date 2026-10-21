import type {
  ProductTemplate,
  FiscalConfig,
  StockMovement,
  StockAdjustmentRecord,
  WarehouseOperationOrder,
  ProductCategory,
  Warehouse
} from '@/types/inventoryTypes'

export const defaultFiscalConfig: FiscalConfig = {
  enabled: true, // Default to true, but toggleable in frontend via feature flags
  authority: 'SENIAT',
  defaultVATRate: '16'
}

export const mockProductTemplates: ProductTemplate[] = [
  {
    id: 'prod-001',
    name: 'Camisa Polo Algodón Pima',
    defaultCode: 'TEX-POL-001',
    barcode: '7591234567011',
    productType: 'storable',
    uomCode: 'un',
    categoryName: 'Textil & Indumentaria',
    tags: ['Ropa', 'Algodón', 'Uniforme'],
    canBeSold: true,
    canBePurchased: true,
    basePrice: 22.0,
    standardCost: 11.5,
    targetMargin: 47.7,
    minStock: 15,
    vatRate: '16',
    applyISLR: false,
    invoicingPolicy: 'DELIVERED',
    purchaseControlPolicy: 'RECEIVED',
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-10-14T15:30:00Z',
    attributes: [
      {
        id: 'attr-size',
        name: 'Talla',
        values: [
          { id: 'val-m', name: 'M' },
          { id: 'val-l', name: 'L' }
        ]
      },
      {
        id: 'attr-color',
        name: 'Color',
        values: [
          { id: 'val-blue', name: 'Azul Marino' },
          { id: 'val-white', name: 'Blanco' }
        ]
      }
    ],
    variants: [
      {
        id: 'var-001',
        templateId: 'prod-001',
        sku: 'TEX-POL-001-M-BLU',
        barcode: '7591234567012',
        combinationValues: [
          { attributeName: 'Talla', valueName: 'M' },
          { attributeName: 'Color', valueName: 'Azul Marino' }
        ],
        costPrice: 11.5,
        priceExtra: 0,
        physicalStock: 25,
        reservedStock: 3,
        availableStock: 22
      },
      {
        id: 'var-002',
        templateId: 'prod-001',
        sku: 'TEX-POL-001-M-WHT',
        barcode: '7591234567013',
        combinationValues: [
          { attributeName: 'Talla', valueName: 'M' },
          { attributeName: 'Color', valueName: 'Blanco' }
        ],
        costPrice: 11.5,
        priceExtra: 0,
        physicalStock: 18,
        reservedStock: 0,
        availableStock: 18
      },
      {
        id: 'var-003',
        templateId: 'prod-001',
        sku: 'TEX-POL-001-L-BLU',
        barcode: '7591234567014',
        combinationValues: [
          { attributeName: 'Talla', valueName: 'L' },
          { attributeName: 'Color', valueName: 'Azul Marino' }
        ],
        costPrice: 12.0,
        priceExtra: 2.0,
        physicalStock: 8,
        reservedStock: 2,
        availableStock: 6
      },
      {
        id: 'var-004',
        templateId: 'prod-001',
        sku: 'TEX-POL-001-L-WHT',
        barcode: '7591234567015',
        combinationValues: [
          { attributeName: 'Talla', valueName: 'L' },
          { attributeName: 'Color', valueName: 'Blanco' }
        ],
        costPrice: 12.0,
        priceExtra: 2.0,
        physicalStock: 4,
        reservedStock: 0,
        availableStock: 4
      }
    ]
  },
  {
    id: 'prod-002',
    name: 'Solvente Limpiador Industrial',
    defaultCode: 'CHM-SLV-002',
    barcode: '7591234567020',
    productType: 'consumable',
    uomCode: 'L',
    categoryName: 'Químicos & Fluidos',
    tags: ['Líquidos', 'Taller', 'Desengrasante'],
    canBeSold: true,
    canBePurchased: true,
    basePrice: 9.5,
    standardCost: 4.8,
    targetMargin: 49.5,
    minStock: 20,
    vatRate: '16',
    applyISLR: false,
    createdAt: '2026-09-12T10:15:00Z',
    updatedAt: '2026-10-12T11:20:00Z',
    attributes: [
      {
        id: 'attr-vol',
        name: 'Presentación',
        values: [
          { id: 'val-1l', name: 'Envase 1 Litro' },
          { id: 'val-5l', name: 'Bidón 5 Litros' }
        ]
      }
    ],
    variants: [
      {
        id: 'var-005',
        templateId: 'prod-002',
        sku: 'CHM-SLV-002-1L',
        barcode: '7591234567021',
        combinationValues: [{ attributeName: 'Presentación', valueName: 'Envase 1 Litro' }],
        costPrice: 4.8,
        priceExtra: 0,
        physicalStock: 35,
        reservedStock: 5,
        availableStock: 30
      },
      {
        id: 'var-006',
        templateId: 'prod-002',
        sku: 'CHM-SLV-002-5L',
        barcode: '7591234567022',
        combinationValues: [{ attributeName: 'Presentación', valueName: 'Bidón 5 Litros' }],
        costPrice: 18.0,
        priceExtra: 22.0,
        physicalStock: 6,
        reservedStock: 1,
        availableStock: 5
      }
    ]
  },
  {
    id: 'prod-003',
    name: 'Taladro Percutor 1/2" Bosch GSB 13 RE',
    defaultCode: 'HER-TAL-003',
    barcode: '7591234567030',
    productType: 'storable',
    uomCode: 'un',
    categoryName: 'Herramientas & Maquinaria',
    tags: ['Eléctricas', 'Bosch', '650W'],
    canBeSold: true,
    canBePurchased: true,
    basePrice: 85.0,
    standardCost: 55.0,
    targetMargin: 35.3,
    minStock: 3,
    vatRate: '16',
    applyISLR: false,
    createdAt: '2026-09-15T14:00:00Z',
    updatedAt: '2026-10-15T08:40:00Z',
    attributes: [],
    variants: [
      {
        id: 'var-007',
        templateId: 'prod-003',
        sku: 'HER-TAL-003',
        barcode: '7591234567030',
        combinationValues: [],
        costPrice: 55.0,
        priceExtra: 0,
        physicalStock: 7,
        reservedStock: 0,
        availableStock: 7
      }
    ]
  },
  {
    id: 'prod-004',
    name: 'Papel Fotocopia Carta 75g (Resma)',
    defaultCode: 'OFI-PAP-004',
    barcode: '7591234567040',
    productType: 'consumable',
    uomCode: 'paquete',
    categoryName: 'Papelería & Oficina',
    tags: ['Oficina', 'Papel', '500 hojas'],
    canBeSold: false,
    canBePurchased: true,
    basePrice: 5.0,
    standardCost: 3.8,
    targetMargin: 24.0,
    minStock: 10,
    vatRate: 'EXEMPT',
    applyISLR: false,
    createdAt: '2026-09-18T11:00:00Z',
    updatedAt: '2026-10-10T16:10:00Z',
    attributes: [],
    variants: [
      {
        id: 'var-008',
        templateId: 'prod-004',
        sku: 'OFI-PAP-004',
        barcode: '7591234567040',
        combinationValues: [],
        costPrice: 3.8,
        priceExtra: 0,
        physicalStock: 2,
        reservedStock: 0,
        availableStock: 2 // Low stock warning
      }
    ]
  },
  {
    id: 'prod-005',
    name: 'Café en Grano Premium Arábica',
    defaultCode: 'ALM-CAF-005',
    barcode: '7591234567050',
    productType: 'storable',
    uomCode: 'kg',
    categoryName: 'Alimentos & Bebidas',
    tags: ['Gourmet', 'Tostado', 'Arábica'],
    canBeSold: true,
    canBePurchased: true,
    basePrice: 14.0,
    standardCost: 7.5,
    targetMargin: 46.4,
    minStock: 5,
    vatRate: 'EXEMPT',
    applyISLR: false,
    createdAt: '2026-09-20T09:30:00Z',
    updatedAt: '2026-10-16T10:00:00Z',
    attributes: [
      {
        id: 'attr-kg',
        name: 'Presentación',
        values: [
          { id: 'val-500g', name: 'Bolsa 500g' },
          { id: 'val-1kg', name: 'Bolsa 1kg' }
        ]
      }
    ],
    variants: [
      {
        id: 'var-009',
        templateId: 'prod-005',
        sku: 'ALM-CAF-005-500G',
        barcode: '7591234567051',
        combinationValues: [{ attributeName: 'Presentación', valueName: 'Bolsa 500g' }],
        costPrice: 4.0,
        priceExtra: -6.0,
        physicalStock: 0,
        reservedStock: 0,
        availableStock: 0 // Out of stock
      },
      {
        id: 'var-010',
        templateId: 'prod-005',
        sku: 'ALM-CAF-005-1KG',
        barcode: '7591234567052',
        combinationValues: [{ attributeName: 'Presentación', valueName: 'Bolsa 1kg' }],
        costPrice: 7.5,
        priceExtra: 0,
        physicalStock: 12,
        reservedStock: 2,
        availableStock: 10
      }
    ]
  },
  {
    id: 'prod-006',
    name: 'Mantenimiento Preventivo de Maquinaria',
    defaultCode: 'SRV-MNT-006',
    productType: 'service',
    uomCode: 'servicio',
    categoryName: 'Servicios Profesionales',
    tags: ['Taller', 'Mano de Obra', 'Técnico'],
    canBeSold: true,
    canBePurchased: false,
    basePrice: 150.0,
    standardCost: 60.0,
    targetMargin: 60.0,
    vatRate: '16',
    applyISLR: true,
    invoicingPolicy: 'ORDERED',
    purchaseControlPolicy: 'ORDERED',
    createdAt: '2026-09-25T13:00:00Z',
    updatedAt: '2026-10-14T12:00:00Z',
    attributes: [],
    variants: [
      {
        id: 'var-011',
        templateId: 'prod-006',
        sku: 'SRV-MNT-006',
        combinationValues: [],
        costPrice: 60.0,
        priceExtra: 0,
        physicalStock: 0,
        reservedStock: 0,
        availableStock: 0
      }
    ]
  }
]

export const mockStockMovements: StockMovement[] = [
  {
    id: 'mov-001',
    fecha: '2026-10-17T10:15:00Z',
    producto_id: 'prod-001',
    producto_nombre: 'Camisa Polo Algodón Pima',
    variante_id: 'var-001',
    variante_sku: 'TEX-POL-001-M-BLU',
    uom_code: 'un',
    tipo_movimiento: 'SALE_DELIVERY',
    documento_referencia: 'COT-2026-0042',
    cantidad_entrada: 0,
    cantidad_salida: 5,
    costo_unitario_usd: 11.5,
    saldo_resultante: 25,
    motivo: 'Despacho por orden de venta aprobada',
    almacen: 'Almacén Central',
    usuario_responsable: 'Carlos Mendoza'
  },
  {
    id: 'mov-002',
    fecha: '2026-10-16T16:40:00Z',
    producto_id: 'prod-003',
    producto_nombre: 'Taladro Percutor 1/2" Bosch GSB 13 RE',
    variante_id: 'var-007',
    variante_sku: 'HER-TAL-003',
    uom_code: 'un',
    tipo_movimiento: 'PURCHASE_RECEIPT',
    documento_referencia: 'REC-2026-0089',
    cantidad_entrada: 4,
    cantidad_salida: 0,
    costo_unitario_usd: 55.0,
    saldo_resultante: 7,
    motivo: 'Recepción de proveedor Ferretería Mayorista C.A.',
    almacen: 'Almacén Central',
    usuario_responsable: 'Elena Rivas'
  },
  {
    id: 'mov-003',
    fecha: '2026-10-15T14:20:00Z',
    producto_id: 'prod-004',
    producto_nombre: 'Papel Fotocopia Carta 75g (Resma)',
    variante_id: 'var-008',
    variante_sku: 'OFI-PAP-004',
    uom_code: 'paquete',
    tipo_movimiento: 'ADJUSTMENT_OUT',
    documento_referencia: 'AJU-2026-0002',
    cantidad_entrada: 0,
    cantidad_salida: 3,
    costo_unitario_usd: 3.8,
    saldo_resultante: 2,
    motivo: 'Consumo interno de administración y humedad en empaque',
    almacen: 'Almacén Suministros',
    usuario_responsable: 'Elena Rivas'
  },
  {
    id: 'mov-004',
    fecha: '2026-10-14T11:05:00Z',
    producto_id: 'prod-002',
    producto_nombre: 'Solvente Limpiador Industrial',
    variante_id: 'var-005',
    variante_sku: 'CHM-SLV-002-1L',
    uom_code: 'L',
    tipo_movimiento: 'PURCHASE_RECEIPT',
    documento_referencia: 'REC-2026-0084',
    cantidad_entrada: 20,
    cantidad_salida: 0,
    costo_unitario_usd: 4.8,
    saldo_resultante: 35,
    motivo: 'Reposición mensual de químicos industriales',
    almacen: 'Almacén Químicos',
    usuario_responsable: 'Carlos Mendoza'
  },
  {
    id: 'mov-005',
    fecha: '2026-10-13T09:30:00Z',
    producto_id: 'prod-005',
    producto_nombre: 'Café en Grano Premium Arábica',
    variante_id: 'var-010',
    variante_sku: 'ALM-CAF-005-1KG',
    uom_code: 'kg',
    tipo_movimiento: 'ADJUSTMENT_IN',
    documento_referencia: 'AJU-2026-0001',
    cantidad_entrada: 2,
    cantidad_salida: 0,
    costo_unitario_usd: 7.5,
    saldo_resultante: 12,
    motivo: 'Sobrante verificado durante toma física de inventario',
    almacen: 'Almacén Central',
    usuario_responsable: 'Elena Rivas'
  },
  {
    id: 'mov-006',
    fecha: '2026-10-10T08:00:00Z',
    producto_id: 'prod-001',
    producto_nombre: 'Camisa Polo Algodón Pima',
    variante_id: 'var-001',
    variante_sku: 'TEX-POL-001-M-BLU',
    uom_code: 'un',
    tipo_movimiento: 'INITIAL_INVENTORY',
    documento_referencia: 'INV-INI-2026',
    cantidad_entrada: 30,
    cantidad_salida: 0,
    costo_unitario_usd: 11.5,
    saldo_resultante: 30,
    motivo: 'Carga de saldo inicial de apertura',
    almacen: 'Almacén Central',
    usuario_responsable: 'Sistema ERP'
  }
]

export const mockStockAdjustments: StockAdjustmentRecord[] = [
  {
    id: 'adj-002',
    correlativo: 'AJU-2026-0002',
    fecha: '2026-10-15T14:20:00Z',
    producto_id: 'prod-004',
    producto_nombre: 'Papel Fotocopia Carta 75g (Resma)',
    variante_id: 'var-008',
    variante_sku: 'OFI-PAP-004',
    uom_code: 'paquete',
    motivo: 'CONSUMO_INTERNO',
    stock_sistema: 5,
    stock_contado: 2,
    diferencia: -3,
    costo_unitario_usd: 3.8,
    impacto_usd: -11.4,
    observaciones: '2 resmas asignadas a departamento de facturación y 1 con daño por humedad',
    usuario_responsable: 'Elena Rivas',
    estado: 'APPLIED'
  },
  {
    id: 'adj-001',
    correlativo: 'AJU-2026-0001',
    fecha: '2026-10-13T09:30:00Z',
    producto_id: 'prod-005',
    producto_nombre: 'Café en Grano Premium Arábica',
    variante_id: 'var-010',
    variante_sku: 'ALM-CAF-005-1KG',
    uom_code: 'kg',
    motivo: 'CONTEO_FISICO',
    stock_sistema: 10,
    stock_contado: 12,
    diferencia: 2,
    costo_unitario_usd: 7.5,
    impacto_usd: 15.0,
    observaciones: 'Hallazgo de 2 empaques de 1kg en estante secundario durante auditoría',
    usuario_responsable: 'Elena Rivas',
    estado: 'APPLIED'
  }
]

export const mockWarehouseOperationOrders: WarehouseOperationOrder[] = [
  // RECEPCIONES (IN)
  {
    id: 'ord-in-001',
    codigo: 'IN/2026/0091',
    tipo: 'RECEIPT',
    estado: 'READY',
    tercero_nombre: 'Distribuidora Textil Andina S.A.',
    documento_origen: 'OC-2026-0018',
    almacen_origen_nombre: 'Proveedor Externo',
    almacen_destino_id: 'wh-001',
    almacen_destino_nombre: 'Almacén Central',
    ubicacion_destino_nombre: 'PAS-A-EST-01 · Pasillo A - Estante 1',
    fecha_programada: '2026-10-18',
    total_articulos: 50,
    responsable: 'Elena Rivas',
    notas: 'Entrega parcial de dotación corporativa lote #44. Verificar precintos de bolsas.',
    createdAt: '2026-10-16T09:30:00Z',
    lineas: [
      {
        id: 'lin-in-1',
        producto_id: 'prod-001',
        producto_nombre: 'Camisa Polo Algodón Pima',
        variante_id: 'var-001',
        variante_sku: 'TEX-POL-001-M-BLU',
        uom_code: 'un',
        cantidad_demanda: 30,
        cantidad_procesada: 30,
        costo_unitario_usd: 11.5
      },
      {
        id: 'lin-in-2',
        producto_id: 'prod-001',
        producto_nombre: 'Camisa Polo Algodón Pima',
        variante_id: 'var-002',
        variante_sku: 'TEX-POL-001-M-WHT',
        uom_code: 'un',
        cantidad_demanda: 20,
        cantidad_procesada: 20,
        costo_unitario_usd: 11.5
      }
    ]
  },
  {
    id: 'ord-in-002',
    codigo: 'IN/2026/0089',
    tipo: 'RECEIPT',
    estado: 'WAITING',
    tercero_nombre: 'Químicos Industriales Carabobo C.A.',
    documento_origen: 'OC-2026-0021',
    almacen_origen_nombre: 'Proveedor Externo',
    almacen_destino_id: 'wh-001',
    almacen_destino_nombre: 'Almacén Central',
    ubicacion_destino_nombre: 'ZONA-QUIM-01 · Área de Seguridad Química',
    fecha_programada: '2026-10-19',
    total_articulos: 25,
    responsable: 'Elena Rivas',
    notas: 'Requiere hoja de seguridad MSDS firmada al momento de la descarga.',
    createdAt: '2026-10-17T11:00:00Z',
    lineas: [
      {
        id: 'lin-in-3',
        producto_id: 'prod-002',
        producto_nombre: 'Solvente Limpiador Industrial',
        variante_id: 'var-005',
        variante_sku: 'CHM-SLV-002-1L',
        uom_code: 'L',
        cantidad_demanda: 20,
        cantidad_procesada: 20,
        costo_unitario_usd: 4.8
      },
      {
        id: 'lin-in-4',
        producto_id: 'prod-002',
        producto_nombre: 'Solvente Limpiador Industrial',
        variante_id: 'var-006',
        variante_sku: 'CHM-SLV-002-5L',
        uom_code: 'L',
        cantidad_demanda: 5,
        cantidad_procesada: 5,
        costo_unitario_usd: 18.0
      }
    ]
  },
  {
    id: 'ord-in-003',
    codigo: 'IN/2026/0084',
    tipo: 'RECEIPT',
    estado: 'COMPLETED',
    tercero_nombre: 'Ferretería Mayorista Central C.A.',
    documento_origen: 'OC-2026-0012',
    almacen_origen_nombre: 'Proveedor Externo',
    almacen_destino_id: 'wh-001',
    almacen_destino_nombre: 'Almacén Central',
    ubicacion_destino_nombre: 'PAS-B-EST-04 · Pasillo B - Estante 4',
    fecha_programada: '2026-10-14',
    fecha_efectiva: '2026-10-14T15:20:00Z',
    total_articulos: 5,
    responsable: 'Elena Rivas',
    notas: 'Recepción conforme con factura fiscal N° 00-48192.',
    createdAt: '2026-10-13T10:00:00Z',
    lineas: [
      {
        id: 'lin-in-5',
        producto_id: 'prod-003',
        producto_nombre: 'Taladro Percutor 1/2" Bosch GSB 13 RE',
        variante_id: 'var-007',
        variante_sku: 'HER-TAL-003',
        uom_code: 'un',
        cantidad_demanda: 5,
        cantidad_procesada: 5,
        costo_unitario_usd: 55.0
      }
    ]
  },

  // ÓRDENES DE ENTREGA / DESPACHOS (OUT)
  {
    id: 'ord-out-001',
    codigo: 'OUT/2026/0042',
    tipo: 'DELIVERY',
    estado: 'READY',
    tercero_nombre: 'Inversiones Globales del Sur C.A.',
    documento_origen: 'COT-2026-0042',
    almacen_origen_id: 'wh-001',
    almacen_origen_nombre: 'Almacén Central',
    ubicacion_origen_nombre: 'PAS-A-EST-01 · Pasillo A - Estante 1',
    almacen_destino_nombre: 'Despacho a Cliente',
    fecha_programada: '2026-10-18',
    total_articulos: 15,
    responsable: 'Carlos Mendoza',
    notas: 'Cliente retira por muelle principal con transporte propio.',
    createdAt: '2026-10-16T14:20:00Z',
    lineas: [
      {
        id: 'lin-out-1',
        producto_id: 'prod-001',
        producto_nombre: 'Camisa Polo Algodón Pima',
        variante_id: 'var-001',
        variante_sku: 'TEX-POL-001-M-BLU',
        uom_code: 'un',
        cantidad_demanda: 10,
        cantidad_procesada: 10,
        costo_unitario_usd: 11.5
      },
      {
        id: 'lin-out-2',
        producto_id: 'prod-002',
        producto_nombre: 'Solvente Limpiador Industrial',
        variante_id: 'var-005',
        variante_sku: 'CHM-SLV-002-1L',
        uom_code: 'L',
        cantidad_demanda: 5,
        cantidad_procesada: 5,
        costo_unitario_usd: 4.8
      }
    ]
  },
  {
    id: 'ord-out-002',
    codigo: 'OUT/2026/0041',
    tipo: 'DELIVERY',
    estado: 'LATE',
    tercero_nombre: 'Constructora Horizonte C.A.',
    documento_origen: 'COT-2026-0039',
    almacen_origen_id: 'wh-001',
    almacen_origen_nombre: 'Almacén Central',
    ubicacion_origen_nombre: 'PAS-B-EST-04 · Pasillo B - Estante 4',
    almacen_destino_nombre: 'Despacho a Cliente',
    fecha_programada: '2026-10-16',
    total_articulos: 3,
    responsable: 'Elena Rivas',
    notas: 'Pendiente confirmación de guía de movilización.',
    createdAt: '2026-10-15T08:45:00Z',
    lineas: [
      {
        id: 'lin-out-3',
        producto_id: 'prod-003',
        producto_nombre: 'Taladro Percutor 1/2" Bosch GSB 13 RE',
        variante_id: 'var-007',
        variante_sku: 'HER-TAL-003',
        uom_code: 'un',
        cantidad_demanda: 3,
        cantidad_procesada: 3,
        costo_unitario_usd: 55.0
      }
    ]
  },
  {
    id: 'ord-out-003',
    codigo: 'OUT/2026/0044',
    tipo: 'DELIVERY',
    estado: 'WAITING',
    tercero_nombre: 'Comercializadora El Faro C.A.',
    documento_origen: 'COT-2026-0048',
    almacen_origen_id: 'wh-002',
    almacen_origen_nombre: 'Depósito Sucursal Valencia',
    ubicacion_origen_nombre: 'VAL-PISO-VENTA · Exhibición y Despacho Rápido POS',
    almacen_destino_nombre: 'Despacho a Cliente',
    fecha_programada: '2026-10-19',
    total_articulos: 8,
    responsable: 'Carlos Mendoza',
    notas: 'Preparar embalaje reforzado para envío regional.',
    createdAt: '2026-10-17T16:10:00Z',
    lineas: [
      {
        id: 'lin-out-4',
        producto_id: 'prod-005',
        producto_nombre: 'Café en Grano Premium Arábica',
        variante_id: 'var-009',
        variante_sku: 'ALM-CAF-005-1KG',
        uom_code: 'kg',
        cantidad_demanda: 8,
        cantidad_procesada: 8,
        costo_unitario_usd: 9.2
      }
    ]
  },

  // TRANSFERENCIAS INTERNAS (INT)
  {
    id: 'ord-int-001',
    codigo: 'INT/2026/0015',
    tipo: 'INTERNAL_TRANSFER',
    estado: 'READY',
    tercero_nombre: 'Traslado Interno entre Almacenes',
    documento_origen: 'REQ-SUC-019',
    almacen_origen_id: 'wh-001',
    almacen_origen_nombre: 'Almacén Central',
    ubicacion_origen_nombre: 'PAS-A-EST-01 · Pasillo A - Estante 1',
    almacen_destino_id: 'wh-002',
    almacen_destino_nombre: 'Depósito Sucursal Valencia',
    ubicacion_destino_nombre: 'VAL-PISO-VENTA · Exhibición y Despacho Rápido POS',
    fecha_programada: '2026-10-18',
    total_articulos: 12,
    responsable: 'Elena Rivas',
    notas: 'Reposición semanal de stock para piso de venta en Sucursal Valencia.',
    createdAt: '2026-10-17T08:30:00Z',
    lineas: [
      {
        id: 'lin-int-1',
        producto_id: 'prod-001',
        producto_nombre: 'Camisa Polo Algodón Pima',
        variante_id: 'var-001',
        variante_sku: 'TEX-POL-001-M-BLU',
        uom_code: 'un',
        cantidad_demanda: 8,
        cantidad_procesada: 8,
        costo_unitario_usd: 11.5
      },
      {
        id: 'lin-int-2',
        producto_id: 'prod-003',
        producto_nombre: 'Taladro Percutor 1/2" Bosch GSB 13 RE',
        variante_id: 'var-007',
        variante_sku: 'HER-TAL-003',
        uom_code: 'un',
        cantidad_demanda: 4,
        cantidad_procesada: 4,
        costo_unitario_usd: 55.0
      }
    ]
  },
  {
    id: 'ord-int-002',
    codigo: 'INT/2026/0014',
    tipo: 'INTERNAL_TRANSFER',
    estado: 'WAITING',
    tercero_nombre: 'Reubicación Interna de Almacén',
    documento_origen: 'MOV-INT-008',
    almacen_origen_id: 'wh-002',
    almacen_origen_nombre: 'Depósito Sucursal Valencia',
    ubicacion_origen_nombre: 'VAL-TRANSITO · Muelle de Recepción / Tránsito',
    almacen_destino_id: 'wh-002',
    almacen_destino_nombre: 'Depósito Sucursal Valencia',
    ubicacion_destino_nombre: 'VAL-BODEGA-01 · Bodega Trasera Principal',
    fecha_programada: '2026-10-19',
    total_articulos: 10,
    responsable: 'Carlos Mendoza',
    notas: 'Paso de muelle de recepción a estantería definitiva tras control de calidad.',
    createdAt: '2026-10-17T13:15:00Z',
    lineas: [
      {
        id: 'lin-int-3',
        producto_id: 'prod-002',
        producto_nombre: 'Solvente Limpiador Industrial',
        variante_id: 'var-005',
        variante_sku: 'CHM-SLV-002-1L',
        uom_code: 'L',
        cantidad_demanda: 10,
        cantidad_procesada: 10,
        costo_unitario_usd: 4.8
      }
    ]
  },
  {
    id: 'ord-int-003',
    codigo: 'INT/2026/0011',
    tipo: 'INTERNAL_TRANSFER',
    estado: 'COMPLETED',
    tercero_nombre: 'Traslado Interno entre Almacenes',
    documento_origen: 'REQ-SUC-014',
    almacen_origen_id: 'wh-001',
    almacen_origen_nombre: 'Almacén Central',
    ubicacion_origen_nombre: 'PAS-B-EST-04 · Pasillo B - Estante 4',
    almacen_destino_id: 'wh-002',
    almacen_destino_nombre: 'Depósito Sucursal Valencia',
    ubicacion_destino_nombre: 'VAL-BODEGA-01 · Bodega Trasera Principal',
    fecha_programada: '2026-10-12',
    fecha_efectiva: '2026-10-12T17:00:00Z',
    total_articulos: 6,
    responsable: 'Elena Rivas',
    notas: 'Transferencia completada sin novedades.',
    createdAt: '2026-10-11T11:20:00Z',
    lineas: [
      {
        id: 'lin-int-4',
        producto_id: 'prod-005',
        producto_nombre: 'Café en Grano Premium Arábica',
        variante_id: 'var-009',
        variante_sku: 'ALM-CAF-005-1KG',
        uom_code: 'kg',
        cantidad_demanda: 6,
        cantidad_procesada: 6,
        costo_unitario_usd: 9.2
      }
    ]
  }
]

export const mockProductCategories: ProductCategory[] = [
  {
    id: 'cat-001',
    code: 'TEX',
    name: 'Textil & Indumentaria',
    description: 'Uniformes corporativos, dotación textil, camisas, pantalones y calzado industrial',
    isActive: true,
    createdAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'cat-002',
    code: 'HER',
    name: 'Herramientas & Maquinaria',
    description: 'Herramientas eléctricas, manuales, discos de corte, taladros y repuestos mecánicos',
    isActive: true,
    createdAt: '2026-09-01T10:05:00Z'
  },
  {
    id: 'cat-003',
    code: 'QUI',
    name: 'Químicos & Fluidos',
    description: 'Solventes industriales, desengrasantes, aceites lubricantes y pinturas',
    isActive: true,
    createdAt: '2026-09-01T10:10:00Z'
  },
  {
    id: 'cat-004',
    code: 'PAP',
    name: 'Papelería & Oficina',
    description: 'Resmas de papel, tóners, carpetas y suministros administrativos consumibles',
    isActive: true,
    createdAt: '2026-09-01T10:15:00Z'
  },
  {
    id: 'cat-005',
    code: 'ALI',
    name: 'Alimentos & Bebidas',
    description: 'Café en grano, insumos de comedor y productos de consumo perecederos',
    isActive: true,
    createdAt: '2026-09-01T10:20:00Z'
  },
  {
    id: 'cat-006',
    code: 'TEC',
    name: 'Tecnología & Electrónica',
    description: 'Equipos de cómputo, lectores de código de barras, impresoras fiscales y redes',
    isActive: true,
    createdAt: '2026-09-01T10:25:00Z'
  },
  {
    id: 'cat-007',
    code: 'SRV',
    name: 'Servicios Profesionales',
    description: 'Mano de obra especializada, mantenimiento técnico, instalaciones y consultoría',
    isActive: true,
    createdAt: '2026-09-01T10:30:00Z'
  }
]

export const mockWarehouses: Warehouse[] = [
  {
    id: 'wh-001',
    code: 'ALM-CENTRAL',
    name: 'Almacén Central',
    address: 'Zona Industrial Los Cortijos, Galpón 4, Caracas',
    manager: 'Elena Rivas',
    isDefault: true,
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
    locations: [
      {
        id: 'loc-001',
        warehouseId: 'wh-001',
        code: 'PAS-A-EST-01',
        name: 'Pasillo A - Estante 1 (Textiles y Dotación)',
        type: 'INTERNAL',
        notes: 'Anaqueles de carga ligera climatizados',
        isActive: true
      },
      {
        id: 'loc-002',
        warehouseId: 'wh-001',
        code: 'PAS-B-EST-04',
        name: 'Pasillo B - Estante 4 (Herramientas y Equipos)',
        type: 'INTERNAL',
        notes: 'Rack reforzado con control de acceso',
        isActive: true
      },
      {
        id: 'loc-003',
        warehouseId: 'wh-001',
        code: 'ZONA-QUIM-01',
        name: 'Área de Seguridad Química y Líquidos',
        type: 'INTERNAL',
        notes: 'Zona ventilada con bandeja antiderrames',
        isActive: true
      },
      {
        id: 'loc-004',
        warehouseId: 'wh-001',
        code: 'MERMA-CUARENTENA',
        name: 'Zona de Merma y Cuarentena',
        type: 'SCRAP',
        notes: 'Artículos dañados pendientes por baja definitiva',
        isActive: true
      }
    ]
  },
  {
    id: 'wh-002',
    code: 'SUC-VALENCIA',
    name: 'Depósito Sucursal Valencia',
    address: 'Av. Industrial Michelena, C.C. Empresarial, Local 12, Valencia',
    manager: 'Carlos Mendoza',
    isDefault: false,
    isActive: true,
    createdAt: '2026-09-05T09:30:00Z',
    locations: [
      {
        id: 'loc-005',
        warehouseId: 'wh-002',
        code: 'VAL-PISO-VENTA',
        name: 'Exhibición y Despacho Rápido POS',
        type: 'INTERNAL',
        notes: 'Reposición diaria desde almacén interno',
        isActive: true
      },
      {
        id: 'loc-006',
        warehouseId: 'wh-002',
        code: 'VAL-BODEGA-01',
        name: 'Bodega Trasera Principal',
        type: 'INTERNAL',
        notes: 'Estantería general multipropósito',
        isActive: true
      },
      {
        id: 'loc-007',
        warehouseId: 'wh-002',
        code: 'VAL-TRANSITO',
        name: 'Muelle de Recepción / Tránsito',
        type: 'TRANSIT',
        notes: 'Mercancía en verificación de guía de despacho',
        isActive: true
      }
    ]
  }
]

