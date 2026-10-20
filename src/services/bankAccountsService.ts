import { BankAccount, ALL_BANKS } from '@/types/bankAccountTypes'

const STORAGE_KEY = 'foundly_bank_accounts'

const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  // Cuentas de la Empresa (is_empresa: true)
  {
    id: 'bank-emp-01',
    banco: 'Banesco Banco Universal, C.A.',
    codigo_banco: '0134',
    numero_cuenta: '0134-0012-34-5678901234',
    tipo_cuenta: 'CORRIENTE',
    moneda: 'VES',
    titular: 'Forge Global Suministros C.A.',
    identificacion_titular: 'J-40192834-5',
    telefono_pago_movil: '0414-9876543',
    is_pago_movil: true,
    email_notificacion: 'administracion@forge-global.com',
    is_predeterminada: true,
    contacto_id: 'COMPANY',
    contacto_nombre: 'Empresa (Forge Global)',
    contacto_tipo: 'EMPRESA',
    is_empresa: true,
    notas: 'Cuenta principal de cobros y pagos en Bolívares con Pago Móvil activo',
    status: 'ACTIVO',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z'
  },
  {
    id: 'bank-emp-02',
    banco: 'Banesco Banco Universal, C.A.',
    codigo_banco: '0134',
    numero_cuenta: '0134-0012-34-9988776655',
    tipo_cuenta: 'CORRIENTE',
    moneda: 'USD',
    titular: 'Forge Global Suministros C.A.',
    identificacion_titular: 'J-40192834-5',
    email_notificacion: 'administracion@forge-global.com',
    is_predeterminada: true,
    contacto_id: 'COMPANY',
    contacto_nombre: 'Empresa (Forge Global)',
    contacto_tipo: 'EMPRESA',
    is_empresa: true,
    notas: 'Cuenta Custodia en Dólares para recepción de pagos especiales',
    status: 'ACTIVO',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z'
  },
  {
    id: 'bank-emp-03',
    banco: 'Banco Mercantil, C.A.',
    codigo_banco: '0105',
    numero_cuenta: '0105-0023-45-1234567890',
    tipo_cuenta: 'CORRIENTE',
    moneda: 'VES',
    titular: 'Forge Global Suministros C.A.',
    identificacion_titular: 'J-40192834-5',
    telefono_pago_movil: '0414-9876543',
    is_pago_movil: true,
    email_notificacion: 'administracion@forge-global.com',
    is_predeterminada: false,
    contacto_id: 'COMPANY',
    contacto_nombre: 'Empresa (Forge Global)',
    contacto_tipo: 'EMPRESA',
    is_empresa: true,
    notas: 'Cuenta secundaria para pagos a proveedores Mercantil',
    status: 'ACTIVO',
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-01T10:00:00Z'
  },
  {
    id: 'bank-emp-04',
    banco: 'Zelle (Transferencia Directa USD)',
    codigo_banco: 'ZELLE',
    numero_cuenta: 'zelle@forge-global.com',
    tipo_cuenta: 'VIRTUAL',
    moneda: 'USD',
    titular: 'Forge Global LLC',
    identificacion_titular: 'EIN-84920194',
    email_notificacion: 'zelle@forge-global.com',
    is_predeterminada: false,
    contacto_id: 'COMPANY',
    contacto_nombre: 'Empresa (Forge Global)',
    contacto_tipo: 'EMPRESA',
    is_empresa: true,
    notas: 'Zelle corporativo para transferencias internacionales en USD',
    status: 'ACTIVO',
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-10T10:00:00Z'
  },

  // Cuentas de Contactos (Clientes / Proveedores)
  {
    id: 'bank-ct-01',
    banco: 'Banesco Banco Universal, C.A.',
    codigo_banco: '0134',
    numero_cuenta: '0134-0987-65-4321098765',
    tipo_cuenta: 'CORRIENTE',
    moneda: 'VES',
    titular: 'Inversiones Caroní C.A.',
    identificacion_titular: 'J-30981245-2',
    telefono_pago_movil: '0414-1234567',
    is_pago_movil: true,
    email_notificacion: 'pagos@inversionescaroni.com',
    is_predeterminada: true,
    contacto_id: 'ct-01',
    contacto_nombre: 'Inversiones Caroní C.A.',
    contacto_tipo: 'CLIENTE',
    is_empresa: false,
    status: 'ACTIVO',
    created_at: '2026-02-15T12:00:00Z',
    updated_at: '2026-02-15T12:00:00Z'
  },
  {
    id: 'bank-ct-02',
    banco: 'Bancamiga Banco Universal, C.A.',
    codigo_banco: '0172',
    numero_cuenta: '0172-0056-78-9012345678',
    tipo_cuenta: 'CORRIENTE',
    moneda: 'USD',
    titular: 'Distribuidora Oriental S.A.S.',
    identificacion_titular: 'J-40291823-1',
    email_notificacion: 'finanzas@distoriental.com',
    is_predeterminada: true,
    contacto_id: 'ct-02',
    contacto_nombre: 'Distribuidora Oriental S.A.S.',
    contacto_tipo: 'CLIENTE',
    is_empresa: false,
    status: 'ACTIVO',
    created_at: '2026-02-20T12:00:00Z',
    updated_at: '2026-02-20T12:00:00Z'
  },
  {
    id: 'bank-ct-03',
    banco: 'Banco de Venezuela, S.A.',
    codigo_banco: '0102',
    numero_cuenta: '0102-0001-00-0000030010',
    tipo_cuenta: 'CORRIENTE',
    moneda: 'VES',
    titular: 'Corpoelec / Servicios Eléctricos',
    identificacion_titular: 'G-20003001-0',
    email_notificacion: 'recaudacion@corpoelec.gob.ve',
    is_predeterminada: true,
    contacto_id: 'ct-prov-01',
    contacto_nombre: 'Corpoelec / Servicios Eléctricos',
    contacto_tipo: 'PROVEEDOR',
    is_empresa: false,
    status: 'ACTIVO',
    created_at: '2026-02-22T12:00:00Z',
    updated_at: '2026-02-22T12:00:00Z'
  },
  {
    id: 'bank-ct-04',
    banco: 'Banco Mercantil, C.A.',
    codigo_banco: '0105',
    numero_cuenta: '0105-0876-54-3210987654',
    tipo_cuenta: 'CORRIENTE',
    moneda: 'VES',
    titular: 'Distribuidora Eléctrica del Sur C.A.',
    identificacion_titular: 'J-40128456-0',
    telefono_pago_movil: '0424-8765432',
    is_pago_movil: true,
    email_notificacion: 'cobranzas@delsur.com',
    is_predeterminada: true,
    contacto_id: 'ct-prov-02',
    contacto_nombre: 'Distribuidora Eléctrica del Sur C.A.',
    contacto_tipo: 'PROVEEDOR',
    is_empresa: false,
    status: 'ACTIVO',
    created_at: '2026-02-25T12:00:00Z',
    updated_at: '2026-02-25T12:00:00Z'
  },
  {
    id: 'bank-ct-05',
    banco: 'Banco de Venezuela, S.A.',
    codigo_banco: '0102',
    numero_cuenta: '0102-0112-23-4567890123',
    tipo_cuenta: 'CORRIENTE',
    moneda: 'VES',
    titular: 'Inversiones Polar C.A.',
    identificacion_titular: 'J-00041372-8',
    telefono_pago_movil: '0424-7654321',
    is_pago_movil: true,
    email_notificacion: 'retenciones@polar.com',
    is_predeterminada: true,
    contacto_id: 'ter-001',
    contacto_nombre: 'Inversiones Polar C.A.',
    contacto_tipo: 'AMBOS',
    is_empresa: false,
    status: 'ACTIVO',
    created_at: '2026-02-26T12:00:00Z',
    updated_at: '2026-02-26T12:00:00Z'
  }
]

class BankAccountsService {
  private getStored(): BankAccount[] {
    if (typeof window === 'undefined') return INITIAL_BANK_ACCOUNTS
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BANK_ACCOUNTS))
      return INITIAL_BANK_ACCOUNTS
    }
    try {
      return JSON.parse(raw)
    } catch {
      return INITIAL_BANK_ACCOUNTS
    }
  }

  private setStored(accounts: BankAccount[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  }

  public async getBankAccounts(filters?: {
    contactoId?: string
    isEmpresa?: boolean
    search?: string
    moneda?: string
    tipo?: string
  }): Promise<BankAccount[]> {
    await new Promise(r => setTimeout(r, 100))
    let list = this.getStored().filter(acc => acc.status === 'ACTIVO')

    if (filters) {
      if (filters.isEmpresa !== undefined) {
        list = list.filter(acc => (filters.isEmpresa ? acc.is_empresa : !acc.is_empresa))
      }
      if (filters.contactoId) {
        list = list.filter(acc => acc.contacto_id === filters.contactoId)
      }
      if (filters.moneda && filters.moneda !== 'ALL') {
        list = list.filter(acc => acc.moneda === filters.moneda)
      }
      if (filters.tipo && filters.tipo !== 'ALL') {
        list = list.filter(acc => acc.tipo_cuenta === filters.tipo)
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim()
        list = list.filter(
          acc =>
            acc.banco.toLowerCase().includes(q) ||
            acc.numero_cuenta.toLowerCase().includes(q) ||
            acc.titular.toLowerCase().includes(q) ||
            acc.identificacion_titular.toLowerCase().includes(q) ||
            (acc.contacto_nombre && acc.contacto_nombre.toLowerCase().includes(q)) ||
            (acc.telefono_pago_movil && acc.telefono_pago_movil.includes(q))
        )
      }
    }

    return list
  }

  public async getCompanyBankAccounts(): Promise<BankAccount[]> {
    return this.getBankAccounts({ isEmpresa: true })
  }

  public async getContactBankAccounts(contactoId: string): Promise<BankAccount[]> {
    return this.getBankAccounts({ contactoId })
  }

  public async getBankAccountById(id: string): Promise<BankAccount | null> {
    const list = this.getStored()
    const found = list.find(a => a.id === id)
    return found || null
  }

  public async createBankAccount(data: Omit<BankAccount, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<BankAccount> {
    await new Promise(r => setTimeout(r, 150))
    const list = this.getStored()

    // Si viene marcada como predeterminada, quitar predeterminada previa en el mismo contacto o empresa
    if (data.is_predeterminada) {
      list.forEach(a => {
        if (data.is_empresa && a.is_empresa) {
          a.is_predeterminada = false
        } else if (!data.is_empresa && a.contacto_id === data.contacto_id) {
          a.is_predeterminada = false
        }
      })
    }

    const newAcc: BankAccount = {
      id: `bank-${Date.now()}`,
      ...data,
      status: 'ACTIVO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    list.unshift(newAcc)
    this.setStored(list)
    return newAcc
  }

  public async updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
    await new Promise(r => setTimeout(r, 150))
    const list = this.getStored()
    const idx = list.findIndex(a => a.id === id)
    if (idx === -1) throw new Error('Cuenta bancaria no encontrada')

    if (data.is_predeterminada) {
      const target = list[idx]
      list.forEach(a => {
        if (target.is_empresa && a.is_empresa) {
          a.is_predeterminada = false
        } else if (!target.is_empresa && a.contacto_id === target.contacto_id) {
          a.is_predeterminada = false
        }
      })
    }

    list[idx] = {
      ...list[idx],
      ...data,
      updated_at: new Date().toISOString()
    }

    this.setStored(list)
    return list[idx]
  }

  public async deleteBankAccount(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 100))
    const list = this.getStored()
    const filtered = list.filter(a => a.id !== id)
    this.setStored(filtered)
  }

  public async setDefaultBankAccount(id: string, contactoId?: string, isEmpresa = false): Promise<void> {
    const list = this.getStored()
    list.forEach(a => {
      if (isEmpresa && a.is_empresa) {
        a.is_predeterminada = a.id === id
      } else if (!isEmpresa && contactoId && a.contacto_id === contactoId) {
        a.is_predeterminada = a.id === id
      }
    })
    this.setStored(list)
  }
}

export const bankAccountsService = new BankAccountsService()
