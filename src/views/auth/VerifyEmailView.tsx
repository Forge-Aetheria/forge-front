'use client'

import { useState, useEffect } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import CustomTextField from '@core/components/mui/TextField'
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import { authService } from '@/services/authService'
import { useAuth } from '@/contexts/AuthContext'

export const VerifyEmailView = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenHash = searchParams?.get('token_hash') || searchParams?.get('code') || ''
  const { refreshUser } = useAuth()

  const [verifying, setVerifying] = useState(Boolean(tokenHash))
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resend state
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSuccessMessage, setResendSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!tokenHash) return

    let isMounted = true

    const doVerify = async () => {
      try {
        const res = await authService.verifyEmail(tokenHash)

        if (!isMounted) return

        if (res.success) {
          setSuccess(true)
          await refreshUser()
          setTimeout(() => {
            router.push('/home')
          }, 2000)
        } else {
          setError(res.error || 'El enlace de confirmación ha expirado o es inválido.')
        }
      } catch (err: unknown) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Error al verificar la cuenta.')
      } finally {
        if (isMounted) setVerifying(false)
      }
    }

    doVerify()

    return () => {
      isMounted = false
    }
  }, [tokenHash, router, refreshUser])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!resendEmail.trim()) return

    setResending(true)
    setResendSuccessMessage(null)

    try {
      const res = await authService.resendVerificationEmail(resendEmail.trim())

      setResendSuccessMessage(res.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className='flex justify-center items-center min-h-screen p-6 bg-[#F8F7FA]'>
      <Card sx={{ maxWidth: 460, width: '100%', borderRadius: '24px', boxShadow: '0 8px 30px rgba(108, 92, 231, 0.08)' }}>
        <CardContent className='p-8 flex flex-col items-center text-center gap-5'>
          <div className='flex justify-center mb-1'>
            <Logo />
          </div>

          {verifying ? (
            <div className='flex flex-col items-center gap-3 py-6'>
              <CircularProgress sx={{ color: '#6C5CE7' }} size={44} />
              <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                Verificando tu cuenta...
              </Typography>
              <Typography variant='body2' className='text-[#6B7280]'>
                Estamos activando tu acceso a FORGE ERP.
              </Typography>
            </div>
          ) : success ? (
            <div className='flex flex-col items-center gap-3 py-4'>
              <div className='w-16 h-16 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center text-3xl mb-1'>
                <i className='tabler-circle-check' />
              </div>
              <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
                ¡Cuenta Confirmada!
              </Typography>
              <Typography variant='body2' className='text-[#6B7280] leading-relaxed'>
                Tu correo ha sido verificado exitosamente. Redirigiéndote al sistema...
              </Typography>
              <Button
                variant='contained'
                onClick={() => router.push('/home')}
                sx={{
                  borderRadius: '9999px',
                  backgroundColor: '#6C5CE7',
                  textTransform: 'none',
                  fontWeight: 600,
                  mt: 2,
                  px: 4
                }}
              >
                Entrar al Sistema
              </Button>
            </div>
          ) : (
            <div className='flex flex-col gap-4 w-full text-left'>
              <div className='text-center'>
                <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
                  Verificación de Cuenta
                </Typography>
                <Typography variant='body2' className='text-[#6B7280] mt-1'>
                  {error ? 'Tu enlace no es válido o ha expirado.' : 'Confirma tu correo para comenzar a usar FORGE.'}
                </Typography>
              </div>

              {error && (
                <Alert severity='error' variant='standard' sx={{ borderRadius: '12px' }}>
                  {error}
                </Alert>
              )}

              {resendSuccessMessage && (
                <Alert severity='info' variant='standard' sx={{ borderRadius: '12px' }}>
                  {resendSuccessMessage}
                </Alert>
              )}

              <form onSubmit={handleResend} className='flex flex-col gap-3 mt-1'>
                <Typography variant='body2' className='font-semibold text-[#1E1B2E]'>
                  Solicitar reenvío de correo de confirmación:
                </Typography>
                <CustomTextField
                  fullWidth
                  size='small'
                  type='email'
                  placeholder='tu-correo@empresa.com'
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  required
                />
                <Button
                  fullWidth
                  variant='contained'
                  type='submit'
                  disabled={resending}
                  sx={{
                    borderRadius: '9999px',
                    backgroundColor: '#6C5CE7',
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1,
                    '&:hover': { backgroundColor: '#5B4CDB' }
                  }}
                >
                  {resending ? <CircularProgress size={20} color='inherit' /> : 'Reenviar Enlace de Activación'}
                </Button>
              </form>

              <div className='text-center mt-3'>
                <Link href='/login' className='text-[#6C5CE7] text-sm font-semibold hover:underline inline-flex items-center gap-1'>
                  <i className='tabler-chevron-left text-base' />
                  Volver al Inicio de Sesión
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default VerifyEmailView
