import type { Metadata } from 'next'

import RegisterView from '@/views/auth/RegisterView'

export const metadata: Metadata = {
  title: 'Crear Empresa | FORGE ERP',
  description: 'Registro de nuevas empresas y autoservicio en FORGE ERP'
}

export default function RegisterPage() {
  return <RegisterView />
}
