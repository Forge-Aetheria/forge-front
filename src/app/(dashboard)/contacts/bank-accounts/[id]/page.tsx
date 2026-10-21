import type { Metadata } from 'next'
import BankAccountDetailView from '@/views/contacts/BankAccountDetailView'

type Props = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Ficha de Cuenta Bancaria | Foundly ERP',
  description: 'Detalle, titularidad y canales de pago de la cuenta bancaria'
}

const BankAccountDetailPage = async ({ params }: Props) => {
  const { id } = await params

  return <BankAccountDetailView id={id} />
}

export default BankAccountDetailPage
