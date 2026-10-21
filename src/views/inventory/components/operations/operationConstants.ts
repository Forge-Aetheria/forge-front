import type {
  WarehouseOperationType,
  WarehouseOperationStatus
} from '@/types/inventoryTypes'

export interface FlattenedVariantOption {
  key: string
  templateId: string
  productName: string
  variantId: string
  sku: string
  combinationLabel: string
  uomCode: string
  physicalStock: number
  availableStock: number
  unitCost: number
}

export interface NewOrderLineDraft {
  tempId: string
  variantOption: FlattenedVariantOption | null
  cantidad: string
}

export interface OperationConfigMeta {
  title: string
  subtitle: string
  newBtnLabel: string
  icon: string
  accentBg: string
  accentColor: string
  partnerLabel: string
  partnerPlaceholder: string
  docPlaceholder: string
}

export const OPERATION_CONFIG: Record<WarehouseOperationType, OperationConfigMeta> = {
  RECEIPT: {
    title: 'Recepciones de Mercancía',
    subtitle: 'Ingreso y recepción física de mercancía',
    newBtnLabel: 'Nuevo',
    icon: 'tabler-package-import',
    accentBg: '#F0EEF9',
    accentColor: '#6C5CE7',
    partnerLabel: 'Proveedor',
    partnerPlaceholder: 'Ej. Distribuidora Textil Andina S.A.',
    docPlaceholder: 'Ej. OC-2026-0025 / Factura #00412'
  },
  DELIVERY: {
    title: 'Órdenes de Entrega (Despachos)',
    subtitle: 'Despacho y entrega de mercancía a clientes',
    newBtnLabel: 'Nuevo',
    icon: 'tabler-package-export',
    accentBg: '#E0F2FE',
    accentColor: '#0284C7',
    partnerLabel: 'Cliente / Destinatario',
    partnerPlaceholder: 'Ej. Inversiones Globales del Sur C.A.',
    docPlaceholder: 'Ej. COT-2026-0049 / Pedido #108'
  },
  INTERNAL_TRANSFER: {
    title: 'Transferencias Internas',
    subtitle: 'Traslado de mercancía entre almacenes',
    newBtnLabel: 'Nuevo',
    icon: 'tabler-arrows-left-right',
    accentBg: '#FEF3C7',
    accentColor: '#D97706',
    partnerLabel: 'Concepto / Motivo del Traslado',
    partnerPlaceholder: 'Ej. Reposición semanal de piso de venta',
    docPlaceholder: 'Ej. REQ-SUC-022'
  }
}

export const STATUS_META: Record<
  WarehouseOperationStatus,
  { label: string; color: 'secondary' | 'warning' | 'primary' | 'error' | 'success' }
> = {
  DRAFT: { label: 'Borrador', color: 'secondary' },
  PENDING: { label: 'En espera', color: 'warning' },
  WAITING: { label: 'En espera', color: 'warning' },
  READY: { label: 'Listo', color: 'primary' },
  LATE: { label: 'Retrasado', color: 'error' },
  COMPLETED: { label: 'Realizado', color: 'success' },
  CANCELLED: { label: 'Cancelado', color: 'secondary' }
}
