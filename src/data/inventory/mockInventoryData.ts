import type { ProductTemplate, FiscalConfig } from '@/types/inventoryTypes'

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
    minStock: 15,
    vatRate: '16',
    applyISLR: false,
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
    minStock: 20,
    vatRate: '16',
    applyISLR: false,
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
    minStock: 3,
    vatRate: '16',
    applyISLR: false,
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
    minStock: 10,
    vatRate: 'EXEMPT',
    applyISLR: false,
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
    minStock: 5,
    vatRate: 'EXEMPT',
    applyISLR: false,
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
    vatRate: '16',
    applyISLR: true,
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
