import { HttpResponse } from 'msw'
import { gql } from '../graphql'
import { testStore, MockPartner } from '../store/testStore'

function mapPartnerToGql(p: MockPartner) {
  const [docType, ...docParts] = p.identification.split('-')
  const docNumber = docParts.slice(0, -1).join('') || p.identification
  const checkDigit = docParts.length > 1 ? docParts[docParts.length - 1] : '0'

  return {
    id: p.id,
    legalName: p.name,
    tradeName: p.commercialName || p.name,
    docType: docType || 'J',
    docNumber,
    checkDigit,
    email: p.email || 'contacto@test.com',
    phone: p.phone || '+58 212 0000000',
    fiscalAddress: p.address || 'Caracas, Venezuela',
    status: p.status,
    isCustomer: p.isCustomer,
    isSupplier: p.isSupplier,
    customerProfile: {
      paymentCondition: 'INMEDIATO',
      creditLimit: '0.00',
      creditDays: 0,
      currency: 'USD'
    },
    contacts: [],
    bankAccounts: p.bankAccounts || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export const contactsHandlers = [
  gql.query('GetPartners', () => {
    return HttpResponse.json({
      data: {
        partners: testStore.partners.map(mapPartnerToGql)
      }
    })
  }),

  gql.query('GetPartner', ({ variables }) => {
    const { id } = variables as { id: string }
    const partner = testStore.partners.find(p => p.id === id)
    if (!partner) {
      return HttpResponse.json({
        data: { partner: null }
      })
    }
    return HttpResponse.json({
      data: { partner: mapPartnerToGql(partner) }
    })
  }),

  gql.mutation('CreatePartner', ({ variables }) => {
    const { input } = variables as { input: any }
    const newId = `part-${Date.now()}`
    const identification = input.docNumber
      ? `${input.docType || 'J'}-${input.docNumber}-${input.checkDigit || '0'}`
      : `J-${Date.now().toString().slice(-8)}-0`

    const newPartner: MockPartner = {
      id: newId,
      type: input.type || 'COMPANY',
      name: input.legalName || input.name || 'Nuevo Contacto',
      commercialName: input.tradeName || input.commercialName,
      identification,
      email: input.email,
      phone: input.phone,
      address: input.fiscalAddress,
      isCustomer: Boolean(input.isCustomer),
      isSupplier: Boolean(input.isSupplier),
      isActive: true,
      status: 'ACTIVE',
      bankAccounts: []
    }

    testStore.partners.unshift(newPartner)

    return HttpResponse.json({
      data: {
        createPartner: mapPartnerToGql(newPartner)
      }
    })
  }),

  gql.mutation('UpdatePartner', ({ variables }) => {
    const { input } = variables as { input: any }
    const partnerIndex = testStore.partners.findIndex(p => p.id === input.id)
    if (partnerIndex === -1) {
      return HttpResponse.json({
        errors: [{ message: 'Contacto no encontrado' }]
      })
    }

    const current = testStore.partners[partnerIndex]
    if (input.legalName) current.name = input.legalName
    if (input.tradeName) current.commercialName = input.tradeName
    if (input.email !== undefined) current.email = input.email
    if (input.phone !== undefined) current.phone = input.phone

    return HttpResponse.json({
      data: {
        updatePartner: mapPartnerToGql(current)
      }
    })
  }),

  gql.mutation('RemovePartner', ({ variables }) => {
    const { id } = variables as { id: string }
    testStore.partners = testStore.partners.filter(p => p.id !== id)
    return HttpResponse.json({
      data: {
        removePartner: { id, deletedAt: new Date().toISOString() }
      }
    })
  }),

  gql.query('GetBanks', () => {
    return HttpResponse.json({
      data: {
        banks: [
          { id: 'bank-01', code: '0134', name: 'Banesco Banco Universal' },
          { id: 'bank-02', code: '0105', name: 'Banco Mercantil' },
          { id: 'bank-03', code: '0102', name: 'Banco de Venezuela' }
        ]
      }
    })
  }),

  gql.query('GetCompanyBankAccounts', () => {
    return HttpResponse.json({
      data: {
        companyBankAccounts: testStore.companyBankAccounts
      }
    })
  }),

  gql.mutation('CreateCompanyBankAccount', ({ variables }) => {
    const { input } = variables as { input: any }
    const newAccount = {
      id: `cba-${Date.now()}`,
      accountNumber: input.accountNumber,
      currency: input.currency || 'USD',
      isDefault: Boolean(input.isDefault),
      bank: { id: 'bank-01', code: '0134', name: 'Banesco Banco Universal' }
    }
    testStore.companyBankAccounts.push(newAccount)
    return HttpResponse.json({
      data: {
        createCompanyBankAccount: newAccount
      }
    })
  }),

  gql.mutation('AddPartnerBankAccount', ({ variables }) => {
    const { input } = variables as { input: any }
    const partner = testStore.partners.find(p => p.id === input.partnerId)
    const newAccount = {
      id: `pba-${Date.now()}`,
      accountNumber: input.accountNumber,
      currency: input.currency || 'USD',
      bank: { id: 'bank-01', code: '0134', name: 'Banesco Banco Universal' }
    }
    if (partner) {
      partner.bankAccounts = partner.bankAccounts || []
      partner.bankAccounts.push(newAccount)
    }
    return HttpResponse.json({
      data: {
        addPartnerBankAccount: newAccount
      }
    })
  })
]
