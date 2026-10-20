export type BankAccountType = 'CORRIENTE' | 'AHORRO' | 'VIRTUAL' | 'OTRO'

export type BankCurrency = 'VES' | 'USD' | 'EUR'

export interface BankAccount {
  id: string
  banco: string
  codigo_banco?: string
  numero_cuenta: string
  tipo_cuenta: BankAccountType
  moneda: BankCurrency
  titular: string
  identificacion_titular: string // RIF o Cédula (Ej: J-12345678-0 o V-12345678)
  telefono_pago_movil?: string
  is_pago_movil?: boolean
  email_notificacion?: string
  is_predeterminada?: boolean
  contacto_id?: string // Si no tiene o es 'COMPANY', es cuenta de la empresa
  contacto_nombre?: string
  contacto_tipo?: 'CLIENTE' | 'PROVEEDOR' | 'AMBOS' | 'EMPRESA'
  is_empresa?: boolean // true si pertenece a la propia empresa
  notas?: string
  status: 'ACTIVO' | 'INACTIVO'
  created_at: string
  updated_at: string
}

export interface BankOption {
  codigo: string
  nombre: string
  nombreCorto: string
  esNacional: boolean
  permitePagoMovil?: boolean
}

export const VENEZUELAN_BANKS: BankOption[] = [
  { codigo: '0102', nombre: 'Banco de Venezuela, S.A.', nombreCorto: 'Banco de Venezuela', esNacional: true, permitePagoMovil: true },
  { codigo: '0105', nombre: 'Banco Mercantil, C.A.', nombreCorto: 'Mercantil', esNacional: true, permitePagoMovil: true },
  { codigo: '0108', nombre: 'Banco Provincial, S.A.', nombreCorto: 'BBVA Provincial', esNacional: true, permitePagoMovil: true },
  { codigo: '0134', nombre: 'Banesco Banco Universal, C.A.', nombreCorto: 'Banesco', esNacional: true, permitePagoMovil: true },
  { codigo: '0172', nombre: 'Bancamiga Banco Universal, C.A.', nombreCorto: 'Bancamiga', esNacional: true, permitePagoMovil: true },
  { codigo: '0114', nombre: 'Bancaribe C.A.', nombreCorto: 'Bancaribe', esNacional: true, permitePagoMovil: true },
  { codigo: '0191', nombre: 'Banco Nacional de Crédito (BNC)', nombreCorto: 'BNC', esNacional: true, permitePagoMovil: true },
  { codigo: '0115', nombre: 'Banco Exterior, C.A.', nombreCorto: 'Banco Exterior', esNacional: true, permitePagoMovil: true },
  { codigo: '0174', nombre: 'Banplus Banco Universal, C.A.', nombreCorto: 'Banplus', esNacional: true, permitePagoMovil: true },
  { codigo: '0151', nombre: 'BFC Banco Fondo Común, C.A.', nombreCorto: 'BFC Fondo Común', esNacional: true, permitePagoMovil: true },
  { codigo: '0175', nombre: 'Banco Bicentenario del Pueblo', nombreCorto: 'Banco Bicentenario', esNacional: true, permitePagoMovil: true },
  { codigo: '0137', nombre: 'Banco Sofitasa, C.A.', nombreCorto: 'Sofitasa', esNacional: true, permitePagoMovil: true },
  { codigo: '0168', nombre: 'Bancrecer, S.A.', nombreCorto: 'Bancrecer', esNacional: true, permitePagoMovil: true },
  { codigo: '0177', nombre: 'Banco de la Fuerza Armada Nacional Bolivariana (BANFANB)', nombreCorto: 'BANFANB', esNacional: true, permitePagoMovil: true },
  { codigo: '0169', nombre: 'Mi Banco, Banco Microfinanciero, C.A.', nombreCorto: 'Mi Banco', esNacional: true, permitePagoMovil: true }
]

export const INTERNATIONAL_BANKS: BankOption[] = [
  { codigo: 'CHASE', nombre: 'JPMorgan Chase Bank (USA)', nombreCorto: 'Chase Bank', esNacional: false },
  { codigo: 'BOFA', nombre: 'Bank of America (USA)', nombreCorto: 'Bank of America', esNacional: false },
  { codigo: 'WELLS', nombre: 'Wells Fargo Bank (USA)', nombreCorto: 'Wells Fargo', esNacional: false },
  { codigo: 'BANESCO_PA', nombre: 'Banesco Panamá, S.A.', nombreCorto: 'Banesco Panamá', esNacional: false },
  { codigo: 'MERCANTIL_PA', nombre: 'Mercantil Banco (Panamá)', nombreCorto: 'Mercantil Panamá', esNacional: false },
  { codigo: 'ZELLE', nombre: 'Zelle (Transferencia Directa USD)', nombreCorto: 'Zelle', esNacional: false },
  { codigo: 'PAYPAL', nombre: 'PayPal Inc.', nombreCorto: 'PayPal', esNacional: false },
  { codigo: 'BINANCE', nombre: 'Binance Pay / Crypto USDT', nombreCorto: 'Binance Pay', esNacional: false }
]

export const ALL_BANKS: BankOption[] = [...VENEZUELAN_BANKS, ...INTERNATIONAL_BANKS]
