'use client'

import React, { useState } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import { accountingService } from '@/services/accountingService'
import type { AccountingInvoice } from '@/types/accountingTypes'

interface Props {
  open: boolean
  onClose: () => void
  invoice: AccountingInvoice
  onSuccess: (updatedInvoice: AccountingInvoice) => void
}

const COMMON_REASONS = [
  'Error en datos fiscales o RIF del cliente',
  'Error en cantidades o precios de los productos',
  'Factura emitida por duplicado',
  'Operación o venta cancelada por mutuo acuerdo',
  'Cambio de condiciones comerciales / Reemisión requerida',
  'Otro motivo'
]

export const CancelInvoiceModal: React.FC<Props> = ({
  open,
  onClose,
  invoice,
  onSuccess
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0])
  const [customReason, setCustomReason] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const hasPayments = (invoice.pagosAsociados && invoice.pagosAsociados.length > 0)

  const handleConfirmCancel = async () => {
    try {
      setSubmitting(true)
      setErrorMsg(null)

      const finalReason = selectedReason === 'Otro motivo'
        ? (customReason.trim() || 'Anulación justificada por usuario')
        : (customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason)

      const canceledInvoice = await accountingService.cancelInvoice(invoice.id, finalReason)

      onSuccess(canceledInvoice)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al anular la factura')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
          border: '1px solid #E6E4F0',
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            <i className='tabler-ban' />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 800, color: '#1E293B' }}>
              Anular Factura {invoice.numeroFactura}
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              {invoice.contactoNombre} • Total: ${invoice.totalUsd.toFixed(2)} USD
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={submitting} size='small'>
          <i className='tabler-x text-lg' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
        {errorMsg && (
          <Alert severity='error' sx={{ borderRadius: '12px' }}>
            {errorMsg}
          </Alert>
        )}

        {hasPayments ? (
          <Alert
            severity='warning'
            icon={<i className='tabler-alert-triangle text-lg' />}
            sx={{ borderRadius: '16px', border: '1px solid #FCD34D' }}
          >
            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#92400E' }}>
              No se puede anular directamente
            </Typography>
            <Typography variant='body2' sx={{ color: '#B45309', mt: 0.5 }}>
              Esta factura tiene <strong>{invoice.pagosAsociados?.length} pago(s) o cobro(s) conciliados</strong>.
              Para reversar la operación contable y fiscal legalmente, debes emitir una <strong>Nota de Crédito</strong> o bien eliminar los pagos asociados en la pestaña &apos;Pagos Conciliados&apos;.
            </Typography>
          </Alert>
        ) : (
          <Box sx={{ p: 2, borderRadius: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2' }}>
            <Typography variant='body2' sx={{ color: '#991B1B', fontWeight: 600 }}>
              ¿Estás seguro de anular esta factura?
            </Typography>
            <Typography variant='caption' sx={{ color: '#B91C1C', display: 'block', mt: 0.5 }}>
              Al anularla, el estado cambiará a <strong>ANULADA</strong>, el asiento contable asociado en el diario será cancelado y el saldo pendiente quedará en $0.00.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select
            fullWidth
            label='Motivo de la anulación'
            value={selectedReason}
            onChange={e => setSelectedReason(e.target.value)}
            disabled={hasPayments || submitting}
            size='small'
          >
            {COMMON_REASONS.map(reason => (
              <MenuItem key={reason} value={reason}>
                {reason}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={3}
            label={selectedReason === 'Otro motivo' ? 'Especificar motivo *' : 'Observaciones adicionales (opcional)'}
            placeholder='Detalla el motivo para registro contable y auditoría...'
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            disabled={hasPayments || submitting}
            required={selectedReason === 'Otro motivo'}
            size='small'
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1.5 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{
            borderRadius: '9999px',
            color: '#64748B',
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          {hasPayments ? 'Entendido' : 'Cancelar'}
        </Button>

        {!hasPayments && (
          <Button
            variant='contained'
            onClick={handleConfirmCancel}
            disabled={submitting || (selectedReason === 'Otro motivo' && !customReason.trim())}
            startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-ban' />}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
              '&:hover': { backgroundColor: '#DC2626' }
            }}
          >
            {submitting ? 'Anulando...' : 'Confirmar Anulación'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
