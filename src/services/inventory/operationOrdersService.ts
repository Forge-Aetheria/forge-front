import type {
  WarehouseOperationLine,
  WarehouseOperationOrder,
  WarehouseOperationStatus,
  WarehouseOperationType
} from '@/types/inventoryTypes'
import { executeGraphQL } from '@/libs/graphqlClient'
import {
  CANCEL_WAREHOUSE_OPERATION_MUTATION,
  CREATE_WAREHOUSE_OPERATION_MUTATION,
  GET_WAREHOUSE_OPERATION_QUERY,
  GET_WAREHOUSE_OPERATIONS_QUERY,
  VALIDATE_WAREHOUSE_OPERATION_MUTATION
} from '@/graphql/inventory.gql'
import { generateIdempotencyKey } from '@/services/adapters/inventoryAdapter'

interface GqlOperationLine {
  id: string
  lineNumber: number
  variantId: string
  productName?: string | null
  sku?: string | null
  uomCode?: string | null
  demandQty: string
  processedQty: string
  unitCostUsd: string
}

interface GqlOperation {
  id: string
  code: string
  type: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER'
  status: string
  thirdPartyName?: string | null
  sourceDocument?: string | null
  sourceWarehouseId?: string | null
  targetWarehouseId?: string | null
  scheduledAt?: string | null
  effectiveAt?: string | null
  totalItems: number
  responsible?: string | null
  notes?: string | null
  createdAt: string
  lines: GqlOperationLine[]
}

const mapStatus = (status: string): WarehouseOperationStatus =>
  status === 'CANCELLED' ? 'CANCELLED' : (status as WarehouseOperationStatus)

const mapLine = (line: GqlOperationLine): WarehouseOperationLine => ({
  id: line.id,
  producto_id: line.variantId,
  producto_nombre: line.productName || '',
  variante_id: line.variantId,
  variante_sku: line.sku || '',
  uom_code: line.uomCode || 'UNI',
  cantidad_demanda: Number(line.demandQty),
  cantidad_procesada: Number(line.processedQty),
  costo_unitario_usd: Number(line.unitCostUsd)
})

const mapOrder = (operation: GqlOperation): WarehouseOperationOrder => ({
  id: operation.id,
  codigo: operation.code,
  tipo: operation.type,
  estado: mapStatus(operation.status),
  tercero_nombre: operation.thirdPartyName || '',
  documento_origen: operation.sourceDocument || undefined,
  almacen_origen_id: operation.sourceWarehouseId || undefined,
  almacen_origen_nombre: '',
  almacen_destino_id: operation.targetWarehouseId || undefined,
  almacen_destino_nombre: '',
  fecha_programada: operation.scheduledAt || operation.createdAt,
  fecha_efectiva: operation.effectiveAt || undefined,
  total_articulos: operation.totalItems,
  responsable: operation.responsible || '',
  notas: operation.notes || undefined,
  lineas: operation.lines.map(mapLine),
  createdAt: operation.createdAt
})

export const getWarehouseOperationOrderById = async (
  id: string
): Promise<WarehouseOperationOrder | null> => {
  const response = await executeGraphQL<{ warehouseOperation: GqlOperation | null }>(
    GET_WAREHOUSE_OPERATION_QUERY,
    { id },
    { timeoutMs: 5000 }
  )

  return response.warehouseOperation ? mapOrder(response.warehouseOperation) : null
}

export const getWarehouseOperationOrders = async (
  tipo?: WarehouseOperationType
): Promise<WarehouseOperationOrder[]> => {
  const response = await executeGraphQL<{ warehouseOperations: GqlOperation[] }>(
    GET_WAREHOUSE_OPERATIONS_QUERY,
    { where: tipo ? { type: { equals: tipo } } : undefined, take: 100 },
    { timeoutMs: 5000 }
  )

  return response.warehouseOperations.map(mapOrder)
}

export const createWarehouseOperationOrder = async (input: {
  tipo: WarehouseOperationType
  tercero_nombre: string
  documento_origen?: string
  almacen_origen_id?: string
  almacen_origen_nombre: string
  ubicacion_origen_nombre?: string
  almacen_destino_id?: string
  almacen_destino_nombre: string
  ubicacion_destino_nombre?: string
  fecha_programada: string
  responsable?: string
  notas?: string
  estado?: WarehouseOperationStatus
  lineas: Omit<WarehouseOperationLine, 'id'>[]
}): Promise<WarehouseOperationOrder> => {
  if (!input.lineas || input.lineas.length === 0) {
    throw new Error('Debes incluir al menos un artículo en la operación.')
  }

  const response = await executeGraphQL<{ createWarehouseOperation: GqlOperation }>(
    CREATE_WAREHOUSE_OPERATION_MUTATION,
    {
      input: {
        idempotencyKey: generateIdempotencyKey(),
        type: input.tipo,
        thirdPartyName: input.tercero_nombre.trim() || undefined,
        sourceDocument: input.documento_origen?.trim() || undefined,
        sourceWarehouseId: input.almacen_origen_id || undefined,
        targetWarehouseId: input.almacen_destino_id || undefined,
        scheduledAt: input.fecha_programada
          ? new Date(input.fecha_programada).toISOString()
          : undefined,
        responsible: input.responsable?.trim() || undefined,
        notes: input.notas?.trim() || undefined,
        lines: input.lineas.map(line => ({
          variantId: line.variante_id,
          demandQty: String(line.cantidad_demanda),
          unitCostUsd: String(line.costo_unitario_usd ?? 0)
        }))
      }
    },
    { timeoutMs: 10000 }
  )

  return mapOrder(response.createWarehouseOperation)
}

export const validateWarehouseOperationOrder = async (
  orderId: string,
  processedQuantities?: Record<string, number>
): Promise<WarehouseOperationOrder> => {
  const current = await getWarehouseOperationOrderById(orderId)

  if (!current) {
    throw new Error('Orden de operación no encontrada.')
  }

  const response = await executeGraphQL<{ validateWarehouseOperation: GqlOperation }>(
    VALIDATE_WAREHOUSE_OPERATION_MUTATION,
    {
      input: {
        operationId: orderId,
        idempotencyKey: generateIdempotencyKey(),
        lines: current.lineas.map(line => ({
          lineId: line.id,
          processedQty: String(processedQuantities?.[line.id] ?? line.cantidad_demanda)
        }))
      }
    },
    { timeoutMs: 12000 }
  )

  return mapOrder(response.validateWarehouseOperation)
}

export const cancelWarehouseOperationOrder = async (
  orderId: string,
  reason = 'Cancelada desde la interfaz'
): Promise<WarehouseOperationOrder> => {
  await executeGraphQL(
    CANCEL_WAREHOUSE_OPERATION_MUTATION,
    { input: { operationId: orderId, reason } },
    { timeoutMs: 10000 }
  )

  const updated = await getWarehouseOperationOrderById(orderId)

  if (!updated) {
    throw new Error('No se pudo recargar la operación cancelada.')
  }

  return updated
}
