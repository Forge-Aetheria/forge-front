'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'

import { useBcvRateInfo } from '@/hooks/useBcvRate'

const BCV_DEPENDENT_MODULES = ['/home', '/sales', '/purchases', '/inventory', '/accounting', '/pos']

const dependsOnBcv = (pathname: string): boolean =>
  BCV_DEPENDENT_MODULES.some(module => pathname === module || pathname.startsWith(`${module}/`))

export const BcvRateAlert = () => {
  const pathname = usePathname()
  const { rate, isLoading, isFallback, isMissing } = useBcvRateInfo()

  if (!dependsOnBcv(pathname) || isLoading || (!isMissing && !isFallback)) {
    return null
  }

  const configureButton = (
    <Button component={Link} href='/settings' size='small' color='inherit' sx={{ fontWeight: 700 }}>
      Configurar tasa
    </Button>
  )

  if (isMissing) {
    return (
      <Alert
        severity='error'
        action={configureButton}
        sx={{ mb: 4, borderRadius: '12px', alignItems: 'center' }}
      >
        <AlertTitle sx={{ fontWeight: 700 }}>No hay una tasa BCV configurada</AlertTitle>
        Los módulos que convierten montos a bolívares no pueden calcularse sin una tasa. Configure la tasa
        manual en Ajustes o espere la sincronización oficial.
      </Alert>
    )
  }

  return (
    <Alert
      severity='warning'
      action={configureButton}
      sx={{ mb: 4, borderRadius: '12px', alignItems: 'center' }}
    >
      <AlertTitle sx={{ fontWeight: 700 }}>Tasa BCV oficial no disponible</AlertTitle>
      Se está usando la tasa configurada manualmente: <strong>{rate.toFixed(2)} Bs/USD</strong>. Verifique la
      configuración para mantener los cálculos actualizados.
    </Alert>
  )
}

export default BcvRateAlert
