import { HttpResponse } from 'msw'
import { gql } from '../graphql'
import { testStore, MockProductTemplate, MockCategory } from '../store/testStore'

function mapTemplateToGql(t: MockProductTemplate) {
  return {
    id: t.id,
    name: t.name,
    uomCode: t.uomCode,
    productType: t.productType,
    basePrice: t.listPrice.toString(),
    vatAliquot: '16.00',
    withholdingIslr: '0.00',
    category: t.category
      ? {
          id: t.category.id,
          name: t.category.name,
          completeName: t.category.completeName || t.category.name
        }
      : null,
    attributes: [],
    variants: t.variants.map(v => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode || null,
      priceExtra: '0.00',
      standardCost: v.costPrice.toString(),
      isActive: v.isActive,
      values: [],
      quants: [
        {
          id: `quant-${v.id}`,
          quantity: v.physicalStock,
          reservedQuantity: v.reservedStock
        }
      ]
    }))
  }
}

export const inventoryHandlers = [
  gql.query('GetTemplates', () => {
    return HttpResponse.json({
      data: {
        templates: testStore.products.map(mapTemplateToGql)
      }
    })
  }),

  gql.query('GetTemplate', ({ variables }) => {
    const { id } = variables as { id: string }
    const template = testStore.products.find(p => p.id === id)
    if (!template) {
      return HttpResponse.json({
        data: { template: null }
      })
    }
    return HttpResponse.json({
      data: { template: mapTemplateToGql(template) }
    })
  }),

  gql.query('GetKardex', ({ variables }) => {
    const { variantId } = variables as { variantId: string }
    return HttpResponse.json({
      data: {
        kardex: [
          {
            id: `kardex-${variantId}-01`,
            date: new Date().toISOString(),
            moveType: 'INITIAL_STOCK',
            quantity: 100,
            referenceDoc: 'INV/SEED/001',
            sourceLocation: 'VIRTUAL/VENDOR',
            destLocation: 'WH/STOCK',
            runningBalance: 100,
            valuations: [
              {
                id: `val-${variantId}-01`,
                bcvRate: '54.50',
                unitCostUsd: '3.20',
                unitCostVes: '174.40',
                quantity: 100
              }
            ]
          }
        ]
      }
    })
  }),

  gql.mutation('CreateProductTemplate', ({ variables }) => {
    const { input } = variables as { input: any }
    const newId = `prod-${Date.now()}`
    const category = testStore.categories.find(c => c.id === input.categoryId) || testStore.categories[0]

    const newTemplate: MockProductTemplate = {
      id: newId,
      name: input.name,
      defaultCode: input.variants?.[0]?.sku || `SKU-${Date.now().toString().slice(-4)}`,
      description: input.notes || '',
      productType: input.productType || 'storable',
      uomCode: input.uomCode || 'UNI',
      listPrice: parseFloat(input.basePrice || '0'),
      standardCost: parseFloat(input.variants?.[0]?.standardCost || '0'),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category,
      variants: (input.variants || [{ sku: `SKU-${Date.now().toString().slice(-4)}` }]).map((v: any, idx: number) => ({
        id: `var-${newId}-${idx + 1}`,
        templateId: newId,
        sku: v.sku || `SKU-${Date.now().toString().slice(-4)}`,
        name: `${input.name} - Variante ${idx + 1}`,
        barcode: v.barcode,
        salePrice: parseFloat(input.basePrice || '0') + parseFloat(v.priceExtra || '0'),
        costPrice: parseFloat(v.standardCost || '0'),
        physicalStock: 0,
        reservedStock: 0,
        availableStock: 0,
        isActive: true
      }))
    }

    testStore.products.unshift(newTemplate)

    return HttpResponse.json({
      data: {
        createProductTemplate: mapTemplateToGql(newTemplate)
      }
    })
  }),

  gql.mutation('UpdateProductTemplate', ({ variables }) => {
    const { input } = variables as { input: any }
    const templateIndex = testStore.products.findIndex(p => p.id === input.id)
    if (templateIndex === -1) {
      return HttpResponse.json({
        errors: [{ message: 'Producto no encontrado' }]
      })
    }

    const current = testStore.products[templateIndex]
    if (input.name) current.name = input.name
    if (input.basePrice !== undefined) current.listPrice = parseFloat(input.basePrice)
    if (input.notes !== undefined) current.description = input.notes
    current.updatedAt = new Date().toISOString()

    return HttpResponse.json({
      data: {
        updateProductTemplate: mapTemplateToGql(current)
      }
    })
  }),

  gql.mutation('DeleteProductTemplate', ({ variables }) => {
    const { id } = variables as { id: string }
    testStore.products = testStore.products.filter(p => p.id !== id)
    return HttpResponse.json({
      data: { deleteProductTemplate: true }
    })
  }),

  gql.query('GetCategories', () => {
    return HttpResponse.json({
      data: {
        categories: testStore.categories.map(c => ({
          id: c.id,
          name: c.name,
          completeName: c.completeName || c.name,
          code: c.code || '',
          description: c.description || '',
          isActive: c.isActive,
          revenueAccount: null,
          expenseAccount: null,
          inventoryAccount: null,
          landedCostAccount: null
        }))
      }
    })
  }),

  gql.mutation('CreateProductCategory', ({ variables }) => {
    const { input } = variables as { input: any }
    const newCategory: MockCategory = {
      id: `cat-${Date.now()}`,
      name: input.name,
      code: input.code,
      completeName: input.name,
      isActive: true,
      description: input.description
    }
    testStore.categories.push(newCategory)
    return HttpResponse.json({
      data: {
        createProductCategory: {
          id: newCategory.id,
          name: newCategory.name,
          completeName: newCategory.name,
          code: newCategory.code,
          description: newCategory.description,
          isActive: true
        }
      }
    })
  }),

  gql.query('GetUnitsOfMeasure', () => {
    return HttpResponse.json({
      data: {
        unitsOfMeasure: testStore.unitsOfMeasure.map(u => ({
          code: u.code,
          name: u.name,
          active: u.active
        }))
      }
    })
  }),

  gql.mutation('SeedUnitsOfMeasure', () => {
    return HttpResponse.json({
      data: {
        seedDefaultUnitsOfMeasure: testStore.unitsOfMeasure
      }
    })
  }),

  gql.query('GetWarehouses', () => {
    return HttpResponse.json({
      data: {
        warehouses: testStore.warehouses.map(w => ({
          id: w.id,
          name: w.name,
          code: w.code,
          isActive: w.isActive,
          locations: w.locations
        }))
      }
    })
  }),

  gql.query('GetStockLocations', () => {
    const allLocations = testStore.warehouses.flatMap(w => w.locations)
    return HttpResponse.json({
      data: {
        stockLocations: allLocations.map(l => ({
          id: l.id,
          name: l.name,
          completePath: `${l.code} / ${l.name}`,
          locationType: 'INTERNAL',
          warehouseId: l.warehouseId,
          isFrozen: false
        }))
      }
    })
  }),

  gql.query('GetVariantAvailability', ({ variables }) => {
    const { variantId } = variables as { variantId: string }
    const variant = testStore.products.flatMap(p => p.variants).find(v => v.id === variantId)
    return HttpResponse.json({
      data: {
        inventoryVariantAvailability: {
          variantId,
          physicalStock: variant ? variant.physicalStock : 50,
          reservedStock: variant ? variant.reservedStock : 5,
          incomingStock: 20,
          availableStock: variant ? variant.availableStock : 45,
          quants: []
        }
      }
    })
  })
]
