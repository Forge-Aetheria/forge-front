import { Metadata } from 'next'
import { JournalsListView } from '@/views/accounting/journals/JournalsListView'

export const metadata: Metadata = {
  title: 'Diarios Contables | Foundly Accounting',
  description: 'Gestión y configuración de libros auxiliares y diarios contables'
}

export default function JournalsPage() {
  return <JournalsListView />
}
