'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TablePagination from '@mui/material/TablePagination'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type { LandedCostRecord, LandedCostStatus } from '@/types/inventoryTypes'
import { getLandedCosts, deleteLandedCost } from '@/services/inventoryService'

const STATUS_META: Record<
  LandedCostStatus,
  { label: string; color: 'warning' | 'success' | 'secondary' | 'error'; icon: string }
> = {
  DRAFT: {
    label: 'Borrador',
    color: 'warning',
    icon: 'tabler-edit'
  },
  APPLIED: {
    label: 'Aplicado y Contabilizado',
    color: 'success',
    icon: 'tabler-circle-check'
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'secondary',
    icon: 'tabler-x'
  }
}

export const LandedCostsListView: React.FC = () => {
  const router = useRouter()

  const [records, setRecords] = useState<LandedCostRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | LandedCostStatus>('ALL')

  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<LandedCostRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toast
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getLandedCosts()

      setRecords(data)
    } catch {
      setToast({
        open: true,
        message: 'Error al cargar los costos en destino.',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (statusFilter !== 'ALL' && r.estado !== statusFilter) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchCode = r.codigo.toLowerCase().includes(q)
        const matchRef = (r.referencia || '').toLowerCase().includes(q)
        const matchNotes = (r.notas || '').toLowerCase().includes(q)

        const matchReceipts = r.recepciones.some(
          rec =>
            rec.orden_codigo.toLowerCase().includes(q) ||
            rec.tercero_nombre.toLowerCase().includes(q)
        )

        if (!matchCode && !matchRef && !matchNotes && !matchReceipts) return false
      }

      return true
    })
  }, [records, statusFilter, search])

  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredRecords, page, rowsPerPage])

  // KPIs
  const kpis = useMemo(() => {
    const totalCount = records.length
    const draftCount = records.filter(r => r.estado === 'DRAFT').length
    const appliedCount = records.filter(r => r.estado === 'APPLIED').length

    const totalAmountUsd = records
      .filter(r => r.estado === 'APPLIED')
      .reduce((acc, r) => acc + (r.total_monto_usd || 0), 0)

    return { totalCount, draftCount, appliedCount, totalAmountUsd }
  }, [records])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      await deleteLandedCost(deleteTarget.id)
      setToast({
        open: true,
        message: `Costo en destino ${deleteTarget.codigo} eliminado.`,
        severity: 'success'
      })
      setDeleteTarget(null)
      await loadData()
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'No se pudo eliminar el registro.',
        severity: 'error'
      })
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)

      
return d.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return iso
    }
  }

  return (
    <div className='flex flex-col gap-6 w-full'>
      {/* Header */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div className='flex items-center gap-2.5 flex-wrap'>
          <div
            className='w-10 h-10 rounded-full flex items-center justify-center shrink-0'
            style={{ backgroundColor: 'rgba(108, 92, 231, 0.1)', color: '#6C5CE7' }}
          >
            <i className='tabler-calculator text-xl' />
          </div>
          <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
            Costos en Destino (Landed Costs)
          </Typography>
        </div>

        <Button
          component={Link}
          href='/inventory/operations/landed-costs/create'
          variant='contained'
          startIcon={<i className='tabler-plus text-base' />}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            textTransform: 'none',
            fontWeight: 600,
            px: 3.5,
            py: 1,
            boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
            '&:hover': { backgroundColor: '#5B4CDB' }
          }}
        >
          Nuevo
        </Button>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card
          sx={{
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
          }}
        >
          <CardContent className='p-4 flex items-center justify-between'>
            <div className='flex flex-col'>
              <span className='text-xs text-[#6B7280] font-medium'>Total Registros</span>
              <span className='text-2xl font-bold text-[#1E1B2E] mt-1'>{kpis.totalCount}</span>
              <span className='text-[11px] text-[#6B7280] mt-0.5'>Liquidaciones registradas</span>
            </div>
            <div className='w-12 h-12 rounded-2xl bg-[#6C5CE7]/10 flex items-center justify-center text-[#6C5CE7]'>
              <i className='tabler-calculator text-2xl' />
            </div>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
          }}
        >
          <CardContent className='p-4 flex items-center justify-between'>
            <div className='flex flex-col'>
              <span className='text-xs text-[#6B7280] font-medium'>En Borrador</span>
              <span className='text-2xl font-bold text-[#F59E0B] mt-1'>{kpis.draftCount}</span>
              <span className='text-[11px] text-[#6B7280] mt-0.5'>Pendientes de validar</span>
            </div>
            <div className='w-12 h-12 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]'>
              <i className='tabler-edit text-2xl' />
            </div>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
          }}
        >
          <CardContent className='p-4 flex items-center justify-between'>
            <div className='flex flex-col'>
              <span className='text-xs text-[#6B7280] font-medium'>Aplicados y Validados</span>
              <span className='text-2xl font-bold text-[#10B981] mt-1'>{kpis.appliedCount}</span>
              <span className='text-[11px] text-[#6B7280] mt-0.5'>Prorrateados en Kárdex</span>
            </div>
            <div className='w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]'>
              <i className='tabler-circle-check text-2xl' />
            </div>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
          }}
        >
          <CardContent className='p-4 flex items-center justify-between'>
            <div className='flex flex-col'>
              <span className='text-xs text-[#6B7280] font-medium'>Total Capitalizado (USD)</span>
              <span className='text-2xl font-bold text-[#6C5CE7] mt-1'>
                ${kpis.totalAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className='text-[11px] text-[#6B7280] mt-0.5'>Fletes, aranceles y seguros</span>
            </div>
            <div className='w-12 h-12 rounded-2xl bg-[#6C5CE7]/10 flex items-center justify-center text-[#6C5CE7]'>
              <i className='tabler-cash text-2xl' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table Card */}
      <Card
        sx={{
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
        }}
      >
        <CardContent className='p-4 flex items-center justify-between flex-wrap gap-3 border-b border-[#E6E4F0]'>
          <CustomTextField
            size='small'
            placeholder='Buscar por código, referencia o recepción...'
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(0)
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='tabler-search text-[#6B7280]' />
                  </InputAdornment>
                )
              }
            }}
            sx={{ minWidth: 280, flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />

          <CustomTextField
            select
            size='small'
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value as any)
              setPage(0)
            }}
            sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          >
            <MenuItem value='ALL'>Todos los Estados</MenuItem>
            <MenuItem value='DRAFT'>Borradores</MenuItem>
            <MenuItem value='APPLIED'>Aplicados</MenuItem>
            <MenuItem value='CANCELLED'>Cancelados</MenuItem>
          </CustomTextField>
        </CardContent>

        {loading ? (
          <div className='p-8 flex flex-col gap-3'>
            <Skeleton variant='rectangular' height={40} className='rounded-xl' />
            <Skeleton variant='rectangular' height={40} className='rounded-xl' />
            <Skeleton variant='rectangular' height={40} className='rounded-xl' />
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table size='small'>
              <TableHead sx={{ backgroundColor: '#F8F7FC', borderBottom: '1px solid #E6E4F0' }}>
                <TableRow>
                  <TableCell sx={{ width: 40, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem', textAlign: 'center' }}>
                    #
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    CÓDIGO
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    FECHA
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    REFERENCIA
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    RECEPCIONES VINCULADAS
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    TOTAL MONTO (USD)
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    ESTADO
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    ASIENTO CONTABLE
                  </TableCell>
                  <TableCell align='center' sx={{ width: 90, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    ACCIONES
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className='text-center py-12 text-[#6B7280]'>
                      <div className='flex flex-col items-center justify-center gap-2'>
                        <div className='w-12 h-12 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center text-[#6C5CE7]'>
                          <i className='tabler-calculator text-2xl' />
                        </div>
                        <span className='font-semibold text-sm text-[#1E1B2E]'>No se encontraron costos en destino</span>
                        <span className='text-xs text-[#6B7280]'>
                          Crea uno nuevo para prorratear fletes o aranceles sobre recepciones de almacén.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((item, index) => {
                    const meta = STATUS_META[item.estado] || {
                      label: item.estado,
                      color: 'secondary',
                      icon: 'tabler-circle'
                    }

                    return (
                      <TableRow
                        key={item.id}
                        hover
                        className='border-b border-[#E6E4F0] last:border-none hover:bg-[#FAF9FF] transition-colors cursor-pointer'
                        onClick={() => router.push(`/inventory/operations/landed-costs/${item.id}`)}
                      >
                        <TableCell className='text-center text-xs font-mono text-[#6B7280]'>
                          {page * rowsPerPage + index + 1}
                        </TableCell>
                        <TableCell className='font-mono font-bold text-xs text-[#6C5CE7]'>
                          {item.codigo}
                        </TableCell>
                        <TableCell className='text-xs text-[#6B7280] font-mono whitespace-nowrap'>
                          {formatDate(item.fecha)}
                        </TableCell>
                        <TableCell className='text-xs text-[#1E1B2E] font-medium max-w-[200px] truncate'>
                          {item.referencia || '—'}
                        </TableCell>
                        <TableCell className='text-xs text-[#1E1B2E]'>
                          <div className='flex flex-wrap gap-1'>
                            {item.recepciones.length === 0 ? (
                              <span className='text-[#9CA3AF] text-xs'>Sin recepciones</span>
                            ) : (
                              item.recepciones.map(r => (
                                <span
                                  key={r.id || r.orden_id}
                                  className='font-mono text-[11px] bg-[#F4F3FF] text-[#6C5CE7] font-semibold px-2 py-0.5 rounded-full'
                                >
                                  {r.orden_codigo}
                                </span>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell align='right' className='font-mono font-bold text-xs text-[#1E1B2E] whitespace-nowrap'>
                          ${item.total_monto_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>
                          <CustomChip
                            size='small'
                            label={meta.label}
                            color={meta.color}
                            variant='tonal'
                          />
                        </TableCell>
                        <TableCell className='font-mono text-xs text-[#6B7280]'>
                          {item.asiento_contable_numero ? (
                            <span className='bg-[#ECFDF5] text-[#059669] font-bold px-2 py-0.5 rounded'>
                              {item.asiento_contable_numero}
                            </span>
                          ) : (
                            <span className='text-[#9CA3AF]'>—</span>
                          )}
                        </TableCell>
                        <TableCell align='center' onClick={e => e.stopPropagation()}>
                          <div className='flex items-center justify-center gap-1'>
                            <Tooltip title='Ver Detalle'>
                              <IconButton
                                size='small'
                                component={Link}
                                href={`/inventory/operations/landed-costs/${item.id}`}
                                className='text-[#6C5CE7]'
                              >
                                <i className='tabler-eye text-base' />
                              </IconButton>
                            </Tooltip>
                            {item.estado === 'DRAFT' && (
                              <Tooltip title='Eliminar'>
                                <IconButton
                                  size='small'
                                  color='error'
                                  onClick={() => setDeleteTarget(item)}
                                >
                                  <i className='tabler-trash text-base' />
                                </IconButton>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component='div'
          count={filteredRecords.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle className='font-bold text-[#1E1B2E]'>
          ¿Eliminar Costo en Destino?
        </DialogTitle>
        <DialogContent>
          <span className='text-sm text-[#6B7280]'>
            ¿Estás seguro de que deseas eliminar el costo en destino{' '}
            <strong className='text-[#1E1B2E]'>{deleteTarget?.codigo}</strong>? Esta acción no se puede deshacer.
          </span>
        </DialogContent>
        <DialogActions className='gap-2 p-3'>
          <Button
            variant='outlined'
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ borderRadius: '9999px', textTransform: 'none', px: 3 }}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={handleDelete}
            disabled={deleting}
            sx={{ borderRadius: '9999px', textTransform: 'none', px: 3 }}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          variant='filled'
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          sx={{ borderRadius: '12px' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}
