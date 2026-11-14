export type DocType = 'V' | 'E' | 'J' | 'G' | 'C'

export type BaseCurrency = 'USD' | 'VES'

export type VatAliquot = 'GENERAL_16' | 'REDUCED_8' | 'EXEMPT_0'

export interface TenantOnboardingStatus {
  tenantId: string
  onboardingCompleted: boolean
  onboardingCompletedAt: string | null
}

export interface TenantOnboardingState {
  tenantId: string
  onboardingCompleted: boolean
  onboardingCompletedAt: string | null
  baseCurrency: BaseCurrency | null
  defaultVatAliquot: VatAliquot | null
  legalName: string | null
  tradeName: string | null
  docType: DocType | null
  docNumber: string | null
  checkDigit: string | null
  fiscalAddress: string | null
}

export interface CompleteTenantOnboardingInput {
  legalName: string
  tradeName?: string
  docType: DocType
  docNumber: string
  checkDigit?: string
  fiscalAddress: string
  baseCurrency: BaseCurrency
  defaultVatAliquot?: VatAliquot | null
}

export interface TenantOnboardingPayload {
  tenantId: string
  legalName: string
  tradeName: string | null
  docType: DocType
  docNumber: string
  checkDigit: string | null
  baseCurrency: BaseCurrency
  onboardingCompleted: boolean
}

export interface OnboardingFormState {
  legalName: string
  tradeName: string
  docType: DocType
  docNumber: string
  checkDigit: string
  fiscalAddress: string
  baseCurrency: BaseCurrency
  defaultVatAliquot: '' | VatAliquot
}

export type OnboardingFieldErrors = Partial<Record<keyof OnboardingFormState, string>>
