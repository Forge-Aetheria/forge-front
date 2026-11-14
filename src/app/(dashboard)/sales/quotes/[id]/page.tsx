import type { Metadata } from 'next';

import { QuoteDetailView } from '@/views/sales/quotes/QuoteDetailView';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Detalle de Cotización | Foundly ERP',
  description: 'Consulta integral, condiciones bimonetarias y conversión a orden de venta'
};

const QuoteDetailPage = async ({ params }: Props) => {
  const { id } = await params;

  return <QuoteDetailView id={id} />;
};

export default QuoteDetailPage;
