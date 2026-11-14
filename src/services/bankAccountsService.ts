import type { BankAccount } from '@/types/bankAccountTypes'
import { executeGraphQL } from '@/libs/graphqlClient'
import {
  ADD_PARTNER_BANK_ACCOUNT_MUTATION,
  ADD_PARTNER_MOBILE_PAYMENT_MUTATION,
  CREATE_COMPANY_BANK_ACCOUNT_MUTATION,
  GET_BANKS_QUERY,
  GET_COMPANY_BANK_ACCOUNTS_QUERY,
  GET_PARTNER_QUERY,
  REMOVE_COMPANY_BANK_ACCOUNT_MUTATION,
  REMOVE_PARTNER_BANK_ACCOUNT_MUTATION,
  SET_DEFAULT_COMPANY_BANK_ACCOUNT_MUTATION
} from '@/graphql/contacts.gql'

interface GqlCompanyBankAccount {
  id: string
  accountNumber: string
  currency: 'USD' | 'VES'
  label?: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
  bank: { id: string; name: string; code: string }
}

interface GqlPartnerBankAccount {
  id: string
  accountNumber: string
  currency: 'USD' | 'VES'
  bank?: { id: string; name: string; code: string } | null
}

const mapCompanyAccount = (account: GqlCompanyBankAccount): BankAccount => ({
  id: account.id,
  banco: account.bank.name,
  codigo_banco: account.bank.code,
  numero_cuenta: account.accountNumber,
  tipo_cuenta: 'CORRIENTE',
  moneda: account.currency,
  titular: account.label || 'Empresa',
  identificacion_titular: '',
  is_predeterminada: account.isDefault,
  contacto_id: 'COMPANY',
  contacto_nombre: 'Empresa',
  contacto_tipo: 'EMPRESA',
  is_empresa: true,
  status: 'ACTIVO',
  created_at: account.createdAt,
  updated_at: account.updatedAt
})

const mapPartnerAccount = (account: GqlPartnerBankAccount): BankAccount => ({
  id: account.id,
  banco: account.bank?.name || '',
  codigo_banco: account.bank?.code,
  numero_cuenta: account.accountNumber,
  tipo_cuenta: 'CORRIENTE',
  moneda: account.currency,
  titular: '',
  identificacion_titular: '',
  is_empresa: false,
  status: 'ACTIVO',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

class BankAccountsService {
  private cachedBanks: Array<{ id: string; name: string; code: string }> | null = null

  public async fetchBanks(): Promise<Array<{ id: string; name: string; code: string }>> {
    if (this.cachedBanks) return this.cachedBanks

    const response = await executeGraphQL<{ banks: Array<{ id: string; name: string; code: string }> }>(
      GET_BANKS_QUERY,
      { take: 100 },
      { timeoutMs: 5000 }
    )

    this.cachedBanks = response.banks

    return response.banks
  }

  public validateBankAccountCode(
    accountNumber: string,
    expectedCode?: string
  ): { valid: boolean; message?: string } {
    const cleanDigits = accountNumber.replace(/[\s-]/g, '')

    if (cleanDigits.length !== 20) {
      return { valid: false, message: 'El número de cuenta bancaria debe contener exactamente 20 dígitos numéricos.' }
    }

    if (expectedCode && cleanDigits.slice(0, 4) !== expectedCode) {
      return {
        valid: false,
        message: `Los primeros 4 dígitos no coinciden con el código oficial del banco (${expectedCode}).`
      }
    }

    return { valid: true }
  }

  public async getBankAccounts(filters?: {
    contactoId?: string
    isEmpresa?: boolean
    search?: string
    moneda?: string
    tipo?: string
  }): Promise<BankAccount[]> {
    if (filters?.contactoId && !filters.isEmpresa) {
      return this.getContactBankAccounts(filters.contactoId)
    }

    const response = await executeGraphQL<{ companyBankAccounts: GqlCompanyBankAccount[] }>(
      GET_COMPANY_BANK_ACCOUNTS_QUERY,
      undefined,
      { timeoutMs: 5000 }
    )

    let list = response.companyBankAccounts.map(mapCompanyAccount)

    if (filters?.moneda && filters.moneda !== 'ALL') {
      list = list.filter(account => account.moneda === filters.moneda)
    }

    if (filters?.search?.trim()) {
      const query = filters.search.toLowerCase().trim()

      list = list.filter(
        account =>
          account.banco.toLowerCase().includes(query) ||
          account.numero_cuenta.toLowerCase().includes(query) ||
          account.titular.toLowerCase().includes(query)
      )
    }

    return list
  }

  public async getCompanyBankAccounts(): Promise<BankAccount[]> {
    return this.getBankAccounts({ isEmpresa: true })
  }

  public async getContactBankAccounts(contactoId: string): Promise<BankAccount[]> {
    if (!/^[0-9a-fA-F-]{36}$/.test(contactoId)) return []

    const response = await executeGraphQL<{
      partner: { bankAccounts: GqlPartnerBankAccount[] } | null
    }>(GET_PARTNER_QUERY, { id: contactoId }, { timeoutMs: 5000 })

    return (response.partner?.bankAccounts || []).map(mapPartnerAccount)
  }

  public async getBankAccountById(id: string): Promise<BankAccount | null> {
    const companyAccounts = await this.getCompanyBankAccounts()
    const companyMatch = companyAccounts.find(account => account.id === id)

    return companyMatch || null
  }

  public async createBankAccount(
    data: Omit<BankAccount, 'id' | 'status' | 'created_at' | 'updated_at'>
  ): Promise<BankAccount> {
    const cleanAccount = data.numero_cuenta.replace(/[\s-]/g, '')
    const banks = await this.fetchBanks()
    const bank = banks.find(item => item.code === (data.codigo_banco || cleanAccount.slice(0, 4)))

    if (!bank) throw new Error('Banco no encontrado en el catálogo.')

    const validation = this.validateBankAccountCode(cleanAccount, bank.code)

    if (!validation.valid) throw new Error(validation.message)

    if (data.is_empresa) {
      const response = await executeGraphQL<{ createCompanyBankAccount: GqlCompanyBankAccount }>(
        CREATE_COMPANY_BANK_ACCOUNT_MUTATION,
        {
          input: {
            bankId: bank.id,
            currency: data.moneda,
            accountNumber: cleanAccount,
            label: data.titular || undefined,
            isDefault: data.is_predeterminada
          }
        },
        { timeoutMs: 10000 }
      )

      return mapCompanyAccount(response.createCompanyBankAccount)
    }

    if (!data.contacto_id) {
      throw new Error('La cuenta bancaria de tercero requiere un contacto.')
    }

    const response = await executeGraphQL<{ addPartnerBankAccount: GqlPartnerBankAccount }>(
      ADD_PARTNER_BANK_ACCOUNT_MUTATION,
      {
        input: {
          partnerId: data.contacto_id,
          bankId: bank.id,
          currency: data.moneda,
          accountNumber: cleanAccount
        }
      },
      { timeoutMs: 10000 }
    )

    if (data.is_pago_movil && data.telefono_pago_movil) {
      await executeGraphQL(
        ADD_PARTNER_MOBILE_PAYMENT_MUTATION,
        {
          input: {
            partnerId: data.contacto_id,
            bankId: bank.id,
            phone: data.telefono_pago_movil.replace(/[\s-]/g, ''),
            docId: data.identificacion_titular.trim()
          }
        },
        { timeoutMs: 8000 }
      )
    }

    return { ...mapPartnerAccount(response.addPartnerBankAccount), ...data }
  }

  public async updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
    if (data.is_predeterminada) {
      await this.setDefaultBankAccount(id, data.contacto_id, data.is_empresa)
    }

    const current = await this.getBankAccountById(id)

    if (!current) throw new Error('Cuenta bancaria no encontrada.')

    return { ...current, ...data, updated_at: new Date().toISOString() }
  }

  public async deleteBankAccount(id: string): Promise<void> {
    const companyAccounts = await this.getCompanyBankAccounts()
    const isCompany = companyAccounts.some(account => account.id === id)

    if (isCompany) {
      await executeGraphQL(REMOVE_COMPANY_BANK_ACCOUNT_MUTATION, { id }, { timeoutMs: 8000 })

      return
    }

    await executeGraphQL(REMOVE_PARTNER_BANK_ACCOUNT_MUTATION, { id }, { timeoutMs: 8000 })
  }

  public async setDefaultBankAccount(
    id: string,
    _contactoId?: string,
    isEmpresa = false
  ): Promise<void> {
    void _contactoId

    if (!isEmpresa) {
      throw new Error('El backend no expone cuenta bancaria predeterminada por tercero.')
    }

    await executeGraphQL(SET_DEFAULT_COMPANY_BANK_ACCOUNT_MUTATION, { id }, { timeoutMs: 8000 })
  }
}

export const bankAccountsService = new BankAccountsService()
