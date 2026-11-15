// Definiciones GraphQL para el módulo de Contactos (Directorio de Terceros y Clientes)

export const GET_PARTNERS_QUERY = `
  query GetPartners($where: PartnerWhereInput, $orderBy: [PartnerOrderByWithRelationInput!], $take: Int, $skip: Int) {
    partners(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      legalName
      tradeName
      docType
      docNumber
      checkDigit
      email
      phone
      fiscalAddress
      status
      isCustomer
      isSupplier
      customerProfile {
        paymentCondition
        creditLimit
        creditDays
        currency
      }
      contacts {
        id
        name
        email
        phone
        position
        isPrimary
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_PARTNER_QUERY = `
  query GetPartner($id: ID!) {
    partner(id: $id) {
      id
      legalName
      tradeName
      docType
      docNumber
      checkDigit
      email
      phone
      fiscalAddress
      status
      isCustomer
      isSupplier
      customerProfile {
        paymentCondition
        creditLimit
        creditDays
        currency
      }
      contacts {
        id
        name
        email
        phone
        position
        isPrimary
      }
      bankAccounts {
        id
        accountNumber
        bank {
          id
          name
          code
        }
      }
    }
  }
`

export const CREATE_PARTNER_MUTATION = `
  mutation CreatePartner($input: CreatePartnerInput!) {
    createPartner(input: $input) {
      id
      legalName
      tradeName
      docType
      docNumber
      checkDigit
      email
      phone
      fiscalAddress
      status
      isCustomer
      isSupplier
      createdAt
      updatedAt
    }
  }
`

export const REMOVE_PARTNER_MUTATION = `
  mutation RemovePartner($id: ID!) {
    removePartner(id: $id) {
      id
      deletedAt
    }
  }
`

export const UPDATE_PARTNER_MUTATION = `
  mutation UpdatePartner($id: ID!, $input: UpdatePartnerInput!) {
    updatePartner(id: $id, input: $input) {
      id
      legalName
      tradeName
      docType
      docNumber
      checkDigit
      email
      phone
      fiscalAddress
      status
      isCustomer
      isSupplier
      updatedAt
    }
  }
`

export const GET_BANKS_QUERY = `
  query GetBanks($where: BankWhereInput, $take: Int, $skip: Int) {
    banks(where: $where, take: $take, skip: $skip) {
      id
      name
      code
      rif
      active
    }
  }
`

export const ADD_PARTNER_BANK_ACCOUNT_MUTATION = `
  mutation AddPartnerBankAccount($input: PartnerBankAccountInput!) {
    addPartnerBankAccount(input: $input) {
      id
      accountNumber
      currency
      bank {
        id
        name
        code
      }
      createdAt
    }
  }
`

export const REMOVE_PARTNER_BANK_ACCOUNT_MUTATION = `
  mutation RemovePartnerBankAccount($id: ID!) {
    removePartnerBankAccount(id: $id) {
      id
    }
  }
`

export const ADD_PARTNER_MOBILE_PAYMENT_MUTATION = `
  mutation AddPartnerMobilePayment($input: PartnerMobilePaymentInput!) {
    addPartnerMobilePayment(input: $input) {
      id
      phone
      docId
      bank {
        id
        name
        code
      }
      createdAt
    }
  }
`

export const REMOVE_PARTNER_MOBILE_PAYMENT_MUTATION = `
  mutation RemovePartnerMobilePayment($id: ID!) {
    removePartnerMobilePayment(id: $id) {
      id
    }
  }
`




export const GET_COMPANY_BANK_ACCOUNTS_QUERY = `
  query GetCompanyBankAccounts {
    companyBankAccounts {
      id
      accountNumber
      currency
      label
      isDefault
      createdAt
      updatedAt
      bank { id name code }
    }
  }
`

export const CREATE_COMPANY_BANK_ACCOUNT_MUTATION = `
  mutation CreateCompanyBankAccount($input: CreateCompanyBankAccountInput!) {
    createCompanyBankAccount(input: $input) {
      id
      accountNumber
      currency
      label
      isDefault
      createdAt
      updatedAt
      bank { id name code }
    }
  }
`

export const REMOVE_COMPANY_BANK_ACCOUNT_MUTATION = `
  mutation RemoveCompanyBankAccount($id: ID!) {
    removeCompanyBankAccount(id: $id) {
      id
    }
  }
`

export const SET_DEFAULT_COMPANY_BANK_ACCOUNT_MUTATION = `
  mutation SetDefaultCompanyBankAccount($id: ID!) {
    setDefaultCompanyBankAccount(id: $id) {
      id
      isDefault
    }
  }
`
