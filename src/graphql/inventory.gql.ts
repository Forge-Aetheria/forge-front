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
    }
  }
`

export const CONFIRM_STOCK_MOVE_MUTATION = `
  mutation ConfirmStockMove($moveId: ID!, $input: ConfirmStockMoveInput!) {
    confirmStockMove(moveId: $moveId, input: $input) {
      id
      state
      valuations {
        id
        bcvRate
        unitCostUsd
        unitCostVes
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

