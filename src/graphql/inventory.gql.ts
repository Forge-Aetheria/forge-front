// Definiciones GraphQL para el Módulo de Inventario (Templates, Variantes, Kardex y StockQuants)

export const GET_TEMPLATES_QUERY = `
  query GetTemplates($filter: TemplateFilter, $page: Int, $perPage: Int) {
    templates(filter: $filter, page: $page, perPage: $perPage) {
      nodes {
        id
        name
        uomCode
        productType
        basePrice
        vatAliquot
        withholdingIslr
        category {
          id
          name
          completeName
        }
        attributes {
          id
          attribute {
            id
            name
            displayType
          }
        }
        variants {
          id
          sku
          barcode
          priceExtra
          standardCost
          isActive
          values {
            attributeValue {
              id
              name
              htmlColor
              attribute {
                name
              }
            }
          }
          quants {
            id
            quantity
            reservedQuantity
          }
        }
      }
      pageInfo {
        totalCount
        page
        perPage
        hasNextPage
      }
    }
  }
`

export const GET_TEMPLATE_BY_ID_QUERY = `
  query GetTemplate($id: ID!) {
    template(id: $id) {
      id
      name
      uomCode
      productType
      basePrice
      vatAliquot
      withholdingIslr
      category {
        id
        name
        completeName
      }
      attributes {
        id
        attribute {
          id
          name
          displayType
          values {
            id
            name
            htmlColor
          }
        }
      }
      variants {
        id
        sku
        barcode
        priceExtra
        standardCost
        isActive
        values {
          attributeValue {
            id
            name
            htmlColor
            attribute {
              name
            }
          }
        }
        quants {
          id
          quantity
          reservedQuantity
        }
      }
    }
  }
`

export const GET_KARDEX_QUERY = `
  query GetKardex($variantId: ID!, $state: MoveState, $page: Int, $perPage: Int) {
    kardex(variantId: $variantId, state: $state, page: $page, perPage: $perPage) {
      nodes {
        id
        moveType
        state
        quantity
        referenceDoc
        createdAt
        locationSrc {
          id
          completePath
        }
        locationDst {
          id
          completePath
        }
        valuations {
          id
          bcvRate
          unitCostUsd
          unitCostVes
          quantity
        }
      }
      pageInfo {
        totalCount
        page
        perPage
        hasNextPage
      }
    }
  }
`

export const CREATE_STOCK_MOVE_MUTATION = `
  mutation CreateStockMove($input: CreateStockMoveInput!) {
    createStockMove(input: $input) {
      id
      moveType
      state
      quantity
      referenceDoc
      locationSrcId
      locationDstId
      createdAt
    }
  }
`

export const CONFIRM_STOCK_MOVE_MUTATION = `
  mutation ConfirmStockMove($moveId: ID!, $input: ConfirmStockMoveInput!) {
    confirmStockMove(moveId: $moveId, input: $input) {
      id
      state
      moveType
      quantity
      referenceDoc
      valuations {
        id
        bcvRate
        unitCostUsd
        unitCostVes
        quantity
      }
    }
  }
`

export const GET_STOCK_LOCATIONS_QUERY = `
  query GetStockLocations($take: Int, $skip: Int) {
    stockLocations(take: $take, skip: $skip) {
      id
      name
      completePath
      usage
      warehouseId
      isFrozen
    }
  }
`

export const GET_STOCK_QUANTS_QUERY = `
  query GetStockQuants($take: Int, $skip: Int) {
    stockQuants(take: $take, skip: $skip) {
      id
      variantId
      locationId
      quantity
      reservedQuantity
      location {
        id
        name
        completePath
      }
    }
  }
`

export const GET_VARIANT_AVAILABILITY_QUERY = `
  query GetVariantAvailability($variantId: ID!) {
    inventoryVariantAvailability(variantId: $variantId) {
      variantId
      physicalStock
      reservedStock
      incomingStock
      availableStock
      quants {
        id
        locationId
        quantity
        reservedQuantity
      }
    }
  }
`
export const GET_CATEGORIES_QUERY = `
  query GetCategories($take: Int, $skip: Int) {
    categories(take: $take, skip: $skip) {
      id
      name
      completeName
      code
      description
      isActive
      revenueAccount { id code name }
      expenseAccount { id code name }
      inventoryAccount { id code name }
      landedCostAccount { id code name }
    }
  }
`

export const CREATE_PRODUCT_TEMPLATE_MUTATION = `
  mutation CreateProductTemplate($input: CreateProductTemplateInput!) {
    createProductTemplate(input: $input) {
      id
      name
      categoryId
      category {
        id
        name
        completeName
      }
      basePrice
      uomCode
      productType
      vatAliquot
      withholdingIslr
      targetMargin
      notes
      imageUrl
      canBeSold
      canBePurchased
      weight
      volume
      deliveryPolicy
      invoicingPolicy
      purchaseControlPolicy
      isLandedCost
      defaultSplitMethod
      variants {
        id
        sku
        barcode
        priceExtra
        standardCost
        isActive
        values {
          id
          attributeValue {
            id
            name
            htmlColor
            attribute {
              id
              name
            }
          }
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_PRODUCT_TEMPLATE_MUTATION = `
  mutation UpdateProductTemplate($id: ID!, $input: UpdateProductTemplateInput!) {
    updateProductTemplate(id: $id, input: $input) {
      id
      name
      categoryId
      category {
        id
        name
        completeName
      }
      basePrice
      uomCode
      productType
      vatAliquot
      withholdingIslr
      targetMargin
      notes
      imageUrl
      canBeSold
      canBePurchased
      weight
      volume
      deliveryPolicy
      invoicingPolicy
      purchaseControlPolicy
      isLandedCost
      defaultSplitMethod
      variants {
        id
        sku
        barcode
        priceExtra
        standardCost
        isActive
      }
      updatedAt
    }
  }
`

export const DELETE_PRODUCT_TEMPLATE_MUTATION = `
  mutation DeleteProductTemplate($id: ID!) {
    deleteProductTemplate(id: $id)
  }
`

export const GET_INVENTORY_ADJUSTMENTS_QUERY = `
  query GetInventoryAdjustments($where: InventoryAuditWhereInput, $take: Int, $skip: Int) {
    inventoryAdjustments(where: $where, take: $take, skip: $skip) {
      id
      auditNumber
      adjustmentState
      locationId
      reason
      auditType
      createdAt
      lines {
        id
        variantId
        theoreticalQuantity
        countedQuantity
        difference
      }
    }
  }
`

export const CREATE_INVENTORY_ADJUSTMENT_MUTATION = `
  mutation CreateInventoryAdjustment($input: CreateInventoryAdjustmentInput!) {
    createInventoryAdjustment(input: $input) {
      id
      auditNumber
      adjustmentState
      createdAt
    }
  }
`

export const APPLY_INVENTORY_ADJUSTMENT_MUTATION = `
  mutation ApplyInventoryAdjustment($id: ID!, $idempotencyKey: String!) {
    applyInventoryAdjustment(id: $id, idempotencyKey: $idempotencyKey) {
      id
      auditNumber
      adjustmentState
    }
  }
`

export const GET_LANDED_COSTS_QUERY = `
  query GetLandedCosts($where: LandedCostWhereInput, $take: Int, $skip: Int) {
    landedCosts(where: $where, take: $take, skip: $skip) {
      id
      code
      state
      date
      reference
      notes
      totalAmountUsd
      createdAt
      updatedAt
      costs {
        id
        description
        splitMethod
        amountUsd
      }
    }
  }
`

export const GET_LANDED_COST_QUERY = `
  query GetLandedCost($id: ID!) {
    landedCost(id: $id) {
      id
      code
      state
      date
      reference
      notes
      totalAmountUsd
      createdAt
      updatedAt
      costs {
        id
        description
        splitMethod
        amountUsd
      }
    }
  }
`

export const CREATE_LANDED_COST_MUTATION = `
  mutation CreateLandedCost($input: CreateLandedCostInput!) {
    createLandedCost(input: $input) {
      id
      code
      state
      totalAmountUsd
      createdAt
    }
  }
`

export const UPDATE_LANDED_COST_MUTATION = `
  mutation UpdateLandedCost($id: ID!, $input: UpdateLandedCostInput!) {
    updateLandedCost(id: $id, input: $input) {
      id
      code
      state
      updatedAt
    }
  }
`

export const VALIDATE_LANDED_COST_MUTATION = `
  mutation ValidateLandedCost($id: ID!, $idempotencyKey: String!) {
    validateLandedCost(id: $id, idempotencyKey: $idempotencyKey) {
      id
      code
      state
      updatedAt
    }
  }
`

export const CANCEL_LANDED_COST_MUTATION = `
  mutation CancelLandedCost($id: ID!, $reason: String!) {
    cancelLandedCost(id: $id, reason: $reason) {
      id
      state
    }
  }
`

export const GET_WAREHOUSES_QUERY = `
  query GetWarehouses($where: WarehouseWhereInput, $take: Int, $skip: Int) {
    warehouses(where: $where, take: $take, skip: $skip) {
      id
      code
      name
      address
      manager
      isDefault
      isActive
      createdAt
      updatedAt
      locations {
        id
        code
        name
        completePath
        warehouseId
        isActive
      }
    }
  }
`

export const CREATE_WAREHOUSE_MUTATION = `
  mutation CreateWarehouse($input: CreateWarehouseInput!) {
    createWarehouse(input: $input) {
      id
      code
      name
      address
      manager
      isDefault
      isActive
    }
  }
`

export const UPDATE_WAREHOUSE_MUTATION = `
  mutation UpdateWarehouse($id: ID!, $input: UpdateWarehouseInput!) {
    updateWarehouse(id: $id, input: $input) {
      id
      code
      name
      address
      manager
      isDefault
      isActive
    }
  }
`

export const CREATE_STOCK_LOCATION_MUTATION = `
  mutation CreateStockLocation($input: CreateStockLocationInput!) {
    createStockLocation(input: $input) {
      id
      name
      code
      completePath
      warehouseId
      parentId
      isFrozen
      isActive
    }
  }
`

export const UPDATE_STOCK_LOCATION_MUTATION = `
  mutation UpdateStockLocation($id: ID!, $input: UpdateStockLocationInput!) {
    updateStockLocation(id: $id, input: $input) {
      id
      name
      code
      completePath
      parentId
      isFrozen
      isActive
    }
  }
`




export const GET_UNITS_OF_MEASURE_QUERY = `
  query GetUnitsOfMeasure {
    unitsOfMeasure {
      id
      code
      name
      isActive
    }
  }
`

export const SEED_UNITS_OF_MEASURE_MUTATION = `
  mutation SeedUnitsOfMeasure {
    seedDefaultUnitsOfMeasure {
      id
      code
      name
      isActive
    }
  }
`

export const CREATE_PRODUCT_CATEGORY_MUTATION = `
  mutation CreateProductCategory($input: CreateProductCategoryInput!) {
    createProductCategory(input: $input) {
      id
      code
      name
      description
      isActive
      revenueAccount { id code name }
      expenseAccount { id code name }
      inventoryAccount { id code name }
      landedCostAccount { id code name }
    }
  }
`

export const UPDATE_PRODUCT_CATEGORY_MUTATION = `
  mutation UpdateProductCategory($id: ID!, $input: UpdateProductCategoryInput!) {
    updateProductCategory(id: $id, input: $input) {
      id
      code
      name
      description
      isActive
      revenueAccount { id code name }
      expenseAccount { id code name }
      inventoryAccount { id code name }
      landedCostAccount { id code name }
    }
  }
`

export const DELETE_PRODUCT_CATEGORY_MUTATION = `
  mutation DeleteProductCategory($id: ID!) {
    deleteProductCategory(id: $id)
  }
`


export const DELETE_WAREHOUSE_MUTATION = `
  mutation DeleteWarehouse($id: ID!) {
    deleteWarehouse(id: $id)
  }
`

export const DELETE_STOCK_LOCATION_MUTATION = `
  mutation DeleteStockLocation($id: ID!) {
    deleteStockLocation(id: $id)
  }
`

export const GET_WAREHOUSE_OPERATIONS_QUERY = `
  query GetWarehouseOperations($where: WarehouseOperationWhereInput, $take: Int, $skip: Int) {
    warehouseOperations(where: $where, take: $take, skip: $skip, orderBy: [{ createdAt: desc }]) {
      id
      code
      type
      status
      thirdPartyName
      sourceDocument
      sourceWarehouseId
      targetWarehouseId
      scheduledAt
      effectiveAt
      totalItems
      responsible
      notes
      createdAt
      lines {
        id
        lineNumber
        variantId
        productName
        sku
        uomCode
        demandQty
        processedQty
        unitCostUsd
      }
    }
  }
`

export const GET_WAREHOUSE_OPERATION_QUERY = `
  query GetWarehouseOperation($id: ID!) {
    warehouseOperation(id: $id) {
      id
      code
      type
      status
      thirdPartyName
      sourceDocument
      sourceWarehouseId
      targetWarehouseId
      scheduledAt
      effectiveAt
      totalItems
      responsible
      notes
      createdAt
      lines {
        id
        lineNumber
        variantId
        productName
        sku
        uomCode
        demandQty
        processedQty
        unitCostUsd
      }
    }
  }
`

export const CREATE_WAREHOUSE_OPERATION_MUTATION = `
  mutation CreateWarehouseOperation($input: CreateWarehouseOperationInput!) {
    createWarehouseOperation(input: $input) {
      id
      code
      type
      status
      thirdPartyName
      sourceDocument
      sourceWarehouseId
      targetWarehouseId
      scheduledAt
      effectiveAt
      totalItems
      responsible
      notes
      createdAt
      lines {
        id
        lineNumber
        variantId
        productName
        sku
        uomCode
        demandQty
        processedQty
        unitCostUsd
      }
    }
  }
`

export const VALIDATE_WAREHOUSE_OPERATION_MUTATION = `
  mutation ValidateWarehouseOperation($input: ValidateWarehouseOperationInput!) {
    validateWarehouseOperation(input: $input) {
      id
      code
      type
      status
      totalItems
      effectiveAt
      lines {
        id
        lineNumber
        variantId
        productName
        sku
        uomCode
        demandQty
        processedQty
        unitCostUsd
      }
    }
  }
`

export const CANCEL_WAREHOUSE_OPERATION_MUTATION = `
  mutation CancelWarehouseOperation($input: CancelWarehouseOperationInput!) {
    cancelWarehouseOperation(input: $input) {
      id
      code
      status
      cancellationReason
    }
  }
`
