'use client'

import { useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import CustomTextField from '@core/components/mui/TextField'
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import { authService } from '@/services/authService'

export const ResetPasswordView = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenHash = searchParams?.get('token_hash') || searchParams?.get('code') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!tokenHash) {
      setError('El enlace de recuperación es inválido o no contiene un token válido.')

      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')

      return
    }

    const check = authService.validatePasswordComplexity(password)

    if (!check.valid) {
      setError(check.message || 'La contraseña no cumple con los requisitos.')

      return
    }

    setSubmitting(true)

    try {
      const res = await authService.resetPassword(tokenHash, password)

      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.error || 'No se pudo actualizar la contraseña.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado al restablecer la contraseña.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className='flex justify-center items-center min-h-screen p-6 bg-[#F8F7FA]'>
        <Card sx={{ maxWidth: 440, width: '100%', borderRadius: '24px', boxShadow: '0 8px 30px rgba(108, 92, 231, 0.08)' }}>
          <CardContent className='p-8 flex flex-col items-center text-center gap-4'>
            <div className='w-16 h-16 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center text-3xl mb-2'>
              <i className='tabler-circle-check' />
            </div>
            <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
              Contraseña actualizada
            </Typography>
            <Typography variant='body2' className='text-[#6B7280] leading-relaxed'>
              Tu contraseña ha sido modificada con éxito. Ya puedes iniciar sesión con tus nuevas credenciales.
            </Typography>
            <Button
              variant='contained'
              onClick={() => router.push('/login')}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                textTransform: 'none',
                fontWeight: 600,
                mt: 2,
                px: 4
              }}
            >
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex justify-center items-center min-h-screen p-6 bg-[#F8F7FA]'>
      <Card sx={{ maxWidth: 440, width: '100%', borderRadius: '24px', boxShadow: '0 8px 30px rgba(108, 92, 231, 0.08)' }}>
        <CardContent className='p-8 flex flex-col gap-5'>
          <div className='flex justify-center mb-2'>
            <Logo />
          </div>

          <div className='text-center'>
            <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
              Restablecer Contraseña
            </Typography>
            <Typography variant='body2' className='text-[#6B7280] mt-1'>
              Define tu nueva contraseña de acceso.
            </Typography>
          </div>

          {error && (
            <Alert severity='error' variant='standard' onClose={() => setError(null)} sx={{ borderRadius: '12px' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <CustomTextField
              fullWidth
              size='small'
              label='Nueva Contraseña'
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              helperText='Mínimo 8 caracteres, letra y número'
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton edge='end' onClick={() => setShowPassword(prev => !prev)} size='small'>
                      <i className={showPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <CustomTextField
              fullWidth
              size='small'
              label='Confirmar Contraseña'
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              fullWidth
              variant='contained'
              type='submit'
              disabled={submitting}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                textTransform: 'none',
                fontWeight: 600,
                py: 1.2,
                mt: 1,
                '&:hover': { backgroundColor: '#5B4CDB' }
              }}
            >
              {submitting ? <CircularProgress size={22} color='inherit' /> : 'Actualizar Contraseña'}
            </Button>

            <div className='text-center mt-3'>
              <Link href='/login' className='text-[#6C5CE7] text-sm font-semibold hover:underline inline-flex items-center gap-1'>
                <i className='tabler-chevron-left text-base' />
                Cancelar y Volver al Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPasswordView
