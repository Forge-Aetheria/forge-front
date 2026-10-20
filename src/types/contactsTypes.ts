export type EntityType = 'EMPRESA' | 'INDIVIDUAL';

export type ContactPersonRole =
  | 'REPRESENTANTE_LEGAL'
  | 'PAGOS_RETENCIONES'
  | 'COMPRAS'
  | 'VENTAS'
  | 'OPERATIVO'
  | 'ADMINISTRATIVO';

export type ContactRole = ContactPersonRole;

export type AddressType = 'FISCAL' | 'ENTREGA' | 'FACTURACION';

export interface EntityAddress {
  id: string;
  tipo: AddressType;
  direccion: string;
  ciudad: string;
  estado: string;
  pais: string;
  codigo_postal?: string;
  is_predeterminada: boolean;
}

export interface ContactPerson {
  id: string;
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
  rol: ContactPersonRole;
  is_principal: boolean;
  cedula_identidad?: string;
}

export type BankAccountType = 'CORRIENTE' | 'AHORRO' | 'PAGO_MOVIL' | 'CUSTODIA_USD' | 'ZELLE' | 'OTRO';
export type BankCurrency = 'VES' | 'USD' | 'EUR';

export interface BankAccount {
  id: string;
  banco: string;
  tipo_cuenta: BankAccountType;
  moneda: BankCurrency;
  numero_cuenta: string; // 20 dígitos o identificador / teléfono / correo
  titular: string;
  identificacion_titular: string; // Cédula o RIF
  is_predeterminada: boolean;
  telefono_pago_movil?: string;
}

export type EntityOrigin = 'NACIONAL' | 'EXTRANJERO';

export interface TerceroEntity {
  id: string;
  codigo?: string; // Código comercial o interno (ej. CLI-001, PRV-042)
  origen?: EntityOrigin; // 'NACIONAL' | 'EXTRANJERO'
  tipo: EntityType; // 'EMPRESA' | 'INDIVIDUAL'
  nombre_razon_social: string;
  nombre_comercial?: string;
  identificacion: string; // RIF (J-...) o C.I. (V-..., E-...) o Tax ID
  
  // Clasificación comercial múltiple
  is_cliente: boolean;
  is_proveedor: boolean;
  is_contacto: boolean;

  telefono_principal: string;
  email_principal: string;

  // Dirección principal
  direccion: string;
  ciudad: string;
  estado: string;
  pais: string;
  codigo_postal?: string;

  // Anidados exclusivos para EMPRESA
  contactos_referentes: ContactPerson[];
  direcciones_adicionales: EntityAddress[];

  // Cuentas Bancarias
  cuentas_bancarias?: BankAccount[];

  status: 'ACTIVO' | 'INACTIVO';
  created_at: string;
  updated_at: string;

  // Metadatos para personas referentes en resultados de búsqueda
  parent_company_id?: string;
  parent_company_name?: string;
  contact_person_ref?: ContactPerson;
}

export interface TerceroFormData {
  codigo?: string;
  origen?: EntityOrigin;
  tipo: EntityType;
  nombre_razon_social: string;
  nombre_comercial?: string;
  identificacion: string;
  is_cliente: boolean;
  is_proveedor: boolean;
  is_contacto: boolean;
  telefono_principal: string;
  email_principal: string;
  direccion: string;
  ciudad: string;
  estado: string;
  pais: string;
  codigo_postal?: string;
  contactos_referentes: ContactPerson[];
  direcciones_adicionales: EntityAddress[];
  cuentas_bancarias?: BankAccount[];
}

export interface ContactsTabProps {
  terceroId?: string;
  readOnly?: boolean;
}

export interface ContactsFilterState {
  search: string;
  tipo: 'ALL' | EntityType;
  clasificacion: 'ALL' | 'CLIENTE' | 'PROVEEDOR';
}

export interface ContactVisibleColumns {
  clasificacion?: boolean;
  ubicacion: boolean;
  contactoDirecto: boolean;
  referentes: boolean;
}

export type ContactSortKey = 'nombre' | 'identificacion' | 'tipo' | 'ciudad' | 'referentes';
export type ContactSortDirection = 'asc' | 'desc';
