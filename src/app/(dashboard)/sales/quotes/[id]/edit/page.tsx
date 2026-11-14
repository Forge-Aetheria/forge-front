import type { Metadata } from 'next';

import { QuoteEditWrapper } from '@/views/sales/quotes/QuoteEditWrapper';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Editar Cotización | Foundly ERP',
  description: 'Modificación de presupuesto en borrador'
};

const EditQuotePage = async ({ params }: Props) => {
  const { id } = await params;

  return <QuoteEditWrapper id={id} />;
};

export default EditQuotePage;
