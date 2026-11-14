'use client';

import { useState, useEffect, useCallback } from 'react';

import type { TerceroEntity, TerceroFormData, ContactsFilterState } from '@/types/contactsTypes';
import { contactsService } from '@/services/contactsService';

export function useEntityContacts() {
  const [terceros, setTerceros] = useState<TerceroEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filters, setFilters] = useState<ContactsFilterState>({
    search: '',
    tipo: 'ALL',
    clasificacion: 'ALL'
  });

  const fetchTerceros = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await contactsService.getTerceros(filters);

      setTerceros(data);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener directorio');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTerceros();
  }, [fetchTerceros]);

  const saveTercero = async (formData: TerceroFormData, id?: string) => {
    setIsSubmitting(true);

    try {
      let saved: TerceroEntity;

      if (id) {
        saved = await contactsService.updateTercero(id, formData);
        setTerceros(prev => prev.map(t => (t.id === id ? saved : t)));
      } else {
        saved = await contactsService.createTercero(formData);
        setTerceros(prev => [saved, ...prev]);
      }

      
return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al guardar el contacto' };
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivateTercero = async (id: string) => {
    setIsSubmitting(true);

    try {
      await contactsService.deactivateTercero(id);
      setTerceros(prev => prev.filter(t => t.id !== id));
      
return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'No se pudo eliminar el contacto' };
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivateMultipleTerceros = async (ids: string[]) => {
    setIsSubmitting(true);

    try {
      await contactsService.deactivateMultipleTerceros(ids);
      const idSet = new Set(ids);

      setTerceros(prev => prev.filter(t => !idSet.has(t.id)));
      
return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'No se pudieron eliminar los contactos' };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    terceros,
    filters,
    setFilters,
    isLoading,
    error,
    isSubmitting,
    saveTercero,
    deactivateTercero,
    deactivateMultipleTerceros,
    refetch: fetchTerceros
  };
}

;
