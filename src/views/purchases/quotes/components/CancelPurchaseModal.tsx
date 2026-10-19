'use client'

import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import CustomTextField from '@core/components/mui/TextField'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: string) => Promise<void>
  correlativo: string
}

export const CancelPurchaseModal: React.FC<Props> = ({ open, onClose, onConfirm, correlativo }) => {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!motivo.trim() || motivo.trim().length < 5) {
      setError('El motivo de anulación es obligatorio (mínimo 5 caracteres).')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      await onConfirm(motivo.trim())
      setMotivo('')
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error al anular el registro de compra.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          border: '1px solid #E6E4F0',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
          backgroundColor: '#FFFFFF',
          p: 1
        }
      }}
    >
      <DialogTitle className='flex items-center gap-2 pb-2'>
        <span className='flex items-center justify-center w-8 h-8 rounded-full bg-[#FEE2E2] text-[#EF4444]'>
          <i className='tabler-alert-triangle text-lg' />
        </span>
        <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
          Anular Compra {correlativo}
        </Typography>
      </DialogTitle>

      <DialogContent className='pt-2'>
        <Typography variant='body2' className='text-[#6B7280] mb-4'>
          Esta acción cambiará el estado del documento a <strong className='text-[#EF4444]'>Anulada</strong> (Soft
          Delete). El registro no se eliminará físicamente para conservar la trazabilidad de auditoría.
        </Typography>

        <CustomTextField
          autoFocus
          multiline
          rows={3}
          fullWidth
          label='Motivo de anulación *'
          placeholder='Ej: El proveedor notificó agotamiento de lote o variación en condiciones de entrega...'
          value={motivo}
          onChange={e => {
            setMotivo(e.target.value)
            if (error) setError('')
          }}
          error={Boolean(error)}
          helperText={error || 'Campo obligatorio para auditoría de abastecimiento (mínimo 5 caracteres).'}
          disabled={isSubmitting}
        />
      </DialogContent>

      <DialogActions className='p-4 pt-2 flex items-center justify-end gap-2'>
        <Button
          variant='outlined'
          onClick={onClose}
          disabled={isSubmitting}
          sx={{
            borderRadius: '9999px',
            borderColor: '#DCD8EC',
            color: '#6B7280',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: '#6C5CE7',
              color: '#6C5CE7'
            }
          }}
        >
          Cancelar
        </Button>
        <Button
          variant='contained'
          onClick={handleConfirm}
          disabled={isSubmitting || motivo.trim().length < 5}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#DC2626',
              boxShadow: 'none'
            }
          }}
          startIcon={
            isSubmitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-ban text-base' />
          }
        >
          {isSubmitting ? 'Anulando...' : 'Confirmar Anulación'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
