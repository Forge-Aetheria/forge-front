import type { Metadata } from 'next';
import ContactDetailView from '@/views/contacts/ContactDetailView';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Ficha de Contacto | Foundly ERP',
  description: 'Detalle integral, personas referentes y direcciones comerciales'
};

const ContactDetailPage = async ({ params }: Props) => {
  const { id } = await params;

  return <ContactDetailView id={id} />;
};

export default ContactDetailPage;
