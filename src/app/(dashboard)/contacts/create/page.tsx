import type { Metadata } from 'next';
import ContactDetailView from '@/views/contacts/ContactDetailView';

export const metadata: Metadata = {
  title: 'Nuevo Contacto | Foundly ERP',
  description: 'Registro maestro de clientes, proveedores y personas referentes'
};

const ContactCreatePage = () => {
  return <ContactDetailView id="create" />;
};

export default ContactCreatePage;
