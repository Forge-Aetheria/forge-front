'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import Menu from '@mui/material/Menu'
import Divider from '@mui/material/Divider'
import CustomChip from '@core/components/mui/Chip'
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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'

import { useSearchParams } from 'next/navigation'

import { accountingService } from '@/services/accountingService'
import type { Account, AccountType } from '@/types/accountingTypes'
import { AccountFormView } from './AccountFormView'

export const ChartOfAccountsView: React.FC = () => {
  const searchParams = useSearchParams()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryTab, setCategoryTab] = useState<number>(0) // 0: Todas, 1: Activo, 2: Pasivo, 3: Patrimonio, 4: Ingresos, 5: Costos, 6: Gastos
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Full view state (Vista Completa para crear/editar cuenta)
  const [isFormActive, setIsFormActive] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Control de Columnas Visibles
  const DEFAULT_VISIBLE_COLUMNS = {
    codigo: true,
    nombre: true,
    tipo: true,
    moneda: true,
    saldoUsd: true,
    saldoVes: true,
    conciliable: true
  }
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS)
  const [columnAnchorEl, setColumnAnchorEl] = useState<null | HTMLElement>(null)

  // Selección Múltiple y Acciones en Lote
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchMenuAnchorEl, setBatchMenuAnchorEl] = useState<null | HTMLElement>(null)


  const loadAccounts = async () => {
    try {
      setLoading(true)
      const list = await accountingService.getAccounts()

      setAccounts(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  // Soporte para apertura por query param (?action=new o ?edit=id)
  useEffect(() => {
    const action = searchParams.get('action')
    const editId = searchParams.get('edit')

    if (action === 'new') {
      setSelectedAccount(null)
      setIsFormActive(true)
    } else if (editId && accounts.length > 0) {
      const found = accounts.find(a => a.id === editId || a.codigo === editId)

      if (found) {
        setSelectedAccount(found)
        setIsFormActive(true)
      }
    }
  }, [searchParams, accounts])

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch =
        acc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.nombre.toLowerCase().includes(searchTerm.toLowerCase())

      let matchCategory = true

      if (categoryTab === 1) matchCategory = acc.tipo.startsWith('ASSET')
      else if (categoryTab === 2) matchCategory = acc.tipo.startsWith('LIABILITY')
      else if (categoryTab === 3) matchCategory = acc.tipo === 'EQUITY'
      else if (categoryTab === 4) matchCategory = acc.tipo.startsWith('INCOME')
      else if (categoryTab === 5) matchCategory = acc.tipo === 'COST_OF_GOODS'
      else if (categoryTab === 6) matchCategory = acc.tipo.startsWith('EXPENSE')

      return matchSearch && matchCategory
    })
  }, [accounts, searchTerm, categoryTab])

  const paginatedAccounts = useMemo(() => {
    return filteredAccounts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredAccounts, page, rowsPerPage])

  const handleOpenCreate = () => {
    setSelectedAccount(null)
    setIsFormActive(true)
  }

  const handleOpenEdit = (acc: Account) => {
    setSelectedAccount(acc)
    setIsFormActive(true)
  }

  const handleAccountSaved = (acc: Account, isNew: boolean) => {
    setToastMessage(`Cuenta ${acc.codigo} - ${acc.nombre} ${isNew ? "creada" : "actualizada"} exitosamente.`)
    loadAccounts()
    setSelectedAccount(acc)
    setIsFormActive(true)
  }

  if (isFormActive) {
    return (
      <AccountFormView
        account={selectedAccount}
        onBack={() => {
          setIsFormActive(false)
          setSelectedAccount(null)
        }}
        onSaved={handleAccountSaved}
      />
    )
  }

  const getTypeChip = (tipo: AccountType, subtipo?: string, tipoCuentaNombre?: string) => {
    let specificLabel = tipoCuentaNombre

    if (!specificLabel) {
      switch (tipo) {
        case 'ASSET_CURRENT':
          specificLabel = 'Activo Corriente'
          break
        case 'ASSET_NON_CURRENT':
          specificLabel = 'Activo No Corriente'
          break
        case 'LIABILITY_CURRENT':
          specificLabel = 'Pasivo Corriente'
          break
        case 'LIABILITY_NON_CURRENT':
          specificLabel = 'Pasivo No Corriente'
          break
        case 'EQUITY':
          specificLabel = 'Capital y Reservas'
          break
        case 'INCOME':
          specificLabel = 'Ingresos Operacionales'
          break
        case 'INCOME_FINANCIAL':
          specificLabel = 'Ingresos Financieros'
          break
        case 'COST_OF_GOODS':
          specificLabel = 'Costo de Ventas'
          break
        case 'EXPENSE_OPERATING':
          specificLabel = 'Gastos Operativos'
          break
        case 'EXPENSE_FINANCIAL':
          specificLabel = 'Gastos Financieros'
          break
        default:
          specificLabel = tipo
      }
    }

    let categoryChip = <CustomChip label='1. Activo' size='small' variant='tonal' color='success' />

    if (tipo.startsWith('LIABILITY')) {
      categoryChip = <CustomChip label='2. Pasivo' size='small' variant='tonal' color='error' />
    } else if (tipo === 'EQUITY') {
      categoryChip = <CustomChip label='3. Patrimonio' size='small' variant='tonal' color='primary' />
    } else if (tipo.startsWith('INCOME')) {
      categoryChip = <CustomChip label='4. Ingresos' size='small' variant='tonal' color='info' />
    } else if (tipo === 'COST_OF_GOODS') {
      categoryChip = <CustomChip label='5. Costos' size='small' variant='tonal' color='warning' />
    } else if (tipo.startsWith('EXPENSE')) {
      categoryChip = <CustomChip label='6. Gastos' size='small' variant='tonal' color='secondary' />
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, alignItems: 'flex-start' }}>
        {categoryChip}
        <Typography variant='caption' sx={{ fontWeight: 600, color: '#334155' }}>
          {specificLabel}
        </Typography>
      </Box>
    )
  }

    const isAllSelected = paginatedAccounts.length > 0 && paginatedAccounts.every(acc => selectedIds.includes(acc.id))
  const isIndeterminate = paginatedAccounts.some(acc => selectedIds.includes(acc.id)) && !isAllSelected

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = new Set(paginatedAccounts.map(a => a.id))
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)))
    } else {
      const pageIds = paginatedAccounts.map(a => a.id)
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleCopySelected = () => {
    const selectedAccounts = accounts.filter(a => selectedIds.includes(a.id))
    const text = selectedAccounts.map(a => `${a.codigo} - ${a.nombre}`).join('\n')
    navigator.clipboard.writeText(text)
    setToastMessage(`${selectedIds.length} cuentas copiadas al portapapeles.`)
    setBatchMenuAnchorEl(null)
  }

  const totalVisibleCols = 1 + Object.values(visibleColumns).filter(Boolean).length + 1

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Cabecera */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
            Plan Único de Cuentas (PUC)
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
            onClick={handleOpenCreate}
            sx={{
              backgroundColor: '#6C5CE7',
              borderRadius: '9999px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': { backgroundColor: '#5b4bc4' }
            }}
          >
            Nueva Cuenta
          </Button>
        </Box>
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
        {/* Category Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: '#E6E4F0', mb: 3 }}>
          <Tabs
            value={categoryTab}
            onChange={(_, val) => setCategoryTab(val)}
            variant='scrollable'
            scrollButtons='auto'
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem'
              },
              '& .Mui-selected': {
                color: '#6C5CE7 !important'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#6C5CE7'
              }
            }}
          >
            <Tab label={`Todas (${accounts.length})`} />
            <Tab label='1. Activo' />
            <Tab label='2. Pasivo' />
            <Tab label='3. Patrimonio' />
            <Tab label='4. Ingresos' />
            <Tab label='5. Costos' />
            <Tab label='6. Gastos' />
          </Tabs>
        </Box>

        {/* Search */}
        <Box sx={{ mb: 4 }}>
          <TextField
            size='small'
            placeholder='Buscar por código jerárquico (ej. 1.1.01) o nombre de la cuenta...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{ maxWidth: 460, width: '100%' }}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
            }}
          />
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
              Cuentas Contables
            </Typography>
            <CustomChip
              label={`${filteredAccounts.length} ${filteredAccounts.length === 1 ? 'cuenta' : 'cuentas'}`}
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

        {/* Table */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderTop: 'none', borderRadius: '0 0 16px 16px' }}>
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
                {visibleColumns.codigo && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Código</TableCell>}
                {visibleColumns.nombre && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Nombre de la Cuenta</TableCell>}
                {visibleColumns.tipo && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tipo de Cuenta</TableCell>}
                {visibleColumns.moneda && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Moneda</TableCell>}
                {visibleColumns.saldoUsd && <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Saldo (USD)</TableCell>}
                {visibleColumns.saldoVes && <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Saldo (VES)</TableCell>}
                {visibleColumns.conciliable && <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>Conciliable</TableCell>}
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569', width: 90 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={totalVisibleCols}>
                      <Skeleton variant='text' height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalVisibleCols} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    No se encontraron cuentas contables.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAccounts.map(acc => {
                  const isSelected = selectedIds.includes(acc.id)

                  return (
                    <TableRow
                      key={acc.id}
                      hover
                      selected={isSelected}
                      onClick={() => handleOpenEdit(acc)}
                      sx={{
                        cursor: 'pointer',
                        '&.Mui-selected': { backgroundColor: 'rgba(108, 92, 231, 0.08) !important' },
                        '&:last-child td, &:last-child th': { border: 0 }
                      }}
                    >
                      <TableCell padding='checkbox' onClick={e => e.stopPropagation()}>
                        <Checkbox
                          size='small'
                          checked={isSelected}
                          onChange={() => handleToggleSelect(acc.id)}
                          sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                        />
                      </TableCell>
                      {visibleColumns.codigo && (
                        <TableCell sx={{ fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>
                          {acc.codigo}
                        </TableCell>
                      )}
                      {visibleColumns.nombre && (
                        <TableCell sx={{ fontWeight: 600, color: '#334155' }}>
                          {acc.nombre}
                        </TableCell>
                      )}
                      {visibleColumns.tipo && (
                        <TableCell>
                          {getTypeChip(acc.tipo, acc.subtipo, acc.tipoCuentaNombre)}
                        </TableCell>
                      )}
                      {visibleColumns.moneda && (
                        <TableCell sx={{ color: '#64748B', fontWeight: 500 }}>
                          {acc.moneda}
                        </TableCell>
                      )}
                      {visibleColumns.saldoUsd && (
                        <TableCell align='right' sx={{ fontWeight: 700, color: '#1E293B' }}>
                          ${acc.saldoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      )}
                      {visibleColumns.saldoVes && (
                        <TableCell align='right' sx={{ color: '#64748B' }}>
                          {acc.saldoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                        </TableCell>
                      )}
                      {visibleColumns.conciliable && (
                        <TableCell align='center'>
                          {acc.permiteConciliacion ? (
                            <CustomChip label='Sí' size='small' variant='tonal' color='success' />
                          ) : (
                            <Typography variant='caption' sx={{ color: '#94A3B8' }}>No</Typography>
                          )}
                        </TableCell>
                      )}
                      <TableCell align='center' onClick={e => e.stopPropagation()}>
                        <Tooltip title='Editar Cuenta'>
                          <IconButton
                            size='small'
                            onClick={e => {
                              e.stopPropagation()
                              handleOpenEdit(acc)
                            }}
                            sx={{ color: '#6C5CE7' }}
                          >
                            <i className='tabler-edit' />
                          </IconButton>
                        </Tooltip>
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
          count={filteredAccounts.length}
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
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, codigo: !prev.codigo }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.codigo)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Código</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, nombre: !prev.nombre }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.nombre)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Nombre de la Cuenta</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, tipo: !prev.tipo }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.tipo)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Tipo de Cuenta</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, moneda: !prev.moneda }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.moneda)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Moneda</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, saldoUsd: !prev.saldoUsd }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.saldoUsd)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Saldo (USD)</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, saldoVes: !prev.saldoVes }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.saldoVes)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Saldo (VES)</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, conciliable: !prev.conciliable }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.conciliable)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Conciliable</Typography>
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
          <Typography variant='body2' sx={{ fontWeight: 600 }}>Copiar Cuentas</Typography>
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
