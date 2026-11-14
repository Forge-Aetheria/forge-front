import type { DocType } from '@/types/onboardingTypes'

const RIF_PREFIX_VALUES: Record<DocType, number> = {
  V: 1,
  E: 2,
  J: 3,
  G: 5,
  C: 3
}

const RIF_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2] as const

export const RIF_BODY_LENGTH = 8

const CHECK_DIGIT_REQUIRED: readonly DocType[] = ['J', 'G', 'C']

export interface NormalizedRif {
  docType: DocType
  docNumber: string
  checkDigit: string | null
}

export class RifValidationError extends Error {
  readonly field: 'docNumber' | 'checkDigit'

  constructor(message: string, field: 'docNumber' | 'checkDigit') {
    super(message)
    this.name = 'RifValidationError'
    this.field = field
  }
}

export const isCheckDigitRequired = (docType: DocType): boolean => CHECK_DIGIT_REQUIRED.includes(docType)

export const computeRifCheckDigit = (docType: DocType, body: string): string => {
  let sum = RIF_PREFIX_VALUES[docType] * 4

  for (let i = 0; i < RIF_BODY_LENGTH; i++) {
    sum += Number(body[i]) * RIF_WEIGHTS[i]
  }

  const digit = 11 - (sum % 11)

  return digit >= 10 ? '0' : String(digit)
}

const stripSeparators = (value: string): string => value.toUpperCase().replace(/[\s.\-_/]/g, '')

export const normalizeRif = (
  docType: DocType,
  rawNumber: string,
  rawCheckDigit?: string | null
): NormalizedRif => {
  const explicitDigit =
    rawCheckDigit !== undefined && rawCheckDigit !== null && rawCheckDigit.trim() !== ''
      ? stripSeparators(rawCheckDigit)
      : null

  if (explicitDigit !== null && !/^\d$/.test(explicitDigit)) {
    throw new RifValidationError('El dígito verificador debe ser un único dígito', 'checkDigit')
  }

  const trimmed = rawNumber.trim().toUpperCase()
  const dashed = /^(.*\d)-(\d)$/.exec(trimmed)
  let digits = stripSeparators(dashed !== null ? dashed[1] : trimmed)
  let checkDigit = explicitDigit ?? (dashed !== null ? dashed[2] : null)

  if (digits.startsWith(docType)) {
    digits = digits.slice(1)
  }

  if (!/^\d+$/.test(digits)) {
    throw new RifValidationError(`El número de un documento ${docType} debe ser numérico`, 'docNumber')
  }

  if (checkDigit === null && digits.length === RIF_BODY_LENGTH + 1) {
    checkDigit = digits.slice(-1)
    digits = digits.slice(0, -1)
  }

  if (digits.length < 1 || digits.length > RIF_BODY_LENGTH) {
    throw new RifValidationError(
      `El número de un documento ${docType} debe tener entre 1 y ${RIF_BODY_LENGTH} dígitos`,
      'docNumber'
    )
  }

  const body = digits.padStart(RIF_BODY_LENGTH, '0')

  if (checkDigit === null) {
    if (isCheckDigitRequired(docType)) {
      throw new RifValidationError(`El RIF tipo ${docType} requiere dígito verificador`, 'checkDigit')
    }

    return { docType, docNumber: body, checkDigit: null }
  }

  if (computeRifCheckDigit(docType, body) !== checkDigit) {
    throw new RifValidationError(
      `RIF ${docType}-${body}-${checkDigit} inválido: dígito verificador incorrecto`,
      'checkDigit'
    )
  }

  return { docType, docNumber: body, checkDigit }
}
