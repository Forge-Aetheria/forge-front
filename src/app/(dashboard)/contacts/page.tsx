import type { Metadata } from 'next';

import EntityContactsTab from '@/views/contacts/EntityContactsTab';

export const metadata: Metadata = {
  title: 'Contactos & Personas de Interés | Foundly ERP',
  description: 'Gestión de contactos clave, representantes legales y responsables de pagos'
};

const ContactsPage = () => {
  return <EntityContactsTab />;
};

export default ContactsPage;
