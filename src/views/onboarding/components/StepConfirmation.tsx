'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import type { OnboardingFormState, VatAliquot } from '@/types/onboardingTypes'

const VAT_LABELS: Record<VatAliquot, string> = {
  GENERAL_16: 'General 16%',
  REDUCED_8: 'Reducida 8%',
  EXEMPT_0: 'Exenta 0%'
}

interface Props {
  values: OnboardingFormState
  isSubmitting: boolean
  onConfirm: () => void
}

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <Grid size={{ xs: 12, sm: 6 }}>
    <Typography variant='caption' className='text-[#6B7280] uppercase tracking-wide'>
      {label}
    </Typography>
    <Typography variant='body1' className='font-medium text-[#1E1B2E] break-words'>
      {value}
    </Typography>
  </Grid>
)

export const StepConfirmation = ({ values, isSubmitting, onConfirm }: Props) => (
  <div className='flex flex-col gap-5'>
    <div>
      <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
        Confirmación y resumen
      </Typography>
      <Typography variant='body2' className='text-[#6B7280] mt-1'>
        Revisa los datos antes de habilitar el acceso completo al ERP.
      </Typography>
    </div>

    <Box className='rounded-xl border border-[#E6E4F0] bg-[#FAFAFC] p-4'>
      <Grid container spacing={3}>
        <SummaryItem label='Razón social' value={values.legalName} />
        <SummaryItem label='Nombre comercial' value={values.tradeName || 'No indicado'} />
        <SummaryItem
          label='Documento fiscal'
          value={`${values.docType}-${values.docNumber}${values.checkDigit ? `-${values.checkDigit}` : ''}`}
        />
        <SummaryItem label='Dirección fiscal' value={values.fiscalAddress} />
        <SummaryItem label='Moneda base' value={values.baseCurrency} />
        <SummaryItem
          label='Alícuota de IVA'
          value={values.defaultVatAliquot ? VAT_LABELS[values.defaultVatAliquot] : 'Sin alícuota por defecto'}
        />
      </Grid>
    </Box>

    <Button
      fullWidth
      variant='contained'
      onClick={onConfirm}
      disabled={isSubmitting}
      startIcon={isSubmitting ? <CircularProgress size={18} color='inherit' /> : undefined}
      sx={{
        borderRadius: '9999px',
        backgroundColor: '#6C5CE7',
        textTransform: 'none',
        fontWeight: 600,
        py: 1.2,
        '&:hover': { backgroundColor: '#5B4CDB' }
      }}
    >
      {isSubmitting ? 'Guardando configuración...' : 'Comenzar a usar el ERP'}
    </Button>
  </div>
)
