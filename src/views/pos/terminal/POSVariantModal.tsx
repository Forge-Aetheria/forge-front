'use client'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

// Type Imports
import type { ProductTemplate, ProductVariant } from '@/types/inventoryTypes'

type Props = {
  open: boolean
  onClose: () => void
  template: ProductTemplate | null
  bcvRate: number
  onSelectVariant: (template: ProductTemplate, variant: ProductVariant) => void
}

const POSVariantModal = ({ open, onClose, template, bcvRate, onSelectVariant }: Props) => {
  if (!template) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle className='flex items-center justify-between border-b border-[var(--mui-palette-divider)] pb-3'>
        <div>
          <Typography variant='h6' className='font-bold leading-tight'>
            Seleccionar Variante
          </Typography>
          <Typography variant='caption' className='text-textSecondary'>
            {template.name} · SKU: {template.defaultCode}
          </Typography>
        </div>
        <Button size='small' onClick={onClose} color='secondary'>
          Cerrar
        </Button>
      </DialogTitle>

      <DialogContent className='pt-4 flex flex-col gap-2.5'>
        {template.variants.map((variant, idx) => {
          const finalPriceUSD = template.basePrice + variant.priceExtra
          const finalPriceVES = finalPriceUSD * bcvRate
          const isAvailable = variant.availableStock > 0

          const label =
            variant.combinationValues.length > 0
              ? variant.combinationValues.map(c => `${c.attributeName}: ${c.valueName}`).join(' · ')
              : 'Estándar'

          return (
            <div
              key={idx}
              onClick={() => {
                if (isAvailable || template.productType === 'service') {
                  onSelectVariant(template, variant)
                  onClose()
                }
              }}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${
                isAvailable || template.productType === 'service'
                  ? 'cursor-pointer hover:border-primary hover:bg-[var(--mui-palette-action-hover)] active:scale-[0.98]'
                  : 'opacity-50 cursor-not-allowed bg-[var(--mui-palette-action-disabledBackground)]'
              }`}
            >
              <div className='flex flex-col'>
                <Typography className='font-semibold text-textPrimary text-sm'>
                  {label}
                </Typography>
                <div className='flex items-center gap-2 mt-0.5'>
                  <Typography variant='caption' className='font-mono text-primary font-bold'>
                    {variant.sku}
                  </Typography>
                  {template.productType !== 'service' && (
                    <Chip
                      size='small'
                      label={`${variant.availableStock} disp.`}
                      color={isAvailable ? 'success' : 'error'}
                      variant='tonal'
                      className='h-4 text-[10px]'
                    />
                  )}
                </div>
              </div>

              <div className='flex flex-col items-end'>
                <Typography variant='subtitle1' className='font-bold text-primary font-mono leading-tight'>
                  ${finalPriceUSD.toFixed(2)}
                </Typography>
                <Typography variant='caption' className='text-textSecondary font-mono'>
                  {finalPriceVES.toFixed(2)} Bs.
                </Typography>
              </div>
            </div>
          )
        })}
      </DialogContent>

      <DialogActions className='border-t border-[var(--mui-palette-divider)]'>
        <Button onClick={onClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  )
}

export default POSVariantModal
