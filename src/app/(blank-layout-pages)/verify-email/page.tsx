import type { Metadata } from 'next'

import VerifyEmailView from '@/views/auth/VerifyEmailView'

export const metadata: Metadata = {
  title: 'Verificación de Correo | FORGE ERP',
  description: 'Confirmación y activación de cuenta de usuario en FORGE ERP'
}

export default function VerifyEmailPage() {
  return <VerifyEmailView />
}
