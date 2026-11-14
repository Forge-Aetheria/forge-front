import {
  COMPLETE_TENANT_ONBOARDING_MUTATION,
  GET_MY_TENANT_ONBOARDING_STATUS_QUERY,
  GET_TENANT_ONBOARDING_QUERY
} from '@/graphql/iam.gql'
import { executeGraphQL, GraphQLClientError } from '@/libs/graphqlClient'
import type {
  CompleteTenantOnboardingInput,
  TenantOnboardingPayload,
  TenantOnboardingState,
  TenantOnboardingStatus
} from '@/types/onboardingTypes'

export interface OnboardingError {
  code: string
  message: string
  field?: string
}

export type OnboardingResult<T> = { ok: true; data: T } | { ok: false; error: OnboardingError }

const toOnboardingError = (error: unknown): OnboardingError => {
  if (error instanceof GraphQLClientError) {
    const field = typeof error.extensions?.field === 'string' ? error.extensions.field : undefined

    return {
      code: error.code ?? 'UNKNOWN_ERROR',
      message: error.message,
      ...(field !== undefined ? { field } : {})
    }
  }

  if (error instanceof Error) {
    return { code: 'UNKNOWN_ERROR', message: error.message }
  }

  return { code: 'UNKNOWN_ERROR', message: 'Ocurrió un error inesperado al procesar el onboarding.' }
}

export const onboardingService = {
  async getStatus(): Promise<OnboardingResult<TenantOnboardingStatus>> {
    try {
      const response = await executeGraphQL<{ myTenantOnboardingStatus: TenantOnboardingStatus }>(
        GET_MY_TENANT_ONBOARDING_STATUS_QUERY,
        undefined,
        { timeoutMs: 8000 }
      )

      return { ok: true, data: response.myTenantOnboardingStatus }
    } catch (error) {
      return { ok: false, error: toOnboardingError(error) }
    }
  },

  async getState(): Promise<OnboardingResult<TenantOnboardingState>> {
    try {
      const response = await executeGraphQL<{ tenantOnboarding: TenantOnboardingState }>(
        GET_TENANT_ONBOARDING_QUERY,
        undefined,
        { timeoutMs: 8000 }
      )

      return { ok: true, data: response.tenantOnboarding }
    } catch (error) {
      return { ok: false, error: toOnboardingError(error) }
    }
  },

  async complete(
    input: CompleteTenantOnboardingInput
  ): Promise<OnboardingResult<TenantOnboardingPayload>> {
    const payload: CompleteTenantOnboardingInput = {
      legalName: input.legalName,
      docType: input.docType,
      docNumber: input.docNumber,
      fiscalAddress: input.fiscalAddress,
      baseCurrency: input.baseCurrency,
      ...(input.tradeName ? { tradeName: input.tradeName } : {}),
      ...(input.checkDigit ? { checkDigit: input.checkDigit } : {}),
      ...(input.defaultVatAliquot ? { defaultVatAliquot: input.defaultVatAliquot } : {})
    }

    try {
      const response = await executeGraphQL<{
        completeTenantOnboarding: TenantOnboardingPayload
      }>(COMPLETE_TENANT_ONBOARDING_MUTATION, { input: payload }, { timeoutMs: 15000 })

      return { ok: true, data: response.completeTenantOnboarding }
    } catch (error) {
      return { ok: false, error: toOnboardingError(error) }
    }
  }
}
