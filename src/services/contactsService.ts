import type { TerceroEntity, TerceroFormData, ContactsFilterState, ContactPerson } from '@/types/contactsTypes';
import { executeGraphQL } from '@/libs/graphqlClient';
import {
  GET_PARTNERS_QUERY,
  GET_PARTNER_QUERY,
  CREATE_PARTNER_MUTATION,
  UPDATE_PARTNER_MUTATION,
  REMOVE_PARTNER_MUTATION
} from '@/graphql/contacts.gql';

const PARTNER_UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface BackendPartner {
  id: string;
  legalName: string;
  tradeName?: string | null;
  docType: string;
  docNumber: string;
  checkDigit?: string | null;
  email: string;
  phone: string;
  fiscalAddress: string;
  status: string;
  isCustomer: boolean;
  isSupplier: boolean;
  customerProfile?: {
    paymentCondition?: string;
    creditLimit?: string;
    creditDays?: number;
    currency?: string;
  } | null;
  contacts?: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    position?: string | null;
    isPrimary?: boolean | null;
  }> | null;
  bankAccounts?: Array<{
    id: string;
    accountNumber: string;
    bank?: {
      id: string;
      name: string;
      code: string;
    } | null;
  }> | null;
  createdAt: string;
  updatedAt: string;
}

const RIF_PREFIX_VALUES: Record<string, number> = {
  V: 1,
  E: 2,
  J: 3,
  P: 4,
  G: 5,
  C: 3
};

const RIF_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2];

function computeRifCheckDigit(docType: string, body: string): string {
  const prefixVal = RIF_PREFIX_VALUES[docType] || 3;
  let sum = prefixVal * 4;
  const padded = body.padStart(8, '0');

  for (let i = 0; i < 8; i++) {
    sum += Number(padded[i]) * RIF_WEIGHTS[i];
  }

  const digit = 11 - (sum % 11);

  
return digit >= 10 ? '0' : String(digit);
}

export function mapBackendPartnerToTercero(partner: BackendPartner): TerceroEntity {
  const isIndividual = partner.docType === 'V' || partner.docType === 'E';

  const docFormatted = partner.checkDigit
    ? `${partner.docType}-${partner.docNumber}-${partner.checkDigit}`
    : `${partner.docType}-${partner.docNumber}`;

  const contactos: ContactPerson[] = (partner.contacts || []).map((c, idx) => ({
    id: c.id || `cp-${idx}`,
    nombre: c.name,
    cargo: c.position || 'Contacto Comercial',
    telefono: c.phone || '',
    email: c.email || '',
    rol: 'VENTAS',
    is_principal: Boolean(c.isPrimary)
  }));

  return {
    id: partner.id,
    codigo: partner.docNumber,
    origen: 'NACIONAL',
    tipo: isIndividual ? 'INDIVIDUAL' : 'EMPRESA',
    nombre_razon_social: partner.legalName,
    nombre_comercial: partner.tradeName || partner.legalName,
    identificacion: docFormatted,
    is_cliente: partner.isCustomer,
    is_proveedor: partner.isSupplier,
    is_contacto: true,
    telefono_principal: partner.phone || '',
    email_principal: partner.email || '',
    direccion: partner.fiscalAddress || '',
    ciudad: 'Caracas',
    estado: 'Distrito Capital',
    pais: 'Venezuela',
    contactos_referentes: contactos,
    direcciones_adicionales: [],
    limite_credito_usd: partner.customerProfile?.creditLimit ? Number(partner.customerProfile.creditLimit) : 0,
    plazo_pago_dias: partner.customerProfile?.creditDays || 0,
    status: partner.status === 'INACTIVE' ? 'INACTIVO' : 'ACTIVO',
    created_at: partner.createdAt,
    updated_at: partner.updatedAt
  };
}

class ContactsService {
  private terceros: TerceroEntity[] = [];
  private lastFetchTimestamp = 0;

  public async getTerceros(filters?: Partial<ContactsFilterState>, forceRefresh = false): Promise<TerceroEntity[]> {
    const now = Date.now();

    // Cache de 15 segundos para evitar saturación de queries
    if (forceRefresh || now - this.lastFetchTimestamp > 15000) {
      const res = await executeGraphQL<{ partners: BackendPartner[] }>(
        GET_PARTNERS_QUERY,
        {
          where: {
            deletedAt: { equals: null }
          },
          take: 100
        },
        { timeoutMs: 5000 }
      );

      if (!res?.partners || !Array.isArray(res.partners)) {
        throw new Error('El backend no devolvió un listado de terceros válido.');
      }

      this.terceros = res.partners.map(mapBackendPartnerToTercero);
      this.lastFetchTimestamp = now;
    }

    let result = this.terceros.filter(t => t.status === 'ACTIVO');

    if (filters) {
      if (filters.tipo && filters.tipo !== 'ALL') {
        result = result.filter(t => t.tipo === filters.tipo);
      }

      if (filters.clasificacion && filters.clasificacion !== 'ALL') {
        if (filters.clasificacion === 'CLIENTE') {
          result = result.filter(t => t.is_cliente);
        } else if (filters.clasificacion === 'PROVEEDOR') {
          result = result.filter(t => t.is_proveedor);
        }
      }

      if (filters.search && filters.search.trim().length > 0) {
        const q = filters.search.toLowerCase().trim();
        const searchResults: TerceroEntity[] = [];

        for (const t of result) {
          const companyMatches =
            t.nombre_razon_social.toLowerCase().includes(q) ||
            (t.nombre_comercial && t.nombre_comercial.toLowerCase().includes(q)) ||
            t.identificacion.toLowerCase().includes(q) ||
            (t.codigo && t.codigo.toLowerCase().includes(q)) ||
            t.ciudad.toLowerCase().includes(q) ||
            t.estado.toLowerCase().includes(q) ||
            t.telefono_principal.includes(q);

          const matchingPersons = (t.contactos_referentes || []).filter(
            c =>
              c.nombre.toLowerCase().includes(q) ||
              c.cargo.toLowerCase().includes(q) ||
              c.telefono.includes(q) ||
              c.email.toLowerCase().includes(q) ||
              (c.cedula_identidad && c.cedula_identidad.toLowerCase().includes(q))
          );

          if (companyMatches) {
            searchResults.push(t);
          }

          if (matchingPersons.length > 0) {
            for (const person of matchingPersons) {
              searchResults.push({
                ...t,
                id: `${t.id}__ref__${person.id}`,
                tipo: 'INDIVIDUAL',
                nombre_razon_social: person.nombre,
                nombre_comercial: person.cargo,
                identificacion: person.cedula_identidad || t.identificacion,
                telefono_principal: person.telefono,
                email_principal: person.email,
                parent_company_id: t.id,
                parent_company_name: t.nombre_razon_social,
                contact_person_ref: person
              });
            }
          }
        }

        result = searchResults;
      }
    }

    return result;
  }

  public async getTerceroById(id: string): Promise<TerceroEntity | null> {
    const realId = id.split('__ref__')[0];

    const res = await executeGraphQL<{ partner: BackendPartner | null }>(
      GET_PARTNER_QUERY,
      { id: realId },
      { timeoutMs: 4000 }
    );

    if (!res?.partner) return null;

    const mapped = mapBackendPartnerToTercero(res.partner);
    const index = this.terceros.findIndex(t => t.id === realId);

    if (index !== -1) {
      this.terceros[index] = mapped;
    } else {
      this.terceros.unshift(mapped);
    }

    return mapped;
  }

  public async createTercero(data: TerceroFormData): Promise<TerceroEntity> {
    // Normalizar docType y docNumber del formato SENIAT (ej. J-12345678-9)
    const cleanId = data.identificacion.replace(/[\s.\-_/]/g, '').toUpperCase();
    const docTypeMatch = cleanId.match(/^([VEJPGC])/);
    const docType = docTypeMatch ? docTypeMatch[1] : (data.tipo === 'INDIVIDUAL' ? 'V' : 'J');
    const digitsOnly = cleanId.replace(/^[A-Z]/, '');
    const docNumber = digitsOnly.slice(0, 8).padStart(8, '0');

    // Calcular dígito verificador exacto SENIAT (módulo 11) si aplica
    let checkDigit: string | undefined = undefined;

    if (['J', 'G', 'C'].includes(docType)) {
      checkDigit = computeRifCheckDigit(docType, docNumber);
    } else if (digitsOnly.length > 8) {
      checkDigit = digitsOnly.slice(8, 9);
    }

    // Regla de Negocio BR-02 del backend:
    // Si la condición es CASH (contado), días y límite DEBEN ser estrictamente 0.
    // Si tiene días > 0 o límite > 0, la condición comercial DEBE ser CREDIT (crédito).
    const creditDaysNum = Number(data.plazo_pago_dias || 0);
    const creditLimitNum = Number(data.limite_credito_usd || 0);
    const hasCredit = creditDaysNum > 0 || creditLimitNum > 0;
    const paymentCondition = hasCredit ? 'CREDIT' : 'CASH';
    const finalCreditDays = hasCredit ? creditDaysNum : 0;
    const finalCreditLimit = hasCredit ? String(creditLimitNum) : '0';

    const input = {
      docType,
      docNumber,
      checkDigit,
      legalName: data.nombre_razon_social.trim(),
      fiscalAddress: data.direccion?.trim() || 'Caracas, Venezuela',
      phone: data.telefono_principal?.trim() || '04140000000',
      email: data.email_principal?.trim() || 'contacto@empresa.com',
      customerProfile: data.is_cliente ? {
        paymentCondition,
        creditDays: finalCreditDays,
        creditLimit: finalCreditLimit,
        currency: 'USD'
      } : undefined
    };

    // Llamada directa al backend: SI FALLA, LANZAR EL ERROR DIRECTO A LA UI
    const res = await executeGraphQL<{ createPartner: BackendPartner }>(
      CREATE_PARTNER_MUTATION,
      { input },
      { timeoutMs: 10000 }
    );

    if (!res?.createPartner) {
      throw new Error('El backend no devolvió los datos del tercero creado.');
    }

    const mapped = mapBackendPartnerToTercero(res.createPartner);

    this.terceros.unshift(mapped);
    this.lastFetchTimestamp = 0;

    return mapped;
  }

  public async updateTercero(id: string, data: Partial<TerceroFormData>): Promise<TerceroEntity> {
    const realId = id.split('__ref__')[0];

    if (!PARTNER_UUID_PATTERN.test(realId)) {
      throw new Error('El tercero no existe en el backend. Recargue el directorio e intente nuevamente.');
    }

    const input: Record<string, unknown> = {};

    if (data.nombre_razon_social) input.legalName = data.nombre_razon_social.trim();
    if (data.direccion) input.fiscalAddress = data.direccion.trim();
    if (data.telefono_principal) input.phone = data.telefono_principal.trim();
    if (data.email_principal) input.email = data.email_principal.trim();

    const res = await executeGraphQL<{ updatePartner: BackendPartner }>(
      UPDATE_PARTNER_MUTATION,
      { id: realId, input },
      { timeoutMs: 10000 }
    );

    if (!res?.updatePartner) {
      throw new Error('El backend no devolvió los datos del tercero actualizado.');
    }

    const mapped = mapBackendPartnerToTercero(res.updatePartner);
    const index = this.terceros.findIndex(t => t.id === realId);

    if (index !== -1) {
      this.terceros[index] = mapped;
    } else {
      this.terceros.unshift(mapped);
    }

    this.lastFetchTimestamp = 0;

    return mapped;
  }

  public async deactivateTercero(id: string): Promise<void> {
    const realId = id.split('__ref__')[0];

    await executeGraphQL(
      REMOVE_PARTNER_MUTATION,
      { id: realId },
      { timeoutMs: 10000 }
    );

    this.terceros = this.terceros.filter(t => t.id !== realId);
    this.lastFetchTimestamp = 0;
  }

  public async deactivateMultipleTerceros(ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids.map(id => id.split('__ref__')[0]))];

    if (uniqueIds.length === 0) return;

    const results = await Promise.allSettled(
      uniqueIds.map(id =>
        executeGraphQL(REMOVE_PARTNER_MUTATION, { id }, { timeoutMs: 10000 })
      )
    );

    const removedIds = new Set<string>();
    let failed = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        removedIds.add(uniqueIds[index]);
      } else {
        failed += 1;
      }
    });

    if (removedIds.size > 0) {
      this.terceros = this.terceros.filter(t => !removedIds.has(t.id));
      this.lastFetchTimestamp = 0;
    }

    if (failed > 0) {
      throw new Error(`No se pudieron eliminar ${failed} contacto(s). Refresque la lista e intente nuevamente.`);
    }
  }
}

export const contactsService = new ContactsService();
