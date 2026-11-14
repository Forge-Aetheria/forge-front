'use client'

import React, { useState, useEffect, useMemo } from 'react'

import { useSearchParams } from 'next/navigation'

import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'

import TablePagination from '@mui/material/TablePagination'
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

import CustomChip from '@core/components/mui/Chip'


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
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

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

  const paginatedEntries = useMemo(() => {
    return filteredEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredEntries, page, rowsPerPage])

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
        return <CustomChip label='Factura' size='small' variant='tonal' color='primary' />
      case 'PAGO':
        return <CustomChip label='Pago' size='small' variant='tonal' color='success' />
      case 'PAGO_LOTE':
        return <CustomChip label='Lote Proveedores' size='small' variant='tonal' color='info' />
      case 'GASTO_DIRECTO':
        return <CustomChip label='Gasto Directo' size='small' variant='tonal' color='error' />
      case 'MANUAL':
        return <CustomChip label='Manual' size='small' variant='tonal' color='warning' />
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

        {/* Table Toolbar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 2,
            backgroundColor: '#FAF9FF',
            border: '1px solid #E6E4F0',
            borderBottom: 'none',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B' }}>
              Asientos Contables Registrados
            </Typography>
            <CustomChip
              label={`${filteredEntries.length} ${filteredEntries.length === 1 ? 'asiento' : 'asientos'}`}
              variant='tonal'
              color='primary'
              size='small'
            />
          </Box>
        </Box>

        {/* Table */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderTop: 'none', borderRadius: '0 0 16px 16px' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
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
                paginatedEntries.map(entry => (
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
                      <CustomChip
                        label={entry.estado === 'POSTED' ? 'Publicado' : entry.estado === 'DRAFT' ? 'Borrador' : 'Anulado'}
                        size='small'
                        variant='tonal'
                        color={
                          entry.estado === 'POSTED'
                            ? 'success'
                            : entry.estado === 'DRAFT'
                              ? 'warning'
                              : 'error'
                        }
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

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component='div'
          count={filteredEntries.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          labelRowsPerPage='Filas por página:'
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
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
