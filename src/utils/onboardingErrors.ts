import type { OnboardingFormState } from '@/types/onboardingTypes'

export interface OnboardingErrorTarget {
  step: number
  field: keyof OnboardingFormState
}

const IDENTITY_FIELDS: readonly (keyof OnboardingFormState)[] = [
  'legalName',
  'tradeName',
  'docType',
  'docNumber',
  'checkDigit',
  'fiscalAddress'
]

export const resolveOnboardingErrorTarget = (
  field: string | undefined,
  message: string
): OnboardingErrorTarget | null => {
  if (field === 'baseCurrency' || field === 'defaultVatAliquot') {
    return { step: 1, field }
  }

  if (field !== undefined && IDENTITY_FIELDS.includes(field as keyof OnboardingFormState)) {
    return { step: 0, field: field as keyof OnboardingFormState }
  }

  if (field === undefined && /dígito verificador/i.test(message)) {
    return { step: 0, field: 'checkDigit' }
  }

  if (field === undefined) {
    return { step: 0, field: 'docNumber' }
  }

  return null
}
