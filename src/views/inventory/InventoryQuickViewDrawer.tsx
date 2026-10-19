'use client'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'

// Type Imports
import type { ProductTemplate } from '@/types/inventoryTypes'
import { calculateFinancials, getActiveBcvRate } from '@/services/inventoryService'

type Props = {
  open: boolean
  onClose: () => void
  template: ProductTemplate | null
  fiscalEnabled: boolean
  onEdit?: (template: ProductTemplate) => void
  onAdjustStock?: (template: ProductTemplate) => void
}

const InventoryQuickViewDrawer = ({
  open,
  onClose,
  template,
  fiscalEnabled,
  onAdjustStock
}: Props) => {
  if (!template) return null

  const bcvRate = getActiveBcvRate()
  const financials = calculateFinancials(
    template.standardCost,
    template.basePrice,
    template.vatRate,
    fiscalEnabled
  )

  const totalPhysicalStock = template.variants.reduce((acc, v) => acc + v.physicalStock, 0)
  const totalReservedStock = template.variants.reduce((acc, v) => acc + v.reservedStock, 0)
  const totalAvailableStock = template.variants.reduce((acc, v) => acc + v.availableStock, 0)
  const isService = template.productType === 'service'

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          className: 'w-[90vw] sm:w-[560px] md:w-[640px] p-6 flex flex-col justify-between overflow-y-auto bg-[#FFFFFF]'
        }
      }}
    >
      <div className='flex flex-col gap-5'>
        {/* Header */}
        <div className='flex items-start justify-between gap-4'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2'>
              <span className='font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#F0EEF9] font-bold text-xs text-[#6C5CE7] border border-[#DCD8EC]'>
                {template.defaultCode}
              </span>
              {template.barcode && (
                <Typography variant='caption' className='text-[#6B7280] font-mono flex items-center gap-1'>
                  <i className='tabler-barcode text-sm' />
                  {template.barcode}
                </Typography>
              )}
            </div>
            <Typography variant='h5' className='font-bold text-[#1E1B2E] mt-1'>
              {template.name}
            </Typography>
            <Typography variant='caption' className='text-[#6B7280]'>
              Categoría: <strong className='text-[#1E1B2E]'>{template.categoryName}</strong> · UdM:{' '}
              <strong className='text-[#1E1B2E]'>{template.uomCode}</strong>
            </Typography>
          </div>
          <IconButton size='small' onClick={onClose}>
            <i className='tabler-x text-xl text-[#6B7280]' />
          </IconButton>
        </div>

        <Divider sx={{ borderColor: '#E6E4F0' }} />

        {/* Badges / Clasificación (100% Tabler Icons, Cero Emojis) */}
        <div className='flex flex-wrap items-center gap-2'>
          <Chip
            size='small'
            icon={
              <i
                className={
                  template.productType === 'storable'
                    ? 'tabler-box text-xs'
                    : template.productType === 'consumable'
                    ? 'tabler-package text-xs'
                    : 'tabler-briefcase text-xs'
                }
              />
            }
            label={
              template.productType === 'storable'
                ? 'Almacenable'
                : template.productType === 'consumable'
                ? 'Consumible'
                : 'Servicio'
            }
            sx={{
              borderRadius: '9999px',
              fontWeight: 600,
              fontSize: '0.72rem',
              backgroundColor: '#F0EEF9',
              color: '#6C5CE7'
            }}
          />
          {template.canBeSold && (
            <Chip
              size='small'
              label='Para la Venta'
              sx={{
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 600,
                backgroundColor: '#E8F5E9',
                color: '#10B981'
              }}
            />
          )}
          {template.canBePurchased && (
            <Chip
              size='small'
              label='Para la Compra'
              sx={{
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 600,
                backgroundColor: '#F4F3F8',
                color: '#6B7280'
              }}
            />
          )}
          {fiscalEnabled && financials.taxFullLabel && (
            <Chip
              size='small'
              label={financials.taxFullLabel}
              sx={{
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                backgroundColor: template.vatRate === 'EXEMPT' ? '#F4F3F8' : '#F0EEF9',
                color: template.vatRate === 'EXEMPT' ? '#6B7280' : '#6C5CE7',
                border: '1px solid #DCD8EC'
              }}
            />
          )}
        </div>

        {/* Resumen Financiero Bimonetario */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F7FC] p-4 rounded-2xl border border-[#E6E4F0]'>
          <div className='flex flex-col'>
            <span className='text-[11px] text-[#6B7280]'>Costo Base</span>
            <span className='text-base font-bold text-[#1E1B2E]'>${financials.netCost.toFixed(2)}</span>
            <span className='text-[10px] text-[#9CA3AF]'>Bs. {financials.netCostVes.toFixed(2)}</span>
          </div>
          <div className='flex flex-col'>
            <span className='text-[11px] text-[#6B7280]'>Precio Venta (Neto)</span>
            <span className='text-base font-bold text-[#6C5CE7]'>${financials.netPrice.toFixed(2)}</span>
            <span className='text-[10px] text-[#9CA3AF]'>Bs. {financials.netPriceVes.toFixed(2)}</span>
          </div>
          <div className='flex flex-col'>
            <span className='text-[11px] text-[#6B7280]'>Margen Bruto</span>
            <span className='text-base font-bold text-[#10B981]'>
              {financials.marginPercentage.toFixed(1)}%
            </span>
            <span className='text-[10px] text-[#9CA3AF]'>+${financials.marginAmount.toFixed(2)}</span>
          </div>
          <div className='flex flex-col'>
            <span className='text-[11px] text-[#6B7280]'>
              {fiscalEnabled ? 'Total con IVA' : 'Precio Final'}
            </span>
            <span className='text-base font-bold text-[#1E1B2E]'>
              ${financials.totalPriceWithTax.toFixed(2)}
            </span>
            <span className='text-[10px] text-[#9CA3AF]'>
              Bs. {financials.totalPriceWithTaxVes.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Existencias Consolidadas (Solo para productos físicos) */}
        {!isService && (
          <div className='grid grid-cols-3 gap-3 text-center'>
            <div className='p-3 rounded-2xl border border-[#E6E4F0] bg-[#FFFFFF]'>
              <span className='text-[11px] text-[#6B7280] block'>Stock Físico</span>
              <strong className='text-base text-[#1E1B2E]'>
                {totalPhysicalStock} {template.uomCode}
              </strong>
            </div>
            <div className='p-3 rounded-2xl border border-[#E6E4F0] bg-[#FFFFFF]'>
              <span className='text-[11px] text-[#6B7280] block'>Reservado</span>
              <strong className='text-base text-[#F59E0B]'>
                {totalReservedStock} {template.uomCode}
              </strong>
            </div>
            <div className='p-3 rounded-2xl border border-[#E6E4F0] bg-[#E8F5E9]/40'>
              <span className='text-[11px] text-[#6B7280] block'>Disponible Real</span>
              <strong className='text-base text-[#10B981]'>
                {totalAvailableStock} {template.uomCode}
              </strong>
            </div>
          </div>
        )}

        {/* Matriz de Variantes */}
        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold uppercase tracking-wider text-[#1E1B2E]'>
              Matriz de Variantes ({template.variants.length})
            </span>
            <span className='text-[11px] text-[#6B7280]'>Tasa BCV: {bcvRate.toFixed(2)} Bs/$</span>
          </div>

          <div className='overflow-x-auto border border-[#E6E4F0] rounded-2xl'>
            <Table size='small'>
              <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Combinación</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>SKU</TableCell>
                  <TableCell align='center' sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Disp.
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Precio Final
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {template.variants.map(variant => {
                  const finalVariantPrice = template.basePrice + variant.priceExtra

                  return (
                    <TableRow key={variant.id} hover>
                      <TableCell sx={{ fontSize: '0.75rem' }}>
                        {variant.combinationValues.length > 0
                          ? variant.combinationValues
                              .map(c => `${c.attributeName}: ${c.valueName}`)
                              .join(' / ')
                          : 'Estándar (Única)'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                        {variant.sku}
                      </TableCell>
                      <TableCell align='center' sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        {isService ? 'N/A' : `${variant.availableStock} ${template.uomCode}`}
                      </TableCell>
                      <TableCell align='right' sx={{ fontSize: '0.75rem' }}>
                        <div className='flex flex-col items-end'>
                          <strong className='text-[#1E1B2E]'>${finalVariantPrice.toFixed(2)}</strong>
                          <span className='text-[10px] text-[#9CA3AF]'>
                            Bs. {(finalVariantPrice * bcvRate).toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className='pt-4 mt-6 border-t border-[#E6E4F0] flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2'>
          {!isService && onAdjustStock && (
            <Button
              variant='outlined'
              size='small'
              onClick={() => {
                onClose()
                onAdjustStock(template)
              }}
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                borderColor: '#DCD8EC',
                color: '#6C5CE7',
                fontWeight: 600
              }}
              startIcon={<i className='tabler-adjustments-horizontal text-sm' />}
            >
              Ajustar Stock
            </Button>
          )}
        </div>

        <Button
          component={Link}
          href={`/inventory/products/${template.id}`}
          variant='contained'
          onClick={onClose}
          sx={{
            borderRadius: '9999px',
            textTransform: 'none',
            backgroundColor: '#6C5CE7',
            color: '#FFFFFF',
            fontWeight: 600,
            px: 3,
            '&:hover': { backgroundColor: '#5B4CDB' }
          }}
          endIcon={<i className='tabler-arrow-up-right text-base' />}
        >
          Ficha Completa
        </Button>
      </div>
    </Drawer>
  )
}

export default InventoryQuickViewDrawer
