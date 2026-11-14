'use client'

import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import type { BaseCurrency, OnboardingFieldErrors, OnboardingFormState, VatAliquot } from '@/types/onboardingTypes'

const BASE_CURRENCIES: BaseCurrency[] = ['USD', 'VES']
const VAT_ALIQUOTS: VatAliquot[] = ['GENERAL_16', 'REDUCED_8', 'EXEMPT_0']

const VAT_LABELS: Record<VatAliquot, string> = {
  GENERAL_16: 'General 16%',
  REDUCED_8: 'Reducida 8%',
  EXEMPT_0: 'Exenta 0%'
}

interface Props {
  values: OnboardingFormState
  errors: OnboardingFieldErrors
  onChange: (patch: Partial<OnboardingFormState>) => void
}

export const StepFiscalPreferences = ({ values, errors, onChange }: Props) => (
  <div className='flex flex-col gap-4'>
    <div>
      <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
        Preferencias operativas y moneda
      </Typography>
      <Typography variant='body2' className='text-[#6B7280] mt-1'>
        Define la moneda base del ERP y la alícuota de IVA que se propondrá por defecto.
      </Typography>
    </div>

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          select
          size='small'
          label='Moneda base'
          value={values.baseCurrency}
          onChange={event => onChange({ baseCurrency: event.target.value as BaseCurrency })}
          error={Boolean(errors.baseCurrency)}
          helperText={errors.baseCurrency ?? 'Moneda en la que se expresan los importes del ERP'}
          required
        >
          {BASE_CURRENCIES.map(currency => (
            <MenuItem key={currency} value={currency}>
              {currency}
            </MenuItem>
          ))}
        </CustomTextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          select
          size='small'
          label='Alícuota de IVA por defecto'
          value={values.defaultVatAliquot}
          onChange={event => onChange({ defaultVatAliquot: event.target.value as '' | VatAliquot })}
          error={Boolean(errors.defaultVatAliquot)}
          helperText={errors.defaultVatAliquot}
        >
          <MenuItem value=''>Sin alícuota por defecto</MenuItem>
          {VAT_ALIQUOTS.map(aliquot => (
            <MenuItem key={aliquot} value={aliquot}>
              {VAT_LABELS[aliquot]}
            </MenuItem>
          ))}
        </CustomTextField>
      </Grid>
    </Grid>
  </div>
)
