import type { ProductType } from '@/types/inventoryTypes'

export interface ProductTemplateSearchParams {
  search?: string
  productType?: ProductType | 'ALL'
  category?: string
}

const PRODUCT_TYPE_MAP: Record<ProductType, 'STORABLE' | 'CONSUMABLE' | 'SERVICE'> = {
  storable: 'STORABLE',
  consumable: 'CONSUMABLE',
  service: 'SERVICE'
}

/**
 * Maps frontend catalog filters into a Prisma `ProductTemplateWhereInput` object
 * compatible with `CatalogResolver.templates` and `inventoryTemplateCount`.
 */
export const buildProductTemplateWhereInput = (
  params: ProductTemplateSearchParams
): Record<string, unknown> | undefined => {
  const conditions: Array<Record<string, unknown>> = []
  const query = params.search?.trim()

  if (query) {
    conditions.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        {
          variants: {
            some: {
              OR: [
                { sku: { contains: query, mode: 'insensitive' } },
                { barcode: { contains: query, mode: 'insensitive' } }
              ]
            }
          }
        }
      ]
    })
  }

  if (params.productType && params.productType !== 'ALL') {
    conditions.push({
      productType: { equals: PRODUCT_TYPE_MAP[params.productType] }
    })
  }

  if (params.category && params.category !== 'ALL') {
    conditions.push({
      category: { is: { name: { equals: params.category } } }
    })
  }

  if (conditions.length === 0) return undefined
  if (conditions.length === 1) return conditions[0]

  return { AND: conditions }
}
