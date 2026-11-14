import type { Metadata } from 'next'

import POSShiftManagement from '@/views/pos/shifts/POSShiftManagement'

export const metadata: Metadata = {
  title: 'Turnos y Arqueos POS | Forge ERP',
  description: 'Control de caja, turnos y conciliación de arqueo ciego'
}

const POSShiftsPage = () => {
  return <POSShiftManagement />
}

export default POSShiftsPage
