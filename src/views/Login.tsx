'use client'

// React Imports
import { useState, useEffect } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import { styled } from '@mui/material/styles'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

// Type Imports
import type { SystemMode } from '@core/types'

// Context & Hook Imports
import { useAuth } from '@/contexts/AuthContext'

// Component Imports
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Styled Component
const AuthIllustrationWrapper = styled('div')(({ theme }) => ({
  width: '100%',
  maxWidth: 450,
  position: 'relative',
  [theme.breakpoints.up('md')]: {
    '&:before': {
      zIndex: -1,
      position: 'absolute',
      height: '234px',
      width: '238px',
      content: '""',
      top: '-80px',
      left: '-45px',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='238' height='234' viewBox='0 0 238 234' fill='none'%3E%3Crect x='87.9395' y='0.5' width='149' height='149' rx='19.5' stroke='%23${theme.palette.primary.main.slice(
        1
      )}' stroke-opacity='0.16'/%3E%3Crect y='33.5608' width='200' height='200' rx='10' fill='%23${theme.palette.primary.main.slice(
        1
      )}' fill-opacity='0.08'/%3E%3C/svg%3E")`
    },
    '&:after': {
      zIndex: -1,
      position: 'absolute',
      height: '180px',
      width: '180px',
      content: '""',
      right: '-57px',
      bottom: '-64px',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180' fill='none'%3E%3Crect x='1' y='1' width='178' height='178' rx='19' stroke='%23${theme.palette.primary.main.slice(
        1
      )}' stroke-opacity='0.16' stroke-width='2' stroke-dasharray='8 8'/%3E%3Crect x='22.5' y='22.5' width='135' height='135' rx='10' fill='%23${theme.palette.primary.main.slice(
        1
      )}' fill-opacity='0.08'/%3E%3C/svg%3E")`
    }
  }
}))

const Login = ({ mode }: { mode?: SystemMode }) => {
  // Hooks
  const router = useRouter()
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth()

  // Form States
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Si ya está autenticado, redirigir a /home
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/home')
    }
  }, [isAuthenticated, router])

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password) {
      setErrorMessage('Por favor ingresa tu correo electrónico y contraseña.')
      return
    }

    setIsSubmitting(true)

    const res = await signIn({
      email: email.trim().toLowerCase(),
      password
    })

    setIsSubmitting(false)

    if (res.success) {
      router.push('/home')
    } else {
      setErrorMessage(res.error || 'Error al iniciar sesión.')
    }
  }

  return (
    <div className='flex flex-col justify-center items-center min-bs-[100dvh] p-6'>
      <AuthIllustrationWrapper>
        <Card className='flex flex-col sm:is-[450px] shadow-md'>
          <CardContent className='p-6 sm:!p-10'>
            <Link href='/' className='flex justify-center mbe-6'>
              <Logo />
            </Link>
            <div className='flex flex-col gap-1 mbe-6 text-center'>
              <Typography variant='h5' className='font-bold text-[#1E1B2E]'>
                ¡Bienvenido a {themeConfig.templateName}! 👋🏻
              </Typography>
              <Typography variant='body2' className='text-[#6B7280]'>
                Ingresa tus credenciales para acceder al ERP
              </Typography>
            </div>

            {errorMessage && (
              <Alert severity='error' className='mbe-6 text-sm' onClose={() => setErrorMessage(null)}>
                {errorMessage}
              </Alert>
            )}

            <form noValidate autoComplete='off' onSubmit={handleSubmit} className='flex flex-col gap-5'>
              <CustomTextField
                autoFocus
                fullWidth
                label='Correo electrónico'
                placeholder='tu-email@empresa.com'
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isSubmitting || authLoading}
              />
              <CustomTextField
                fullWidth
                label='Contraseña'
                placeholder='············'
                id='outlined-adornment-password'
                type={isPasswordShown ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isSubmitting || authLoading}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          onClick={handleClickShowPassword}
                          onMouseDown={e => e.preventDefault()}
                        >
                          <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <div className='flex justify-between items-center gap-x-3 gap-y-1 flex-wrap'>
                <FormControlLabel control={<Checkbox defaultChecked />} label='Recordar sesión' />
                <Typography className='text-end' color='primary.main' component={Link} href='/forgot-password'>
                  ¿Olvidaste tu contraseña?
                </Typography>
              </div>
              <Button
                fullWidth
                variant='contained'
                type='submit'
                size='large'
                disabled={isSubmitting || authLoading}
                startIcon={isSubmitting ? <CircularProgress size={20} color='inherit' /> : null}
              >
                {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </AuthIllustrationWrapper>
    </div>
  )
}

export default Login
