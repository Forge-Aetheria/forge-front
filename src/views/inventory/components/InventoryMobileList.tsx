'use client'


import React from 'react'

import Link from 'next/link'

import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import { useBcvRate } from '@/hooks/useBcvRate'

import type { ProductTemplate } from '@/types/inventoryTypes'
import { calculateFinancials } from '@/services/inventoryService'

interface Props {
  templates: ProductTemplate[]
  fiscalEnabled: boolean
  onQuickView: (template: ProductTemplate) => void
  onEdit: (template: ProductTemplate) => void
  onAdjustStock: (template: ProductTemplate) => void
}

const InventoryMobileList: React.FC<Props> = ({
  templates,
  fiscalEnabled,
  onQuickView,
  onAdjustStock
}) => {
  const bcvRate = useBcvRate()

  if (templates.length === 0) {
    return (
      <div className='p-8 text-center text-[#6B7280]'>
        <i className='tabler-package-off text-3xl mb-2 inline-block text-[#9CA3AF]' />
        <p className='text-sm'>No se encontraron artículos con los filtros actuales.</p>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-3 p-4'>
      {templates.map(template => {
        const financials = calculateFinancials(
          template.standardCost,
          template.basePrice,
          template.vatRate,
          fiscalEnabled,
          bcvRate
        )

        const totalAvailable = template.variants.reduce((acc, v) => acc + v.availableStock, 0)
        const isService = template.productType === 'service'
        const isOutOfStock = !isService && totalAvailable === 0

        const isLowStock =
          !isService && !isOutOfStock && Boolean(template.minStock && totalAvailable <= template.minStock)

        return (
          <div
            key={template.id}
            onClick={() => onQuickView(template)}
            className='p-4 rounded-2xl bg-[#FFFFFF] border border-[#E6E4F0] shadow-xs flex flex-col gap-2.5 cursor-pointer hover:border-[#6C5CE7]/40 transition-all'
          >
            {/* Header Row */}
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <span className='font-mono text-xs font-bold text-[#6C5CE7] block'>
                  {template.defaultCode}
                </span>
                <h4 className='font-bold text-sm text-[#1E1B2E] truncate'>{template.name}</h4>
                <span className='text-xs text-[#6B7280]'>{template.categoryName}</span>
              </div>

              <Chip
                size='small'
                label={
                  isService
                    ? 'Servicio'
                    : isOutOfStock
                    ? 'Agotado'
                    : isLowStock
                    ? 'Stock Bajo'
                    : 'En Stock'
                }
                sx={{
                  borderRadius: '9999px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  height: 22,
                  backgroundColor: isService
                    ? '#F0EEF9'
                    : isOutOfStock
                    ? '#FEE2E2'
                    : isLowStock
                    ? '#FEF3C7'
                    : '#E8F5E9',
                  color: isService
                    ? '#6C5CE7'
                    : isOutOfStock
                    ? '#EF4444'
                    : isLowStock
                    ? '#D97706'
                    : '#10B981'
                }}
              />
            </div>

            {/* Financials & Stock Row */}
            <div className='grid grid-cols-3 gap-2 pt-2 border-t border-[#F4F3F8] text-xs'>
              <div>
                <span className='text-[#6B7280] block text-[10px]'>Precio Base</span>
                <strong className='text-[#1E1B2E] font-mono'>${financials.netPrice.toFixed(2)}</strong>
                <span className='text-[10px] text-[#9CA3AF] block'>
                  Bs. {financials.netPriceVes.toFixed(2)}
                </span>
              </div>

              <div>
                <span className='text-[#6B7280] block text-[10px]'>Margen</span>
                <strong className='text-[#10B981]'>{financials.marginPercentage.toFixed(1)}%</strong>
                <span className='text-[10px] text-[#9CA3AF] block'>
                  Costo: ${financials.netCost.toFixed(2)}
                </span>
              </div>

              <div className='text-right'>
                <span className='text-[#6B7280] block text-[10px]'>Disponible</span>
                <strong className='text-[#1E1B2E]'>
                  {isService ? 'N/A' : `${totalAvailable} ${template.uomCode}`}
                </strong>
                {fiscalEnabled && financials.taxLabel && (
                  <span className='text-[10px] text-[#6C5CE7] font-bold block'>
                    IVA {financials.taxLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div
              className='flex items-center justify-between pt-2 border-t border-[#F4F3F8]'
              onClick={e => e.stopPropagation()}
            >
              <span className='text-[11px] text-[#6B7280]'>
                {template.variants.length > 1
                  ? `${template.variants.length} variantes`
                  : 'Variante única'}
              </span>

              <div className='flex items-center gap-1'>
                {!isService && (
                  <Tooltip title='Ajustar Stock'>
                    <IconButton size='small' onClick={() => onAdjustStock(template)}>
                      <i className='tabler-adjustments-horizontal text-base text-[#6B7280]' />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title='Editar Artículo'>
                  <IconButton
                    size='small'
                    component={Link}
                    href={`/inventory/products/${template.id}`}
                  >
                    <i className='tabler-edit text-base text-[#6B7280]' />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default InventoryMobileList
