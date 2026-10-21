'use client'

import React, { useState, useEffect } from 'react'
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'

import { accountingService } from '@/services/accountingService'
import type { Journal, AccountingInvoice, CurrencyCode, PaymentMethod } from '@/types/accountingTypes'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  journals: Journal[]
  invoices: AccountingInvoice[]
  tasaBcv: number
  preselectedJournalId?: string
}

export const SinglePaymentDrawer: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  journals,
  invoices,
  tasaBcv,
  preselectedJournalId
}) => {
  const bankJournals = journals.filter(j => j.tipo.startsWith('BANCO') || j.tipo === 'CAJA')

  const [selectedJournalId, setSelectedJournalId] = useState(preselectedJournalId || bankJournals[0]?.id || '')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [moneda, setMoneda] = useState<CurrencyCode>('USD')
  const [monto, setMonto] = useState<string>('')
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('TRANSFERENCIA')
  const [referenciaBancaria, setReferenciaBancaria] = useState('')
  const [aplicaIgtf, setAplicaIgtf] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Facturas pendientes
  const pendingInvoices = invoices.filter(i => i.saldoPendienteUsd > 0)
  const selectedInvoice = pendingInvoices.find(i => i.id === selectedInvoiceId)

  useEffect(() => {
    if (preselectedJournalId) {
      setSelectedJournalId(preselectedJournalId)
    }
  }, [preselectedJournalId])

  useEffect(() => {
    if (selectedInvoice) {
      if (moneda === 'USD') {
        setMonto(selectedInvoice.saldoPendienteUsd.toString())
      } else {
        setMonto((selectedInvoice.saldoPendienteUsd * tasaBcv).toFixed(2))
      }
    }
  }, [selectedInvoiceId, moneda, tasaBcv])

  // Cálculo de Diferencial Cambiario en VES
  let difCambiarioVes = 0
  let esGanancia = false

  if (selectedInvoice && moneda === 'VES' && Number(monto) > 0) {
    const montoUsdEquiv = Number(monto) / tasaBcv
    const costoHistoricoVes = montoUsdEquiv * selectedInvoice.tasaBcv
    const costoActualVes = Number(monto)

    difCambiarioVes = Number((costoActualVes - costoHistoricoVes).toFixed(2))
    esGanancia = difCambiarioVes > 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numericMonto = parseFloat(monto)

    if (isNaN(numericMonto) || numericMonto <= 0) return

    setSubmitting(true)

    try {
      const res = await accountingService.createPayment({
        contactoId: selectedInvoice ? selectedInvoice.contactoId : 'ct-gen',
        contactoNombre: selectedInvoice ? selectedInvoice.contactoNombre : 'Beneficiario General',
        diarioId: selectedJournalId,
        metodoPago,
        moneda,
        monto: numericMonto,
        tasaBcvPago: tasaBcv,
        facturaId: selectedInvoice?.id,
        aplicaIgtf,
        referenciaBancaria: referenciaBancaria.trim() || undefined
      })

      onSuccess(`Pago ${res.payment.numeroPago} contabilizado exitosamente en asiento ${res.entry.numeroAsiento}.`)
      onClose()
    } catch (err: any) {
      alert(err?.message || 'Error al procesar el pago')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 480 },
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E6E4F0'
        }
      }}
    >
      <div className='flex flex-col h-full'>
        {/* Header */}
        <div className='p-5 bg-[#FAFAFC] border-b border-[#E6E4F0] flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold text-lg'>
              <i className='tabler-credit-card' />
            </div>
            <div>
              <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                Registrar Pago / Cobro
              </Typography>
              <span className='text-xs text-[#6B7280]'>
                Emisión de pagos bancarios con conciliación y diferencial
              </span>
            </div>
          </div>
          <IconButton onClick={onClose} size='small'>
            <i className='tabler-x text-lg text-[#6B7280]' />
          </IconButton>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className='p-6 flex-1 overflow-y-auto flex flex-col gap-4'>
          {/* Factura a Conciliar (Opcional) */}
          <TextField
            select
            size='small'
            label='Factura a Conciliar (Opcional)'
            value={selectedInvoiceId}
            onChange={e => setSelectedInvoiceId(e.target.value)}
            fullWidth
            helperText={selectedInvoice ? `Emisión: Tasa ${selectedInvoice.tasaBcv} Bs/USD | Saldo: $${selectedInvoice.saldoPendienteUsd.toFixed(2)}` : 'Seleccione para vincular y cancelar factura'}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          >
            <MenuItem value=''>
              <em>-- Pago Libre / Sin Factura Asociada --</em>
            </MenuItem>
            {pendingInvoices.map(inv => (
              <MenuItem key={inv.id} value={inv.id}>
                <div className='flex items-center justify-between w-full gap-2 text-xs'>
                  <span className='font-bold text-[#1E1B2E]'>{inv.numeroFactura} - {inv.contactoNombre}</span>
                  <span className='font-mono font-bold text-[#6C5CE7]'>${inv.saldoPendienteUsd.toFixed(2)}</span>
                </div>
              </MenuItem>
            ))}
          </TextField>

          {/* Diario de Salida / Entrada */}
          <TextField
            select
            size='small'
            label='Diario de Banco o Caja'
            value={selectedJournalId}
            onChange={e => setSelectedJournalId(e.target.value)}
            required
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          >
            {bankJournals.map(j => (
              <MenuItem key={j.id} value={j.id}>
                <div className='flex items-center justify-between w-full gap-2'>
                  <span className='text-sm text-[#1E1B2E] font-medium'>{j.nombre}</span>
                  <span className='font-mono text-xs text-[#6B7280]'>${j.saldoActualUsd.toFixed(2)}</span>
                </div>
              </MenuItem>
            ))}
          </TextField>

          {/* Moneda y Monto */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <TextField
              select
              size='small'
              label='Moneda de Pago'
              value={moneda}
              onChange={e => setMoneda(e.target.value as CurrencyCode)}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            >
              <MenuItem value='USD'>Dólares Americanos ($ USD)</MenuItem>
              <MenuItem value='VES'>Bolívares Digitales (Bs. VES)</MenuItem>
            </TextField>

            <TextField
              size='small'
              label='Monto a Pagar'
              type='number'
              value={monto}
              onChange={e => setMonto(e.target.value)}
              required
              fullWidth
              inputProps={{ min: '0.01', step: '0.01' }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            />
          </div>

          {/* Método de Pago y Referencia */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <TextField
              select
              size='small'
              label='Método de Pago'
              value={metodoPago}
              onChange={e => setMetodoPago(e.target.value as PaymentMethod)}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            >
              <MenuItem value='TRANSFERENCIA'>Transferencia Bancaria</MenuItem>
              <MenuItem value='PAGO_MOVIL'>Pago Móvil C2P / P2P</MenuItem>
              <MenuItem value='EFECTIVO'>Efectivo Divisas / Bs.</MenuItem>
              <MenuItem value='ZELLE'>Zelle / Wire Transfer</MenuItem>
            </TextField>

            <TextField
              size='small'
              label='Referencia / N° Operación'
              placeholder='Ej. 08492041'
              value={referenciaBancaria}
              onChange={e => setReferenciaBancaria(e.target.value)}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            />
          </div>

          {/* Tasa BCV Informativa */}
          <div className='p-3 rounded-xl bg-[#F8F7FC] border border-[#E6E4F0] flex items-center justify-between text-xs text-[#6B7280]'>
            <span>Tasa BCV del Día:</span>
            <strong className='font-mono text-sm text-[#1E1B2E]'>{tasaBcv.toFixed(2)} Bs/USD</strong>
          </div>

          {/* Alerta de Diferencial Cambiario si aplica */}
          {selectedInvoice && moneda === 'VES' && Math.abs(difCambiarioVes) > 0.01 && (
            <Alert
              severity={esGanancia ? 'success' : 'warning'}
              className='text-xs'
              sx={{ borderRadius: '14px', border: '1px solid #E6E4F0' }}
            >
              <strong>Diferencial Cambiario:</strong>{' '}
              {esGanancia
                ? `Ganancia en cambio de +${difCambiarioVes.toFixed(2)} Bs. generada.`
                : `Pérdida en cambio de ${difCambiarioVes.toFixed(2)} Bs. registrada en cuenta 6.1.02.02.`}
              <br />
              <span className='text-[11px] text-[#6B7280]'>
                (Tasa factura: {selectedInvoice.tasaBcv.toFixed(2)} Bs. vs Tasa pago: {tasaBcv.toFixed(2)} Bs.)
              </span>
            </Alert>
          )}

          {/* Switch IGTF (3%) si es en USD */}
          {moneda === 'USD' && (
            <div className='p-3.5 rounded-xl border border-[#E6E4F0] bg-[#FAFAFC] flex items-center justify-between'>
              <div>
                <Typography variant='caption' className='font-bold text-[#1E1B2E] block'>
                  Aplica IGTF Divisas (3%)
                </Typography>
                <span className='text-[11px] text-[#6B7280]'>
                  Genera apunte contable a cuenta 2.1.02.02
                </span>
              </div>
              <Switch checked={aplicaIgtf} onChange={e => setAplicaIgtf(e.target.checked)} color='primary' />
            </div>
          )}

          <div className='mt-auto pt-6 flex items-center justify-end gap-2.5'>
            <Button
              variant='outlined'
              onClick={onClose}
              sx={{
                borderRadius: '9999px',
                borderColor: '#E6E4F0',
                color: '#6B7280',
                textTransform: 'none',
                fontWeight: 600,
                px: 3
              }}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              variant='contained'
              disabled={submitting || !monto}
              startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-check' />}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                color: '#FFFFFF',
                fontWeight: 600,
                textTransform: 'none',
                px: 3.5,
                boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
                '&:hover': { backgroundColor: '#5B4CDB' }
              }}
            >
              {submitting ? 'Contabilizando...' : 'Contabilizar Pago'}
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}
