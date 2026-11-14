'use client'

import React, { useState, useEffect, useMemo } from 'react'

import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Paper from '@mui/material/Paper'

import { accountingService } from '@/services/accountingService'
import type { SupplierBatchItem, Journal } from '@/types/accountingTypes'
import { BatchConfirmationModal } from './BatchConfirmationModal'

export const BatchPaymentsView: React.FC = () => {
  const [items, setItems] = useState<SupplierBatchItem[]>([])
  const [journals, setJournals] = useState<Journal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [tasaBcv] = useState(54.00)

  // Paying bank selector
  const bankJournals = useMemo(() => {
    return journals.filter(j => j.tipo.startsWith('BANCO') || j.tipo === 'CAJA')
  }, [journals])

  const [selectedBankJournalId, setSelectedBankJournalId] = useState<string>('')

  // Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)

      const [batchItems, jList] = await Promise.all([
        accountingService.getSupplierBatchItems(),
        accountingService.getJournals()
      ])

      setItems(batchItems)
      setJournals(jList)

      const firstBank = jList.find(j => j.tipo.startsWith('BANCO'))

      if (firstBank) {
        setSelectedBankJournalId(firstBank.id)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(
      it =>
        it.proveedorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.proveedorRif.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.numeroFactura.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm])

  // Selected batch items
  const selectedBatchItems = useMemo(() => {
    return items.filter(it => selectedIds.has(it.facturaId))
  }, [items, selectedIds])

  const totalSelectedUsd = useMemo(() => {
    return selectedBatchItems.reduce((acc, it) => acc + it.montoAPagarUsd, 0)
  }, [selectedBatchItems])

  const totalSelectedVes = Number((totalSelectedUsd * tasaBcv).toFixed(2))

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map(it => it.facturaId)))
    }
  }

  const handleToggleItem = (facturaId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)

      if (next.has(facturaId)) {
        next.delete(facturaId)
      } else {
        next.add(facturaId)
      }

      return next
    })
  }

  const handleBatchSuccess = (loteId: string, totalUsd: number, totalVes: number) => {
    setToastMessage(`Lote ${loteId} procesado exitosamente por $${totalUsd.toFixed(2)} USD (${totalVes.toLocaleString('es-VE')} Bs.).`)
    setSelectedIds(new Set())
    loadData()
  }

  const currentBankJournal = journals.find(j => j.id === selectedBankJournalId) || bankJournals[0]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', pb: selectedIds.size >= 2 ? 14 : 0 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
            Pagos a Proveedores por Lote
          </Typography>
          <Typography variant='body2' sx={{ color: '#64748B' }}>
            Emisión y contabilización consolidada de pagos
          </Typography>
        </Box>

        <Chip
          label={`Tasa BCV: ${tasaBcv.toFixed(2)} Bs/USD`}
          size='medium'
          sx={{
            fontWeight: 700,
            backgroundColor: 'rgba(108, 92, 231, 0.1)',
            color: '#6C5CE7',
            borderRadius: '9999px',
            border: '1px solid rgba(108, 92, 231, 0.2)'
          }}
        />
      </Box>

      {/* Main card */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: 4
        }}
      >
        {/* Search */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            size='small'
            placeholder='Buscar por proveedor, RIF o número de factura...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{ maxWidth: 420, width: '100%' }}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
            }}
          />

          <Typography variant='body2' sx={{ color: '#64748B', fontWeight: 500 }}>
            {filteredItems.length} facturas pendientes de pago
          </Typography>
        </Box>

        {/* Table */}
        <TableContainer sx={{ border: '1px solid #F1F5F9', borderRadius: '16px' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell padding='checkbox'>
                  <Checkbox
                    indeterminate={selectedIds.size > 0 && selectedIds.size < filteredItems.length}
                    checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                    onChange={handleToggleSelectAll}
                    sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Proveedor</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>N° Factura</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Banco Destino</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Cuenta / Pago Móvil</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Pendiente (USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Pendiente (VES)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={7}>
                      <Skeleton variant='text' height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    No hay facturas de proveedores pendientes de pago por lote.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map(item => {
                  const isSelected = selectedIds.has(item.facturaId)

                  return (
                    <TableRow
                      key={item.facturaId}
                      hover
                      selected={isSelected}
                      onClick={() => handleToggleItem(item.facturaId)}
                      sx={{
                        cursor: 'pointer',
                        '&.Mui-selected': { backgroundColor: 'rgba(108, 92, 231, 0.05) !important' }
                      }}
                    >
                      <TableCell padding='checkbox' onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleItem(item.facturaId)}
                          sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                          {item.proveedorNombre}
                        </Typography>
                        <Typography variant='caption' sx={{ color: '#64748B' }}>
                          {item.proveedorRif}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#334155' }}>
                        {item.numeroFactura}
                      </TableCell>
                      <TableCell sx={{ color: '#64748B' }}>
                        {item.bancoDestino || 'Banesco Universal'}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', color: '#475569', fontSize: '0.85rem' }}>
                        {item.cuentaBancaria20Digitos || item.telefonoPagoMovil}
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#EF4444' }}>
                        ${item.montoPendienteUsd.toFixed(2)}
                      </TableCell>
                      <TableCell align='right' sx={{ color: '#64748B' }}>
                        {item.montoPendienteVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Floating Bottom Action Card (EARS-BATCH-01) */}
      {selectedIds.size >= 2 && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            bottom: 24,
            left: { xs: 24, md: 'calc(260px + 32px)' },
            right: 32,
            zIndex: 100,
            p: 3,
            px: 4,
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                color: '#10B981'
              }}
            >
              <i className='tabler-check' />
            </Box>
            <Box>
              <Typography variant='subtitle1' sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                {selectedIds.size} facturas seleccionadas
              </Typography>
              <Typography variant='caption' sx={{ color: '#94A3B8' }}>
                Total acumulado:{' '}
                <strong style={{ color: '#38BDF8' }}>${totalSelectedUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>{' '}
                ({totalSelectedVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES)
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              select
              size='small'
              value={selectedBankJournalId}
              onChange={e => setSelectedBankJournalId(e.target.value)}
              sx={{
                minWidth: 220,
                backgroundColor: '#334155',
                borderRadius: '12px',
                '& .MuiInputBase-input': { color: '#FFFFFF' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }
              }}
            >
              {bankJournals.map(j => (
                <MenuItem key={j.id} value={j.id}>
                  {j.nombre}
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant='contained'
              onClick={() => setConfirmModalOpen(true)}
              startIcon={<i className='tabler-send' />}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#10B981',
                textTransform: 'none',
                fontWeight: 700,
                px: 4,
                py: 1.5,
                '&:hover': { backgroundColor: '#059669' }
              }}
            >
              Generar y Contabilizar Lote
            </Button>
          </Box>
        </Paper>
      )}

      {/* Confirmation Modal */}
      {currentBankJournal && (
        <BatchConfirmationModal
          open={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onSuccess={handleBatchSuccess}
          selectedItems={selectedBatchItems}
          bankJournal={currentBankJournal}
          tasaBcv={tasaBcv}
        />
      )}

      {/* Toast */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='success' sx={{ borderRadius: '12px' }} onClose={() => setToastMessage(null)}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
