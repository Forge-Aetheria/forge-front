'use client'

import React, { useState, useEffect } from 'react'
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

import { accountingService } from '@/services/accountingService'
import type {
  AccountingInvoice,
  CurrencyCode,
  Journal,
  Payment,
  PaymentMethod
} from '@/types/accountingTypes'
import type { BankAccount } from '@/types/bankAccountTypes'
import { bankAccountsService } from '@/services/bankAccountsService'
import { BankAccountModal } from '@/views/contacts/components/BankAccountModal'

interface Props {
  open: boolean
  onClose: () => void
  invoice: AccountingInvoice
  onPaymentSuccess: (updatedInvoice: AccountingInvoice, payment: Payment) => void
}

export const RegisterInvoicePaymentModal: React.FC<Props> = ({
  open,
  onClose,
  invoice,
  onPaymentSuccess
}) => {
  const [journals, setJournals] = useState<Journal[]>([])
  const [loadingJournals, setLoadingJournals] = useState(true)

  const [diarioId, setDiarioId] = useState<string>('')
  const [moneda, setMoneda] = useState<CurrencyCode>('USD')
  const [monto, setMonto] = useState<number>(invoice.saldoPendienteUsd)
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('TRANSFERENCIA')
  const [tasaBcvPago, setTasaBcvPago] = useState<number>(invoice.tasaBcv || 54.0)
  const [fechaPago, setFechaPago] = useState<string>(new Date().toISOString().split('T')[0])
  const [referenciaBancaria, setReferenciaBancaria] = useState<string>('')

  // Cuentas Bancarias
  const [contactBankAccounts, setContactBankAccounts] = useState<BankAccount[]>([])
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('NONE')
  const [addBankModalOpen, setAddBankModalOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const fetchBankAccounts = async () => {
      try {
        const list = await bankAccountsService.getContactBankAccounts(invoice.contactoId)
        setContactBankAccounts(list)
        const defAcc = list.find(a => a.is_predeterminada) || list[0]
        if (defAcc) {
          setSelectedBankAccountId(defAcc.id)
        } else {
          setSelectedBankAccountId('NONE')
        }
      } catch (err) {
        console.error(err)
      }
    }

    fetchBankAccounts()

    const fetchJournals = async () => {
      try {
        setLoadingJournals(true)
        const allJournals = await accountingService.getJournals()
        const bankJournals = allJournals.filter(
          j => j.tipo.startsWith('BANCO') || j.tipo === 'CAJA'
        )

        setJournals(bankJournals)

        // Select default journal based on currency or first available
        if (bankJournals.length > 0) {
          const defaultJ =
            bankJournals.find(j => (moneda === 'USD' ? j.codigo.includes('USD') : j.codigo.includes('VES'))) ||
            bankJournals[0]

          setDiarioId(defaultJ.id)
        }
      } finally {
        setLoadingJournals(false)
      }
    }

    fetchJournals()

    // Reset amounts
    setMonto(invoice.saldoPendienteUsd)
    setMoneda('USD')
    setTasaBcvPago(invoice.tasaBcv || 54.0)
    setFechaPago(new Date().toISOString().split('T')[0])
    setReferenciaBancaria('')
    setErrorMsg(null)
  }, [open, invoice])

  // When currency changes, adapt amount to default to remaining balance in that currency
  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setMoneda(newCurrency)

    if (newCurrency === 'USD') {
      setMonto(invoice.saldoPendienteUsd)
    } else {
      const vesAmount = Number((invoice.saldoPendienteUsd * tasaBcvPago).toFixed(2))

      setMonto(vesAmount)
    }

    // Auto-select corresponding bank journal if available
    const matched = journals.find(j =>
      newCurrency === 'USD' ? j.codigo.includes('USD') : j.codigo.includes('VES')
    )

    if (matched) {
      setDiarioId(matched.id)
    }
  }

  // Calculate equivalent in both currencies
  const montoUsd = moneda === 'USD' ? monto : Number((monto / tasaBcvPago).toFixed(2))
  const montoVes = moneda === 'VES' ? monto : Number((monto * tasaBcvPago).toFixed(2))

  const saldoRestanteUsd = Math.max(0, Number((invoice.saldoPendienteUsd - montoUsd).toFixed(2)))
  const saldoRestanteVes = Math.max(0, Number((saldoRestanteUsd * tasaBcvPago).toFixed(2)))

  // Exchange difference calculation for VES payments
  const showExchangeDifference = moneda === 'VES' && tasaBcvPago !== invoice.tasaBcv
  const costoEmisionVes = Number((montoUsd * invoice.tasaBcv).toFixed(2))
  const diferencialCambiarioVes = Number((montoVes - costoEmisionVes).toFixed(2))

  const handleSubmit = async () => {
    if (!diarioId) {
      setErrorMsg('Selecciona un diario de tesorería (Banco o Caja).')

      return
    }

    if (monto <= 0) {
      setErrorMsg('El monto a abonar debe ser mayor a 0.')

      return
    }

    if (montoUsd > invoice.saldoPendienteUsd + 0.05) {
      setErrorMsg(`El monto ingresado ($${montoUsd.toFixed(2)}) supera el saldo pendiente ($${invoice.saldoPendienteUsd.toFixed(2)}).`)

      return
    }

    try {
      setSubmitting(true)
      setErrorMsg(null)

      const matchedAccount = contactBankAccounts.find(a => a.id === selectedBankAccountId)
      const cuentaInfo = matchedAccount
        ? `${matchedAccount.banco} (${matchedAccount.numero_cuenta})${matchedAccount.is_pago_movil && matchedAccount.telefono_pago_movil ? ` - PM: ${matchedAccount.telefono_pago_movil}` : ''}`
        : undefined

      const result = await accountingService.registerInvoicePayment({
        invoiceId: invoice.id,
        diarioId,
        metodoPago,
        moneda,
        monto,
        tasaBcvPago,
        referenciaBancaria: referenciaBancaria.trim() || undefined,
        cuentaBancariaId: matchedAccount?.id,
        cuentaBancariaInfo: cuentaInfo,
        fecha: fechaPago
      })

      onPaymentSuccess(result.invoice, result.payment)
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al procesar el pago de la factura.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          border: '1px solid #E6E4F0',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
        }
      }}
    >
      <DialogTitle sx={{ p: 4, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant='h6' sx={{ fontWeight: 800, color: '#1E293B' }}>
              Registrar Pago de Factura
            </Typography>
            <Chip
              label={invoice.numeroFactura}
              size='small'
              sx={{ fontWeight: 700, backgroundColor: 'rgba(108, 92, 231, 0.1)', color: '#6C5CE7' }}
            />
          </Box>
          <Typography variant='body2' sx={{ color: '#64748B', mt: 0.5 }}>
            {invoice.tipo === 'CUSTOMER' ? 'Cobro recibido del cliente' : 'Pago emitido al proveedor'}: {invoice.contactoNombre}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size='small' sx={{ color: '#94A3B8' }}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {errorMsg && (
          <Alert severity='error' sx={{ borderRadius: '12px' }}>
            {errorMsg}
          </Alert>
        )}

        {/* Resumen de Deuda Actual */}
        <Box
          sx={{
            p: 3,
            backgroundColor: '#F8FAFC',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2
          }}
        >
          <Box>
            <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>Total de la Factura:</Typography>
            <Typography variant='subtitle1' sx={{ fontWeight: 700, color: '#1E293B' }}>
              ${invoice.totalUsd.toFixed(2)} USD
            </Typography>
            <Typography variant='caption' sx={{ color: '#94A3B8' }}>
              {invoice.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
            </Typography>
          </Box>
          <Box>
            <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>Saldo Pendiente Actual:</Typography>
            <Typography variant='subtitle1' sx={{ fontWeight: 800, color: '#EF4444' }}>
              ${invoice.saldoPendienteUsd.toFixed(2)} USD
            </Typography>
            <Typography variant='caption' sx={{ color: '#EF4444' }}>
              {invoice.saldoPendienteVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
            </Typography>
          </Box>
        </Box>

        {/* Formulario de Pago */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
          {/* Diario de Tesorería */}
          <TextField
            select
            fullWidth
            size='small'
            label='Diario de Pago / Tesorería'
            value={diarioId}
            onChange={e => setDiarioId(e.target.value)}
            disabled={loadingJournals || submitting}
            sx={{ gridColumn: { xs: '1', sm: '1 / span 2' } }}
          >
            {journals.map(j => (
              <MenuItem key={j.id} value={j.id}>
                {j.nombre} ({j.codigo})
              </MenuItem>
            ))}
          </TextField>

          {/* Selector de Moneda de Pago */}
          <TextField
            select
            fullWidth
            size='small'
            label='Moneda de Pago'
            value={moneda}
            onChange={e => handleCurrencyChange(e.target.value as CurrencyCode)}
            disabled={submitting}
          >
            <MenuItem value='USD'>Dólares Americanos (USD $)</MenuItem>
            <MenuItem value='VES'>Bolívares Digitales (VES Bs.)</MenuItem>
          </TextField>

          {/* Método de Pago */}
          <TextField
            select
            fullWidth
            size='small'
            label='Método de Pago'
            value={metodoPago}
            onChange={e => setMetodoPago(e.target.value as PaymentMethod)}
            disabled={submitting}
          >
            <MenuItem value='TRANSFERENCIA'>Transferencia Bancaria</MenuItem>
            <MenuItem value='PAGO_MOVIL'>Pago Móvil</MenuItem>
            <MenuItem value='EFECTIVO'>Efectivo en Caja</MenuItem>
            <MenuItem value='ZELLE'>Zelle / Wire</MenuItem>
          </TextField>

          {/* Cuenta Bancaria Asociada al Contacto */}
          <Box sx={{ p: 2, borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569' }}>
                {invoice.tipo === 'SUPPLIER'
                  ? 'Cuenta Bancaria de Destino (Proveedor)'
                  : 'Cuenta Bancaria de Origen / Pago Móvil (Cliente)'}
              </Typography>
              <Button
                size='small'
                variant='text'
                startIcon={<i className='tabler-plus text-xs' />}
                onClick={() => setAddBankModalOpen(true)}
                sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: '#6C5CE7', p: 0, minWidth: 0 }}
              >
                + Registrar Nueva Cuenta
              </Button>
            </Box>

            <TextField
              select
              fullWidth
              size='small'
              value={selectedBankAccountId}
              onChange={e => setSelectedBankAccountId(e.target.value)}
              disabled={submitting}
              sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px' }}
            >
              <MenuItem value='NONE'>
                <em>Sin cuenta específica asignada (Efectivo / Caja u Otro)</em>
              </MenuItem>
              {contactBankAccounts.map(acc => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.banco} — {acc.numero_cuenta} ({acc.moneda}) {acc.is_pago_movil && acc.telefono_pago_movil ? `• PM: ${acc.telefono_pago_movil}` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Monto a Abonar */}
          <TextField
            fullWidth
            size='small'
            type='number'
            label={`Monto a Pagar (${moneda})`}
            value={monto}
            onChange={e => setMonto(Number(e.target.value))}
            disabled={submitting}
            inputProps={{ min: 0.01, step: 0.01 }}
            InputProps={{
              endAdornment: (
                <Typography variant='caption' sx={{ fontWeight: 700, color: '#6C5CE7' }}>
                  {moneda}
                </Typography>
              )
            }}
          />

          {/* Tasa BCV del Pago */}
          <TextField
            fullWidth
            size='small'
            type='number'
            label='Tasa Oficial BCV'
            value={tasaBcvPago}
            onChange={e => setTasaBcvPago(Number(e.target.value))}
            disabled={submitting}
            inputProps={{ min: 0.01, step: 0.01 }}
            InputProps={{
              endAdornment: (
                <Typography variant='caption' sx={{ fontWeight: 600, color: '#64748B' }}>
                  Bs/USD
                </Typography>
              )
            }}
          />

          {/* Fecha del Pago */}
          <TextField
            fullWidth
            size='small'
            type='date'
            label='Fecha de Pago'
            value={fechaPago}
            onChange={e => setFechaPago(e.target.value)}
            disabled={submitting}
            InputLabelProps={{ shrink: true }}
          />

          {/* Referencia Bancaria */}
          <TextField
            fullWidth
            size='small'
            label='N° Referencia Bancaria / Comprobante'
            placeholder='Ej: REF-983410'
            value={referenciaBancaria}
            onChange={e => setReferenciaBancaria(e.target.value)}
            disabled={submitting}
          />
        </Box>

        {/* Alerta de Diferencial Cambiario si aplica */}
        {showExchangeDifference && (
          <Box
            sx={{
              p: 2,
              backgroundColor: 'rgba(108, 92, 231, 0.06)',
              borderRadius: '12px',
              border: '1px solid rgba(108, 92, 231, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box>
              <Typography variant='caption' sx={{ fontWeight: 700, color: '#6C5CE7', display: 'block' }}>
                Ajuste por Diferencial Cambiario
              </Typography>
              <Typography variant='caption' sx={{ color: '#475569' }}>
                Tasa emisión: {invoice.tasaBcv.toFixed(2)} Bs. ➔ Tasa pago: {tasaBcvPago.toFixed(2)} Bs.
              </Typography>
            </Box>
            <Chip
              label={`${diferencialCambiarioVes >= 0 ? '+' : ''}${diferencialCambiarioVes.toFixed(2)} Bs.`}
              size='small'
              sx={{
                fontWeight: 700,
                backgroundColor: diferencialCambiarioVes >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: diferencialCambiarioVes >= 0 ? '#10B981' : '#EF4444'
              }}
            />
          </Box>
        )}

        {/* Resumen del Saldo Restante después del Pago */}
        <Box
          sx={{
            p: 2.5,
            backgroundColor: saldoRestanteUsd <= 0.01 ? 'rgba(16, 185, 129, 0.08)' : '#F1F5F9',
            borderRadius: '16px',
            border: saldoRestanteUsd <= 0.01 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box>
            <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
              {saldoRestanteUsd <= 0.01 ? 'Pago Total — La factura quedará PAGADA' : 'Abono Parcial'}
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Monto a abonar: ${montoUsd.toFixed(2)} USD ({montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.)
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>Saldo Restante:</Typography>
            <Typography variant='subtitle1' sx={{ fontWeight: 800, color: saldoRestanteUsd <= 0.01 ? '#10B981' : '#EF4444' }}>
              ${saldoRestanteUsd.toFixed(2)} USD
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 4, pt: 1, borderTop: '1px solid #E6E4F0', gap: 2 }}>
        <Button
          variant='outlined'
          onClick={onClose}
          disabled={submitting}
          sx={{
            borderRadius: '9999px',
            borderColor: '#CBD5E1',
            color: '#64748B',
            textTransform: 'none',
            fontWeight: 600,
            px: 3
          }}
        >
          Cancelar
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-check' />}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            fontWeight: 700,
            textTransform: 'none',
            px: 4,
            '&:hover': { backgroundColor: '#5b4bc4' }
          }}
        >
          {submitting ? 'Contabilizando Pago...' : 'Validar y Registrar Pago'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Modal para Registrar Nueva Cuenta Bancaria al Contacto */}
    <BankAccountModal
      open={addBankModalOpen}
      onClose={() => setAddBankModalOpen(false)}
      onSuccess={saved => {
        setContactBankAccounts(prev => [saved, ...prev])
        setSelectedBankAccountId(saved.id)
      }}
      lockedContactId={invoice.contactoId}
      lockedContactName={invoice.contactoNombre}
    />
  </>
  )
}
