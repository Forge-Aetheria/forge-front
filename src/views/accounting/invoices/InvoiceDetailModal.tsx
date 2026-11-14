'use client'

import React, { useState, useEffect, useMemo } from 'react'

import { useRouter } from 'next/navigation'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'

import { accountingService, isInvoiceLandedCostEligible } from '@/services/accountingService'
import { settingsService } from '@/services/settingsService'
import type {
  Account,
  AccountingInvoice,
  InvoiceAccountingType,
  InvoiceLine,
  JournalItem
} from '@/types/accountingTypes'
import { AutomaticEntryPreview } from './components/AutomaticEntryPreview'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (invoice: AccountingInvoice) => void
  invoice?: AccountingInvoice | null
  accounts: Account[]
  defaultTasaBcv?: number
}

// Contact seeds for selection
const CONTACT_OPTIONS = [
  { id: 'ct-01', nombre: 'Inversiones Caroní C.A.', rif: 'J-30981245-2', tipo: 'CUSTOMER', cuentaCxcId: 'acc-110201' },
  { id: 'ct-02', nombre: 'Distribuidora Oriental S.A.S.', rif: 'J-40291823-1', tipo: 'CUSTOMER', cuentaCxcId: 'acc-110201' },
  { id: 'ct-03', nombre: 'Corporación Metalmecánica Bolivariana', rif: 'J-31890234-5', tipo: 'CUSTOMER', cuentaCxcId: 'acc-110201' },
  { id: 'ct-prov-01', nombre: 'Distribuidora Eléctrica del Sur C.A.', rif: 'J-40128456-0', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-prov-02', nombre: 'Aceros y Perfiles Guayana S.A.', rif: 'J-29845112-9', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' },
  { id: 'ct-prov-03', nombre: 'Ferretería Industrial Roscio C.A.', rif: 'J-31456789-1', tipo: 'SUPPLIER', cuentaCxpId: 'acc-210101' }
]

export const InvoiceDetailModal: React.FC<Props> = ({
  open,
  onClose,
  onSaved,
  invoice,
  accounts,
  defaultTasaBcv = 54.00
}) => {
  const router = useRouter()
  const isEditing = Boolean(invoice)
  const isReadOnly = invoice?.estado === 'POSTED' || invoice?.estado === 'PAID'

  const [activeTab, setActiveTab] = useState<number>(0)
  const [tipo, setTipo] = useState<InvoiceAccountingType>(invoice?.tipo || 'CUSTOMER')
  const [numeroFactura, setNumeroFactura] = useState(invoice?.numeroFactura || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`)
  const [contactoId, setContactoId] = useState(invoice?.contactoId || CONTACT_OPTIONS[0].id)
  const [tasaBcv, setTasaBcv] = useState<number>(invoice?.tasaBcv || defaultTasaBcv)
  const [fechaEmision, setFechaEmision] = useState(invoice?.fechaEmision || new Date().toISOString().split('T')[0])

  const [fechaVencimiento, setFechaVencimiento] = useState(
    invoice?.fechaVencimiento || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  )

  const [costosEnDestinoActivos, setCostosEnDestinoActivos] = useState<boolean>(true)

  useEffect(() => {
    settingsService
      .getFiscalRules()
      .then(rules => {
        setCostosEnDestinoActivos(rules.costosEnDestinoActivos !== false)
      })
      .catch(() => {})
  }, [])

  const [lineas, setLineas] = useState<InvoiceLine[]>(
    invoice?.lineas || [
      {
        id: 'lin-1',
        productoOConcepto: 'Servicio de Consultoría / Mercancía General',
        cuentaContableId: tipo === 'CUSTOMER' ? 'acc-410101' : 'acc-510101',
        cantidad: 1,
        precioUnitarioUsd: 100.0,
        tasaImpuestoPct: 16,
        subtotalUsd: 100.0,
        ivaUsd: 16.0,
        totalUsd: 116.0
      }
    ]
  )

  useEffect(() => {
    if (invoice) {
      setTipo(invoice.tipo)
      setNumeroFactura(invoice.numeroFactura)
      setContactoId(invoice.contactoId)
      setTasaBcv(invoice.tasaBcv)
      setFechaEmision(invoice.fechaEmision)
      setFechaVencimiento(invoice.fechaVencimiento)
      setLineas(invoice.lineas)
    } else {
      setNumeroFactura(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`)
      setTasaBcv(defaultTasaBcv)
    }
  }, [invoice, defaultTasaBcv, open])

  // Current selected contact
  const currentContact = useMemo(() => {
    return CONTACT_OPTIONS.find(c => c.id === contactoId) || CONTACT_OPTIONS[0]
  }, [contactoId])

  // Account candidates for lines
  const eligibleAccounts = useMemo(() => {
    if (tipo === 'CUSTOMER') {
      return accounts.filter(a => a.tipo.startsWith('INCOME'))
    }

    return accounts.filter(a => a.tipo === 'COST_OF_GOODS' || a.tipo.startsWith('EXPENSE'))
  }, [accounts, tipo])

  // Handle contact change and update corresponding default account
  const handleContactChange = (newContactId: string) => {
    setContactoId(newContactId)
  }

  // Handle line updates
  const handleLineChange = (index: number, field: keyof InvoiceLine, value: any) => {
    setLineas(prev => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: value }

      if (field === 'cantidad' || field === 'precioUnitarioUsd' || field === 'tasaImpuestoPct') {
        const qty = Number(current.cantidad) || 0
        const price = Number(current.precioUnitarioUsd) || 0
        const taxRate = Number(current.tasaImpuestoPct) || 0

        current.subtotalUsd = Number((qty * price).toFixed(2))
        current.ivaUsd = Number(((current.subtotalUsd * taxRate) / 100).toFixed(2))
        current.totalUsd = Number((current.subtotalUsd + current.ivaUsd).toFixed(2))
      }

      updated[index] = current

      return updated
    })
  }

  const handleAddLine = () => {
    const defaultAccount = eligibleAccounts[0]?.id || (tipo === 'CUSTOMER' ? 'acc-410101' : 'acc-510101')

    setLineas(prev => [
      ...prev,
      {
        id: `lin-${Date.now()}`,
        productoOConcepto: '',
        cuentaContableId: defaultAccount,
        cantidad: 1,
        precioUnitarioUsd: 0,
        tasaImpuestoPct: 16,
        subtotalUsd: 0,
        ivaUsd: 0,
        totalUsd: 0
      }
    ])
  }

  const handleRemoveLine = (index: number) => {
    if (lineas.length <= 1) return
    setLineas(prev => prev.filter((_, i) => i !== index))
  }

  // Calculate totals
  const totalNetoUsd = useMemo(() => lineas.reduce((acc, l) => acc + l.subtotalUsd, 0), [lineas])
  const totalIvaUsd = useMemo(() => lineas.reduce((acc, l) => acc + l.ivaUsd, 0), [lineas])
  const totalUsd = Number((totalNetoUsd + totalIvaUsd).toFixed(2))
  const totalVes = Number((totalUsd * tasaBcv).toFixed(2))

  // Real-time automatic entry preview
  const entryPreviewItems: JournalItem[] = useMemo(() => {
    const contactoCuentaId = tipo === 'CUSTOMER'
      ? currentContact.cuentaCxcId || 'acc-110201'
      : currentContact.cuentaCxpId || 'acc-210101'

    return accountingService.generateInvoicePreviewEntry(
      {
        tipo,
        numeroFactura,
        contactoId: currentContact.id,
        contactoNombre: currentContact.nombre,
        contactoCuentaContableId: contactoCuentaId,
        tasaBcv,
        lineas
      },
      accounts
    )
  }, [tipo, numeroFactura, currentContact, tasaBcv, lineas, accounts])

  // Save handler
  const handleSave = async (postDirectly: boolean) => {
    const contactoCuentaId = tipo === 'CUSTOMER'
      ? currentContact.cuentaCxcId || 'acc-110201'
      : currentContact.cuentaCxpId || 'acc-210101'

    const newInvoice: AccountingInvoice = {
      id: invoice?.id || `inv-${Date.now()}`,
      numeroFactura,
      tipo,
      diarioId: tipo === 'CUSTOMER' ? 'jou-sales' : 'jou-purchases',
      contactoId: currentContact.id,
      contactoNombre: currentContact.nombre,
      contactoRif: currentContact.rif,
      contactoCuentaContableId: contactoCuentaId,
      fechaEmision,
      fechaVencimiento,
      tasaBcv,
      estado: postDirectly ? 'POSTED' : 'DRAFT',
      lineas,
      totalNetoUsd,
      totalIvaUsd,
      totalUsd,
      totalVes,
      saldoPendienteUsd: totalUsd,
      saldoPendienteVes: totalVes
    }

    if (postDirectly) {
      // Create journal entry automatically
      await accountingService.createJournalEntry({
        diarioId: tipo === 'CUSTOMER' ? 'jou-sales' : 'jou-purchases',
        fecha: fechaEmision,
        origen: 'FACTURA',
        documentoReferencia: numeroFactura,
        tasaBcv,
        creadoPor: 'Módulo Facturación',
        lineas: entryPreviewItems
      })
    }

    onSaved(newInvoice)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 5,
          pb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #E6E4F0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '16px',
              backgroundColor: tipo === 'CUSTOMER' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: tipo === 'CUSTOMER' ? '#10B981' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}
          >
            <i className={tipo === 'CUSTOMER' ? 'tabler-file-invoice' : 'tabler-receipt'} />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B' }}>
              {isEditing ? `Factura ${invoice?.numeroFactura}` : `Nueva Factura de ${tipo === 'CUSTOMER' ? 'Cliente' : 'Proveedor'}`}
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Contabilización bimonetaria con partida doble automática
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {invoice?.estado && (
            <Chip
              label={invoice.estado}
              size='small'
              sx={{
                fontWeight: 700,
                borderRadius: '9999px',
                backgroundColor: invoice.estado === 'POSTED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(108, 92, 231, 0.12)',
                color: invoice.estado === 'POSTED' ? '#10B981' : '#6C5CE7'
              }}
            />
          )}
          <IconButton onClick={onClose} size='small' sx={{ color: '#94A3B8' }}>
            <i className='tabler-x' />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 5 }}>
        {/* Cabecera del formulario */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4, mt: 0.5 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Tipo de Factura'
            value={tipo}
            disabled={isReadOnly || isEditing}
            onChange={e => setTipo(e.target.value as InvoiceAccountingType)}
          >
            <MenuItem value='CUSTOMER'>Factura de Cliente (Venta)</MenuItem>
            <MenuItem value='SUPPLIER'>Factura de Proveedor (Compra)</MenuItem>
          </TextField>

          <TextField
            fullWidth
            size='small'
            label='Número de Factura'
            value={numeroFactura}
            disabled={isReadOnly}
            onChange={e => setNumeroFactura(e.target.value)}
          />

          <TextField
            select
            fullWidth
            size='small'
            label={tipo === 'CUSTOMER' ? 'Cliente' : 'Proveedor'}
            value={contactoId}
            disabled={isReadOnly}
            onChange={e => handleContactChange(e.target.value)}
          >
            {CONTACT_OPTIONS.filter(c => c.tipo === tipo).map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.nombre} ({c.rif})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            size='small'
            type='number'
            label='Tasa Oficial BCV (Bs/USD)'
            value={tasaBcv}
            disabled={isReadOnly}
            onChange={e => setTasaBcv(Number(e.target.value))}
            InputProps={{
              endAdornment: <Typography variant='caption' sx={{ color: '#64748B' }}>Bs.</Typography>
            }}
          />

          <TextField
            fullWidth
            size='small'
            type='date'
            label='Fecha de Emisión'
            value={fechaEmision}
            disabled={isReadOnly}
            onChange={e => setFechaEmision(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            size='small'
            type='date'
            label='Fecha de Vencimiento'
            value={fechaVencimiento}
            disabled={isReadOnly}
            onChange={e => setFechaVencimiento(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* Tabs de Navegación */}
        <Box sx={{ borderBottom: 1, borderColor: '#E6E4F0', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem'
              },
              '& .Mui-selected': {
                color: '#6C5CE7 !important'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#6C5CE7'
              }
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <i className='tabler-list-details' />
                  <span>Líneas de Factura ({lineas.length})</span>
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <i className='tabler-scale' />
                  <span>Apuntes Contables (Asiento Automático)</span>
                  <Chip
                    label='En Vivo'
                    size='small'
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(108, 92, 231, 0.1)',
                      color: '#6C5CE7'
                    }}
                  />
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Tab 0: Líneas de Factura */}
        {activeTab === 0 && (
          <Box>
            <TableContainer
              sx={{
                border: '1px solid #E6E4F0',
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                mb: 3
              }}
            >
              <Table size='small'>
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 220 }}>Concepto / Producto</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 200 }}>Cuenta Contable</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 90 }}>Cant.</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 120 }}>Precio ($)</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 700, color: '#475569', width: 100 }}>IVA %</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 120 }}>Total ($)</TableCell>
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
                          placeholder='Ej. Consultoría o Producto'
                          value={line.productoOConcepto}
                          disabled={isReadOnly}
                          onChange={e => handleLineChange(idx, 'productoOConcepto', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size='small'
                          value={line.cuentaContableId}
                          disabled={isReadOnly}
                          onChange={e => handleLineChange(idx, 'cuentaContableId', e.target.value)}
                        >
                          {eligibleAccounts.map(acc => (
                            <MenuItem key={acc.id} value={acc.id}>
                              {acc.codigo} - {acc.nombre}
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
                          inputProps={{ min: 1, style: { textAlign: 'right' } }}
                          onChange={e => handleLineChange(idx, 'cantidad', e.target.value)}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <TextField
                          type='number'
                          size='small'
                          value={line.precioUnitarioUsd}
                          disabled={isReadOnly}
                          inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                          onChange={e => handleLineChange(idx, 'precioUnitarioUsd', e.target.value)}
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <TextField
                          select
                          size='small'
                          value={line.tasaImpuestoPct}
                          disabled={isReadOnly}
                          onChange={e => handleLineChange(idx, 'tasaImpuestoPct', e.target.value)}
                        >
                          <MenuItem value={16}>16%</MenuItem>
                          <MenuItem value={8}>8%</MenuItem>
                          <MenuItem value={0}>Exento (0%)</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#1E293B' }}>
                        ${line.totalUsd.toFixed(2)}
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell align='center'>
                          <Tooltip title='Eliminar Línea'>
                            <span>
                              <IconButton
                                size='small'
                                disabled={lineas.length <= 1}
                                onClick={() => handleRemoveLine(idx)}
                                sx={{ color: '#EF4444' }}
                              >
                                <i className='tabler-trash' />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {!isReadOnly && (
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-plus' />}
                onClick={handleAddLine}
                sx={{
                  borderRadius: '9999px',
                  color: '#6C5CE7',
                  borderColor: '#6C5CE7',
                  textTransform: 'none',
                  fontWeight: 600,
                  mb: 3
                }}
              >
                Agregar Línea
              </Button>
            )}

            {/* Resumen de Totales */}
            <Box
              sx={{
                p: 4,
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                border: '1px solid #E6E4F0',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' sx={{ color: '#64748B' }}>Subtotal Neto:</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                    ${totalNetoUsd.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' sx={{ color: '#64748B' }}>IVA Total:</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                    ${totalIvaUsd.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ height: 1, backgroundColor: '#E2E8F0', my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='subtitle1' sx={{ fontWeight: 700, color: '#1E293B' }}>Total USD:</Typography>
                  <Typography variant='h6' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                    ${totalUsd.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='caption' sx={{ color: '#64748B' }}>Equivalente VES:</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 700, color: '#10B981' }}>
                    {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* Tab 1: Asiento Automático */}
        {activeTab === 1 && (
          <AutomaticEntryPreview items={entryPreviewItems} tasaBcv={tasaBcv} />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 5, pt: 3, borderTop: '1px solid #E6E4F0', gap: 2 }}>
        {invoice && isInvoiceLandedCostEligible(invoice, costosEnDestinoActivos) && (
          <Button
            variant='outlined'
            onClick={() => {
              onClose()
              router.push(`/inventory/operations/landed-costs/create?invoiceId=${invoice.id}`)
            }}
            startIcon={<i className='tabler-calculator text-base' />}
            sx={{
              borderRadius: '9999px',
              borderColor: '#6C5CE7',
              color: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              px: 3.5,
              mr: 'auto',
              '&:hover': { borderColor: '#5b4bc4', backgroundColor: '#F0EEF9' }
            }}
          >
            Crear Costo en Destino
          </Button>
        )}

        <Button
          variant='outlined'
          onClick={onClose}
          sx={{
            borderRadius: '9999px',
            borderColor: '#CBD5E1',
            color: '#64748B',
            textTransform: 'none',
            fontWeight: 600,
            px: 4
          }}
        >
          Cerrar
        </Button>

        {!isReadOnly && (
          <>
            <Button
              variant='outlined'
              onClick={() => handleSave(false)}
              sx={{
                borderRadius: '9999px',
                borderColor: '#6C5CE7',
                color: '#6C5CE7',
                textTransform: 'none',
                fontWeight: 600,
                px: 4
              }}
            >
              Guardar como Borrador
            </Button>
            <Button
              variant='contained'
              onClick={() => handleSave(true)}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                textTransform: 'none',
                fontWeight: 700,
                px: 4,
                '&:hover': { backgroundColor: '#5b4bc4' }
              }}
            >
              Confirmar y Publicar Factura
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
