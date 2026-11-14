import type { Metadata } from 'next'

import BankAccountDetailView from '@/views/contacts/BankAccountDetailView'

export const metadata: Metadata = {
  title: 'Nueva Cuenta Bancaria | Foundly ERP',
  description: 'Registro de cuentas bancarias de la empresa, clientes y proveedores'
}

const BankAccountCreatePage = () => {
  return <BankAccountDetailView id='create' />
}

export default BankAccountCreatePage
