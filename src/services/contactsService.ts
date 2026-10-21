import { TerceroEntity, TerceroFormData, ContactsFilterState } from '@/types/contactsTypes';
import { initialMockTerceros } from '@/data/contacts/mockContactsData';

class ContactsService {
  private terceros: TerceroEntity[] = [...initialMockTerceros];

  public async getTerceros(filters?: ContactsFilterState): Promise<TerceroEntity[]> {
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
    const item = this.terceros.find(t => t.id === realId && t.status === 'ACTIVO');
    return item || null;
  }

  public async createTercero(data: TerceroFormData): Promise<TerceroEntity> {
    const newTercero: TerceroEntity = {
      id: `ter-${Date.now()}`,
      origen: data.origen || 'NACIONAL',
      ...data,
      status: 'ACTIVO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.terceros.unshift(newTercero);
    return newTercero;
  }

  public async updateTercero(id: string, data: Partial<TerceroFormData>): Promise<TerceroEntity> {
    const realId = id.split('__ref__')[0];
    const index = this.terceros.findIndex(t => t.id === realId);
    if (index === -1) throw new Error('Entidad no encontrada');
    this.terceros[index] = {
      ...this.terceros[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    return this.terceros[index];
  }

  public async deactivateTercero(id: string): Promise<void> {
    const realId = id.split('__ref__')[0];
    const index = this.terceros.findIndex(t => t.id === realId);
    if (index !== -1) {
      this.terceros[index].status = 'INACTIVO';
      this.terceros[index].updated_at = new Date().toISOString();
    }
  }

  public async deactivateMultipleTerceros(ids: string[]): Promise<void> {
    const idSet = new Set(ids.map(id => id.split('__ref__')[0]));
    this.terceros.forEach(t => {
      if (idSet.has(t.id)) {
        t.status = 'INACTIVO';
        t.updated_at = new Date().toISOString();
      }
    });
  }
}

export const contactsService = new ContactsService();
