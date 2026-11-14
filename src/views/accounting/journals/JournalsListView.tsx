'use client'

import React, { useState, useEffect, useMemo } from 'react'

import { useSearchParams } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import Menu from '@mui/material/Menu'
import Divider from '@mui/material/Divider'

import TablePagination from '@mui/material/TablePagination'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import CustomChip from '@core/components/mui/Chip'

import { accountingService } from '@/services/accountingService'
import type { Journal, Account } from '@/types/accountingTypes'
import { JournalFormView } from './JournalFormView'

export const JournalsListView: React.FC = () => {
  const searchParams = useSearchParams()

  const [journals, setJournals] = useState<Journal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | string>('ALL')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [currentView, setCurrentView] = useState<'list' | 'form'>(
    searchParams.get('action') === 'new' ? 'form' : 'list'
  )

  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Control de Columnas Visibles
  const DEFAULT_VISIBLE_COLUMNS = {
    nombre: true,
    codigo: true,
    tipo: true,
    moneda: true,
    cuentaAsociada: true,
    saldoUsd: true,
    saldoVes: true
  }

  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS)
  const [columnAnchorEl, setColumnAnchorEl] = useState<null | HTMLElement>(null)

  // Selección Múltiple y Acciones en Lote
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchMenuAnchorEl, setBatchMenuAnchorEl] = useState<null | HTMLElement>(null)


  const loadData = async () => {
    try {
      setLoading(true)

      const [jList, aList] = await Promise.all([
        accountingService.getJournals(),
        accountingService.getAccounts()
      ])

      setJournals(jList)
      setAccounts(aList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredJournals = useMemo(() => {
    return journals.filter(j => {
      const matchSearch =
        j.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.codigo.toLowerCase().includes(searchTerm.toLowerCase())

      let matchType = true

      if (typeFilter !== 'ALL') {
        if (typeFilter === 'BANCO') {
          matchType = j.tipo === 'BANCO' || j.tipo === 'BANCO_VES' || j.tipo === 'BANCO_USD'
        } else {
          matchType = j.tipo === typeFilter
        }
      }

      return matchSearch && matchType
    })
  }, [journals, searchTerm, typeFilter])

  const paginatedJournals = useMemo(() => {
    return filteredJournals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredJournals, page, rowsPerPage])

  const handleSuccess = (journal: Journal, msg: string) => {
    setToastMessage(msg)
    loadData()
    setSelectedJournal(journal)
    setCurrentView('form')
  }

  const getTypeChip = (j: Journal) => {
    const isBank = j.tipo === 'BANCO' || j.tipo === 'BANCO_VES' || j.tipo === 'BANCO_USD'

    if (isBank) {
      return {
        label: 'Banco',
        color: 'info' as const
      }
    }

    if (j.tipo === 'CAJA') {
      return {
        label: 'Caja / Efectivo',
        color: 'warning' as const
      }
    }

    if (j.tipo === 'VENTAS') {
      return {
        label: 'Ventas',
        color: 'primary' as const
      }
    }

    if (j.tipo === 'COMPRAS') {
      return {
        label: 'Compras',
        color: 'error' as const
      }
    }

    
return {
      label: 'Operaciones Varias',
      color: 'secondary' as const
    }
  }

  // Vista Completa para Crear o Editar Diario Contable
  if (currentView === 'form') {
    return (
      <JournalFormView
        journal={selectedJournal}
        accounts={accounts}
        onBack={() => {
          setCurrentView('list')
          setSelectedJournal(null)
        }}
        onSuccess={handleSuccess}
      />
    )
  }

    const isAllSelected = paginatedJournals.length > 0 && paginatedJournals.every(j => selectedIds.includes(j.id))
  const isIndeterminate = paginatedJournals.some(j => selectedIds.includes(j.id)) && !isAllSelected

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = new Set(paginatedJournals.map(j => j.id))

      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)))
    } else {
      const pageIds = paginatedJournals.map(j => j.id)

      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleCopySelected = () => {
    const selectedJournals = journals.filter(j => selectedIds.includes(j.id))
    const text = selectedJournals.map(j => `${j.codigo} - ${j.nombre}`).join('\n')

    navigator.clipboard.writeText(text)
    setToastMessage(`${selectedIds.length} diarios copiados al portapapeles.`)
    setBatchMenuAnchorEl(null)
  }

  const totalVisibleCols = 1 + Object.values(visibleColumns).filter(Boolean).length + 1

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 1. CABECERA */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
            Diarios Contables (Libros Auxiliares)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {selectedIds.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CustomChip
                size='small'
                variant='tonal'
                color='primary'
                label={`${selectedIds.length} seleccionados`}
                onDelete={() => setSelectedIds([])}
              />
              <Button
                variant='outlined'
                size='small'
                onClick={e => setBatchMenuAnchorEl(e.currentTarget)}
                startIcon={<i className='tabler-settings text-base' />}
                endIcon={<i className='tabler-chevron-down text-xs' />}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#E6E4F0',
                  color: '#1E1B2E',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  px: 2.5,
                  py: 0.8,
                  backgroundColor: '#FFFFFF',
                  '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
                }}
              >
                Acciones
              </Button>
            </Box>
          )}

          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={() => {
              setSelectedJournal(null)
              setCurrentView('form')
            }}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              fontWeight: 700,
              textTransform: 'none',
              px: 3.5,
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.3)',
              '&:hover': { backgroundColor: '#5b4bc4' }
            }}
          >
            Nuevo
          </Button>
        </Box>
      </Box>

      {/* 2. CARD PRINCIPAL CON FILTROS Y TABLA EN LISTA */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: 4
        }}
      >
        {/* Barra de Filtros */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <TextField
            size='small'
            placeholder='Buscar diario por nombre o código...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{
              flex: 1,
              minWidth: 260,
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
            }}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
            }}
          />

          <TextField
            select
            size='small'
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            sx={{
              width: 250,
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
            }}
          >
            <MenuItem value='ALL'>Todos los tipos de diario</MenuItem>
            <MenuItem value='BANCO'>Bancos (Cuentas Bancarias)</MenuItem>
            <MenuItem value='CAJA'>Cajas y Efectivo</MenuItem>
            <MenuItem value='VENTAS'>Diarios de Ventas</MenuItem>
            <MenuItem value='COMPRAS'>Diarios de Compras</MenuItem>
            <MenuItem value='VARIOS'>Operaciones Varias</MenuItem>
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
              Diarios Contables Registrados
            </Typography>
            <CustomChip
              label={`${filteredJournals.length} ${filteredJournals.length === 1 ? 'diario' : 'diarios'}`}
              variant='tonal'
              color='primary'
              size='small'
            />
          </Box>

          <Button
            size='small'
            variant='outlined'
            startIcon={<i className='tabler-layout-columns text-base' />}
            onClick={e => setColumnAnchorEl(e.currentTarget)}
            sx={{
              borderRadius: '9999px',
              borderColor: '#E6E4F0',
              color: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 2,
              py: 0.6,
              backgroundColor: '#FFFFFF',
              '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F3F0FF' }
            }}
          >
            Columnas
          </Button>
        </Box>

        {/* Tabla Lista de Diarios Contables */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderTop: 'none', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
              <TableRow>
                <TableCell padding='checkbox' sx={{ width: 44 }}>
                  <Checkbox
                    size='small'
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    sx={{
                      color: '#6C5CE7',
                      '&.Mui-checked': { color: '#6C5CE7' },
                      '&.MuiCheckbox-indeterminate': { color: '#6C5CE7' }
                    }}
                  />
                </TableCell>
                {visibleColumns.nombre && <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 260 }}>Diario Contable</TableCell>}
                {visibleColumns.codigo && <TableCell sx={{ fontWeight: 700, color: '#475569', width: 120 }}>Código</TableCell>}
                {visibleColumns.tipo && <TableCell sx={{ fontWeight: 700, color: '#475569', width: 140 }}>Tipo</TableCell>}
                {visibleColumns.moneda && <TableCell sx={{ fontWeight: 700, color: '#475569', width: 120 }}>Moneda</TableCell>}
                {visibleColumns.cuentaAsociada && <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 220 }}>Cuenta Asociada (PUC)</TableCell>}
                {visibleColumns.saldoUsd && <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 150 }}>Saldo ($ USD)</TableCell>}
                {visibleColumns.saldoVes && <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 160 }}>Saldo (Bs. VES)</TableCell>}
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569', width: 110 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={totalVisibleCols}>
                      <Skeleton variant='text' height={42} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredJournals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalVisibleCols} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    No se encontraron diarios contables que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedJournals.map(j => {
                  const isSelected = selectedIds.includes(j.id)
                  const typeChip = getTypeChip(j)
                  const color = j.colorIdentificador || '#6C5CE7'
                  const icon = j.icono || 'tabler-notebook'

                  const monedaLabel =
                    j.moneda === 'USD'
                      ? 'USD ($)'
                      : j.moneda === 'VES'
                        ? 'VES (Bs.)'
                        : j.tipo === 'BANCO_USD'
                          ? 'USD ($)'
                          : j.tipo === 'BANCO_VES'
                            ? 'VES (Bs.)'
                            : 'Bimonetario'

                  return (
                    <TableRow
                      key={j.id}
                      hover
                      selected={isSelected}
                      onClick={() => {
                        setSelectedJournal(j)
                        setCurrentView('form')
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&.Mui-selected': { backgroundColor: 'rgba(108, 92, 231, 0.08) !important' },
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <TableCell padding='checkbox' onClick={e => e.stopPropagation()}>
                        <Checkbox
                          size='small'
                          checked={isSelected}
                          onChange={() => handleToggleSelect(j.id)}
                          sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                        />
                      </TableCell>

                      {/* Diario Contable (Icono + Nombre) */}
                      {visibleColumns.nombre && (
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 38,
                                height: 38,
                                borderRadius: '12px',
                                backgroundColor: `${color}18`,
                                color: color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <i className={icon} style={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                              {j.nombre}
                            </Typography>
                          </Box>
                        </TableCell>
                      )}

                      {/* Código */}
                      {visibleColumns.codigo && (
                        <TableCell>
                          <Typography
                            variant='body2'
                            sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#6C5CE7' }}
                          >
                            {j.codigo}
                          </Typography>
                        </TableCell>
                      )}

                      {/* Tipo */}
                      {visibleColumns.tipo && (
                        <TableCell>
                          <CustomChip
                            label={typeChip.label}
                            size='small'
                            variant='tonal'
                            color={typeChip.color}
                          />
                        </TableCell>
                      )}

                      {/* Moneda */}
                      {visibleColumns.moneda && (
                        <TableCell>
                          <CustomChip
                            label={monedaLabel}
                            size='small'
                            variant='tonal'
                            color='secondary'
                          />
                        </TableCell>
                      )}

                      {/* Cuenta Asociada (PUC) */}
                      {visibleColumns.cuentaAsociada && (
                        <TableCell>
                          <Typography variant='body2' sx={{ color: '#334155' }}>
                            {j.cuentaPorDefectoNombre || j.cuentaPorDefectoId}
                          </Typography>
                        </TableCell>
                      )}

                      {/* Saldo USD */}
                      {visibleColumns.saldoUsd && (
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#1E293B' }}>
                            ${j.saldoActualUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                      )}

                      {/* Saldo VES */}
                      {visibleColumns.saldoVes && (
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontWeight: 600, fontFamily: 'monospace', color: '#64748B' }}>
                            {j.saldoActualVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                          </Typography>
                        </TableCell>
                      )}

                      {/* Acciones */}
                      <TableCell align='center' onClick={e => e.stopPropagation()}>
                        <Button
                          variant='outlined'
                          size='small'
                          startIcon={<i className='tabler-edit' />}
                          onClick={() => {
                            setSelectedJournal(j)
                            setCurrentView('form')
                          }}
                          sx={{
                            borderRadius: '9999px',
                            borderColor: '#CBD5E1',
                            color: '#475569',
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2,
                            py: 0.4,
                            fontSize: '0.78rem',
                            '&:hover': {
                              borderColor: '#6C5CE7',
                              color: '#6C5CE7',
                              backgroundColor: 'rgba(108, 92, 231, 0.05)'
                            }
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component='div'
          count={filteredJournals.length}
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

      
      {/* Menú de Personalización de Columnas */}
      <Menu
        anchorEl={columnAnchorEl}
        open={Boolean(columnAnchorEl)}
        onClose={() => setColumnAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 1,
              minWidth: 220,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <Typography variant='caption' sx={{ fontWeight: 700, color: '#6B7280', px: 3, py: 1, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>
          COLUMNAS VISIBLES
        </Typography>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, nombre: !prev.nombre }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.nombre)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Diario Contable</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, codigo: !prev.codigo }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.codigo)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Código</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, tipo: !prev.tipo }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.tipo)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Tipo</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, moneda: !prev.moneda }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.moneda)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Moneda</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, cuentaAsociada: !prev.cuentaAsociada }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.cuentaAsociada)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Cuenta Asociada (PUC)</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, saldoUsd: !prev.saldoUsd }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.saldoUsd)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Saldo ($ USD)</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, saldoVes: !prev.saldoVes }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.saldoVes)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Saldo (Bs. VES)</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          dense
          onClick={() => {
            setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
            setColumnAnchorEl(null)
          }}
          sx={{ borderRadius: '8px', color: '#6C5CE7', fontWeight: 600, fontSize: '0.8rem' }}
        >
          <i className='tabler-rotate text-sm mr-2' /> Restablecer Columnas
        </MenuItem>
      </Menu>

      {/* Menú de Acciones en Lote */}
      <Menu
        anchorEl={batchMenuAnchorEl}
        open={Boolean(batchMenuAnchorEl)}
        onClose={() => setBatchMenuAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 1,
              minWidth: 220,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <MenuItem dense onClick={handleCopySelected} sx={{ borderRadius: '8px', py: 1 }}>
          <i className='tabler-copy text-base mr-2 text-[#6C5CE7]' />
          <Typography variant='body2' sx={{ fontWeight: 600 }}>Copiar Diarios</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          dense
          onClick={() => {
            setSelectedIds([])
            setBatchMenuAnchorEl(null)
          }}
          sx={{ borderRadius: '8px', py: 1, color: '#64748B' }}
        >
          <i className='tabler-x text-base mr-2' />
          <Typography variant='body2'>Deseleccionar</Typography>
        </MenuItem>
      </Menu>

      {/* Snackbar Notificaciones */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='success' onClose={() => setToastMessage(null)} sx={{ borderRadius: '12px' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
