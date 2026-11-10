'use client'

import { useState } from 'react'

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

export const ForgotPasswordView = () => {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [feedback, setFeedback] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) return

    setSubmitting(true)

    try {
      const res = await authService.requestPasswordReset(email)

      setFeedback(res.message)
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
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
              ¿Olvidaste tu contraseña?
            </Typography>
            <Typography variant='body2' className='text-[#6B7280] mt-1'>
              Ingresa tu correo y te enviaremos las instrucciones de recuperación.
            </Typography>
          </div>

          {submitted ? (
            <div className='flex flex-col gap-4 text-center mt-2'>
              <Alert severity='success' variant='standard' sx={{ borderRadius: '12px', textAlign: 'left' }}>
                {feedback}
              </Alert>
              <Typography variant='body2' className='text-[#6B7280]'>
                Revisa también tu carpeta de correo no deseado o spam.
              </Typography>
              <Button
                variant='outlined'
                component={Link}
                href='/login'
                sx={{
                  borderRadius: '9999px',
                  textTransform: 'none',
                  fontWeight: 600,
                  mt: 2
                }}
              >
                Volver al Inicio de Sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
              <CustomTextField
                fullWidth
                size='small'
                type='email'
                label='Correo Electrónico'
                placeholder='tu-correo@empresa.com'
                value={email}
                onChange={e => setEmail(e.target.value)}
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
                {submitting ? <CircularProgress size={22} color='inherit' /> : 'Enviar Enlace de Recuperación'}
              </Button>

              <div className='text-center mt-3'>
                <Link href='/login' className='text-[#6C5CE7] text-sm font-semibold hover:underline inline-flex items-center gap-1'>
                  <i className='tabler-chevron-left text-base' />
                  Volver al Inicio de Sesión
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPasswordView
