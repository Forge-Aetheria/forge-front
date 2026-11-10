import type { Metadata } from 'next'

import ForgotPasswordView from '@/views/auth/ForgotPasswordView'

export const metadata: Metadata = {
  title: 'Recuperar Contraseña | FORGE ERP',
  description: 'Solicitud de recuperación de credenciales de acceso'
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />
}
