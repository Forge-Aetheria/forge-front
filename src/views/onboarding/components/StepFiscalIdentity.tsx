'use client'

import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import { isCheckDigitRequired } from '@/utils/rif'
import type { DocType, OnboardingFieldErrors, OnboardingFormState } from '@/types/onboardingTypes'

const DOC_TYPES: DocType[] = ['V', 'E', 'J', 'G', 'C']

const DOC_TYPE_LABELS: Record<DocType, string> = {
  V: 'V - Cédula / Venezolano',
  E: 'E - Extranjero',
  J: 'J - Jurídico',
  G: 'G - Gobierno',
  C: 'C - Consejo comunal'
}

interface Props {
  values: OnboardingFormState
  errors: OnboardingFieldErrors
  onChange: (patch: Partial<OnboardingFormState>) => void
}

export const StepFiscalIdentity = ({ values, errors, onChange }: Props) => {
  const checkDigitRequired = isCheckDigitRequired(values.docType)

  return (
    <div className='flex flex-col gap-4'>
      <div>
        <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
          Identidad fiscal y empresa
        </Typography>
        <Typography variant='body2' className='text-[#6B7280] mt-1'>
          Estos datos se usarán como emisor fiscal en cotizaciones, compras y comprobantes contables.
        </Typography>
      </div>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 7 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Razón social'
            placeholder='Ej. Distribuidora Central, C.A.'
            value={values.legalName}
            onChange={event => onChange({ legalName: event.target.value })}
            error={Boolean(errors.legalName)}
            helperText={errors.legalName}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Nombre comercial'
            placeholder='Ej. Distribuidora Central'
            value={values.tradeName}
            onChange={event => onChange({ tradeName: event.target.value })}
            error={Boolean(errors.tradeName)}
            helperText={errors.tradeName ?? 'Opcional'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CustomTextField
            fullWidth
            select
            size='small'
            label='Tipo de documento fiscal'
            value={values.docType}
            onChange={event => onChange({ docType: event.target.value as DocType })}
            error={Boolean(errors.docType)}
            helperText={errors.docType}
            required
          >
            {DOC_TYPES.map(docType => (
              <MenuItem key={docType} value={docType}>
                {DOC_TYPE_LABELS[docType]}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Número de documento'
            placeholder='Ej. 40192834'
            value={values.docNumber}
            onChange={event => onChange({ docNumber: event.target.value })}
            error={Boolean(errors.docNumber)}
            helperText={errors.docNumber ?? 'Cuerpo numérico del RIF o cédula'}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Dígito verificador'
            placeholder='Ej. 5'
            value={values.checkDigit}
            onChange={event => onChange({ checkDigit: event.target.value })}
            error={Boolean(errors.checkDigit)}
            helperText={
              errors.checkDigit ?? (checkDigitRequired ? 'Obligatorio para J, G y C' : 'Opcional para V y E')
            }
            inputProps={{ maxLength: 1, inputMode: 'numeric' }}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Dirección fiscal'
            placeholder='Av. Principal, Torre Empresarial, piso 7, oficina 7-A'
            value={values.fiscalAddress}
            onChange={event => onChange({ fiscalAddress: event.target.value })}
            error={Boolean(errors.fiscalAddress)}
            helperText={errors.fiscalAddress}
            multiline
            minRows={2}
            required
          />
        </Grid>
      </Grid>
    </div>
  )
}
