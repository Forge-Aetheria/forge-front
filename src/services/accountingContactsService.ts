import { contactsService } from '@/services/contactsService'

export interface AccountingContactOption {
  id: string
  nombre: string
  rif: string
  tipo: 'CUSTOMER' | 'SUPPLIER'
}

/**
 * Contact options for accounting forms, sourced from the contacts module
 * (backend partners) instead of local constants.
 */
export const getAccountingContactOptions = async (): Promise<AccountingContactOption[]> => {
  const terceros = await contactsService.getTerceros(undefined, true)
  const options: AccountingContactOption[] = []

  for (const tercero of terceros) {
    if (tercero.is_cliente) {
      options.push({
        id: tercero.id,
        nombre: tercero.nombre_razon_social,
        rif: tercero.identificacion,
        tipo: 'CUSTOMER'
      })
    }

    if (tercero.is_proveedor) {
      options.push({
        id: tercero.id,
        nombre: tercero.nombre_razon_social,
        rif: tercero.identificacion,
        tipo: 'SUPPLIER'
      })
    }
  }

  return options
}
