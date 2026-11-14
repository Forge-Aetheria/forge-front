'use client'

import React, { useState, useEffect } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import CustomTextField from '@core/components/mui/TextField'

import type {
  ProductTemplate,
  AdjustmentReason,
  StockAdjustmentRecord
} from '@/types/inventoryTypes'
import { applyStockAdjustment, getActiveBcvRate } from '@/services/inventoryService'
import { stockAdjustmentFormSchema } from '../schemas/productFormSchema'

interface Props {
  open: boolean
  onClose: () => void
  templates: ProductTemplate[]
  preselectedProductId?: string
  preselectedVariantId?: string
  onSuccess: (adjustment: StockAdjustmentRecord) => void
}

const REASON_OPTIONS: { value: AdjustmentReason; label: string; icon: string }[] = [
  { value: 'CONTEO_FISICO', label: 'Toma Física / Auditoría de Almacén', icon: 'tabler-clipboard-check' },
  { value: 'ROTURA_MERMA', label: 'Rotura, Daño o Merma Operativa', icon: 'tabler-alert-triangle' },
  { value: 'CADUCIDAD', label: 'Vencimiento / Caducidad de Lote', icon: 'tabler-calendar-off' },
  { value: 'CONSUMO_INTERNO', label: 'Consumo Interno de la Empresa', icon: 'tabler-building-store' },
  { value: 'CORRECCION_SISTEMA', label: 'Corrección de Saldo en Sistema', icon: 'tabler-adjustments' }
]

const StockAdjustmentModal: React.FC<Props> = ({
  open,
  onClose,
  templates,
  preselectedProductId,
  preselectedVariantId,
  onSuccess
}) => {
  const bcvRate = getActiveBcvRate()
  const physicalTemplates = templates.filter(t => t.productType !== 'service')

  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [stockContado, setStockContado] = useState<number>(0)
  const [motivo, setMotivo] = useState<AdjustmentReason>('CONTEO_FISICO')
  const [observaciones, setObservaciones] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      const initialProd =
        physicalTemplates.find(t => t.id === preselectedProductId) || physicalTemplates[0]

      if (initialProd) {
        setSelectedProductId(initialProd.id)

        const initialVar =
          initialProd.variants.find(v => v.id === preselectedVariantId) || initialProd.variants[0]

        if (initialVar) {
          setSelectedVariantId(initialVar.id)
          setStockContado(initialVar.physicalStock)
        }
      }

      setMotivo('CONTEO_FISICO')
      setObservaciones('')
      setErrorMsg(null)
    }
  }, [open, preselectedProductId, preselectedVariantId, templates])

  const currentProduct = physicalTemplates.find(t => t.id === selectedProductId) || null
  const currentVariant = currentProduct?.variants.find(v => v.id === selectedVariantId) || null

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId)
    const prod = physicalTemplates.find(t => t.id === prodId)

    if (prod && prod.variants[0]) {
      setSelectedVariantId(prod.variants[0].id)
      setStockContado(prod.variants[0].physicalStock)
    }
  }

  const handleVariantChange = (varId: string) => {
    setSelectedVariantId(varId)
    const variant = currentProduct?.variants.find(v => v.id === varId)

    if (variant) {
      setStockContado(variant.physicalStock)
    }
  }

  const stockSistema = currentVariant?.physicalStock ?? 0
  const diferencia = stockContado - stockSistema
  const unitCost = currentVariant?.costPrice || currentProduct?.standardCost || 0
  const impactoUsd = diferencia * unitCost

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const validation = stockAdjustmentFormSchema.safeParse({
      producto_id: selectedProductId,
      variante_id: selectedVariantId,
      stock_contado: stockContado,
      motivo,
      observaciones: observaciones.trim() || undefined
    })

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Verifique los datos ingresados')

      return
    }

    try {
      setIsSubmitting(true)
      const record = await applyStockAdjustment(validation.data)

      onSuccess(record)
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo procesar el ajuste')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 12px 32px rgba(108, 92, 231, 0.12)'
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle className='flex items-center justify-between border-b border-[#E6E4F0] bg-[#FAFAFC] py-4 px-6'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-full bg-[#F0EEF9] text-[#6C5CE7] flex items-center justify-center'>
              <i className='tabler-adjustments-horizontal text-lg' />
            </div>
            <div>
              <Typography variant='h6' className='font-bold text-[#1E1B2E] text-base'>
                Ajuste de Inventario y Toma Física
              </Typography>
              <span className='text-xs text-[#6B7280]'>
                Actualización inmediata de existencias y registro en Kárdex
              </span>
            </div>
          </div>
          <IconButton size='small' onClick={onClose}>
            <i className='tabler-x text-base text-[#6B7280]' />
          </IconButton>
        </DialogTitle>

        <DialogContent className='p-6 flex flex-col gap-4'>
          {errorMsg && (
            <Alert severity='error' sx={{ borderRadius: '12px' }}>
              {errorMsg}
            </Alert>
          )}

          <CustomTextField
            select
            fullWidth
            label='Artículo Físico *'
            value={selectedProductId}
            onChange={e => handleProductChange(e.target.value)}
          >
            {physicalTemplates.map(prod => (
              <MenuItem key={prod.id} value={prod.id}>
                {prod.defaultCode} — {prod.name}
              </MenuItem>
            ))}
          </CustomTextField>

          {currentProduct && currentProduct.variants.length > 0 && (
            <CustomTextField
              select
              fullWidth
              label='Variante / SKU Específico *'
              value={selectedVariantId}
              onChange={e => handleVariantChange(e.target.value)}
            >
              {currentProduct.variants.map(v => (
                <MenuItem key={v.id} value={v.id}>
                  {v.sku}{' '}
                  {v.combinationValues.length > 0
                    ? `(${v.combinationValues.map(c => c.valueName).join(' / ')})`
                    : '(Única)'}{' '}
                  — Actual: {v.physicalStock} {currentProduct.uomCode}
                </MenuItem>
              ))}
            </CustomTextField>
          )}

          {/* Comparativa Visual de Stock */}
          <div className='grid grid-cols-3 gap-3 bg-[#F8F7FC] p-4 rounded-2xl border border-[#E6E4F0]'>
            <div className='flex flex-col'>
              <span className='text-[11px] text-[#6B7280]'>Stock en Sistema</span>
              <span className='text-lg font-bold text-[#1E1B2E]'>
                {stockSistema} <small className='text-xs font-normal'>{currentProduct?.uomCode}</small>
              </span>
              <span className='text-[10px] text-[#9CA3AF]'>
                Reservado: {currentVariant?.reservedStock || 0}
              </span>
            </div>

            <div className='flex flex-col'>
              <CustomTextField
                fullWidth
                type='number'
                label='Conteo Físico Real *'
                value={stockContado}
                onChange={e => setStockContado(Math.max(0, parseInt(e.target.value) || 0))}
                inputProps={{ min: 0 }}
              />
            </div>

            <div className='flex flex-col items-end justify-center'>
              <span className='text-[11px] text-[#6B7280]'>Diferencia (Ajuste)</span>
              <span
                className={`text-lg font-bold ${
                  diferencia > 0
                    ? 'text-[#10B981]'
                    : diferencia < 0
                    ? 'text-[#EF4444]'
                    : 'text-[#6B7280]'
                }`}
              >
                {diferencia > 0 ? `+${diferencia}` : diferencia} {currentProduct?.uomCode}
              </span>
              <span className='text-[10px] text-[#6B7280]'>
                Impacto: ${impactoUsd.toFixed(2)} (Bs. {(impactoUsd * bcvRate).toFixed(2)})
              </span>
            </div>
          </div>

          <CustomTextField
            select
            fullWidth
            label='Motivo de Ajuste *'
            value={motivo}
            onChange={e => setMotivo(e.target.value as AdjustmentReason)}
          >
            {REASON_OPTIONS.map(r => (
              <MenuItem key={r.value} value={r.value}>
                <div className='flex items-center gap-2'>
                  <i className={`${r.icon} text-[#6C5CE7] text-base`} />
                  <span>{r.label}</span>
                </div>
              </MenuItem>
            ))}
          </CustomTextField>

          <CustomTextField
            fullWidth
            multiline
            rows={2}
            label='Observaciones de Auditoría'
            placeholder='Detalle el hallazgo del conteo, número de acta o causa...'
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
          />
        </DialogContent>

        <DialogActions className='px-6 py-4 border-t border-[#E6E4F0] bg-[#FAFAFC] flex justify-end gap-2'>
          <Button
            type='button'
            variant='outlined'
            onClick={onClose}
            disabled={isSubmitting}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              borderColor: '#DCD8EC',
              color: '#6B7280',
              fontWeight: 600
            }}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            variant='contained'
            disabled={isSubmitting}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              backgroundColor: '#6C5CE7',
              color: '#FFFFFF',
              fontWeight: 600,
              px: 3,
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={15} color='inherit' />
              ) : (
                <i className='tabler-check text-base' />
              )
            }
          >
            {isSubmitting ? 'Aplicando...' : 'Aplicar Ajuste al Kárdex'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default StockAdjustmentModal
