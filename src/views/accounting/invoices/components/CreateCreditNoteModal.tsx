'use client'

import React, { useState, useEffect, useMemo } from 'react'

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
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { accountingService } from '@/services/accountingService'
import type { AccountingInvoice, InvoiceLine } from '@/types/accountingTypes'

interface Props {
  open: boolean
  onClose: () => void
  invoice: AccountingInvoice
  onSuccess: (creditNote: AccountingInvoice, updatedInvoice: AccountingInvoice) => void
}

type Mode = 'TOTAL' | 'PARCIAL_MONTO' | 'DEVOLUCION_LINEAS'

const COMMON_REASONS = [
  'Devolución de mercancía o rechazo de servicio',
  'Descuento comercial posterior o bonificación especial',
  'Ajuste de precio o corrección de tarifas facturadas',
  'Anulación total de factura por mutuo acuerdo',
  'Reclamo por garantía o defecto de producto',
  'Otro motivo'
]

export const CreateCreditNoteModal: React.FC<Props> = ({
  open,
  onClose,
  invoice,
  onSuccess
}) => {
  const [mode, setMode] = useState<Mode>('TOTAL')
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0])
  const [customReason, setCustomReason] = useState<string>('')
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0])

  // Custom amount mode
  const [montoPersonalizadoUsd, setMontoPersonalizadoUsd] = useState<number>(invoice.saldoPendienteUsd || invoice.totalUsd)

  // Line return mode: map from line id to return quantity
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({})

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setMode('TOTAL')
    setSelectedReason(COMMON_REASONS[0])
    setCustomReason('')
    setFecha(new Date().toISOString().split('T')[0])
    setMontoPersonalizadoUsd(Number(invoice.saldoPendienteUsd.toFixed(2)) || Number(invoice.totalUsd.toFixed(2)))

    // Initialize line return quantities to 0
    const initialQty: Record<string, number> = {}

    invoice.lineas.forEach(l => {
      initialQty[l.id] = 0
    })
    setReturnQuantities(initialQty)
    setErrorMsg(null)
  }, [open, invoice])

  // Calculate totals based on mode
  const calculation = useMemo(() => {
    if (mode === 'TOTAL') {
      return {
        subtotalUsd: invoice.totalNetoUsd,
        ivaUsd: invoice.totalIvaUsd,
        totalUsd: invoice.totalUsd,
        totalVes: invoice.totalVes,
        lines: invoice.lineas.map((l, idx) => ({ ...l, id: `nc-line-${idx}` }))
      }
    }

    if (mode === 'PARCIAL_MONTO') {
      const parsedAmount = Math.max(0, Number(montoPersonalizadoUsd) || 0)
      const ivaRate = invoice.lineas[0]?.tasaImpuestoPct ?? 16
      const baseNeto = ivaRate > 0 ? Number((parsedAmount / (1 + ivaRate / 100)).toFixed(2)) : parsedAmount
      const ivaAmount = Number((parsedAmount - baseNeto).toFixed(2))
      const totalVes = Number((parsedAmount * invoice.tasaBcv).toFixed(2))

      return {
        subtotalUsd: baseNeto,
        ivaUsd: ivaAmount,
        totalUsd: parsedAmount,
        totalVes,
        lines: [
          {
            id: `nc-line-custom`,
            productoOConcepto: `Ajuste / Descuento parcial (${selectedReason})`,
            cuentaContableId: invoice.lineas[0]?.cuentaContableId || (invoice.tipo === 'CUSTOMER' ? 'acc-410101' : 'acc-510101'),
            cuentaContableNombre: invoice.lineas[0]?.cuentaContableNombre,
            cantidad: 1,
            precioUnitarioUsd: baseNeto,
            tasaImpuestoPct: ivaRate,
            subtotalUsd: baseNeto,
            ivaUsd: ivaAmount,
            totalUsd: parsedAmount
          }
        ]
      }
    }

    // DEVOLUCION_LINEAS
    const linesToReturn: InvoiceLine[] = []
    let subtotalUsd = 0
    let ivaUsd = 0

    invoice.lineas.forEach((origLine, idx) => {
      const qtyToReturn = Number(returnQuantities[origLine.id]) || 0

      if (qtyToReturn > 0) {
        const lineSubtotal = Number((qtyToReturn * origLine.precioUnitarioUsd).toFixed(2))
        const lineIva = Number(((lineSubtotal * origLine.tasaImpuestoPct) / 100).toFixed(2))
        const lineTotal = Number((lineSubtotal + lineIva).toFixed(2))

        subtotalUsd += lineSubtotal
        ivaUsd += lineIva

        linesToReturn.push({
          id: `nc-line-${idx}`,
          productoOConcepto: origLine.productoOConcepto,
          cuentaContableId: origLine.cuentaContableId,
          cuentaContableNombre: origLine.cuentaContableNombre,
          cantidad: qtyToReturn,
          precioUnitarioUsd: origLine.precioUnitarioUsd,
          tasaImpuestoPct: origLine.tasaImpuestoPct,
          subtotalUsd: lineSubtotal,
          ivaUsd: lineIva,
          totalUsd: lineTotal
        })
      }
    })

    const totalUsd = Number((subtotalUsd + ivaUsd).toFixed(2))
    const totalVes = Number((totalUsd * invoice.tasaBcv).toFixed(2))

    return {
      subtotalUsd: Number(subtotalUsd.toFixed(2)),
      ivaUsd: Number(ivaUsd.toFixed(2)),
      totalUsd,
      totalVes,
      lines: linesToReturn
    }
  }, [mode, montoPersonalizadoUsd, returnQuantities, invoice, selectedReason])

  const nuevoSaldoPendienteUsd = Math.max(0, Number((invoice.saldoPendienteUsd - calculation.totalUsd).toFixed(2)))

  const isFormValid =
    calculation.totalUsd > 0 &&
    calculation.totalUsd <= invoice.totalUsd &&
    (selectedReason !== 'Otro motivo' || customReason.trim().length > 0)

  const handleConfirm = async () => {
    try {
      setSubmitting(true)
      setErrorMsg(null)

      const finalReason = selectedReason === 'Otro motivo'
        ? (customReason.trim() || 'Nota de crédito emitida por usuario')
        : (customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason)

      const result = await accountingService.createCreditNoteForInvoice({
        facturaId: invoice.id,
        motivo: finalReason,
        tipoNota: mode === 'TOTAL' ? 'TOTAL' : 'PARCIAL',
        lineas: calculation.lines,
        fecha
      })

      onSuccess(result.creditNote, result.updatedInvoice)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al emitir la Nota de Crédito')
    } finally {
      setSubmitting(false)
    }
  }

  const isSupplier = invoice.tipo === 'SUPPLIER'

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth='md'
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
              backgroundColor: 'rgba(108, 92, 231, 0.12)',
              color: '#6C5CE7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            <i className='tabler-receipt-refund' />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 800, color: '#1E293B' }}>
              Emitir Nota de Crédito
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Documento de ajuste para la Factura <strong>{invoice.numeroFactura}</strong> • {invoice.contactoNombre}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={submitting} size='small'>
          <i className='tabler-x text-lg' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '16px !important' }}>
        {errorMsg && (
          <Alert severity='error' sx={{ borderRadius: '12px' }}>
            {errorMsg}
          </Alert>
        )}

        {/* Resumen de la Factura Original */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
            gap: 2,
            p: 2.5,
            borderRadius: '16px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0'
          }}
        >
          <Box>
            <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>Factura Original</Typography>
            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B' }}>{invoice.numeroFactura}</Typography>
          </Box>
          <Box>
            <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>Total Facturado</Typography>
            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B' }}>${invoice.totalUsd.toFixed(2)} USD</Typography>
          </Box>
          <Box>
            <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>Saldo Pendiente</Typography>
            <Typography variant='subtitle2' sx={{ fontWeight: 800, color: invoice.saldoPendienteUsd > 0 ? '#EF4444' : '#10B981' }}>
              ${invoice.saldoPendienteUsd.toFixed(2)} USD
            </Typography>
          </Box>
          <Box>
            <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>Tasa BCV</Typography>
            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#6C5CE7' }}>{invoice.tasaBcv.toFixed(2)} Bs/USD</Typography>
          </Box>
        </Box>

        {/* Modalidad de la Nota de Crédito */}
        <Box>
          <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B', mb: 1 }}>
            Tipo / Modalidad de Nota de Crédito
          </Typography>
          <RadioGroup
            row
            value={mode}
            onChange={e => setMode(e.target.value as Mode)}
            sx={{ gap: 2 }}
          >
            <FormControlLabel
              value='TOTAL'
              control={<Radio size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }} />}
              label={<Typography variant='body2' sx={{ fontWeight: 600 }}>Total (100% de la Factura)</Typography>}
            />
            <FormControlLabel
              value='PARCIAL_MONTO'
              control={<Radio size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }} />}
              label={<Typography variant='body2' sx={{ fontWeight: 600 }}>Por Monto / Descuento</Typography>}
            />
            <FormControlLabel
              value='DEVOLUCION_LINEAS'
              control={<Radio size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }} />}
              label={<Typography variant='body2' sx={{ fontWeight: 600 }}>Por Devolución de Líneas</Typography>}
            />
          </RadioGroup>
        </Box>

        {/* Formulario según modalidad */}
        {mode === 'PARCIAL_MONTO' && (
          <Box sx={{ p: 2.5, borderRadius: '16px', backgroundColor: '#FDFBFE', border: '1px solid #ECE7FB' }}>
            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#6C5CE7', mb: 1.5 }}>
              Importe a Acreditar (USD)
            </Typography>
            <TextField
              type='number'
              fullWidth
              size='small'
              label='Monto Total de la Nota de Crédito (USD)'
              value={montoPersonalizadoUsd}
              onChange={e => setMontoPersonalizadoUsd(Math.max(0, Number(e.target.value)))}
              inputProps={{ min: 0.01, max: invoice.totalUsd, step: '0.01' }}
              helperText={`Máximo disponible: $${invoice.totalUsd.toFixed(2)} USD (Saldo pendiente: $${invoice.saldoPendienteUsd.toFixed(2)})`}
            />
          </Box>
        )}

        {mode === 'DEVOLUCION_LINEAS' && (
          <Box>
            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B', mb: 1 }}>
              Selecciona las cantidades a devolver por cada ítem
            </Typography>
            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '14px', maxHeight: 240 }}>
              <Table size='small'>
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Concepto / Producto</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Cant. Facturada</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Precio ($)</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 700, color: '#6C5CE7', width: 140 }}>Cant. a Devolver</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Total ($)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.lineas.map(line => {
                    const currentQty = returnQuantities[line.id] || 0
                    const lineTotal = Number((currentQty * line.precioUnitarioUsd * (1 + line.tasaImpuestoPct / 100)).toFixed(2))

                    return (
                      <TableRow key={line.id}>
                        <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>{line.productoOConcepto}</TableCell>
                        <TableCell align='right' sx={{ color: '#64748B' }}>{line.cantidad}</TableCell>
                        <TableCell align='right' sx={{ color: '#64748B' }}>${line.precioUnitarioUsd.toFixed(2)}</TableCell>
                        <TableCell align='center'>
                          <TextField
                            type='number'
                            size='small'
                            value={currentQty}
                            onChange={e => {
                              const val = Math.min(line.cantidad, Math.max(0, Number(e.target.value)))

                              setReturnQuantities(prev => ({ ...prev, [line.id]: val }))
                            }}
                            inputProps={{ min: 0, max: line.cantidad, style: { textAlign: 'center', padding: '4px' } }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 700, color: currentQty > 0 ? '#6C5CE7' : '#94A3B8' }}>
                          ${lineTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Datos Generales de la Nota */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Motivo Comercial / Fiscal'
            value={selectedReason}
            onChange={e => setSelectedReason(e.target.value)}
          >
            {COMMON_REASONS.map(r => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type='date'
            fullWidth
            size='small'
            label='Fecha de Emisión'
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <TextField
          fullWidth
          size='small'
          label={selectedReason === 'Otro motivo' ? 'Especificar motivo de la nota *' : 'Observaciones o justificación adicional (opcional)'}
          placeholder='Añade detalles para el asiento y soporte de auditoría...'
          value={customReason}
          onChange={e => setCustomReason(e.target.value)}
          required={selectedReason === 'Otro motivo'}
        />

        {/* Tarjeta de Cálculo y Asiento Preview */}
        <Box
          sx={{
            p: 3,
            borderRadius: '20px',
            backgroundColor: '#F3F0FF',
            border: '1px solid #D8D0F8',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='subtitle1' sx={{ fontWeight: 800, color: '#4C3FAF' }}>
              Impacto Financiero de la Nota de Crédito
            </Typography>
            <Chip
              label={isSupplier ? 'Reversión Gasto / CxP' : 'Reversión Ingreso / CxC'}
              size='small'
              sx={{ backgroundColor: '#FFFFFF', color: '#6C5CE7', fontWeight: 700, border: '1px solid #6C5CE7' }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
            <Box>
              <Typography variant='caption' sx={{ color: '#6B7280' }}>Subtotal Neto a Acreditar</Typography>
              <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                ${calculation.subtotalUsd.toFixed(2)} USD
              </Typography>
            </Box>
            <Box>
              <Typography variant='caption' sx={{ color: '#6B7280' }}>IVA Reversado</Typography>
              <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                ${calculation.ivaUsd.toFixed(2)} USD
              </Typography>
            </Box>
            <Box>
              <Typography variant='caption' sx={{ color: '#6B7280' }}>Total Nota de Crédito</Typography>
              <Typography variant='subtitle1' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                ${calculation.totalUsd.toFixed(2)} USD
              </Typography>
              <Typography variant='caption' sx={{ color: '#6C5CE7', fontWeight: 600 }}>
                {calculation.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
              </Typography>
            </Box>
            <Box>
              <Typography variant='caption' sx={{ color: '#6B7280' }}>Nuevo Saldo Factura</Typography>
              <Typography variant='subtitle1' sx={{ fontWeight: 800, color: nuevoSaldoPendienteUsd === 0 ? '#10B981' : '#D97706' }}>
                ${nuevoSaldoPendienteUsd.toFixed(2)} USD
              </Typography>
              {nuevoSaldoPendienteUsd === 0 && (
                <Chip label='Pasa a REVERTIDA' size='small' sx={{ height: 18, fontSize: '0.65rem', backgroundColor: '#F3F0FF', color: '#6C5CE7', fontWeight: 800, border: '1px solid #6C5CE7' }} />
              )}
            </Box>
          </Box>
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
          Cancelar
        </Button>

        <Button
          variant='contained'
          onClick={handleConfirm}
          disabled={submitting || !isFormValid}
          startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-receipt-refund' />}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            color: '#FFFFFF',
            fontWeight: 700,
            textTransform: 'none',
            px: 3,
            boxShadow: '0 4px 12px rgba(108, 92, 231, 0.25)',
            '&:hover': { backgroundColor: '#5B4CDB' }
          }}
        >
          {submitting ? 'Generando Nota...' : 'Emitir y Aplicar Nota de Crédito'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
