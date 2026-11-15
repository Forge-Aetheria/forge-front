import { GET_TENANT_SETTING_QUERY } from '@/graphql/pos.gql'
import { GET_ACTIVE_BCV_RATE_QUERY } from '@/graphql/sales.gql'
import { executeGraphQL, GraphQLClientError } from '@/libs/graphqlClient'

export interface ActiveBcvRate {
  rate: number
  rateId: string
  source: string
  valueDate: string
  capturedAt: string

  /** true when there is no official active rate and the configured fallback is used. */
  isFallback?: boolean
}

const BCV_CONFIG_KEY = 'company.bcvConfig'
const CACHE_TTL_MS = 15_000

let cachedRate: { at: number; result: BcvRateResult } | null = null
let inFlightRate: Promise<BcvRateResult> | null = null

export interface BcvRateError {
  code: string
  message: string
}

export type BcvRateResult = { ok: true; data: ActiveBcvRate } | { ok: false; error: BcvRateError }

const toBcvError = (error: unknown): BcvRateError => {
  if (error instanceof GraphQLClientError) {
    return { code: error.code ?? 'UNKNOWN_ERROR', message: error.message }
  }

  if (error instanceof Error) {
    return { code: 'UNKNOWN_ERROR', message: error.message }
  }

  return { code: 'UNKNOWN_ERROR', message: 'No fue posible obtener la tasa BCV activa.' }
}

/**
 * Falls back to the manually configured rate stored in `company.bcvConfig`
 * when the official active rate is not available. This keeps calculation
 * modules operational while the UI surfaces an alert.
 */
const fetchConfiguredBcvRate = async (): Promise<ActiveBcvRate | null> => {
  try {
    const response = await executeGraphQL<{ tenantSetting: string }>(
      GET_TENANT_SETTING_QUERY,
      { key: BCV_CONFIG_KEY },
      { timeoutMs: 3000 }
    )

    if (!response?.tenantSetting) return null

    const config = JSON.parse(response.tenantSetting) as {
      tasaActiva?: number | string
      ultimaSincronizacion?: string
      fuenteOficial?: string
    }

    const rate = Number(config.tasaActiva)

    if (!Number.isFinite(rate) || rate <= 0) return null

    const capturedAt = config.ultimaSincronizacion || new Date().toISOString()

    return {
      rate,
      rateId: 'configurada',
      source: config.fuenteOficial || 'CONFIGURACION',
      valueDate: capturedAt,
      capturedAt,
      isFallback: true
    }
  } catch {
    return null
  }
}

const resolveActiveBcvRate = async (): Promise<BcvRateResult> => {
  let backendError: BcvRateError = {
    code: 'NOT_FOUND',
    message: 'No hay una tasa BCV activa configurada.'
  }

  try {
    const response = await executeGraphQL<{
      activeBcvRate: {
        rate: string
        rateId: string
        source: string
        valueDate: string
        capturedAt: string
      } | null
    }>(GET_ACTIVE_BCV_RATE_QUERY, undefined, { timeoutMs: 5000 })

    if (response.activeBcvRate) {
      return {
        ok: true,
        data: {
          rate: Number(response.activeBcvRate.rate),
          rateId: response.activeBcvRate.rateId,
          source: response.activeBcvRate.source,
          valueDate: response.activeBcvRate.valueDate,
          capturedAt: response.activeBcvRate.capturedAt,
          isFallback: false
        }
      }
    }
  } catch (error) {
    backendError = toBcvError(error)
  }

  const configured = await fetchConfiguredBcvRate()

  if (configured) {
    return { ok: true, data: configured }
  }

  return { ok: false, error: backendError }
}

export const invalidateActiveBcvRateCache = (): void => {
  cachedRate = null
  inFlightRate = null
}

/**
 * Single BCV source for inventory, accounting, sales and POS.
 * Prefers the official active rate; falls back to the configured one so the
 * modules never throw, and callers can render an explicit alert when missing.
 */
export const fetchActiveBcvRate = async (options?: { force?: boolean }): Promise<BcvRateResult> => {
  if (!options?.force && cachedRate && Date.now() - cachedRate.at < CACHE_TTL_MS) {
    return cachedRate.result
  }

  if (inFlightRate) {
    return inFlightRate
  }

  inFlightRate = resolveActiveBcvRate()
    .then(result => {
      cachedRate = { at: Date.now(), result }

      return result
    })
    .finally(() => {
      inFlightRate = null
    })

  return inFlightRate
}
