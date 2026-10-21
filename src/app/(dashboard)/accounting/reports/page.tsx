import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Reportes Financieros - Foundly ERP'
}

export default function FinancialReportsPage() {
  redirect('/accounting/reports/balance-sheet')
}
