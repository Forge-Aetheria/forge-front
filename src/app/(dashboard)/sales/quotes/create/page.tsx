import { Metadata } from 'next';
import { QuoteMasterDetailForm } from '@/views/sales/quotes/QuoteMasterDetailForm';

export const metadata: Metadata = {
  title: 'Nueva Cotización de Venta | Foundly ERP',
  description: 'Creación de presupuestos comerciales bimonetarios con control de inventario'
};

export default function CreateQuotePage() {
  return <QuoteMasterDetailForm mode="create" />;
}
