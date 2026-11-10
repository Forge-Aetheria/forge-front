// Definiciones GraphQL para el módulo de Compras y Aprovisionamiento (PR #28 / BE-PUR-01)

export const GET_PURCHASE_QUOTES_QUERY = `
  query GetPurchaseQuotes($where: PurchaseQuoteWhereInput, $orderBy: [PurchaseQuoteOrderByWithRelationInput!], $take: Int, $skip: Int) {
    purchaseQuotes(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      code
      state
      supplierId
      supplierReference
      paymentCondition
      creditDays
      baseCurrency
      exchangeRate
      validUntil
      estimatedDelivery
      appliesVat
      appliesIgtf
      notes
      subtotalAmount
      vatAmount
      igtfAmount
      totalAmount
      supplier {
        id
        legalName
        tradeName
        docType
        docNumber
        checkDigit
        email
        phone
      }
      lines {
        id
        variantId
        name
        uom
        quantity
        unitCost
        discountPercent
        netAmount
        vatRate
        vatAmount
        totalAmount
        variant {
          id
          sku
          template {
            id
            name
            uomCode
          }
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_PURCHASE_QUOTE_QUERY = `
  query GetPurchaseQuote($id: ID!) {
    purchaseQuote(id: $id) {
      id
      code
      state
      supplierId
      supplierReference
      paymentCondition
      creditDays
      baseCurrency
      exchangeRate
      validUntil
      estimatedDelivery
      appliesVat
      appliesIgtf
      notes
      subtotalAmount
      vatAmount
      igtfAmount
      totalAmount
      rate {
        rateId
        rate
        valueDate
        source
        capturedAt
      }
      supplier {
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
      lines {
        id
        variantId
        name
        uom
        quantity
        unitCost
        discountPercent
        netAmount
        vatRate
        vatAmount
        totalAmount
        variant {
          id
          sku
          template {
            id
            name
            uomCode
          }
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const CREATE_PURCHASE_QUOTE_MUTATION = `
  mutation CreatePurchaseQuote($input: CreatePurchaseQuoteInput!) {
    createPurchaseQuote(input: $input) {
      id
      code
      state
      supplierId
      baseCurrency
      totalAmount
      createdAt
    }
  }
`

export const REGISTER_PURCHASE_QUOTE_MUTATION = `
  mutation RegisterPurchaseQuote($input: RegisterPurchaseQuoteInput!) {
    registerPurchaseQuote(input: $input) {
      id
      code
      state
      updatedAt
    }
  }
`

export const APPROVE_PURCHASE_QUOTE_MUTATION = `
  mutation ApprovePurchaseQuote($input: ApprovePurchaseQuoteInput!) {
    approvePurchaseQuote(input: $input) {
      id
      code
      state
      exchangeRate
      totalAmount
      updatedAt
    }
  }
`

export const CONVERT_PURCHASE_QUOTE_TO_ORDER_MUTATION = `
  mutation ConvertQuoteToPurchaseOrder($input: ConvertQuoteInput!) {
    convertQuoteToPurchaseOrder(input: $input) {
      id
      code
      state
      quoteId
      totalAmount
      createdAt
    }
  }
`

export const CANCEL_PURCHASE_QUOTE_MUTATION = `
  mutation CancelPurchaseQuote($input: CancelPurchaseQuoteInput!) {
    cancelPurchaseQuote(input: $input) {
      id
      code
      state
      updatedAt
    }
  }
`

export const RECALCULATE_PURCHASE_QUOTE_BCV_MUTATION = `
  mutation RecalculatePurchaseQuoteBcv($input: RecalculatePurchaseQuoteInput!) {
    recalculatePurchaseQuoteBcv(input: $input) {
      id
      code
      exchangeRate
      totalAmount
      updatedAt
    }
  }
`

export const GET_PURCHASE_ORDERS_QUERY = `
  query GetPurchaseOrders($where: PurchaseOrderWhereInput, $orderBy: [PurchaseOrderOrderByWithRelationInput!], $take: Int, $skip: Int) {
    purchaseOrders(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      code
      state
      quoteId
      supplierId
      totalAmount
      supplier {
        id
        legalName
        tradeName
        docNumber
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_PURCHASE_ORDER_QUERY = `
  query GetPurchaseOrder($id: ID!) {
    purchaseOrder(id: $id) {
      id
      code
      state
      quoteId
      supplierId
      totalAmount
      createdAt
      updatedAt
    }
  }
`

export const CREATE_PURCHASE_RECEPTION_MUTATION = `
  mutation CreatePurchaseReception($input: CreatePurchaseReceptionInput!) {
    createPurchaseReception(input: $input) {
      id
      code
      orderId
      receivedAt
      lines {
        id
        variantId
        quantityReceived
      }
    }
  }
`

export const GET_PURCHASE_RECEPTIONS_QUERY = `
  query GetPurchaseReceptions($orderId: ID!) {
    purchaseReceptions(orderId: $orderId) {
      id
      code
      orderId
      receivedAt
      lines {
        id
        variantId
        quantityReceived
      }
    }
  }
`

export const GET_PURCHASE_KPIS_QUERY = `
  query GetPurchaseKpis($filter: PurchaseKpiFilter) {
    purchaseKpis(filter: $filter) {
      totalQuotes
      totalOrders
      activeRfqs
      pendingApproval
      pendingReception
      spendUsd
      spendVes
    }
  }
`
