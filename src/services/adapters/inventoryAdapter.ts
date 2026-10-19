// Adaptadores bidireccionales entre el esquema GraphQL de forge-backend y la UI de forge-front

import type {
  ProductTemplate,
  ProductVariant,
  ProductAttribute,
  ProductType,
  SENIAT_VATRate
} from '@/types/inventoryTypes'
import type { GqlProductTemplate, GqlProductVariant } from '@/types/inventoryDto'

export const mapGqlTemplateToFrontend = (gql: GqlProductTemplate): ProductTemplate => {
  // Mapeo de Tipo de Producto
  let productType: ProductType = 'storable'

  if (gql.productType === 'CONSUMABLE') productType = 'consumable'
  if (gql.productType === 'SERVICE') productType = 'service'

  // Mapeo de Alícuota SENIAT
  let vatRate: SENIAT_VATRate | undefined

  if (gql.vatAliquot === 'GENERAL_16') vatRate = '16'
  else if (gql.vatAliquot === 'REDUCED_8') vatRate = '8'
  else if (gql.vatAliquot === 'EXEMPT_0') vatRate = 'EXEMPT'

  // Mapeo de Variantes
  const variants: ProductVariant[] = (gql.variants || []).map(v => mapGqlVariantToFrontend(v, gql.id))

  // Mapeo de Atributos EAV
  const attributes: ProductAttribute[] = (gql.attributes || []).map(attrRel => ({
    id: attrRel.attribute.id,
    name: attrRel.attribute.name,
    values: (attrRel.attribute.values || []).map(val => ({
      id: val.id,
      name: val.name
    }))
  }))

  const basePrice = typeof gql.basePrice === 'string' ? parseFloat(gql.basePrice) : Number(gql.basePrice || 0)
  const standardCost = variants.length > 0 ? variants[0].costPrice : 0

  return {
    id: gql.id,
    name: gql.name,
    defaultCode: variants.length > 0 ? variants[0].sku : `PROD-${gql.id.slice(0, 6)}`,
    barcode: variants.length > 0 ? variants[0].barcode : undefined,
    productType,
    uomCode: gql.uomCode || 'un',
    categoryName: gql.category?.name || 'General',
    tags: [gql.category?.name || 'Inventario'],
    canBeSold: true,
    canBePurchased: true,
    basePrice,
    standardCost,
    vatRate,
    applyISLR: Boolean(gql.withholdingIslr),
    attributes,
    variants
  }
}

export const mapGqlVariantToFrontend = (gqlVar: GqlProductVariant, templateId: string): ProductVariant => {
  const priceExtra =
    typeof gqlVar.priceExtra === 'string' ? parseFloat(gqlVar.priceExtra) : Number(gqlVar.priceExtra || 0)
  const costPrice =
    typeof gqlVar.standardCost === 'string' ? parseFloat(gqlVar.standardCost) : Number(gqlVar.standardCost || 0)

  // Calcular stocks a partir de quants
  let physicalStock = 0
  let reservedStock = 0

  if (gqlVar.quants && gqlVar.quants.length > 0) {
    gqlVar.quants.forEach(q => {
      physicalStock += typeof q.quantity === 'string' ? parseFloat(q.quantity) : Number(q.quantity || 0)
      reservedStock +=
        typeof q.reservedQuantity === 'string' ? parseFloat(q.reservedQuantity) : Number(q.reservedQuantity || 0)
    })
  } else {
    // Si la variante no tiene quants explícitos en la query
    physicalStock = 0
    reservedStock = 0
  }

  const combinationValues = (gqlVar.values || []).map(valRel => ({
    attributeName: valRel.attributeValue?.attribute?.name || 'Atributo',
    valueName: valRel.attributeValue?.name || 'Valor'
  }))

  return {
    id: gqlVar.id,
    templateId,
    sku: gqlVar.sku,
    barcode: gqlVar.barcode || undefined,
    combinationValues,
    costPrice,
    priceExtra,
    physicalStock,
    reservedStock,
    availableStock: Math.max(0, physicalStock - reservedStock)
  }
}
