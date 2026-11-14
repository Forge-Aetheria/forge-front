'use client'

// React Imports
import { useState, useMemo } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'

import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'

// Type Imports
import type { POSPaymentRecord, PaymentMethodType, ChangeResolutionType } from '@/types/posTypes'
import { posPaymentMethods } from '@/data/pos/mockPosData'
import { calculateTransaction } from '@/services/posService'

type Props = {
  open: boolean
  onClose: () => void
  baseTotalUSD: number
  bcvRate: number
  fiscalMode: boolean
  onCompleteSale: (payments: POSPaymentRecord[], changeMethod?: ChangeResolutionType) => void
}

const POSPaymentModal = ({
  open,
  onClose,
  baseTotalUSD,
  bcvRate,
  fiscalMode,
  onCompleteSale
}: Props) => {
  // States
  const [payments, setPayments] = useState<POSPaymentRecord[]>([])
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('cash_usd')
  const [inputCurrency, setInputCurrency] = useState<'USD' | 'VES'>('USD')
  const [amountInput, setAmountInput] = useState<string>('')
  const [referenceInput, setReferenceInput] = useState<string>('')
  const [changeResolution, setChangeResolution] = useState<ChangeResolutionType>('cash_ves')

  // Calculate live transaction with dynamic IGTF
  const summary = useMemo(() => {
    return calculateTransaction(baseTotalUSD, payments, bcvRate, fiscalMode)
  }, [baseTotalUSD, payments, bcvRate, fiscalMode])

  const selectedMethodConfig = posPaymentMethods.find(m => m.type === selectedMethod)

  // Suggest remaining balance when switching method
  const handleSelectMethod = (method: PaymentMethodType) => {
    setSelectedMethod(method)
    const config = posPaymentMethods.find(m => m.type === method)

    if (config?.currency === 'VES') {
      setInputCurrency('VES')
      setAmountInput(summary.remainingVES.toFixed(2))
    } else {
      setInputCurrency('USD')
      setAmountInput(summary.remainingUSD.toFixed(2))
    }
  }

  const handleAddPayment = () => {
    const entered = parseFloat(amountInput)

    if (isNaN(entered) || entered <= 0) return

    let amountUSD = 0
    let amountVES = 0

    if (inputCurrency === 'USD') {
      amountUSD = entered
      amountVES = entered * bcvRate
    } else {
      amountVES = entered
      amountUSD = entered / bcvRate
    }

    const causesIGTF = Boolean(fiscalMode && selectedMethodConfig?.causesIGTF)
    const igtfUSD = causesIGTF ? amountUSD * 0.03 : 0
    const igtfVES = igtfUSD * bcvRate

    const newRecord: POSPaymentRecord = {
      id: `pay-${Date.now()}`,
      method: selectedMethod,
      methodName: selectedMethodConfig?.name || selectedMethod,
      amountUSD,
      amountVES,
      exchangeRate: bcvRate,
      causesIGTF,
      igtfAmountUSD: igtfUSD,
      igtfAmountVES: igtfVES,
      reference: referenceInput.trim() || undefined
    }

    setPayments(prev => [...prev, newRecord])
    setAmountInput('')
    setReferenceInput('')
  }

  const handleRemovePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  const isFullyPaid = summary.remainingUSD <= 0.01

  const handleFinish = () => {
    onCompleteSale(payments, summary.changeUSD > 0 ? changeResolution : undefined)
    setPayments([])
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle className='flex items-center justify-between border-b border-[var(--mui-palette-divider)] pb-3'>
        <div className='flex items-center gap-2'>
          <div className='flex items-center justify-center is-8 bs-8 rounded-lg bg-primary/10 text-primary'>
            <i className='tabler-wallet text-xl' />
          </div>
          <div>
            <Typography variant='h6' className='font-bold leading-tight'>
              Cobro Multidivisa y Liquidación
            </Typography>
            <Typography variant='caption' className='text-textSecondary'>
              Tasa Oficial BCV: <strong>{bcvRate.toFixed(2)} Bs.</strong>
            </Typography>
          </div>
        </div>
        <IconButton size='small' onClick={onClose}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>

      <DialogContent className='pt-5 flex flex-col gap-5'>
        {/* Top Balances Bar */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--mui-palette-action-hover)] border border-[var(--mui-palette-divider)]'>
          <div className='flex flex-col'>
            <Typography variant='caption' className='text-textSecondary font-bold uppercase'>
              Total Cuenta {summary.igtfUSD > 0 && '(+IGTF)'}
            </Typography>
            <Typography variant='h6' className='font-bold font-mono text-textPrimary leading-tight'>
              ${summary.totalUSD.toFixed(2)}
            </Typography>
            <Typography variant='caption' className='font-mono text-textSecondary'>
              {summary.totalVES.toFixed(2)} Bs.
            </Typography>
          </div>

          <div className='flex flex-col'>
            <Typography variant='caption' className='text-textSecondary font-bold uppercase'>
              Total Abonado
            </Typography>
            <Typography variant='h6' className='font-bold font-mono text-success leading-tight'>
              ${summary.totalPaidUSD.toFixed(2)}
            </Typography>
            <Typography variant='caption' className='font-mono text-textSecondary'>
              {summary.totalPaidVES.toFixed(2)} Bs.
            </Typography>
          </div>

          <div className='flex flex-col'>
            <Typography variant='caption' className='text-textSecondary font-bold uppercase'>
              {summary.remainingUSD > 0.01 ? 'Saldo Pendiente' : 'Vuelto (Cambio)'}
            </Typography>
            <Typography
              variant='h6'
              className={`font-bold font-mono leading-tight ${
                summary.remainingUSD > 0.01 ? 'text-error' : 'text-primary'
              }`}
            >
              ${summary.remainingUSD > 0.01 ? summary.remainingUSD.toFixed(2) : summary.changeUSD.toFixed(2)}
            </Typography>
            <Typography variant='caption' className='font-mono text-textSecondary'>
              {summary.remainingUSD > 0.01
                ? `${summary.remainingVES.toFixed(2)} Bs.`
                : `${summary.changeVES.toFixed(2)} Bs.`}
            </Typography>
          </div>
        </div>

        {/* Dynamic IGTF Alert */}
        {fiscalMode && summary.igtfUSD > 0 && (
          <Alert severity='info' icon={<i className='tabler-receipt-tax' />} className='py-1 text-xs'>
            Se aplicó <strong>3% de IGTF (${summary.igtfUSD.toFixed(2)} / {summary.igtfVES.toFixed(2)} Bs.)</strong> sobre los abonos registrados en divisas.
          </Alert>
        )}

        {/* Payment Methods Grid */}
        <div className='flex flex-col gap-2'>
          <Typography variant='subtitle2' className='font-bold'>
            Seleccionar Método de Abono:
          </Typography>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
            {posPaymentMethods.map(method => {
              const isSelected = selectedMethod === method.type

              return (
                <div
                  key={method.type}
                  onClick={() => handleSelectMethod(method.type)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-[var(--mui-palette-divider)] bg-[var(--mui-palette-background-paper)] hover:border-primary/50'
                  }`}
                >
                  <i className={`${method.icon} text-lg`} />
                  <Typography variant='caption' className='font-semibold leading-tight line-clamp-1'>
                    {method.name}
                  </Typography>
                </div>
              )
            })}
          </div>
        </div>

        {/* Amount Input & Add Button */}
        <div className='grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 rounded-xl bg-[var(--mui-palette-background-default)] border border-[var(--mui-palette-divider)]'>
          <div className='sm:col-span-3'>
            <CustomTextField
              select
              fullWidth
              label='Moneda'
              value={inputCurrency}
              onChange={e => setInputCurrency(e.target.value as any)}
            >
              <MenuItem value='USD'>Dólares ($ USD)</MenuItem>
              <MenuItem value='VES'>Bolívares (Bs. VES)</MenuItem>
            </CustomTextField>
          </div>

          <div className='sm:col-span-4'>
            <CustomTextField
              fullWidth
              autoFocus
              type='number'
              label={`Monto en ${inputCurrency}`}
              placeholder='0.00'
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
            />
          </div>

          <div className='sm:col-span-3'>
            <CustomTextField
              fullWidth
              label='Referencia / N° Lote'
              placeholder='Opcional'
              value={referenceInput}
              onChange={e => setReferenceInput(e.target.value)}
            />
          </div>

          <div className='sm:col-span-2'>
            <Button
              fullWidth
              variant='contained'
              onClick={handleAddPayment}
              disabled={!amountInput || parseFloat(amountInput) <= 0}
              startIcon={<i className='tabler-plus' />}
            >
              Abonar
            </Button>
          </div>
        </div>

        {/* Payments Added List */}
        {payments.length > 0 && (
          <div className='flex flex-col gap-2'>
            <Typography variant='caption' className='font-bold uppercase text-textSecondary'>
              Abonos Registrados ({payments.length}):
            </Typography>
            <div className='flex flex-col gap-1.5'>
              {payments.map(record => (
                <div
                  key={record.id}
                  className='flex items-center justify-between p-2.5 rounded-lg border border-[var(--mui-palette-divider)] bg-[var(--mui-palette-background-paper)] text-xs'
                >
                  <div className='flex items-center gap-2'>
                    <Chip size='small' label={record.methodName} color='primary' variant='tonal' />
                    {record.reference && (
                      <span className='font-mono text-textSecondary text-[11px]'>Ref: {record.reference}</span>
                    )}
                    {record.causesIGTF && (
                      <Chip size='small' label='+3% IGTF' color='warning' variant='outlined' className='h-4 text-[10px]' />
                    )}
                  </div>

                  <div className='flex items-center gap-3'>
                    <div className='flex flex-col items-end font-mono'>
                      <span className='font-bold text-textPrimary'>${record.amountUSD.toFixed(2)}</span>
                      <span className='text-textSecondary text-[10px]'>({record.amountVES.toFixed(2)} Bs.)</span>
                    </div>
                    <IconButton size='small' color='error' onClick={() => handleRemovePayment(record.id)}>
                      <i className='tabler-trash text-sm' />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Change Resolution (Vuelto) */}
        {summary.changeUSD > 0.01 && (
          <div className='flex flex-col gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30'>
            <div className='flex items-center justify-between'>
              <Typography variant='subtitle2' className='font-bold text-warning-main flex items-center gap-1.5'>
                <i className='tabler-arrows-exchange' />
                Vuelto a Entregar: ${summary.changeUSD.toFixed(2)} ({summary.changeVES.toFixed(2)} Bs.)
              </Typography>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1'>
              <div
                onClick={() => setChangeResolution('cash_ves')}
                className={`p-2 rounded-lg border text-center cursor-pointer select-none text-xs font-bold transition-all ${
                  changeResolution === 'cash_ves'
                    ? 'border-warning bg-warning/20 text-warning-dark'
                    : 'border-[var(--mui-palette-divider)] bg-[var(--mui-palette-background-paper)]'
                }`}
              >
                💵 Efectivo Bs. ({summary.changeVES.toFixed(2)} Bs.)
              </div>
              <div
                onClick={() => setChangeResolution('pago_movil')}
                className={`p-2 rounded-lg border text-center cursor-pointer select-none text-xs font-bold transition-all ${
                  changeResolution === 'pago_movil'
                    ? 'border-warning bg-warning/20 text-warning-dark'
                    : 'border-[var(--mui-palette-divider)] bg-[var(--mui-palette-background-paper)]'
                }`}
              >
                📱 Pago Móvil Digital
              </div>
              <div
                onClick={() => setChangeResolution('store_credit')}
                className={`p-2 rounded-lg border text-center cursor-pointer select-none text-xs font-bold transition-all ${
                  changeResolution === 'store_credit'
                    ? 'border-warning bg-warning/20 text-warning-dark'
                    : 'border-[var(--mui-palette-divider)] bg-[var(--mui-palette-background-paper)]'
                }`}
              >
                🎫 Vale de Tienda (${summary.changeUSD.toFixed(2)})
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <Divider />

      <DialogActions className='p-4 flex justify-between'>
        <Button variant='outlined' color='secondary' onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant='contained'
          color='success'
          size='large'
          disabled={!isFullyPaid}
          onClick={handleFinish}
          startIcon={<i className='tabler-check' />}
          className='px-6 font-bold shadow-md shadow-success/30'
        >
          {fiscalMode ? 'Confirmar e Imprimir Factura Fiscal' : 'Confirmar e Imprimir Nota de Entrega'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default POSPaymentModal
