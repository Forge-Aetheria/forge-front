'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'

import { useSearchParams } from 'next/navigation'

import { accountingService } from '@/services/accountingService'
import type { Account, Journal, JournalEntry, EntrySource } from '@/types/accountingTypes'
import { JournalEntryFormView } from './JournalEntryFormView'

export const JournalEntriesListView: React.FC = () => {
  const searchParams = useSearchParams()

  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [journals, setJournals] = useState<Journal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [journalFilter, setJournalFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState<'ALL' | EntrySource>('ALL')

  // Full view state (Vista Completa)
  const [isFormActive, setIsFormActive] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [eList, jList, aList] = await Promise.all([
        accountingService.getJournalEntries('ALL'),
        accountingService.getJournals(),
        accountingService.getAccounts()
      ])

      setEntries(eList)
      setJournals(jList)
      setAccounts(aList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Soporte para query params (?action=new o ?id=as-xxx)
  useEffect(() => {
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    if (action === 'new') {
      setSelectedEntry(null)
      setIsFormActive(true)
    } else if (id && entries.length > 0) {
      const found = entries.find(e => e.id === id || e.numeroAsiento === id)

      if (found) {
        setSelectedEntry(found)
        setIsFormActive(true)
      }
    }
  }, [searchParams, entries])

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchSearch =
        e.numeroAsiento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.documentoReferencia && e.documentoReferencia.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.notas && e.notas.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchJournal = journalFilter === 'ALL' || e.diarioId === journalFilter
      const matchSource = sourceFilter === 'ALL' || e.origen === sourceFilter

      return matchSearch && matchJournal && matchSource
    })
  }, [entries, searchTerm, journalFilter, sourceFilter])

  const handleOpenCreate = () => {
    setSelectedEntry(null)
    setIsFormActive(true)
  }

  const handleOpenDetail = (entry: JournalEntry) => {
    setSelectedEntry(entry)
    setIsFormActive(true)
  }

  const handleSuccess = (newOrUpdated: JournalEntry, msg: string) => {
    setToastMessage(msg)
    loadData()
    setIsFormActive(false)
    setSelectedEntry(null)
  }

  if (isFormActive) {
    return (
      <JournalEntryFormView
        entry={selectedEntry}
        accounts={accounts}
        journals={journals}
        onBack={() => {
          setIsFormActive(false)
          setSelectedEntry(null)
        }}
        onSuccess={handleSuccess}
        onEntryUpdated={updated => {
          setSelectedEntry(updated)
          loadData()
        }}
      />
    )
  }

  const getSourceBadge = (source: EntrySource) => {
    switch (source) {
      case 'FACTURA':
        return <Chip label='Factura' size='small' sx={{ backgroundColor: 'rgba(108, 92, 231, 0.1)', color: '#6C5CE7', fontWeight: 600 }} />
      case 'PAGO':
        return <Chip label='Pago' size='small' sx={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontWeight: 600 }} />
      case 'PAGO_LOTE':
        return <Chip label='Lote Proveedores' size='small' sx={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9', fontWeight: 600 }} />
      case 'GASTO_DIRECTO':
        return <Chip label='Gasto Directo' size='small' sx={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontWeight: 600 }} />
      case 'MANUAL':
        return <Chip label='Manual' size='small' sx={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontWeight: 600 }} />
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Cabecera */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
            Libro Diario y Asientos Contables
          </Typography>
          <Typography variant='body2' sx={{ color: '#64748B' }}>
            Registro cronológico de apuntes contables y auditoría
          </Typography>
        </Box>

        <Button
          variant='contained'
          startIcon={<i className='tabler-plus' />}
          onClick={handleOpenCreate}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            fontWeight: 700,
            textTransform: 'none',
            px: 4,
            '&:hover': { backgroundColor: '#5b4bc4' }
          }}
        >
          Nuevo
        </Button>
      </Box>

      {/* Main Card */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: 4
        }}
      >
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <TextField
            size='small'
            placeholder='Buscar por N° asiento, referencia o concepto...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{ flex: 1, minWidth: 260 }}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
            }}
          />

          <TextField
            select
            size='small'
            value={journalFilter}
            onChange={e => setJournalFilter(e.target.value)}
            sx={{ width: 240 }}
          >
            <MenuItem value='ALL'>Todos los diarios</MenuItem>
            {journals.map(j => (
              <MenuItem key={j.id} value={j.id}>
                {j.nombre}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size='small'
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value as any)}
            sx={{ width: 220 }}
          >
            <MenuItem value='ALL'>Todos los orígenes</MenuItem>
            <MenuItem value='FACTURA'>Factura</MenuItem>
            <MenuItem value='PAGO'>Pago Individual</MenuItem>
            <MenuItem value='PAGO_LOTE'>Lote Proveedores</MenuItem>
            <MenuItem value='GASTO_DIRECTO'>Gasto Directo</MenuItem>
            <MenuItem value='MANUAL'>Asiento Manual</MenuItem>
          </TextField>
        </Box>

        {/* Table */}
        <TableContainer sx={{ border: '1px solid #F1F5F9', borderRadius: '16px' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>N° Asiento</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Diario</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Origen / Ref.</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Total Debe ($)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Total Haber ($)</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>Estado</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={8}>
                      <Skeleton variant='text' height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    No se encontraron asientos contables registrados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map(entry => (
                  <TableRow
                    key={entry.id}
                    hover
                    sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                    onClick={() => handleOpenDetail(entry)}
                  >
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>
                      {entry.numeroAsiento}
                    </TableCell>
                    <TableCell sx={{ color: '#64748B' }}>
                      {entry.fecha}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: '#334155' }}>
                      {entry.diarioNombre}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {getSourceBadge(entry.origen)}
                        <Typography variant='caption' sx={{ color: '#64748B' }}>
                          {entry.documentoReferencia || '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, color: '#1E293B' }}>
                      ${entry.totalDebeUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, color: '#1E293B' }}>
                      ${entry.totalHaberUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align='center'>
                      <Chip
                        label={entry.estado === 'POSTED' ? 'Publicado' : entry.estado === 'DRAFT' ? 'Borrador' : 'Anulado'}
                        size='small'
                        sx={{
                          fontWeight: 700,
                          backgroundColor:
                            entry.estado === 'POSTED'
                              ? 'rgba(16, 185, 129, 0.12)'
                              : entry.estado === 'DRAFT'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.12)',
                          color:
                            entry.estado === 'POSTED'
                              ? '#10B981'
                              : entry.estado === 'DRAFT'
                                ? '#D97706'
                                : '#EF4444',
                          borderRadius: '9999px'
                        }}
                      />
                    </TableCell>
                    <TableCell align='center' onClick={e => e.stopPropagation()}>
                      <Tooltip title='Ver Asiento'>
                        <IconButton size='small' onClick={() => handleOpenDetail(entry)} sx={{ color: '#6C5CE7' }}>
                          <i className='tabler-eye' />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

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
