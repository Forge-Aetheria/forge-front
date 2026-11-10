import type { Metadata } from 'next'

import ResetPasswordView from '@/views/auth/ResetPasswordView'

export const metadata: Metadata = {
  title: 'Restablecer Contraseña | FORGE ERP',
  description: 'Establecer nueva contraseña de acceso en FORGE ERP'
}

export default function ResetPasswordPage() {
  return <ResetPasswordView />
}
