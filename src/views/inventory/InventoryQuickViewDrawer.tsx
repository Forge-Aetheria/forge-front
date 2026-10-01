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
import { calculateFinancials } from '@/services/inventoryService'

type Props = {
  open: boolean
  onClose: () => void
  template: ProductTemplate | null
  fiscalEnabled: boolean
}

const InventoryQuickViewDrawer = ({ open, onClose, template, fiscalEnabled }: Props) => {
  if (!template) return null

  const financials = calculateFinancials(
    template.standardCost,
    template.basePrice,
    template.vatRate,
    fiscalEnabled
  )

  const totalPhysicalStock = template.variants.reduce((acc, v) => acc + v.physicalStock, 0)
  const totalReservedStock = template.variants.reduce((acc, v) => acc + v.reservedStock, 0)
  const totalAvailableStock = template.variants.reduce((acc, v) => acc + v.availableStock, 0)

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          className: 'w-[90vw] sm:w-[540px] md:w-[620px] p-6 flex flex-col justify-between overflow-y-auto'
        }
      }}
    >
      <div className='flex flex-col gap-6'>
        {/* Header */}
        <div className='flex items-start justify-between gap-4'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2'>
              <Typography variant='caption' className='font-mono uppercase px-2 py-0.5 rounded bg-[var(--mui-palette-action-hover)] font-bold text-primary'>
                {template.defaultCode}
              </Typography>
              {template.barcode && (
                <Typography variant='caption' className='text-textSecondary font-mono'>
                  <i className='tabler-barcode text-sm inline-block mr-1' />
                  {template.barcode}
                </Typography>
              )}
            </div>
            <Typography variant='h5' className='font-bold mbs-1'>
              {template.name}
            </Typography>
            <Typography variant='caption' className='text-textSecondary'>
              Categoría: <strong>{template.categoryName}</strong> · UdM: <strong>{template.uomCode}</strong>
            </Typography>
          </div>
          <IconButton size='small' onClick={onClose}>
            <i className='tabler-x text-xl' />
          </IconButton>
        </div>

        <Divider />

        {/* Badges / Clasificación */}
        <div className='flex flex-wrap items-center gap-2'>
          <Chip
            size='small'
            label={
              template.productType === 'storable'
                ? '📦 Almacenable'
                : template.productType === 'consumable'
                ? '🧻 Consumible'
                : '💼 Servicio'
            }
            color={
              template.productType === 'storable'
                ? 'primary'
                : template.productType === 'consumable'
                ? 'warning'
                : 'info'
            }
            variant='tonal'
          />
          {template.canBeSold && <Chip size='small' label='Venta' color='success' variant='outlined' />}
          {template.canBePurchased && <Chip size='small' label='Compra' color='secondary' variant='outlined' />}
          {fiscalEnabled && financials.taxLabel && (
            <Chip
              size='small'
              label={financials.taxLabel}
              color={template.vatRate === 'EXEMPT' ? 'default' : 'primary'}
              variant='outlined'
            />
          )}
        </div>

        {/* Resumen Financiero */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--mui-palette-action-hover)] p-4 rounded-xl border border-[var(--mui-palette-divider)]'>
          <div className='flex flex-col'>
            <Typography variant='caption' className='text-textSecondary'>Costo Base</Typography>
            <Typography variant='h6' className='font-bold'>${financials.netCost.toFixed(2)}</Typography>
          </div>
          <div className='flex flex-col'>
            <Typography variant='caption' className='text-textSecondary'>Precio Venta Base</Typography>
            <Typography variant='h6' className='font-bold text-primary'>${financials.netPrice.toFixed(2)}</Typography>
          </div>
          <div className='flex flex-col'>
            <Typography variant='caption' className='text-textSecondary'>Margen Bruto</Typography>
            <Typography variant='h6' className='font-bold text-success'>
              {financials.marginPercentage.toFixed(1)}%
            </Typography>
          </div>
          <div className='flex flex-col'>
            <Typography variant='caption' className='text-textSecondary'>
              {fiscalEnabled ? 'Precio Final (+IVA)' : 'Stock Total'}
            </Typography>
            <Typography variant='h6' className='font-bold'>
              {fiscalEnabled
                ? `$${financials.totalPriceWithTax.toFixed(2)}`
                : `${totalAvailableStock} ${template.uomCode}`}
            </Typography>
          </div>
        </div>

        {/* Matriz de Variantes (Patrón Template vs Variant) */}
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <Typography variant='subtitle1' className='font-semibold flex items-center gap-1.5'>
              <i className='tabler-grid-dots text-primary' />
              Matriz de Variantes Físicas ({template.variants.length})
            </Typography>
            {template.productType !== 'service' && (
              <Typography variant='caption' className='text-textSecondary'>
                Físico: <strong>{totalPhysicalStock}</strong> · Reservado: <strong>{totalReservedStock}</strong> · Disp:{' '}
                <strong className='text-success'>{totalAvailableStock} {template.uomCode}</strong>
              </Typography>
            )}
          </div>

          <div className='overflow-x-auto border border-[var(--mui-palette-divider)] rounded-xl'>
            <Table size='small'>
              <TableHead className='bg-[var(--mui-palette-action-hover)]'>
                <TableRow>
                  <TableCell className='text-xs font-bold'>Variante / Atributos</TableCell>
                  <TableCell className='text-xs font-bold'>SKU Físico</TableCell>
                  <TableCell className='text-xs font-bold text-center'>Disponible</TableCell>
                  <TableCell className='text-xs font-bold text-right'>Precio Final</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {template.variants.map((v, idx) => {
                  const finalVariantPrice = template.basePrice + v.priceExtra

                  return (
                    <TableRow key={idx} hover>
                      <TableCell className='text-xs py-2'>
                        {v.combinationValues.length > 0 ? (
                          <div className='flex flex-wrap gap-1'>
                            {v.combinationValues.map((cv, cIdx) => (
                              <Chip
                                key={cIdx}
                                size='small'
                                label={`${cv.attributeName}: ${cv.valueName}`}
                                variant='outlined'
                                className='text-[10px] h-5'
                              />
                            ))}
                          </div>
                        ) : (
                          <span className='text-textSecondary italic'>Estándar (Única)</span>
                        )}
                      </TableCell>
                      <TableCell className='text-xs font-mono py-2'>{v.sku}</TableCell>
                      <TableCell className='text-xs text-center py-2'>
                        {template.productType === 'service' ? (
                          <span className='text-textDisabled'>N/A</span>
                        ) : (
                          <span className={v.availableStock <= 0 ? 'text-error font-bold' : 'text-success font-bold'}>
                            {v.availableStock} {template.uomCode}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className='text-xs font-bold text-right py-2'>
                        ${finalVariantPrice.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className='flex items-center gap-1.5 flex-wrap'>
            <Typography variant='caption' className='text-textSecondary'>Tags:</Typography>
            {template.tags.map((tag, tIdx) => (
              <Chip key={tIdx} label={tag} size='small' variant='tonal' className='text-[11px]' />
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className='flex items-center justify-between gap-3 pt-6 mt-6 border-t border-[var(--mui-palette-divider)]'>
        <Button variant='outlined' color='secondary' onClick={onClose}>
          Cerrar
        </Button>
        <Button
          component={Link}
          href={`/inventory/${template.id}`}
          variant='contained'
          color='primary'
          endIcon={<i className='tabler-arrow-up-right' />}
        >
          Abrir Ficha Completa
        </Button>
      </div>
    </Drawer>
  )
}

export default InventoryQuickViewDrawer
