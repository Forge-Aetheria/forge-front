import { GET_ACTIVE_BCV_RATE_QUERY } from '@/graphql/sales.gql'
import { executeGraphQL, GraphQLClientError } from '@/libs/graphqlClient'

export interface ActiveBcvRate {
  rate: number
  rateId: string
  source: string
  valueDate: string
  capturedAt: string
}

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
 * Single BCV source for inventory, accounting, sales and POS.
 * Never returns a hardcoded fallback: callers must render an explicit error.
 */
export const fetchActiveBcvRate = async (): Promise<BcvRateResult> => {
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

    if (!response.activeBcvRate) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'No hay una tasa BCV activa configurada.' }
      }
    }

    return {
      ok: true,
      data: {
        rate: Number(response.activeBcvRate.rate),
        rateId: response.activeBcvRate.rateId,
        source: response.activeBcvRate.source,
        valueDate: response.activeBcvRate.valueDate,
        capturedAt: response.activeBcvRate.capturedAt
      }
    }
  } catch (error) {
    return { ok: false, error: toBcvError(error) }
  }
}
