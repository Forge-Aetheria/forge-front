import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildProductTemplateWhereInput } from './inventoryWhere'

describe('buildProductTemplateWhereInput', () => {
  it('returns undefined when all filters are empty or ALL', () => {
    assert.equal(buildProductTemplateWhereInput({}), undefined)
    assert.equal(
      buildProductTemplateWhereInput({ search: '   ', productType: 'ALL', category: 'ALL' }),
      undefined
    )
  })

  it('builds case-insensitive OR search across name, variant sku, and barcode', () => {
    const where = buildProductTemplateWhereInput({ search: 'Taladro' })

    assert.deepEqual(where, {
      OR: [
        { name: { contains: 'Taladro', mode: 'insensitive' } },
        {
          variants: {
            some: {
              OR: [
                { sku: { contains: 'Taladro', mode: 'insensitive' } },
                { barcode: { contains: 'Taladro', mode: 'insensitive' } }
              ]
            }
          }
        }
      ]
    })
  })

  it('combines productType and category with AND', () => {
    const where = buildProductTemplateWhereInput({
      productType: 'storable',
      category: 'Herramientas'
    })

    assert.deepEqual(where, {
      AND: [
        { productType: { equals: 'STORABLE' } },
        { category: { is: { name: { equals: 'Herramientas' } } } }
      ]
    })
  })
})
