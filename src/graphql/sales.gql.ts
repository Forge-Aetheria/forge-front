// Definiciones GraphQL para el módulo de Ventas (Cotizaciones y Órdenes de Venta)

export const GET_SALES_QUOTES_QUERY = `
  query GetSalesQuotes($where: SalesQuoteWhereInput, $orderBy: [SalesQuoteOrderByWithRelationInput!], $take: Int, $skip: Int) {
    salesQuotes(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      number
      status
      customerId
      customer {
        id
        legalName
        tradeName
        docType
        docNumber
        checkDigit
        email
        phone
        fiscalAddress
      }
      locationId
      orderDiscount
      discountTotal
      subtotal
      total
      notes
      validUntil
      approvedOrderId
      approvedOrder {
        id
        number
        status
      }
      createdBy
      createdAt
      updatedAt
      lines {
        id
        lineNumber
        variantId
        variant {
          id
          sku
          template {
            id
            name
            uomCode
          }
        }
        quantity
        unitPrice
        itemDiscount
        lineTotal
        description
      }
    }
  }
`

export const GET_SALES_QUOTE_QUERY = `
  query GetSalesQuote($id: ID!) {
    salesQuote(id: $id) {
      id
      number
      status
      customerId
      customer {
        id
        legalName
        tradeName
        docType
        docNumber
        checkDigit
        email
        phone
        fiscalAddress
      }
      locationId
      location {
        id
        name
      }
      orderDiscount
      discountTotal
      subtotal
      total
      notes
      validUntil
      approvedOrderId
      approvedOrder {
        id
        number
        status
      }
      createdBy
      createdAt
      updatedAt
      lines {
        id
        lineNumber
        variantId
        variant {
          id
          sku
          template {
            id
            name
            uomCode
          }
        }
        quantity
        unitPrice
        itemDiscount
        lineTotal
        description
      }
    }
  }
`

export const CREATE_SALES_QUOTE_MUTATION = `
  mutation CreateSalesQuote($input: CreateSalesQuoteInput!) {
    createSalesQuote(input: $input) {
      id
      number
      status
      subtotal
      discountTotal
      total
      notes
      validUntil
      createdAt
    }
  }
`

export const UPDATE_SALES_QUOTE_MUTATION = `
  mutation UpdateSalesQuote($input: UpdateSalesQuoteInput!) {
    updateSalesQuote(input: $input) {
      id
      number
      status
      subtotal
      discountTotal
      total
      updatedAt
    }
  }
`

export const APPROVE_SALES_QUOTE_MUTATION = `
  mutation ApproveSalesQuote($input: ApproveSalesQuoteInput!) {
    approveSalesQuote(input: $input) {
      id
      number
      status
      total
      customerId
      createdAt
    }
  }
`

export const CANCEL_SALES_QUOTE_MUTATION = `
  mutation CancelSalesQuote($input: CancelSalesQuoteInput!) {
    cancelSalesQuote(input: $input) {
      id
      number
      status
      updatedAt
    }
  }
`

export const GET_ACTIVE_BCV_RATE_QUERY = `
  query GetActiveBcvRate {
    activeBcvRate {
      rate
      rateId
      source
      valueDate
      capturedAt
    }
  }
`

export const GET_VARIANTS_QUERY = `
  query GetVariants($take: Int, $skip: Int) {
    variants(take: $take, skip: $skip) {
      id
      sku
      barcode
      priceExtra
      standardCost
      isActive
      template {
        id
        name
        uomCode
        productType
        basePrice
        vatAliquot
      }
      quants {
        id
        quantity
        reservedQuantity
      }
    }
  }
`

