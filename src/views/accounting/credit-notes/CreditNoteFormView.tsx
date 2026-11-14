'use client'

import React, { useState, useEffect, useMemo } from 'react'

import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'

import CustomChip from '@core/components/mui/Chip'

import { accountingService } from '@/services/accountingService'
import { contactsService } from '@/services/contactsService'
import type {
  AccountingInvoice,
  InvoiceAccountingType,
  InvoiceLine,
  JournalItem,
  CurrencyCode
} from '@/types/accountingTypes'
import { AutomaticEntryPreview } from '../invoices/components/AutomaticEntryPreview'

interface Props {
  onBack: () => void
  onSaved: (creditNote: AccountingInvoice) => void
  creditNote?: AccountingInvoice | null
  initialType?: InvoiceAccountingType
}

interface ContactOption {
  id: string
  nombre: string
  rif: string
  tipo: InvoiceAccountingType
  cuentaCxcId?: string
  cuentaCxpId?: string
}

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

const COMMON_REASONS = [
  'Devolución de mercancía o rechazo de servicio',
  'Descuento comercial posterior o bonificación especial',
  'Ajuste de precio o corrección de tarifas facturadas',
  'Anulación total de factura por mutuo acuerdo',
  'Reclamo por garantía o defecto de producto',
  'Ajuste contable directo sin factura previa',
  'Otro motivo'
]

const CUSTOMER_ACCOUNT_OPTIONS = [
  { id: 'acc-410101', label: '4.1.01.01 - Ingresos por Venta / Devoluciones' },
  { id: 'acc-410102', label: '4.1.01.02 - Prestación de Servicios' }
]

const SUPPLIER_ACCOUNT_OPTIONS = [
  { id: 'acc-510101', label: '5.1.01.01 - Costo de Ventas / Devolución Compras' },
  { id: 'acc-610101', label: '6.1.01.01 - Gastos Operativos y Administrativos' }
]

export const CreditNoteFormView: React.FC<Props> = ({
  onBack,
  onSaved,
  creditNote,
  initialType = 'CUSTOMER'
}) => {
  const isEditing = Boolean(creditNote?.id)
  const isReadOnly = creditNote?.estado === 'POSTED'

  const [activeTab, setActiveTab] = useState<number>(0)
  const [tipo] = useState<InvoiceAccountingType>(creditNote?.tipo || initialType)
  const [contacts, setContacts] = useState<ContactOption[]>(DEFAULT_CONTACTS)
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null)

  // Invoices of contact
  const [availableInvoices, setAvailableInvoices] = useState<AccountingInvoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(creditNote?.facturaAfectadaId || 'NONE')
  const [invoiceMode, setInvoiceMode] = useState<'TOTAL' | 'PARCIAL'>('TOTAL')

  // Document Fields
  const [numeroFactura, setNumeroFactura] = useState(
    creditNote?.numeroFactura || `NC-2026-${Math.floor(1000 + Math.random() * 9000)}`
  )

  const [moneda, setMoneda] = useState<CurrencyCode>(creditNote?.moneda || 'USD')

  const [fechaEmision, setFechaEmision] = useState<string>(
    creditNote?.fechaEmision || new Date().toISOString().split('T')[0]
  )

  const [tasaBcv, setTasaBcv] = useState<number>(creditNote?.tasaBcv || 54.00)

  const [selectedReason, setSelectedReason] = useState<string>(
    creditNote?.motivoNotaCredito || COMMON_REASONS[0]
  )

  const [customReason, setCustomReason] = useState<string>('')
  const [observaciones, setObservaciones] = useState<string>(creditNote?.terminosCondiciones || '')

  // Lines
  const [lineas, setLineas] = useState<InvoiceLine[]>(
    creditNote?.lineas || [
      {
        id: `line-${Date.now()}-0`,
        productoOConcepto: 'Ajuste / Nota de Crédito por Devolución de Mercancía',
        cuentaContableId: initialType === 'CUSTOMER' ? 'acc-410101' : 'acc-510101',
        cuentaContableNombre: initialType === 'CUSTOMER' ? 'Ingresos por Venta de Mercancías' : 'Costo de Ventas',
        cantidad: 1,
        precioUnitarioUsd: 100.0,
        tasaImpuestoPct: 16,
        subtotalUsd: 100.0,
        ivaUsd: 16.0,
        totalUsd: 116.0
      }
    ]
  )

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Load Contacts
  useEffect(() => {
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
          const combined = [...mapped, ...DEFAULT_CONTACTS.filter(d => !mapped.some(m => m.id === d.id))]

          setContacts(combined)

          if (creditNote?.contactoId) {
            const found = combined.find(c => c.id === creditNote.contactoId)

            if (found) setSelectedContact(found)
          } else {
            const defaultOfTipo = combined.find(c => c.tipo === tipo) || combined[0]

            setSelectedContact(defaultOfTipo)
          }
        }
      } catch {
        const defaultOfTipo = DEFAULT_CONTACTS.find(c => c.tipo === tipo) || DEFAULT_CONTACTS[0]

        setSelectedContact(defaultOfTipo)
      }
    }

    loadContacts()
  }, [creditNote, tipo])

  // Fetch Invoices when contact or tipo changes
  useEffect(() => {
    if (!selectedContact?.id) {
      setAvailableInvoices([])
      
return
    }

    const fetchInvoices = async () => {
      try {
        const all = await accountingService.getInvoices()

        const match = all.filter(
          i => i.contactoId === selectedContact.id &&
               i.tipo === tipo &&
               i.tipoDocumento !== 'NOTA_CREDITO' &&
               i.estado !== 'CANCELED' &&
               i.estado !== 'REVERSED'
        )

        setAvailableInvoices(match)
      } catch {
        setAvailableInvoices([])
      }
    }

    fetchInvoices()
  }, [selectedContact, tipo])

  // Target invoice
  const targetInvoice = useMemo(() => {
    if (selectedInvoiceId === 'NONE') return null
    
return availableInvoices.find(i => i.id === selectedInvoiceId) || null
  }, [selectedInvoiceId, availableInvoices])

  // When target invoice is selected and mode is TOTAL, sync lines
  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId)
    if (invId === 'NONE') return

    const inv = availableInvoices.find(i => i.id === invId)

    if (inv) {
      setTasaBcv(inv.tasaBcv || 54.0)

      if (invoiceMode === 'TOTAL') {
        setLineas(inv.lineas.map((l, idx) => ({ ...l, id: `line-nc-${idx}` })))
      }
    }
  }

  const handleModeChange = (newMode: 'TOTAL' | 'PARCIAL') => {
    setInvoiceMode(newMode)

    if (newMode === 'TOTAL' && targetInvoice) {
      setLineas(targetInvoice.lineas.map((l, idx) => ({ ...l, id: `line-nc-${idx}` })))
    }
  }

  // Handle line changes
  const handleLineChange = (index: number, field: keyof InvoiceLine, value: any) => {
    setLineas(prev => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: value }

      if (field === 'cantidad' || field === 'precioUnitarioUsd' || field === 'tasaImpuestoPct') {
        const cant = field === 'cantidad' ? Number(value) : current.cantidad
        const precio = field === 'precioUnitarioUsd' ? Number(value) : current.precioUnitarioUsd
        const tasa = field === 'tasaImpuestoPct' ? Number(value) : current.tasaImpuestoPct

        const subtotal = Number((cant * precio).toFixed(2))
        const iva = Number(((subtotal * tasa) / 100).toFixed(2))
        const total = Number((subtotal + iva).toFixed(2))

        current.subtotalUsd = subtotal
        current.ivaUsd = iva
        current.totalUsd = total
      }

      updated[index] = current
      
return updated
    })
  }

  const handleAddLine = () => {
    const ctaDefault = tipo === 'CUSTOMER' ? 'acc-410101' : 'acc-510101'

    const newLine: InvoiceLine = {
      id: `line-${Date.now()}-${lineas.length}`,
      productoOConcepto: '',
      cuentaContableId: ctaDefault,
      cuentaContableNombre: tipo === 'CUSTOMER' ? 'Ingresos por Venta de Mercancías' : 'Costo de Ventas',
      cantidad: 1,
      precioUnitarioUsd: 0,
      tasaImpuestoPct: 16,
      subtotalUsd: 0,
      ivaUsd: 0,
      totalUsd: 0
    }

    setLineas(prev => [...prev, newLine])
  }

  const handleRemoveLine = (index: number) => {
    if (lineas.length <= 1) return
    setLineas(prev => prev.filter((_, idx) => idx !== index))
  }

  // Calculated totals
  const totalNetoUsd = Number(lineas.reduce((acc, l) => acc + (l.subtotalUsd || 0), 0).toFixed(2))
  const totalIvaUsd = Number(lineas.reduce((acc, l) => acc + (l.ivaUsd || 0), 0).toFixed(2))
  const totalUsd = Number((totalNetoUsd + totalIvaUsd).toFixed(2))
  const totalVes = Number((totalUsd * tasaBcv).toFixed(2))

  // Live accounting items
  const entryPreviewItems: JournalItem[] = useMemo(() => {
    const items: JournalItem[] = []

    const contactoCuentaId =
      tipo === 'CUSTOMER'
        ? selectedContact?.cuentaCxcId || 'acc-110201'
        : selectedContact?.cuentaCxpId || 'acc-210101'

    if (tipo === 'CUSTOMER') {
      lineas.forEach((l, idx) => {
        const subtotalVes = Number((l.subtotalUsd * tasaBcv).toFixed(2))

        items.push({
          id: `preview-nc-${idx}`,
          cuentaId: l.cuentaContableId || 'acc-410101',
          cuentaCodigo: '4.1.01.01',
          cuentaNombre: l.cuentaContableNombre || 'Devoluciones / Ingresos por Ventas',
          contactoId: selectedContact?.id,
          contactoNombre: selectedContact?.nombre,
          etiqueta: `Nota de Crédito ${numeroFactura} - ${l.productoOConcepto}`,
          debeUsd: l.subtotalUsd,
          haberUsd: 0,
          debeVes: subtotalVes,
          haberVes: 0
        })
      })

      if (totalIvaUsd > 0) {
        items.push({
          id: 'preview-nc-iva',
          cuentaId: 'acc-210201',
          cuentaCodigo: '2.1.02.01',
          cuentaNombre: 'Débito Fiscal IVA (Reversión Ventas)',
          contactoId: selectedContact?.id,
          contactoNombre: selectedContact?.nombre,
          etiqueta: `Reversión Débito Fiscal IVA NC ${numeroFactura}`,
          debeUsd: totalIvaUsd,
          haberUsd: 0,
          debeVes: Number((totalIvaUsd * tasaBcv).toFixed(2)),
          haberVes: 0
        })
      }

      items.push({
        id: 'preview-nc-cxc',
        cuentaId: contactoCuentaId,
        cuentaCodigo: '1.1.02.01',
        cuentaNombre: 'Cuentas por Cobrar Clientes (CxC)',
        contactoId: selectedContact?.id,
        contactoNombre: selectedContact?.nombre,
        etiqueta: `Aplicación NC ${numeroFactura}`,
        debeUsd: 0,
        haberUsd: totalUsd,
        debeVes: 0,
        haberVes: totalVes
      })
    } else {
      items.push({
        id: 'preview-nc-cxp',
        cuentaId: contactoCuentaId,
        cuentaCodigo: '2.1.01.01',
        cuentaNombre: 'Cuentas por Pagar Proveedores (CxP)',
        contactoId: selectedContact?.id,
        contactoNombre: selectedContact?.nombre,
        etiqueta: `Aplicación NC ${numeroFactura}`,
        debeUsd: totalUsd,
        haberUsd: 0,
        debeVes: totalVes,
        haberVes: 0
      })

      lineas.forEach((l, idx) => {
        const subtotalVes = Number((l.subtotalUsd * tasaBcv).toFixed(2))

        items.push({
          id: `preview-nc-${idx}`,
          cuentaId: l.cuentaContableId || 'acc-510101',
          cuentaCodigo: '5.1.01.01',
          cuentaNombre: l.cuentaContableNombre || 'Devoluciones / Reducción Costo de Compra',
          contactoId: selectedContact?.id,
          contactoNombre: selectedContact?.nombre,
          etiqueta: `Nota de Crédito ${numeroFactura} - ${l.productoOConcepto}`,
          debeUsd: 0,
          haberUsd: l.subtotalUsd,
          debeVes: 0,
          haberVes: subtotalVes
        })
      })

      if (totalIvaUsd > 0) {
        items.push({
          id: 'preview-nc-iva',
          cuentaId: 'acc-110401',
          cuentaCodigo: '1.1.04.01',
          cuentaNombre: 'Crédito Fiscal IVA (Reversión Compras)',
          contactoId: selectedContact?.id,
          contactoNombre: selectedContact?.nombre,
          etiqueta: `Reversión Crédito Fiscal IVA NC ${numeroFactura}`,
          debeUsd: 0,
          haberUsd: totalIvaUsd,
          debeVes: 0,
          haberVes: Number((totalIvaUsd * tasaBcv).toFixed(2))
        })
      }
    }

    return items
  }, [lineas, tipo, selectedContact, numeroFactura, tasaBcv, totalIvaUsd, totalUsd, totalVes])

  // Save handler
  const handleSave = async (postDirectly: boolean) => {
    if (!selectedContact) {
      setToastMessage('Debes seleccionar un cliente o proveedor.')
      
return
    }

    if (totalUsd <= 0) {
      setToastMessage('La nota de crédito debe tener al menos una línea con importe mayor a 0.')
      
return
    }

    try {
      const finalReason = selectedReason === 'Otro motivo'
        ? (customReason.trim() || 'Nota de crédito registrada por usuario')
        : (customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason)

      const res = await accountingService.createStandaloneCreditNote({
        tipo,
        contactoId: selectedContact.id,
        contactoNombre: selectedContact.nombre,
        contactoRif: selectedContact.rif,
        contactoCuentaContableId: tipo === 'CUSTOMER' ? selectedContact.cuentaCxcId : selectedContact.cuentaCxpId,
        facturaId: selectedInvoiceId !== 'NONE' ? selectedInvoiceId : undefined,
        motivo: finalReason,
        lineas,
        montoUsd: totalUsd,
        tasaBcv,
        fecha: fechaEmision,
        notas: observaciones
      })

      onSaved(res.creditNote)
      setToastMessage(
        postDirectly
          ? `Nota de crédito ${res.creditNote.numeroFactura} confirmada y publicada con éxito.`
          : `Borrador de nota de crédito ${res.creditNote.numeroFactura} guardado correctamente.`
      )
    } catch (err: any) {
      setToastMessage(err.message || 'Error al guardar la nota de crédito')
    }
  }

  const isSupplier = tipo === 'SUPPLIER'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Cabecera Superior de la Vista Completa */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
                {isEditing ? `Nota de Crédito ${numeroFactura}` : `Nueva Nota de Crédito (${isSupplier ? 'Proveedores' : 'Clientes'})`}
              </Typography>
              <CustomChip
                label='Nota de Crédito'
                size='small'
                variant='tonal'
                color='info'
              />
              <CustomChip
                label={isReadOnly ? 'Publicada' : 'Borrador'}
                size='small'
                variant='tonal'
                color={isReadOnly ? 'primary' : 'secondary'}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {!isReadOnly && (
            <>
              <Button
                variant='tonal'
                color='secondary'
                size='small'
                onClick={onBack}
                sx={{ borderRadius: '9999px', textTransform: 'none', fontWeight: 600 }}
              >
                Cancelar
              </Button>

              <Button
                variant='outlined'
                color='primary'
                size='small'
                startIcon={<i className='tabler-device-floppy text-base' />}
                onClick={() => handleSave(false)}
                sx={{ borderRadius: '9999px', textTransform: 'none', fontWeight: 600 }}
              >
                Guardar
              </Button>

              <Button
                variant='contained'
                color='primary'
                size='small'
                startIcon={<i className='tabler-check text-base' />}
                onClick={() => handleSave(true)}
                sx={{ borderRadius: '9999px', textTransform: 'none', fontWeight: 600 }}
              >
                Publicar
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Banner Informativo si está vinculada a factura */}
      {targetInvoice && (
        <Alert
          severity='info'
          icon={<i className='tabler-receipt-refund text-lg text-[#6C5CE7]' />}
          sx={{
            borderRadius: '16px',
            backgroundColor: '#F3F0FF',
            color: '#4C3FAF',
            border: '1px solid #D8D0F8',
            fontWeight: 500
          }}
        >
          Esta Nota de Crédito afectará y amortizará directamente el saldo de la <strong>Factura {targetInvoice.numeroFactura}</strong> (Saldo actual: ${targetInvoice.saldoPendienteUsd.toFixed(2)} USD).
        </Alert>
      )}

      {/* Tarjeta Maestro Principal */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          p: 5
        }}
      >
        {/* Cabecera Maestro */}
        <Box
          sx={{
            p: 4,
            mb: 4,
            backgroundColor: '#F8FAFC',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          {/* Fila 1: Contacto, Factura Asociada, N° Documento */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.5fr 1.5fr 1fr' }, gap: 3 }}>
            <Autocomplete
              options={contacts.filter(c => c.tipo === tipo)}
              getOptionLabel={opt => `${opt.nombre} (${opt.rif})`}
              value={selectedContact}
              disabled={isReadOnly}
              onChange={(_, val) => setSelectedContact(val)}
              renderInput={params => (
                <TextField
                  {...params}
                  size='small'
                  label={isSupplier ? 'Proveedor / Beneficiario *' : 'Cliente (Cuentas por Cobrar) *'}
                  placeholder='Buscar contacto...'
                  sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              )}
            />

            <TextField
              select
              fullWidth
              size='small'
              label='Factura Asociada (Opcional)'
              value={selectedInvoiceId}
              disabled={isReadOnly}
              onChange={e => handleSelectInvoice(e.target.value)}
              sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
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

            <TextField
              fullWidth
              size='small'
              label='N° Control Fiscal / Nota'
              value={numeroFactura}
              disabled={isReadOnly}
              onChange={e => setNumeroFactura(e.target.value)}
              sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Box>

          {/* Si tiene factura asociada, opciones de reversión */}
          {targetInvoice && !isReadOnly && (
            <Box sx={{ p: 2, borderRadius: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant='body2' sx={{ fontWeight: 600, color: '#475569' }}>
                Modalidad de la Nota de Crédito:
              </Typography>
              <RadioGroup
                row
                value={invoiceMode}
                onChange={e => handleModeChange(e.target.value as 'TOTAL' | 'PARCIAL')}
              >
                <FormControlLabel
                  value='TOTAL'
                  control={<Radio size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }} />}
                  label={<Typography variant='body2' sx={{ fontWeight: 600 }}>100% Total de la Factura</Typography>}
                />
                <FormControlLabel
                  value='PARCIAL'
                  control={<Radio size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }} />}
                  label={<Typography variant='body2' sx={{ fontWeight: 600 }}>Parcial / Personalizado</Typography>}
                />
              </RadioGroup>
            </Box>
          )}

          {/* Fila 2: Fecha, Tasa, Motivo, Moneda */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1.5fr 1fr' }, gap: 3 }}>
            <TextField
              type='date'
              fullWidth
              size='small'
              label='Fecha de Emisión'
              value={fechaEmision}
              disabled={isReadOnly}
              onChange={e => setFechaEmision(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />

            <TextField
              type='number'
              fullWidth
              size='small'
              label='Tasa Oficial BCV'
              value={tasaBcv}
              disabled={isReadOnly}
              onChange={e => setTasaBcv(Math.max(0.01, Number(e.target.value)))}
              inputProps={{ step: '0.01' }}
              sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />

            <TextField
              select
              fullWidth
              size='small'
              label='Motivo Comercial / Fiscal'
              value={selectedReason}
              disabled={isReadOnly}
              onChange={e => setSelectedReason(e.target.value)}
              sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            >
              {COMMON_REASONS.map(r => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              size='small'
              label='Moneda Operativa'
              value={moneda}
              disabled={isReadOnly}
              onChange={e => setMoneda(e.target.value as CurrencyCode)}
              sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            >
              <MenuItem value='USD'>Dólares (USD $)</MenuItem>
              <MenuItem value='VES'>Bolívares (VES Bs.)</MenuItem>
            </TextField>
          </Box>

          {selectedReason === 'Otro motivo' && (
            <TextField
              fullWidth
              size='small'
              label='Especificar motivo *'
              placeholder='Indica la razón fiscal o comercial...'
              value={customReason}
              disabled={isReadOnly}
              onChange={e => setCustomReason(e.target.value)}
              sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          )}
        </Box>

        {/* Tabs de Contenido: Líneas vs Asiento */}
        <Box sx={{ borderBottom: 1, borderColor: '#E6E4F0', mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.95rem' },
              '& .Mui-selected': { color: '#6C5CE7 !important' },
              '& .MuiTabs-indicator': { backgroundColor: '#6C5CE7' }
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <i className='tabler-list-details' />
                  <span>Líneas de la Nota de Crédito ({lineas.length})</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <i className='tabler-scale' />
                  <span>Apuntes Contables de Reversión</span>
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Tab 0: Líneas */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '16px' }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 260 }}>Concepto / Descripción</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 260 }}>Cuenta Contable</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 90 }}>Cant.</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 140 }}>Precio ($)</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 700, color: '#475569', width: 120 }}>IVA %</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#6C5CE7', width: 140 }}>Total ($)</TableCell>
                    {!isReadOnly && <TableCell align='center' sx={{ width: 60 }} />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineas.map((line, idx) => (
                    <TableRow key={line.id || idx}>
                      <TableCell>
                        <TextField
                          fullWidth
                          size='small'
                          placeholder='Ej: Devolución de producto o descuento...'
                          value={line.productoOConcepto}
                          disabled={isReadOnly}
                          onChange={e => handleLineChange(idx, 'productoOConcepto', e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size='small'
                          value={line.cuentaContableId || (tipo === 'CUSTOMER' ? 'acc-410101' : 'acc-510101')}
                          disabled={isReadOnly}
                          onChange={e => handleLineChange(idx, 'cuentaContableId', e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        >
                          {(tipo === 'CUSTOMER' ? CUSTOMER_ACCOUNT_OPTIONS : SUPPLIER_ACCOUNT_OPTIONS).map(acc => (
                            <MenuItem key={acc.id} value={acc.id}>
                              {acc.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell align='right'>
                        <TextField
                          type='number'
                          size='small'
                          value={line.cantidad}
                          disabled={isReadOnly}
                          onChange={e => handleLineChange(idx, 'cantidad', Math.max(1, Number(e.target.value)))}
                          inputProps={{ min: 1, style: { textAlign: 'right' } }}
                          sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <TextField
                          type='number'
                          size='small'
                          value={line.precioUnitarioUsd}
                          disabled={isReadOnly}
                          onChange={e => handleLineChange(idx, 'precioUnitarioUsd', Math.max(0, Number(e.target.value)))}
                          inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                          sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <TextField
                          select
                          size='small'
                          value={line.tasaImpuestoPct}
                          disabled={isReadOnly}
                          onChange={e => handleLineChange(idx, 'tasaImpuestoPct', Number(e.target.value))}
                          sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        >
                          <MenuItem value={16}>16%</MenuItem>
                          <MenuItem value={8}>8%</MenuItem>
                          <MenuItem value={0}>0%</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7', fontSize: '0.95rem' }}>
                        ${line.totalUsd.toFixed(2)}
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell align='center'>
                          <Tooltip title='Eliminar línea'>
                            <IconButton
                              size='small'
                              onClick={() => handleRemoveLine(idx)}
                              disabled={lineas.length <= 1}
                              sx={{ color: '#EF4444' }}
                            >
                              <i className='tabler-trash' />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {!isReadOnly && (
              <Box>
                <Button
                  variant='outlined'
                  startIcon={<i className='tabler-plus' />}
                  onClick={handleAddLine}
                  sx={{
                    borderRadius: '9999px',
                    borderColor: '#6C5CE7',
                    color: '#6C5CE7',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 3,
                    '&:hover': { borderColor: '#5B4CDB', backgroundColor: 'rgba(108, 92, 231, 0.08)' }
                  }}
                >
                  Agregar Línea
                </Button>
              </Box>
            )}

            {/* Fila Inferior: Observaciones y Totales */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 4, mt: 2 }}>
              <Box>
                <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B', mb: 1 }}>
                  Observaciones / Justificación de la Nota de Crédito
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  placeholder='Detalles para el libro de ventas/compras y soporte de auditoría...'
                  value={observaciones}
                  disabled={isReadOnly}
                  onChange={e => setObservaciones(e.target.value)}
                  sx={{ backgroundColor: '#FFFFFF', borderRadius: '14px', '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
                />
              </Box>

              {/* Tarjeta de Totales */}
              <Box
                sx={{
                  p: 3.5,
                  borderRadius: '20px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='body2' sx={{ color: '#64748B' }}>Subtotal Neto:</Typography>
                  <Typography variant='body1' sx={{ fontWeight: 600, color: '#1E293B' }}>
                    ${totalNetoUsd.toFixed(2)} USD
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='body2' sx={{ color: '#64748B' }}>IVA Reversado:</Typography>
                  <Typography variant='body1' sx={{ fontWeight: 600, color: '#1E293B' }}>
                    ${totalIvaUsd.toFixed(2)} USD
                  </Typography>
                </Box>

                <Box
                  sx={{
                    pt: 2,
                    mt: 1,
                    borderTop: '2px dashed #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline'
                  }}
                >
                  <Typography variant='h6' sx={{ fontWeight: 800, color: '#1E293B' }}>
                    Total Nota de Crédito:
                  </Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant='h5' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                      ${totalUsd.toFixed(2)} USD
                    </Typography>
                    <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>
                      {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* Tab 1: Asiento Automático */}
        {activeTab === 1 && (
          <AutomaticEntryPreview items={entryPreviewItems} tasaBcv={tasaBcv} />
        )}
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity='info' onClose={() => setToastMessage(null)} sx={{ borderRadius: '12px', fontWeight: 600 }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
