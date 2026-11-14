import type { Metadata } from 'next'

import { BankAccountsListView } from '@/views/contacts/BankAccountsListView'

export const metadata: Metadata = {
  title: 'Cuentas Bancarias | Foundly ERP',
  description: 'Gestión integral de cuentas bancarias y pago móvil para cobros y pagos'
}

const BankAccountsPage = () => {
  return <BankAccountsListView />
}

export default BankAccountsPage
