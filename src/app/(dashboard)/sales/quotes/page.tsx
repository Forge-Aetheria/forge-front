import { Metadata } from 'next';
import { QuotesListView } from '@/views/sales/quotes/QuotesListView';

export const metadata: Metadata = {
  title: 'Cotizaciones y Ventas | Foundly ERP',
  description: 'Gestión del ciclo comercial, emisión de presupuestos bimonetarios y órdenes de venta'
};

export default function SalesQuotesPage() {
  return <QuotesListView />;
}
