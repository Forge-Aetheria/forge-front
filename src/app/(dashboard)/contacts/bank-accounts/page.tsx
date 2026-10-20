import type { Metadata } from 'next'
import { BankAccountsListView } from '@/views/contacts/BankAccountsListView'

export const metadata: Metadata = {
  title: 'Cuentas Bancarias | Foundly ERP',
  description: 'Gestión integral de cuentas bancarias y pago móvil para cobros y pagos'
}

const BankAccountsPage = () => {
  return (
    <div className='p-4 sm:p-6 max-w-7xl mx-auto'>
      <BankAccountsListView />
    </div>
  )
}

export default BankAccountsPage
