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
import Autocomplete from '@mui/material/Autocomplete'

import { accountingService } from '@/services/accountingService'
import { contactsService } from '@/services/contactsService'
import type { AccountingInvoice, InvoiceAccountingType, InvoiceLine } from '@/types/accountingTypes'

interface Props {
  open: boolean
  onClose: () => void
  initialType?: InvoiceAccountingType
  onSuccess: (creditNote: AccountingInvoice, updatedInvoice?: AccountingInvoice) => void
}

interface ContactOption {
  id: string
  nombre: string
  rif: string
  tipo: InvoiceAccountingType
  cuentaCxcId?: string
  cuentaCxpId?: string
}

const COMMON_REASONS = [
  'Devolución de mercancía o rechazo de servicio',
  'Descuento comercial posterior o bonificación especial',
  'Ajuste de precio o corrección de tarifas facturadas',
  'Anulación total de factura por mutuo acuerdo',
  'Reclamo por garantía o defecto de producto',
  'Ajuste contable directo sin factura previa',
  'Otro motivo'
]

const DEFAULT_CONTACTS: ContactOption[] = [
  { id: 'ct-01', nombre: 'Inversiones Caroní C.A.', rif: 'J-30981245-2', tipo: 'CUSTOMER', cuentaCxcId: 'acc-110201' },
  { id: 'ct-02', nombre: 'Distribuidora Oriental S.A.S.', rif: 'J-40291823-1', tipo: 'CUSTOMER', cuentaCxcId: 'acc-110201' },
  { id: 'ct-03', nombre: 'Corporación Metalmecánica Bolivariana', rif: 'J-31890234-5', tipo: 'CUSTOMER', cuentaCxcId: 'acc-110201' },
  { id: 'ct-prov-01', nombre: 'Corpoelec / Servicios Eléctricos', rif: 'G-20003001-0', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-prov-02', nombre: 'Distribuidora Eléctrica del Sur C.A.', rif: 'J-40128456-0', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-prov-03', nombre: 'Inmobiliaria Los Próceres (Alquiler Galpón)', rif: 'J-31092834-4', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-prov-04', nombre: 'Cantv / Internet y Telecomunicaciones', rif: 'G-20001099-2', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-prov-05', nombre: 'Ferretería Industrial Roscio C.A.', rif: 'J-31456789-1', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' }
]

export const RegisterCreditNoteModal: React.FC<Props> = ({
  open,
  onClose,
  initialType = 'CUSTOMER',
  onSuccess
}) => {
  const [tipo, setTipo] = useState<InvoiceAccountingType>(initialType)
  const [contacts, setContacts] = useState<ContactOption[]>(DEFAULT_CONTACTS)
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null)

  // Invoices for contact
  const [availableInvoices, setAvailableInvoices] = useState<AccountingInvoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('NONE')

  // Invoice mode vs Standalone mode
  const [mode, setMode] = useState<'TOTAL' | 'PARCIAL_MONTO'>('TOTAL')

  // Form Fields
  const [concepto, setConcepto] = useState<string>('')
  const [montoBaseUsd, setMontoBaseUsd] = useState<number>(100)
  const [tasaIva, setTasaIva] = useState<number>(16)
  const [tasaBcv, setTasaBcv] = useState<number>(54.00)
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0])
  const [customReason, setCustomReason] = useState<string>('')
  const [notas, setNotas] = useState<string>('')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setTipo(initialType)
    setSelectedInvoiceId('NONE')
    setMode('TOTAL')
    setSelectedReason(COMMON_REASONS[0])
    setCustomReason('')
    setConcepto('')
    setMontoBaseUsd(100)
    setTasaIva(16)
    setTasaBcv(54.00)
    setFecha(new Date().toISOString().split('T')[0])
    setErrorMsg(null)

    const loadContacts = async () => {
      try {
        const terceros = await contactsService.getTerceros()

        if (terceros && terceros.length > 0) {
          const mapped: ContactOption[] = []

          terceros.forEach(t => {
            if (t.is_cliente) {
              mapped.push({
                id: t.id,
                nombre: t.nombre_razon_social,
                rif: t.identificacion,
                tipo: 'CUSTOMER',
                cuentaCxcId: t.cuenta_cxc_id || 'acc-110201'
              })
            }

            if (t.is_proveedor) {
              mapped.push({
                id: t.id,
                nombre: t.nombre_razon_social,
                rif: t.identificacion,
                tipo: 'SUPPLIER',
                cuentaCxpId: t.cuenta_cxp_id || 'acc-210101'
              })
            }
          })
          setContacts([...mapped, ...DEFAULT_CONTACTS.filter(d => !mapped.some(m => m.id === d.id))])
        }
      } catch {
        setContacts(DEFAULT_CONTACTS)
      }
    }

    loadContacts()
  }, [open, initialType])

  // Select first contact of matching type when tipo changes
  useEffect(() => {
    const matchingContacts = contacts.filter(c => c.tipo === tipo)

    if (matchingContacts.length > 0) {
      setSelectedContact(matchingContacts[0])
    } else {
      setSelectedContact(null)
    }
  }, [tipo, contacts])

  // Fetch invoices for selected contact
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!selectedContact?.id) {
        setAvailableInvoices([])
        setSelectedInvoiceId('NONE')
        
return
      }

      try {
        const allInvoices = await accountingService.getInvoices()

        const contactInvoices = allInvoices.filter(
          i => i.contactoId === selectedContact.id &&
               i.tipo === tipo &&
               i.tipoDocumento !== 'NOTA_CREDITO' &&
               i.estado !== 'CANCELED' &&
               i.estado !== 'REVERSED'
        )

        setAvailableInvoices(contactInvoices)
      } catch {
        setAvailableInvoices([])
      }
    }

    fetchInvoices()
  }, [selectedContact, tipo])

  // Target invoice details
  const targetInvoice = useMemo(() => {
    if (selectedInvoiceId === 'NONE') return null
    
return availableInvoices.find(i => i.id === selectedInvoiceId) || null
  }, [selectedInvoiceId, availableInvoices])

  // When target invoice changes, auto-fill amounts
  useEffect(() => {
    if (targetInvoice) {
      setTasaBcv(targetInvoice.tasaBcv || 54.00)
      setConcepto(`Nota de Crédito ref. Factura ${targetInvoice.numeroFactura}`)
      setMontoBaseUsd(targetInvoice.saldoPendienteUsd || targetInvoice.totalUsd)
      setTasaIva(targetInvoice.lineas[0]?.tasaImpuestoPct ?? 16)
    } else {
      setConcepto('')
      setMontoBaseUsd(100)
      setTasaIva(16)
    }
  }, [targetInvoice])

  // Calculation
  const calculation = useMemo(() => {
    if (targetInvoice && mode === 'TOTAL') {
      return {
        subtotalUsd: targetInvoice.totalNetoUsd,
        ivaUsd: targetInvoice.totalIvaUsd,
        totalUsd: targetInvoice.totalUsd,
        totalVes: targetInvoice.totalVes,
        lines: targetInvoice.lineas
      }
    }

    const subtotal = Number(montoBaseUsd) || 0
    const iva = Number(((subtotal * tasaIva) / 100).toFixed(2))
    const total = Number((subtotal + iva).toFixed(2))
    const totalBs = Number((total * tasaBcv).toFixed(2))

    return {
      subtotalUsd: subtotal,
      ivaUsd: iva,
      totalUsd: total,
      totalVes: totalBs,
      lines: [
        {
          id: `nc-line-${Date.now()}`,
          productoOConcepto: concepto.trim() || `Nota de Crédito (${selectedReason})`,
          cuentaContableId: tipo === 'CUSTOMER' ? 'acc-410101' : 'acc-510101',
          cuentaContableNombre: tipo === 'CUSTOMER' ? 'Ingresos por Venta de Mercancías' : 'Costo de Ventas',
          cantidad: 1,
          precioUnitarioUsd: subtotal,
          tasaImpuestoPct: tasaIva,
          subtotalUsd: subtotal,
          ivaUsd: iva,
          totalUsd: total
        }
      ] as InvoiceLine[]
    }
  }, [targetInvoice, mode, montoBaseUsd, tasaIva, tasaBcv, concepto, selectedReason, tipo])

  const handleConfirm = async () => {
    if (!selectedContact) {
      setErrorMsg('Debes seleccionar un contacto.')
      
return
    }

    if (calculation.totalUsd <= 0) {
      setErrorMsg('El monto total de la nota de crédito debe ser mayor a 0.')
      
return
    }

    try {
      setSubmitting(true)
      setErrorMsg(null)

      const finalReason = selectedReason === 'Otro motivo'
        ? (customReason.trim() || 'Nota de crédito registrada por usuario')
        : (customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason)

      const result = await accountingService.createStandaloneCreditNote({
        tipo,
        contactoId: selectedContact.id,
        contactoNombre: selectedContact.nombre,
        contactoRif: selectedContact.rif,
        contactoCuentaContableId: tipo === 'CUSTOMER' ? selectedContact.cuentaCxcId : selectedContact.cuentaCxpId,
        facturaId: selectedInvoiceId !== 'NONE' ? selectedInvoiceId : undefined,
        motivo: finalReason,
        lineas: calculation.lines,
        montoUsd: calculation.totalUsd,
        tasaBcv,
        fecha,
        notas
      })

      onSuccess(result.creditNote, result.updatedInvoice)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al emitir la Nota de Crédito')
    } finally {
      setSubmitting(false)
    }
  }

  const isSupplier = tipo === 'SUPPLIER'

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
              Registrar Nota de Crédito
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Emisión de nota de crédito con reversión contable automática y afectación de saldo
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={submitting} size='small'>
          <i className='tabler-x text-lg' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
        {errorMsg && (
          <Alert severity='error' sx={{ borderRadius: '12px' }}>
            {errorMsg}
          </Alert>
        )}

        {/* Selector de Tipo (Cliente o Proveedor) */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B', minWidth: 90 }}>
            Módulo:
          </Typography>
          <RadioGroup
            row
            value={tipo}
            onChange={e => setTipo(e.target.value as InvoiceAccountingType)}
          >
            <FormControlLabel
              value='CUSTOMER'
              control={<Radio size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }} />}
              label={<Typography variant='body2' sx={{ fontWeight: 600 }}>Cliente (CxC - Ventas)</Typography>}
            />
            <FormControlLabel
              value='SUPPLIER'
              control={<Radio size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }} />}
              label={<Typography variant='body2' sx={{ fontWeight: 600 }}>Proveedor (CxP - Compras)</Typography>}
            />
          </RadioGroup>
        </Box>

        {/* Contacto y Factura Asociada */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Autocomplete
            options={contacts.filter(c => c.tipo === tipo)}
            getOptionLabel={opt => `${opt.nombre} (${opt.rif})`}
            value={selectedContact}
            onChange={(_, val) => setSelectedContact(val)}
            renderInput={params => (
              <TextField
                {...params}
                size='small'
                label={isSupplier ? 'Proveedor *' : 'Cliente *'}
                placeholder='Buscar contacto...'
              />
            )}
          />

          <TextField
            select
            fullWidth
            size='small'
            label='Factura Asociada (Opcional)'
            value={selectedInvoiceId}
            onChange={e => setSelectedInvoiceId(e.target.value)}
            helperText={
              selectedInvoiceId === 'NONE'
                ? 'Nota de crédito directa (sin factura previa)'
                : `Afectará y amortizará la factura seleccionada`
            }
          >
            <MenuItem value='NONE'>
              <em>Sin factura asociada (Ajuste comercial directo)</em>
            </MenuItem>
            {availableInvoices.map(inv => (
              <MenuItem key={inv.id} value={inv.id}>
                {inv.numeroFactura} — Total: ${inv.totalUsd.toFixed(2)} (Saldo: ${inv.saldoPendienteUsd.toFixed(2)})
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Si tiene factura asociada seleccionada, selector de modo Total o Parcial */}
        {targetInvoice && (
          <Box sx={{ p: 2, borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569' }}>
                Factura Seleccionada: {targetInvoice.numeroFactura}
              </Typography>
              <Chip
                label={`Saldo Pendiente: $${targetInvoice.saldoPendienteUsd.toFixed(2)} USD`}
                size='small'
                sx={{ backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 700 }}
              />
            </Box>
            <RadioGroup
              row
              value={mode}
              onChange={e => setMode(e.target.value as 'TOTAL' | 'PARCIAL_MONTO')}
            >
              <FormControlLabel
                value='TOTAL'
                control={<Radio size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }} />}
                label={<Typography variant='body2' sx={{ fontWeight: 600 }}>Reversión Total (100% de la Factura)</Typography>}
              />
              <FormControlLabel
                value='PARCIAL_MONTO'
                control={<Radio size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }} />}
                label={<Typography variant='body2' sx={{ fontWeight: 600 }}>Importe Parcial</Typography>}
              />
            </RadioGroup>
          </Box>
        )}

        {/* Campos de Importe y Concepto (cuando es directo o parcial) */}
        {(!targetInvoice || mode === 'PARCIAL_MONTO') && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2 }}>
            <TextField
              size='small'
              label='Concepto / Descripción *'
              placeholder='Ej: Devolución de lote defectuoso, Bonificación especial...'
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              fullWidth
            />
            <TextField
              type='number'
              size='small'
              label='Base Imponible ($)'
              value={montoBaseUsd}
              onChange={e => setMontoBaseUsd(Math.max(0, Number(e.target.value)))}
              inputProps={{ min: 0.01, step: '0.01' }}
              fullWidth
            />
            <TextField
              select
              size='small'
              label='Alícuota IVA'
              value={tasaIva}
              onChange={e => setTasaIva(Number(e.target.value))}
              fullWidth
            >
              <MenuItem value={16}>16% (General)</MenuItem>
              <MenuItem value={8}>8% (Reducido)</MenuItem>
              <MenuItem value={0}>0% (Exento)</MenuItem>
            </TextField>
          </Box>
        )}

        {/* Motivo, Fecha y Tasa BCV */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2 }}>
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

          <TextField
            type='number'
            fullWidth
            size='small'
            label='Tasa Oficial BCV'
            value={tasaBcv}
            onChange={e => setTasaBcv(Math.max(0.01, Number(e.target.value)))}
            inputProps={{ step: '0.01' }}
          />
        </Box>

        {selectedReason === 'Otro motivo' && (
          <TextField
            fullWidth
            size='small'
            label='Especificar motivo *'
            placeholder='Indica la razón de la nota de crédito...'
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            required
          />
        )}

        <TextField
          fullWidth
          size='small'
          label='Notas / Observaciones de auditoría (opcional)'
          placeholder='Anotaciones para el comprobante contable...'
          value={notas}
          onChange={e => setNotas(e.target.value)}
        />

        {/* Resumen Financiero y Contable */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: '16px',
            backgroundColor: '#F3F0FF',
            border: '1px solid #D8D0F8',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='subtitle2' sx={{ fontWeight: 800, color: '#4C3FAF' }}>
              Impacto Contable de la Nota de Crédito
            </Typography>
            <Chip
              label={
                targetInvoice
                  ? `Vinculada a ${targetInvoice.numeroFactura}`
                  : 'Nota Directa (Sin Factura)'
              }
              size='small'
              sx={{ backgroundColor: '#FFFFFF', color: '#6C5CE7', fontWeight: 700, border: '1px solid #6C5CE7' }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
            <Box>
              <Typography variant='caption' sx={{ color: '#6B7280' }}>Base Imponible</Typography>
              <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                ${calculation.subtotalUsd.toFixed(2)} USD
              </Typography>
            </Box>
            <Box>
              <Typography variant='caption' sx={{ color: '#6B7280' }}>IVA ({tasaIva}%)</Typography>
              <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                ${calculation.ivaUsd.toFixed(2)} USD
              </Typography>
            </Box>
            <Box>
              <Typography variant='caption' sx={{ color: '#6B7280' }}>Total Nota de Crédito</Typography>
              <Typography variant='subtitle1' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                ${calculation.totalUsd.toFixed(2)} USD
              </Typography>
            </Box>
            <Box>
              <Typography variant='caption' sx={{ color: '#6B7280' }}>Total en Bolívares</Typography>
              <Typography variant='subtitle1' sx={{ fontWeight: 800, color: '#1E293B' }}>
                {calculation.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
              </Typography>
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
          disabled={submitting || !selectedContact || calculation.totalUsd <= 0}
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
          {submitting ? 'Emitiendo Nota...' : 'Emitir Nota de Crédito'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
