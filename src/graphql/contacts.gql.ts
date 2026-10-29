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

