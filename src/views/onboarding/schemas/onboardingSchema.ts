import { z } from 'zod'

import type { BaseCurrency, DocType, VatAliquot } from '@/types/onboardingTypes'
import { normalizeRif, RifValidationError } from '@/utils/rif'

export const DOC_TYPES = ['V', 'E', 'J', 'G', 'C'] as const satisfies readonly DocType[]
export const BASE_CURRENCIES = ['USD', 'VES'] as const satisfies readonly BaseCurrency[]
export const VAT_ALIQUOTS = ['GENERAL_16', 'REDUCED_8', 'EXEMPT_0'] as const satisfies readonly VatAliquot[]

export const fiscalIdentitySchema = z
  .object({
    legalName: z
      .string()
      .trim()
      .min(1, 'La razón social es obligatoria')
      .max(255, 'La razón social no puede superar 255 caracteres'),
    tradeName: z
      .string()
      .trim()
      .max(255, 'El nombre comercial no puede superar 255 caracteres')
      .optional()
      .or(z.literal('')),
    docType: z.enum(DOC_TYPES, { message: 'Selecciona un tipo de documento fiscal válido' }),
    docNumber: z
      .string()
      .trim()
      .min(1, 'El número de documento es obligatorio')
      .max(20, 'El número de documento no puede superar 20 caracteres'),
    checkDigit: z
      .string()
      .trim()
      .max(1, 'El dígito verificador debe ser un único dígito')
      .optional()
      .or(z.literal('')),
    fiscalAddress: z
      .string()
      .trim()
      .min(1, 'La dirección fiscal es obligatoria')
      .max(500, 'La dirección fiscal no puede superar 500 caracteres')
  })
  .superRefine((data, ctx) => {
    try {
      normalizeRif(data.docType, data.docNumber, data.checkDigit ?? '')
    } catch (error) {
      if (error instanceof RifValidationError) {
        ctx.addIssue({
          code: 'custom',
          path: [error.field],
          message: error.message
        })

        return
      }

      throw error
    }
  })
  .transform(data => {
    const normalized = normalizeRif(data.docType, data.docNumber, data.checkDigit ?? '')

    return {
      ...data,
      docNumber: normalized.docNumber,
      checkDigit: normalized.checkDigit ?? ''
    }
  })

export const fiscalPreferencesSchema = z.object({
  baseCurrency: z.enum(BASE_CURRENCIES, { message: 'Selecciona la moneda base del ERP' }),
  defaultVatAliquot: z
    .enum(VAT_ALIQUOTS, { message: 'Selecciona una alícuota de IVA válida' })
    .or(z.literal(''))
    .optional()
})

export type FiscalIdentityData = z.infer<typeof fiscalIdentitySchema>
export type FiscalPreferencesData = z.infer<typeof fiscalPreferencesSchema>
