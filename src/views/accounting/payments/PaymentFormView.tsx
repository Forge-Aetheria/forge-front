'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import CustomChip from '@core/components/mui/Chip'
import Grid from '@mui/material/Grid'
import Autocomplete from '@mui/material/Autocomplete'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { accountingService } from '@/services/accountingService'
import type {
  Payment,
  Journal,
  AccountingInvoice,
  Account,
  CurrencyCode,
  PaymentMethod
} from '@/types/accountingTypes'

// Opciones de contacto con RIF
const CONTACT_OPTIONS = [
  { id: 'ct-01', nombre: 'Inversiones Caroní C.A.', rif: 'J-30981245-2', tipo: 'CUSTOMER' },
  { id: 'ct-02', nombre: 'Distribuidora Oriental S.A.S.', rif: 'J-40291823-1', tipo: 'CUSTOMER' },
  { id: 'ct-03', nombre: 'Corporación Metalmecánica Bolivariana', rif: 'J-31890234-5', tipo: 'CUSTOMER' },
  { id: 'ct-prov-01', nombre: 'Corpoelec / Servicios Eléctricos', rif: 'G-20003001-0', tipo: 'SUPPLIER' },
  { id: 'ct-prov-02', nombre: 'Distribuidora Eléctrica del Sur C.A.', rif: 'J-40128456-0', tipo: 'SUPPLIER' },
  { id: 'ct-prov-03', nombre: 'Inmobiliaria Los Próceres (Alquiler Galpón)', rif: 'J-31092834-4', tipo: 'SUPPLIER' },
  { id: 'ct-prov-04', nombre: 'Cantv / Internet y Telecomunicaciones', rif: 'G-20001099-2', tipo: 'SUPPLIER' },
  { id: 'ct-prov-05', nombre: 'Ferretería Industrial Roscio C.A.', rif: 'J-31456789-1', tipo: 'SUPPLIER' }
]

interface Props {
  payment?: Payment | null
  initialType?: 'CUSTOMER' | 'SUPPLIER'
  journals: Journal[]
  invoices: AccountingInvoice[]
  accounts: Account[]
  defaultTasaBcv?: number
  onBack: () => void
  onSuccess: (message: string, payment?: Payment) => void
}

export const PaymentFormView: React.FC<Props> = ({
  payment,
  initialType = 'CUSTOMER',
  journals,
  invoices,
  accounts,
  defaultTasaBcv = 54.00,
  onBack,
  onSuccess
}) => {
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(payment || null)
  const isReadOnly = Boolean(currentPayment)
  const isCustomer = (currentPayment ? currentPayment.tipo : initialType) === 'CUSTOMER'

  // Filtrar diarios que sean de Banco o Caja
  const bankJournals = useMemo(() => {
    const filtered = journals.filter(j => j.tipo.startsWith('BANCO') || j.tipo === 'CAJA')
    return filtered.length > 0 ? filtered : journals
  }, [journals])

  // Estados del Formulario
  const [tipo, setTipo] = useState<'CUSTOMER' | 'SUPPLIER'>(payment?.tipo || initialType)
  const [contactoId, setContactoId] = useState(payment?.contactoId || '')
  const [contactoNombre, setContactoNombre] = useState(payment?.contactoNombre || '')
  const [facturaId, setFacturaId] = useState<string>(
    payment?.facturasConciliadas?.[0]?.facturaId || ''
  )
  const [diarioId, setDiarioId] = useState(payment?.diarioId || bankJournals[0]?.id || '')
  const [moneda, setMoneda] = useState<CurrencyCode>(payment?.moneda || 'USD')
  const [monto, setMonto] = useState<number | string>(payment?.monto ?? '')
  const [tasaBcv, setTasaBcv] = useState<number>(payment?.tasaBcvPago || defaultTasaBcv)
  const [fecha, setFecha] = useState(payment?.fecha || new Date().toISOString().split('T')[0])
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>(payment?.metodoPago || 'TRANSFERENCIA')
  const [referenciaBancaria, setReferenciaBancaria] = useState(payment?.referenciaBancaria || '')
  const [aplicaIgtf, setAplicaIgtf] = useState(payment?.aplicaIgtf || false)
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Facturas pendientes elegibles para conciliar
  const eligibleInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchType = inv.tipo === tipo
      const matchPending = inv.saldoPendienteUsd > 0.01
      if (!matchType || !matchPending) return false
      if (contactoId) {
        return inv.contactoId === contactoId
      }
      return true
    })
  }, [invoices, tipo, contactoId])

  const selectedInvoice = useMemo(() => {
    if (!facturaId) return null
    return invoices.find(i => i.id === facturaId) || null
  }, [invoices, facturaId])

  // Al seleccionar una factura, auto-rellenar contacto y monto
  const handleSelectInvoice = (inv: AccountingInvoice | null) => {
    if (inv) {
      setFacturaId(inv.id)
      setContactoId(inv.contactoId)
      setContactoNombre(inv.contactoNombre)
      if (moneda === 'USD') {
        setMonto(inv.saldoPendienteUsd)
      } else {
        setMonto(Number((inv.saldoPendienteUsd * tasaBcv).toFixed(2)))
      }
    } else {
      setFacturaId('')
    }
  }

  // Cálculos en vivo
  const numericMonto = typeof monto === 'number' ? monto : parseFloat(monto) || 0
  const montoUsd = moneda === 'USD' ? numericMonto : Number((numericMonto / tasaBcv).toFixed(2))
  const montoVes = moneda === 'VES' ? numericMonto : Number((numericMonto * tasaBcv).toFixed(2))

  // IGTF 3% en divisas
  const montoIgtfUsd = aplicaIgtf && moneda === 'USD' ? Number((numericMonto * 0.03).toFixed(2)) : 0
  const montoIgtfVes = Number((montoIgtfUsd * tasaBcv).toFixed(2))

  // Diferencial Cambiario proyectado si se paga en VES
  let difCambiarioVes = 0
  if (selectedInvoice && moneda === 'VES' && numericMonto > 0) {
    const costoHistoricoVes = montoUsd * selectedInvoice.tasaBcv
    const costoActualVes = numericMonto
    difCambiarioVes = Number(
      tipo === 'CUSTOMER'
        ? (costoActualVes - costoHistoricoVes).toFixed(2)
        : (costoHistoricoVes - costoActualVes).toFixed(2)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!diarioId) {
      setErrorMsg('Por favor selecciona un diario de Banco o Caja receptor/emisor.')
      return
    }

    if (!contactoNombre && !contactoId) {
      setErrorMsg('Por favor indica el cliente o proveedor de la transacción.')
      return
    }

    if (numericMonto <= 0) {
      setErrorMsg('El monto del pago debe ser mayor a 0.')
      return
    }

    try {
      setSubmitting(true)
      setErrorMsg(null)

      if (facturaId) {
        // Conciliación formal con factura (estilo Odoo)
        const res = await accountingService.registerInvoicePayment({
          invoiceId: facturaId,
          monto: numericMonto,
          moneda,
          tasaBcvPago: tasaBcv,
          diarioId,
          metodoPago,
          referenciaBancaria: referenciaBancaria.trim() || undefined,
          fecha
        })
        setCurrentPayment(res.payment)
        onSuccess(`Pago ${res.payment.numeroPago} conciliado y contabilizado exitosamente en asiento ${res.entry.numeroAsiento}.`, res.payment)
      } else {
        // Pago libre / anticipo de cliente o proveedor
        const finalContact = CONTACT_OPTIONS.find(c => c.id === contactoId)
        const res = await accountingService.createPayment({
          contactoId: contactoId || (tipo === 'SUPPLIER' ? 'ct-prov-gen' : 'ct-cli-gen'),
          contactoNombre: finalContact ? finalContact.nombre : (contactoNombre || 'Tercero General'),
          diarioId,
          metodoPago,
          moneda,
          monto: numericMonto,
          tasaBcvPago: tasaBcv,
          aplicaIgtf,
          referenciaBancaria: referenciaBancaria.trim() || undefined
        })
        setCurrentPayment(res.payment)
        onSuccess(`Pago ${res.payment.numeroPago} registrado y contabilizado en asiento ${res.entry.numeroAsiento}.`, res.payment)
      }
      } catch (err: any) {
      setErrorMsg(err?.message || 'Error al procesar el pago')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 1. BARRA SUPERIOR DE ACCIONES */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Tooltip title='Volver'>
            <IconButton
              onClick={onBack}
              sx={{
                width: 38,
                height: 38,
                borderRadius: '9999px',
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E4F0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' }
              }}
            >
              <i className='tabler-arrow-left text-lg' />
            </IconButton>
          </Tooltip>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
                {currentPayment
                  ? `Pago: ${currentPayment.numeroPago}`
                  : tipo === 'CUSTOMER'
                    ? 'Registrar Cobro de Cliente'
                    : 'Registrar Pago a Proveedor'}
              </Typography>
              <CustomChip
                label={currentPayment ? 'Confirmado' : 'Nuevo'}
                size='small'
                variant='tonal'
                color={currentPayment ? 'success' : 'primary'}
              />
              <CustomChip
                label={tipo === 'CUSTOMER' ? 'Ingreso' : 'Egreso'}
                size='small'
                variant='tonal'
                color={tipo === 'CUSTOMER' ? 'success' : 'error'}
              />
            </Box>
          </Box>
        </Box>

        {/* Botones de Cabecera */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant='tonal'
            color='secondary'
            size='small'
            onClick={onBack}
            disabled={submitting}
            sx={{
              borderRadius: '9999px',
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            {isReadOnly ? 'Volver' : 'Cancelar'}
          </Button>

          {!isReadOnly && (
            <Button
              variant='contained'
              size='small'
              color={tipo === 'CUSTOMER' ? 'success' : 'primary'}
              onClick={handleSubmit}
              disabled={submitting || numericMonto <= 0}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color='inherit' />
                ) : (
                  <i className='tabler-device-floppy text-base' />
                )
              }
              sx={{
                borderRadius: '9999px',
                fontWeight: 600,
                textTransform: 'none',
                px: 3
              }}
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity='error' sx={{ borderRadius: '16px' }}>
          {errorMsg}
        </Alert>
      )}

      {/* 2. CARD PRINCIPAL: DETALLES DE LA TRANSACCIÓN DE TESORERÍA */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: { xs: 3, sm: 4.5 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '12px',
              backgroundColor: tipo === 'CUSTOMER' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(108, 92, 231, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tipo === 'CUSTOMER' ? '#10B981' : '#6C5CE7'
            }}
          >
            <i className='tabler-wallet' style={{ fontSize: '1.35rem' }} />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.1rem' }}>
              Datos de la Transacción Bancaria / Caja
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Complete los parámetros del movimiento monetario para su imputación contable
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3.5}>
          {/* Tipo de Operación (Si es nuevo registro) */}
          {!payment && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
                Tipo de Operación *
              </Typography>
              <TextField
                select
                fullWidth
                size='small'
                value={tipo}
                onChange={e => {
                  const val = e.target.value as 'CUSTOMER' | 'SUPPLIER'
                  setTipo(val)
                  setContactoId('')
                  setContactoNombre('')
                  setFacturaId('')
                }}
                sx={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
                }}
              >
                <MenuItem value='CUSTOMER'>Cobro a Cliente (Entrada de Fondos)</MenuItem>
                <MenuItem value='SUPPLIER'>Pago a Proveedor (Salida de Fondos)</MenuItem>
              </TextField>
            </Grid>
          )}

          {/* Contacto (Cliente / Proveedor) con Autocomplete */}
          <Grid size={{ xs: 12, sm: 6, md: !payment ? 5 : 6 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              {tipo === 'CUSTOMER' ? 'Cliente (Cobrador / Pagador) *' : 'Proveedor (Beneficiario) *'}
            </Typography>
            <Autocomplete
              size='small'
              disabled={isReadOnly}
              options={CONTACT_OPTIONS.filter(c => c.tipo === tipo)}
              value={CONTACT_OPTIONS.find(c => c.id === contactoId) || null}
              onChange={(_, newVal) => {
                if (newVal) {
                  setContactoId(newVal.id)
                  setContactoNombre(newVal.nombre)
                  setFacturaId('')
                } else {
                  setContactoId('')
                  setContactoNombre('')
                  setFacturaId('')
                }
              }}
              getOptionLabel={c => `${c.nombre} (${c.rif})`}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              filterOptions={(options, state) => {
                const q = state.inputValue.toLowerCase().trim()
                if (!q) return options
                return options.filter(c =>
                  c.nombre.toLowerCase().includes(q) || c.rif.toLowerCase().includes(q)
                )
              }}
              renderOption={(props, opt) => (
                <li {...props} key={opt.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, py: 0.5, width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                        {opt.nombre}
                      </Typography>
                      <CustomChip
                        label={opt.tipo === 'CUSTOMER' ? 'Cliente' : 'Proveedor'}
                        size='small'
                        variant='tonal'
                        color={opt.tipo === 'CUSTOMER' ? 'primary' : 'warning'}
                      />
                    </Box>
                    <Typography variant='caption' sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                      RIF: {opt.rif}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={params => (
                <TextField
                  {...params}
                  placeholder='Buscar por nombre o RIF...'
                  sx={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
                  }}
                />
              )}
            />
          </Grid>

          {/* Factura a Conciliar (Opcional o Directa) */}
          <Grid size={{ xs: 12, sm: 6, md: !payment ? 4 : 6 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Factura por Conciliar (Opcional)
            </Typography>
            <Autocomplete
              size='small'
              disabled={isReadOnly}
              options={eligibleInvoices}
              value={selectedInvoice}
              onChange={(_, newVal) => handleSelectInvoice(newVal)}
              getOptionLabel={inv => `${inv.numeroFactura} - Saldo: $${inv.saldoPendienteUsd.toFixed(2)} (${inv.contactoNombre})`}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              filterOptions={(options, state) => {
                const q = state.inputValue.toLowerCase().trim()
                if (!q) return options
                return options.filter(
                  i =>
                    i.numeroFactura.toLowerCase().includes(q) ||
                    i.contactoNombre.toLowerCase().includes(q)
                )
              }}
              renderOption={(props, opt) => (
                <li {...props} key={opt.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', py: 0.5 }}>
                    <Box>
                      <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                        {opt.numeroFactura}
                      </Typography>
                      <Typography variant='caption' sx={{ color: '#64748B' }}>
                        Fecha: {opt.fechaEmision} | {opt.contactoNombre}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant='body2' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                        ${opt.saldoPendienteUsd.toFixed(2)}
                      </Typography>
                      <Typography variant='caption' sx={{ color: '#94A3B8' }}>
                        {Number((opt.saldoPendienteUsd * tasaBcv).toFixed(2)).toLocaleString('es-VE')} Bs.
                      </Typography>
                    </Box>
                  </Box>
                </li>
              )}
              renderInput={params => (
                <TextField
                  {...params}
                  placeholder='Selecciona factura pendiente...'
                  sx={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
                  }}
                />
              )}
            />
          </Grid>

          {/* Diario de Banco / Caja */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Diario Receptor / Emisor (Banco o Caja) *
            </Typography>
            <TextField
              select
              fullWidth
              size='small'
              value={diarioId}
              disabled={isReadOnly}
              onChange={e => setDiarioId(e.target.value)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            >
              {bankJournals.map(j => (
                <MenuItem key={j.id} value={j.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>{j.nombre}</span>
                    <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>
                      ${j.saldoActualUsd.toFixed(2)}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Moneda del Pago */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Moneda del Pago *
            </Typography>
            <TextField
              select
              fullWidth
              size='small'
              value={moneda}
              disabled={isReadOnly}
              onChange={e => setMoneda(e.target.value as CurrencyCode)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            >
              <MenuItem value='USD'>Dólares (USD $)</MenuItem>
              <MenuItem value='VES'>Bolívares (VES Bs.)</MenuItem>
            </TextField>
          </Grid>

          {/* Tasa Oficial BCV */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Tasa Oficial BCV (Bs/USD)
            </Typography>
            <TextField
              fullWidth
              size='small'
              type='number'
              value={tasaBcv}
              disabled={isReadOnly}
              onChange={e => setTasaBcv(Number(e.target.value))}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            />
          </Grid>

          {/* Fecha de Operación */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Fecha de la Transacción *
            </Typography>
            <TextField
              fullWidth
              size='small'
              type='date'
              value={fecha}
              disabled={isReadOnly}
              onChange={e => setFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            />
          </Grid>

          {/* Monto del Pago */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Monto Pagado ({moneda}) *
            </Typography>
            <TextField
              fullWidth
              size='small'
              type='number'
              value={monto}
              disabled={isReadOnly}
              onChange={e => setMonto(e.target.value === '' ? '' : Number(e.target.value))}
              inputProps={{ min: 0, step: 0.01 }}
              placeholder='0.00'
              helperText={`Equivalente estimado: ${
                moneda === 'USD'
                  ? `${montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`
                  : `$${montoUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
              }`}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            />
          </Grid>

          {/* Método de Pago */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Método de Pago *
            </Typography>
            <TextField
              select
              fullWidth
              size='small'
              value={metodoPago}
              disabled={isReadOnly}
              onChange={e => setMetodoPago(e.target.value as PaymentMethod)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            >
              <MenuItem value='TRANSFERENCIA'>Transferencia Bancaria</MenuItem>
              <MenuItem value='PAGO_MOVIL'>Pago Móvil Interbancario</MenuItem>
              <MenuItem value='EFECTIVO_USD'>Efectivo Divisas (USD)</MenuItem>
              <MenuItem value='EFECTIVO_VES'>Efectivo Bolívares (VES)</MenuItem>
              <MenuItem value='PUNTO_VENTA'>Punto de Venta / Tarjeta Débito</MenuItem>
              <MenuItem value='ZELLE'>Zelle / Transferencia Internacional</MenuItem>
              <MenuItem value='CHEQUE'>Cheque Bancario</MenuItem>
            </TextField>
          </Grid>

          {/* Referencia Bancaria */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              N° Referencia Bancaria / Operación
            </Typography>
            <TextField
              fullWidth
              size='small'
              placeholder='Ej: REF-990812, 1234'
              value={referenciaBancaria}
              disabled={isReadOnly}
              onChange={e => setReferenciaBancaria(e.target.value)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            />
          </Grid>

          {/* Switch IGTF (3%) */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box sx={{ pt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={aplicaIgtf}
                    disabled={isReadOnly || moneda !== 'USD'}
                    onChange={e => setAplicaIgtf(e.target.checked)}
                    color='primary'
                  />
                }
                label={
                  <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                    Aplicar IGTF Divisas (3%)
                  </Typography>
                }
              />
              {aplicaIgtf && moneda === 'USD' && (
                <Typography variant='caption' sx={{ color: '#EF4444', display: 'block', fontWeight: 600 }}>
                  Recargo IGTF: +${montoIgtfUsd.toFixed(2)} (${montoIgtfVes.toLocaleString('es-VE')} Bs.)
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Observaciones / Notas */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Concepto / Notas de Auditoría del Pago
            </Typography>
            <TextField
              fullWidth
              size='small'
              placeholder='Detalles adicionales de la cobranza o desembolso...'
              value={notas}
              disabled={isReadOnly}
              onChange={e => setNotas(e.target.value)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            />
          </Grid>
        </Grid>
      </Card>

      {/* 3. CARD SECUNDARIA: RESUMEN FINANCIERO Y APUNTES CONTABLES */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: { xs: 3, sm: 4.5 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '12px',
              backgroundColor: 'rgba(108, 92, 231, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6C5CE7'
            }}
          >
            <i className='tabler-scale' style={{ fontSize: '1.35rem' }} />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.1rem' }}>
              Apuntes Contables de la Operación de Pago
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Imputación bimonetaria en partida doble sobre las cuentas de Tesorería y Terceros
            </Typography>
          </Box>
        </Box>

        {/* Factura Conciliada (Si aplica) */}
        {selectedInvoice && (
          <Box
            sx={{
              p: 2.5,
              mb: 3,
              backgroundColor: '#F8FAFC',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                Factura Vinculada: {selectedInvoice.numeroFactura}
              </Typography>
              <Typography variant='caption' sx={{ color: '#64748B' }}>
                Emisión original: {selectedInvoice.fechaEmision} | Tasa Original: {selectedInvoice.tasaBcv.toFixed(2)} Bs/USD
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant='body2' sx={{ fontWeight: 700, color: '#10B981' }}>
                Monto a Amortizar: ${montoUsd.toFixed(2)} USD
              </Typography>
              {difCambiarioVes !== 0 && (
                <Typography
                  variant='caption'
                  sx={{
                    fontWeight: 700,
                    color: difCambiarioVes > 0 ? '#10B981' : '#EF4444',
                    display: 'block'
                  }}
                >
                  Diferencial Cambiario: {difCambiarioVes > 0 ? '+' : ''}{difCambiarioVes.toLocaleString('es-VE')} Bs. (
                  {difCambiarioVes > 0 ? 'Ganancia Cambiaria' : 'Pérdida Cambiaria'})
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Tabla de Asientos Contables */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderRadius: '16px', overflow: 'hidden' }}>
          <Table size='small'>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Cuenta Contable</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Concepto / Apunte</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Debe (USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Haber (USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Debe (VES)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Haber (VES)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Línea 1: Banco / Caja */}
              <TableRow>
                <TableCell>
                  <Typography variant='body2' sx={{ fontWeight: 700, color: '#6C5CE7' }}>
                    {tipo === 'CUSTOMER' ? '1.1.01.xx - Banco / Caja Receptor' : '1.1.01.xx - Banco / Caja Emisor'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' sx={{ color: '#1E293B' }}>
                    {tipo === 'CUSTOMER' ? `Cobro ${metodoPago}` : `Pago ${metodoPago}`}
                  </Typography>
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>
                  {tipo === 'CUSTOMER' ? `$${montoUsd.toFixed(2)}` : '—'}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>
                  {tipo === 'SUPPLIER' ? `$${montoUsd.toFixed(2)}` : '—'}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>
                  {tipo === 'CUSTOMER' ? `${montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.` : '—'}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>
                  {tipo === 'SUPPLIER' ? `${montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.` : '—'}
                </TableCell>
              </TableRow>

              {/* Línea 2: Tercero (CxC o CxP) */}
              <TableRow>
                <TableCell>
                  <Typography variant='body2' sx={{ fontWeight: 700, color: '#6C5CE7' }}>
                    {tipo === 'CUSTOMER' ? '1.1.02.01 - Cuentas por Cobrar Clientes' : '2.1.01.01 - Cuentas por Pagar Proveedores'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' sx={{ color: '#1E293B' }}>
                    {selectedInvoice ? `Amortización Factura ${selectedInvoice.numeroFactura}` : 'Anticipo / Pago a cuenta'}
                  </Typography>
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>
                  {tipo === 'SUPPLIER' ? `$${montoUsd.toFixed(2)}` : '—'}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>
                  {tipo === 'CUSTOMER' ? `$${montoUsd.toFixed(2)}` : '—'}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>
                  {tipo === 'SUPPLIER' ? `${montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.` : '—'}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>
                  {tipo === 'CUSTOMER' ? `${montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.` : '—'}
                </TableCell>
              </TableRow>

              {/* Línea 3: IGTF si aplica */}
              {aplicaIgtf && moneda === 'USD' && (
                <TableRow>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontWeight: 700, color: '#EF4444' }}>
                      2.1.02.02 - IGTF por Enterar (3%)
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' sx={{ color: '#1E293B' }}>
                      Retención IGTF 3% Ley de Grandes Transacciones
                    </Typography>
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700 }}>
                    ${montoIgtfUsd.toFixed(2)}
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700 }}>
                    —
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700 }}>
                    {montoIgtfVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700 }}>
                    —
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}
