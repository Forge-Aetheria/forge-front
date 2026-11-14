'use client'

// React Imports
import { useState, useMemo } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'

import CustomTextField from '@core/components/mui/TextField'

// Type Imports
import type { ProductTemplate, ProductVariant } from '@/types/inventoryTypes'
import POSVariantModal from './POSVariantModal'

type Props = {
  templates: ProductTemplate[]
  bcvRate: number
  onAddToCart: (template: ProductTemplate, variant: ProductVariant) => void
}

const POSProductCatalog = ({ templates, bcvRate, onAddToCart }: Props) => {
  // States
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [variantModalTemplate, setVariantModalTemplate] = useState<ProductTemplate | null>(null)

  // Categories
  const categories = useMemo(() => {
    return Array.from(new Set(templates.map(t => t.categoryName)))
  }, [templates])

  // Filtered products (only products where canBeSold === true)
  const sellableTemplates = useMemo(() => {
    return templates.filter(t => t.canBeSold)
  }, [templates])

  const filteredTemplates = useMemo(() => {
    return sellableTemplates.filter(template => {
      // Category filter
      if (selectedCategory !== 'ALL' && template.categoryName !== selectedCategory) {
        return false
      }

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchName = template.name.toLowerCase().includes(query)
        const matchCode = template.defaultCode.toLowerCase().includes(query)
        const matchBarcode = template.barcode?.toLowerCase().includes(query)
        const matchTag = template.tags.some(tag => tag.toLowerCase().includes(query))

        const matchVariant = template.variants.some(
          v => v.sku.toLowerCase().includes(query) || (v.barcode && v.barcode.toLowerCase().includes(query))
        )

        if (!matchName && !matchCode && !matchBarcode && !matchTag && !matchVariant) {
          return false
        }
      }

      return true
    })
  }, [sellableTemplates, selectedCategory, search])

  const handleProductClick = (template: ProductTemplate) => {
    if (template.variants.length > 1) {
      setVariantModalTemplate(template)
    } else if (template.variants.length === 1) {
      onAddToCart(template, template.variants[0])
    }
  }

  return (
    <div className='flex flex-col h-full overflow-hidden p-4 gap-3 bg-[var(--mui-palette-background-default)]'>
      {/* Search Bar & Barcode Scanner Input */}
      <div className='flex items-center gap-2'>
        <CustomTextField
          fullWidth
          placeholder='Escanear código de barras (EAN/UPC) o buscar por nombre / SKU... [F2]'
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='tabler-barcode text-primary text-2xl' />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position='end'>
                  <i
                    className='tabler-x cursor-pointer text-textSecondary'
                    onClick={() => setSearch('')}
                  />
                </InputAdornment>
              ) : null
            }
          }}
          className='bg-[var(--mui-palette-background-paper)] rounded-lg'
        />
      </div>

      {/* Categories Horizontal Bar */}
      <div className='flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0'>
        <Chip
          label='Todos los Productos'
          onClick={() => setSelectedCategory('ALL')}
          color={selectedCategory === 'ALL' ? 'primary' : 'default'}
          variant={selectedCategory === 'ALL' ? 'filled' : 'tonal'}
          className='cursor-pointer font-medium'
        />
        {categories.map((cat, idx) => (
          <Chip
            key={idx}
            label={cat}
            onClick={() => setSelectedCategory(cat)}
            color={selectedCategory === cat ? 'primary' : 'default'}
            variant={selectedCategory === cat ? 'filled' : 'tonal'}
            className='cursor-pointer font-medium whitespace-nowrap'
          />
        ))}
      </div>

      {/* Touch Grid of Products */}
      <div className='grow overflow-y-auto pr-1'>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3'>
          {filteredTemplates.map(template => {
            const hasMultipleVariants = template.variants.length > 1
            const totalStock = template.variants.reduce((acc, v) => acc + v.availableStock, 0)
            const priceUSD = template.basePrice
            const priceVES = priceUSD * bcvRate

            return (
              <div
                key={template.id}
                onClick={() => handleProductClick(template)}
                className='group relative flex flex-col justify-between p-3 rounded-xl bg-[var(--mui-palette-background-paper)] border border-[var(--mui-palette-divider)] hover:border-primary shadow-xs hover:shadow-md transition-all cursor-pointer select-none active:scale-[0.97]'
              >
                {/* Top Info */}
                <div>
                  <div className='flex items-start justify-between gap-1 mb-1'>
                    <Typography variant='caption' className='font-mono font-bold text-primary truncate'>
                      {template.defaultCode}
                    </Typography>
                    {hasMultipleVariants && (
                      <Chip
                        size='small'
                        label={`${template.variants.length} Var.`}
                        color='secondary'
                        variant='tonal'
                        className='h-4 text-[10px]'
                      />
                    )}
                  </div>

                  <Typography className='font-bold text-textPrimary text-sm line-clamp-2 leading-tight mb-2'>
                    {template.name}
                  </Typography>
                </div>

                {/* Bottom Pricing & Stock */}
                <div className='pt-2 border-t border-[var(--mui-palette-divider)] mt-2 flex items-end justify-between'>
                  <div className='flex flex-col'>
                    <Typography variant='subtitle1' className='font-bold text-primary font-mono leading-tight'>
                      ${priceUSD.toFixed(2)}
                    </Typography>
                    <Typography variant='caption' className='text-textSecondary font-mono text-[11px] leading-tight'>
                      {priceVES.toFixed(2)} Bs.
                    </Typography>
                  </div>

                  {template.productType !== 'service' && (
                    <Typography
                      variant='caption'
                      className={`text-[10px] font-bold ${
                        totalStock <= 0 ? 'text-error' : totalStock <= (template.minStock || 5) ? 'text-warning' : 'text-textDisabled'
                      }`}
                    >
                      {totalStock} {template.uomCode}
                    </Typography>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Variant Selector Popup */}
      <POSVariantModal
        open={Boolean(variantModalTemplate)}
        onClose={() => setVariantModalTemplate(null)}
        template={variantModalTemplate}
        bcvRate={bcvRate}
        onSelectVariant={onAddToCart}
      />
    </div>
  )
}

export default POSProductCatalog
