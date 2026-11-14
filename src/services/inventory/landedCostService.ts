import type {
  LandedCostCostLine,
  LandedCostReceiptRef,
  LandedCostRecord,
  LandedCostStatus,
  LandedCostValuationAdjustment
} from '@/types/inventoryTypes'
import { executeGraphQL } from '@/libs/graphqlClient'
import {
  CANCEL_LANDED_COST_MUTATION,
  CREATE_LANDED_COST_MUTATION,
  GET_LANDED_COST_QUERY,
  GET_LANDED_COSTS_QUERY,
  UPDATE_LANDED_COST_MUTATION,
  VALIDATE_LANDED_COST_MUTATION
} from '@/graphql/inventory.gql'
import { generateIdempotencyKey } from '@/services/adapters/inventoryAdapter'

interface GqlLandedCostLine {
  id: string
  description: string
  splitMethod: string
  amountUsd: string
}

interface GqlLandedCost {
  id: string
  code: string
  state: string
  date: string
  reference?: string | null
  notes?: string | null
  totalAmountUsd: string
  createdAt: string
  appliedAt?: string | null
  costs?: GqlLandedCostLine[]
}

const mapCost = (cost: GqlLandedCostLine): LandedCostCostLine => ({
  id: cost.id,
  producto_id: '',
  producto_nombre: cost.description,
  descripcion: cost.description,
  metodo_reparto: cost.splitMethod as LandedCostCostLine['metodo_reparto'],
  monto_usd: Number(cost.amountUsd)
})

const mapRecord = (record: GqlLandedCost): LandedCostRecord => ({
  id: record.id,
  codigo: record.code,
  fecha: record.date,
  estado: record.state as LandedCostStatus,
  referencia: record.reference || undefined,
  notas: record.notes || undefined,
  recepciones: [],
  costos: (record.costs || []).map(mapCost),
  ajustes_valoracion: [] as LandedCostValuationAdjustment[],
  total_monto_usd: Number(record.totalAmountUsd),
  createdAt: record.createdAt,
  appliedAt: record.appliedAt || undefined
})

export const getLandedCosts = async (): Promise<LandedCostRecord[]> => {
  const response = await executeGraphQL<{ landedCosts: GqlLandedCost[] }>(
    GET_LANDED_COSTS_QUERY,
    { take: 100 },
    { timeoutMs: 5000 }
  )

  return response.landedCosts.map(mapRecord)
}

export const getLandedCostById = async (id: string): Promise<LandedCostRecord | null> => {
  const response = await executeGraphQL<{ landedCost: GqlLandedCost | null }>(
    GET_LANDED_COST_QUERY,
    { id },
    { timeoutMs: 5000 }
  )

  return response.landedCost ? mapRecord(response.landedCost) : null
}

export const calculateValuationAdjustments = (
  _receipts: LandedCostReceiptRef[],
  _costs: LandedCostCostLine[]
): LandedCostValuationAdjustment[] => []

const toCreateInput = (input: Partial<LandedCostRecord>) => ({
  idempotencyKey: generateIdempotencyKey(),
  date: input.fecha ? new Date(input.fecha).toISOString() : new Date().toISOString(),
  reference: input.referencia?.trim() || undefined,
  notes: input.notas?.trim() || undefined,
  receipts: (input.recepciones || []).map(receipt => ({
    receiptType: 'WAREHOUSE_OPERATION',
    receiptId: receipt.orden_id
  })),
  costs: (input.costos || []).map(cost => ({
    description: cost.descripcion || cost.producto_nombre || 'Gasto de importación',
    splitMethod: cost.metodo_reparto || 'BY_COST',
    amountUsd: String(cost.monto_usd)
  }))
})

export const createLandedCost = async (input: Partial<LandedCostRecord>): Promise<LandedCostRecord> => {
  const response = await executeGraphQL<{ createLandedCost: { id: string } }>(
    CREATE_LANDED_COST_MUTATION,
    { input: toCreateInput(input) },
    { timeoutMs: 10000 }
  )

  const created = await getLandedCostById(response.createLandedCost.id)

  if (!created) throw new Error('No se pudo recargar el costo en destino creado.')

  return created
}

export const updateLandedCost = async (
  id: string,
  partial: Partial<LandedCostRecord>
): Promise<LandedCostRecord> => {
  await executeGraphQL(
    UPDATE_LANDED_COST_MUTATION,
    {
      id,
      input: {
        date: partial.fecha ? new Date(partial.fecha).toISOString() : undefined,
        reference: partial.referencia?.trim() || undefined,
        notes: partial.notas?.trim() || undefined,
        receipts: partial.recepciones?.map(receipt => ({
          receiptType: 'WAREHOUSE_OPERATION',
          receiptId: receipt.orden_id
        })),
        costs: partial.costos?.map(cost => ({
          description: cost.descripcion || cost.producto_nombre || 'Gasto de importación',
          splitMethod: cost.metodo_reparto || 'BY_COST',
          amountUsd: String(cost.monto_usd)
        }))
      }
    },
    { timeoutMs: 10000 }
  )

  const updated = await getLandedCostById(id)

  if (!updated) throw new Error('No se pudo recargar el costo en destino actualizado.')

  return updated
}

export const deleteLandedCost = async (id: string): Promise<void> => {
  await executeGraphQL(
    CANCEL_LANDED_COST_MUTATION,
    { id, reason: 'Cancelado desde la interfaz' },
    { timeoutMs: 10000 }
  )
}

export const validateLandedCost = async (id: string): Promise<LandedCostRecord> => {
  await executeGraphQL(
    VALIDATE_LANDED_COST_MUTATION,
    { id, idempotencyKey: generateIdempotencyKey() },
    { timeoutMs: 12000 }
  )

  const updated = await getLandedCostById(id)

  if (!updated) throw new Error('No se pudo recargar el costo en destino validado.')

  return updated
}
