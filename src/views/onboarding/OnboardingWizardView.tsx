'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import Logo from '@components/layout/shared/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { authService } from '@/services/authService'
import { onboardingService, type OnboardingError } from '@/services/onboardingService'
import { resolveOnboardingErrorTarget } from '@/utils/onboardingErrors'
import { isCheckDigitRequired } from '@/utils/rif'
import type {
  OnboardingFieldErrors,
  OnboardingFormState,
  TenantOnboardingState
} from '@/types/onboardingTypes'
import { fiscalIdentitySchema, fiscalPreferencesSchema } from '@/views/onboarding/schemas/onboardingSchema'
import { OnboardingStepper } from '@/views/onboarding/components/OnboardingStepper'
import { StepConfirmation } from '@/views/onboarding/components/StepConfirmation'
import { StepFiscalIdentity } from '@/views/onboarding/components/StepFiscalIdentity'
import { StepFiscalPreferences } from '@/views/onboarding/components/StepFiscalPreferences'

const EMPTY_FORM: OnboardingFormState = {
  legalName: '',
  tradeName: '',
  docType: 'J',
  docNumber: '',
  checkDigit: '',
  fiscalAddress: '',
  baseCurrency: 'USD',
  defaultVatAliquot: ''
}

const mapZodErrors = (issues: { path: PropertyKey[]; message: string }[]): OnboardingFieldErrors => {
  const errors: OnboardingFieldErrors = {}

  for (const issue of issues) {
    const field = issue.path[0]

    if (typeof field === 'string' && field in EMPTY_FORM) {
      errors[field as keyof OnboardingFormState] = issue.message
    }
  }

  return errors
}

const resolveStartStep = (state: {
  legalName: string | null
  docNumber: string | null
  fiscalAddress: string | null
  docType: OnboardingFormState['docType'] | null
  checkDigit: string | null
  baseCurrency: OnboardingFormState['baseCurrency'] | null
}): number => {
  const docType = state.docType ?? 'J'

  const identityComplete = Boolean(
    state.legalName &&
      state.docNumber &&
      state.fiscalAddress &&
      (!isCheckDigitRequired(docType) || state.checkDigit)
  )

  if (!identityComplete) {
    return 0
  }

  if (!state.baseCurrency) {
    return 1
  }

  return 2
}

export const OnboardingWizardView = () => {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { state, isLoading, error, refresh, complete } = useOnboarding()

  const [form, setForm] = useState<OnboardingFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<OnboardingFieldErrors>({})
  const [activeStep, setActiveStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [details, setDetails] = useState<TenantOnboardingState | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [detailsError, setDetailsError] = useState<OnboardingError | null>(null)
  const detailsRequestedRef = useRef(false)

  const needsDetails = Boolean(isAuthenticated && state && !state.onboardingCompleted)

  const resolving =
    authLoading ||
    isLoading ||
    (!state && !error) ||
    (needsDetails && detailsLoading) ||
    (needsDetails && !details && !detailsError)

  const loadDetails = useCallback(
    async (force = false) => {
      if (!isAuthenticated || (detailsRequestedRef.current && !force)) {
        return
      }

      detailsRequestedRef.current = true
      setDetailsLoading(true)
      setDetailsError(null)

      const result = await onboardingService.getState()

      if (result.ok) {
        setDetails(result.data)
        setForm({
          legalName: result.data.legalName ?? '',
          tradeName: result.data.tradeName ?? '',
          docType: result.data.docType ?? 'J',
          docNumber: result.data.docNumber ?? '',
          checkDigit: result.data.checkDigit ?? '',
          fiscalAddress: result.data.fiscalAddress ?? '',
          baseCurrency: result.data.baseCurrency ?? 'USD',
          defaultVatAliquot: result.data.defaultVatAliquot ?? ''
        })
        setActiveStep(resolveStartStep(result.data))
      } else {
        setDetailsError(result.error)

        if (result.error.code === 'UNAUTHENTICATED') {
          authService.clearSession()
          router.replace('/login?redirectTo=/onboarding')
        }
      }

      setDetailsLoading(false)
    },
    [isAuthenticated, router]
  )

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?redirectTo=/onboarding')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (state?.onboardingCompleted) {
      router.replace('/home')
    }
  }, [state?.onboardingCompleted, router])

  useEffect(() => {
    if (error?.code === 'UNAUTHENTICATED' || detailsError?.code === 'UNAUTHENTICATED') {
      authService.clearSession()
      router.replace('/login?redirectTo=/onboarding')
    }
  }, [error?.code, detailsError?.code, router])

  useEffect(() => {
    if (!needsDetails) {
      setDetailsLoading(false)

      return
    }

    void loadDetails()
  }, [needsDetails, loadDetails])

  const updateForm = (patch: Partial<OnboardingFormState>) => {
    setForm(previous => ({ ...previous, ...patch }))
    setSubmitError(null)

    setErrors(previous => {
      const next = { ...previous }

      for (const field of Object.keys(patch)) {
        delete next[field as keyof OnboardingFormState]
      }

      return next
    })
  }

  const goBack = () => {
    setSubmitError(null)
    setActiveStep(previous => Math.max(0, previous - 1))
  }

  const handleIdentityNext = () => {
    const validation = fiscalIdentitySchema.safeParse(form)

    if (!validation.success) {
      setErrors(mapZodErrors(validation.error.issues))

      return
    }

    setErrors({})
    setForm(previous => ({
      ...previous,
      ...validation.data,
      tradeName: validation.data.tradeName ?? '',
      checkDigit: validation.data.checkDigit ?? ''
    }))
    setActiveStep(1)
  }

  const handlePreferencesNext = () => {
    const validation = fiscalPreferencesSchema.safeParse({
      baseCurrency: form.baseCurrency,
      defaultVatAliquot: form.defaultVatAliquot
    })

    if (!validation.success) {
      setErrors(mapZodErrors(validation.error.issues))

      return
    }

    setErrors({})
    setForm(previous => ({ ...previous, ...validation.data }))
    setActiveStep(2)
  }

  const handleConfirm = async () => {
    if (isSubmitting) {
      return
    }

    const identity = fiscalIdentitySchema.safeParse(form)

    if (!identity.success) {
      setErrors(mapZodErrors(identity.error.issues))
      setActiveStep(0)

      return
    }

    const preferences = fiscalPreferencesSchema.safeParse({
      baseCurrency: form.baseCurrency,
      defaultVatAliquot: form.defaultVatAliquot
    })

    if (!preferences.success) {
      setErrors(mapZodErrors(preferences.error.issues))
      setActiveStep(1)

      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setErrors({})

    const result = await complete({
      legalName: identity.data.legalName,
      tradeName: identity.data.tradeName || undefined,
      docType: identity.data.docType,
      docNumber: identity.data.docNumber,
      checkDigit: identity.data.checkDigit || undefined,
      fiscalAddress: identity.data.fiscalAddress,
      baseCurrency: preferences.data.baseCurrency,
      defaultVatAliquot: preferences.data.defaultVatAliquot || undefined
    })

    setIsSubmitting(false)

    if (result.ok) {
      if (!result.data.onboardingCompleted) {
        setSubmitError('El backend no confirmó la finalización del onboarding. Intenta nuevamente.')

        return
      }

      router.replace('/home')

      return
    }

    const { code, field, message } = result.error

    if (code === 'UNAUTHENTICATED') {
      authService.clearSession()
      router.replace('/login?redirectTo=/onboarding')

      return
    }

    if (code === 'FORBIDDEN') {
      setSubmitError(
        'Tu rol no posee el permiso iam:settings:manage. Solicita a un administrador que complete la configuración inicial.'
      )

      return
    }

    const target = field !== undefined ? resolveOnboardingErrorTarget(field, message) : null

    if (target) {
      setErrors({ [target.field]: message })
      setActiveStep(target.step)

      return
    }

    if (code === 'BAD_USER_INPUT' || code === 'VALIDATION_ERROR') {
      const fallback = resolveOnboardingErrorTarget(undefined, message)

      if (fallback) {
        setErrors({ [fallback.field]: message })
        setActiveStep(fallback.step)

        return
      }
    }

    setSubmitError(message)
  }

  if (resolving) {
    return (
      <Box className='flex items-center justify-center min-bs-screen w-full'>
        <CircularProgress size={40} className='text-primary' />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const readError = error ?? detailsError

  if (readError) {
    const forbidden = readError.code === 'FORBIDDEN'

    return (
      <Box className='flex items-center justify-center min-bs-screen w-full p-6 bg-[#F8F7FA]'>
        <Alert
          severity={forbidden ? 'warning' : 'error'}
          className='max-is-[560px]'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => void (error ? refresh() : loadDetails(true))}
            >
              Reintentar
            </Button>
          }
        >
          {forbidden
            ? 'Tu rol no puede editar la configuración inicial. Solicita a un administrador que complete el onboarding.'
            : readError.message}
        </Alert>
      </Box>
    )
  }

  if (state?.onboardingCompleted) {
    return (
      <Box className='flex items-center justify-center min-bs-screen w-full'>
        <CircularProgress size={40} className='text-primary' />
      </Box>
    )
  }

  return (
    <div className='flex justify-center items-center min-bs-screen p-4 sm:p-6 bg-[#F8F7FA]'>
      <Card
        sx={{
          maxWidth: 760,
          width: '100%',
          borderRadius: '24px',
          boxShadow: '0 8px 30px rgba(108, 92, 231, 0.08)'
        }}
      >
        <CardContent className='p-5 sm:!p-8 flex flex-col gap-6'>
          <div className='flex flex-col items-center gap-2'>
            <Logo />
            <Typography variant='h5' className='font-bold text-[#1E1B2E] text-center'>
              Configura tu empresa
            </Typography>
            <Typography variant='body2' className='text-[#6B7280] text-center'>
              Completa estos datos para habilitar el uso del ERP.
            </Typography>
          </div>

          <OnboardingStepper activeStep={activeStep} />

          {submitError && (
            <Alert severity='error' onClose={() => setSubmitError(null)} sx={{ borderRadius: '12px' }}>
              {submitError}
            </Alert>
          )}

          <div className='min-bs-[320px]'>
            {activeStep === 0 && (
              <StepFiscalIdentity values={form} errors={errors} onChange={updateForm} />
            )}
            {activeStep === 1 && (
              <StepFiscalPreferences values={form} errors={errors} onChange={updateForm} />
            )}
            {activeStep === 2 && (
              <StepConfirmation values={form} isSubmitting={isSubmitting} onConfirm={() => void handleConfirm()} />
            )}
          </div>

          {activeStep < 2 && (
            <div className='flex justify-between gap-3'>
              <Button
                variant='outlined'
                onClick={goBack}
                disabled={activeStep === 0}
                sx={{ borderRadius: '9999px', textTransform: 'none', fontWeight: 600 }}
              >
                Atrás
              </Button>
              <Button
                variant='contained'
                onClick={activeStep === 0 ? handleIdentityNext : handlePreferencesNext}
                sx={{
                  borderRadius: '9999px',
                  backgroundColor: '#6C5CE7',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#5B4CDB' }
                }}
              >
                Continuar
              </Button>
            </div>
          )}

          {activeStep === 2 && (
            <Button
              variant='text'
              onClick={goBack}
              disabled={isSubmitting}
              sx={{ borderRadius: '9999px', textTransform: 'none', fontWeight: 600, alignSelf: 'flex-start' }}
            >
              Atrás
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default OnboardingWizardView
