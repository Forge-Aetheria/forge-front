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

export const RegisterView = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledEmail = searchParams?.get('email') || ''

  const [name, setName] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [email, setEmail] = useState(prefilledEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)

  const handleTenantNameChange = (val: string) => {
    setTenantName(val)
    setTenantSlug(authService.sanitizeTenantSlug(val))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!tenantName.trim()) {
      setError('Ingresa el nombre de tu empresa o negocio.')

      return
    }

    if (!tenantSlug.trim()) {
      setError('El identificador de URL (slug) es obligatorio.')

      return
    }

    const check = authService.validatePasswordComplexity(password)

    if (!check.valid) {
      setError(check.message || 'La contraseña no cumple con los requisitos.')

      return
    }

    setSubmitting(true)

    try {
      const res = await authService.signUp({
        name: name.trim() || undefined,
        tenantName: tenantName.trim(),
        tenantSlug: tenantSlug.trim(),
        email: email.trim().toLowerCase(),
        password
      })

      if (res.success) {
        setRegisteredSuccess(true)
      } else {
        setError(res.error || 'No se pudo crear la cuenta.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado al registrarse.')
    } finally {
      setSubmitting(false)
    }
  }

  if (registeredSuccess) {
    return (
      <div className='flex justify-center items-center min-h-screen p-6 bg-[#F8F7FA]'>
        <Card sx={{ maxWidth: 460, width: '100%', borderRadius: '24px', boxShadow: '0 8px 30px rgba(108, 92, 231, 0.08)' }}>
          <CardContent className='p-8 flex flex-col items-center text-center gap-4'>
            <div className='w-16 h-16 rounded-full bg-[#F0EEF9] text-[#6C5CE7] flex items-center justify-center text-3xl mb-2'>
              <i className='tabler-mail-check' />
            </div>
            <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
              ¡Cuenta creada exitosamente!
            </Typography>
            <Typography variant='body2' className='text-[#6B7280] leading-relaxed'>
              Hemos enviado un enlace de confirmación a <strong>{email}</strong>. Por favor, revisa tu bandeja de entrada para activar tu espacio de trabajo en <strong>{tenantName}</strong>.
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
              Ir a Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex justify-center items-center min-h-screen p-6 bg-[#F8F7FA]'>
      <Card sx={{ maxWidth: 480, width: '100%', borderRadius: '24px', boxShadow: '0 8px 30px rgba(108, 92, 231, 0.08)' }}>
        <CardContent className='p-8 flex flex-col gap-5'>
          <div className='flex justify-center mb-2'>
            <Logo />
          </div>

          <div className='text-center'>
            <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
              Crea tu empresa en FORGE
            </Typography>
            <Typography variant='body2' className='text-[#6B7280] mt-1'>
              Comienza a gestionar compras, ventas e inventario en minutos.
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
              label='Nombre de la Empresa o Negocio'
              placeholder='Ej. Distribuidora Central C.A.'
              value={tenantName}
              onChange={e => handleTenantNameChange(e.target.value)}
              required
            />

            <CustomTextField
              fullWidth
              size='small'
              label='Identificador de URL (Slug)'
              placeholder='distribuidora-central'
              value={tenantSlug}
              onChange={e => setTenantSlug(authService.sanitizeTenantSlug(e.target.value))}
              helperText={`Tu acceso será: app.forge-erp.com/${tenantSlug || 'tu-empresa'}`}
              required
            />

            <CustomTextField
              fullWidth
              size='small'
              label='Tu Nombre (Opcional)'
              placeholder='Ej. Carlos Mendoza'
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <CustomTextField
              fullWidth
              size='small'
              type='email'
              label='Correo Electrónico'
              placeholder='carlos@empresa.com'
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <CustomTextField
              fullWidth
              size='small'
              label='Contraseña'
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              helperText='Mínimo 8 caracteres, al menos una letra y un número'
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
              {submitting ? <CircularProgress size={22} color='inherit' /> : 'Crear Cuenta y Empresa'}
            </Button>
          </form>

          <div className='text-center mt-2'>
            <Typography variant='body2' className='text-[#6B7280]'>
              ¿Ya tienes cuenta?{' '}
              <Link href='/login' className='text-[#6C5CE7] font-semibold hover:underline'>
                Iniciar Sesión
              </Link>
            </Typography>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegisterView
