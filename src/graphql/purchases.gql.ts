// Definiciones GraphQL para el módulo de Compras y Aprovisionamiento (PR #28 / BE-PUR-01)

export const GET_PURCHASE_QUOTES_QUERY = `
  query GetPurchaseQuotes($where: PurchaseQuoteWhereInput, $orderBy: [PurchaseQuoteOrderByWithRelationInput!], $take: Int, $skip: Int) {
    purchaseQuotes(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      code
      status
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
      subtotal
      vatCredit
      igtfAmount
      totalUsd
      lines {
        id
        productId
        name
        sku
        uom
        quantity
        unitCost
        discountPercent
        netSubtotal
        vatRate
        vatAmount
        lineTotal
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
      status
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
      subtotal
      vatCredit
      igtfAmount
      totalUsd
      rate {
        rateId
        rate
        valueDate
        source
        capturedAt
      }
      lines {
        id
        productId
        name
        sku
        uom
        quantity
        unitCost
        discountPercent
        netSubtotal
        vatRate
        vatAmount
        lineTotal
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
      status
      supplierId
      baseCurrency
      totalUsd
      createdAt
    }
  }
`

export const REGISTER_PURCHASE_QUOTE_MUTATION = `
  mutation RegisterPurchaseQuote($input: RegisterPurchaseQuoteInput!) {
    registerPurchaseQuote(input: $input) {
      id
      code
      status
      updatedAt
    }
  }
`

export const APPROVE_PURCHASE_QUOTE_MUTATION = `
  mutation ApprovePurchaseQuote($input: ApprovePurchaseQuoteInput!) {
    approvePurchaseQuote(input: $input) {
      id
      code
      status
      exchangeRate
      totalUsd
      updatedAt
    }
  }
`

export const CONVERT_PURCHASE_QUOTE_TO_ORDER_MUTATION = `
  mutation ConvertQuoteToPurchaseOrder($input: ConvertQuoteInput!) {
    convertQuoteToPurchaseOrder(input: $input) {
      id
      code
      status
      quoteId
      totalUsd
      createdAt
    }
  }
`

export const CANCEL_PURCHASE_QUOTE_MUTATION = `
  mutation CancelPurchaseQuote($input: CancelPurchaseQuoteInput!) {
    cancelPurchaseQuote(input: $input) {
      id
      code
      status
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
      totalUsd
      updatedAt
    }
  }
`

export const GET_PURCHASE_ORDERS_QUERY = `
  query GetPurchaseOrders($where: PurchaseOrderWhereInput, $orderBy: [PurchaseOrderOrderByWithRelationInput!], $take: Int, $skip: Int) {
    purchaseOrders(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      code
      status
      quoteId
      supplierId
      totalUsd
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
      status
      quoteId
      supplierId
      totalUsd
      lines {
        id
        lineNumber
        productId
        orderedQty
        receivedQty
        unitCost
        isPhysicalStock
      }
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
        productId
        orderLineId
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
        productId
        orderLineId
        quantityReceived
      }
    }
  }
`

export const GET_PURCHASE_KPIS_QUERY = `
  query GetPurchaseKpis($filter: PurchaseKpiFilter) {
    purchaseKpis(filter: $filter) {
      approvedCount
      purchaseOrderCount
      rfqSentCount
      committedTotalUsd
      committedTotalVes
      scope
    }
  }
`
