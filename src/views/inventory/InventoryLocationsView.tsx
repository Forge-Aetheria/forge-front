'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'

import CustomChip from '@core/components/mui/Chip'

import type { Warehouse, WarehouseLocation } from '@/types/inventoryTypes'
import {
  getWarehouses,
  addWarehouseLocation,
  deleteWarehouseLocation
} from '@/services/inventoryService'

const locationTypeMeta: Record<
  'INTERNAL' | 'TRANSIT' | 'SCRAP',
  { label: string; color: 'primary' | 'info' | 'warning' }
> = {
  INTERNAL: { label: 'Interna / Estantería', color: 'primary' },
  TRANSIT: { label: 'Recepción / Tránsito', color: 'info' },
  SCRAP: { label: 'Merma / Cuarentena', color: 'warning' }
}

interface FlatLocation extends WarehouseLocation {
  warehouseName: string
  warehouseCode: string
}

export const InventoryLocationsView = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchParams = useSearchParams()
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState(searchParams.get('warehouseId') || 'ALL')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL')

  // Modal de Nueva Ubicación
  const [modalOpen, setModalOpen] = useState(false)
  const [targetWarehouseId, setTargetWarehouseId] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<'INTERNAL' | 'TRANSIT' | 'SCRAP'>('INTERNAL')
  const [notes, setNotes] = useState('')

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getWarehouses()

      setWarehouses(data)

      if (data.length > 0 && !targetWarehouseId) {
        setTargetWarehouseId(data[0].id)
      }
    } catch {
      setToast({ open: true, message: 'Error al cargar ubicaciones.', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [targetWarehouseId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Flatten all locations with warehouse data
  const allLocations = useMemo<FlatLocation[]>(() => {
    const list: FlatLocation[] = []

    warehouses.forEach(wh => {
      wh.locations.forEach(loc => {
        list.push({
          ...loc,
          warehouseName: wh.name,
          warehouseCode: wh.code
        })
      })
    })
    
return list
  }, [warehouses])

  const filteredLocations = useMemo(() => {
    return allLocations.filter(loc => {
      if (selectedWarehouseFilter !== 'ALL' && loc.warehouseId !== selectedWarehouseFilter) {
        return false
      }

      if (selectedTypeFilter !== 'ALL' && loc.type !== selectedTypeFilter) {
        return false
      }

      if (search.trim()) {
        const q = search.toLowerCase()

        
return (
          loc.code.toLowerCase().includes(q) ||
          loc.name.toLowerCase().includes(q) ||
          loc.warehouseName.toLowerCase().includes(q) ||
          (loc.notes && loc.notes.toLowerCase().includes(q))
        )
      }

      
return true
    })
  }, [allLocations, selectedWarehouseFilter, selectedTypeFilter, search])

  const handleOpenModal = () => {
    setCode('')
    setName('')
    setType('INTERNAL')
    setNotes('')

    if (warehouses.length > 0) {
      setTargetWarehouseId(warehouses[0].id)
    }

    setModalOpen(true)
  }

  const handleCreateLocation = async () => {
    if (!targetWarehouseId) {
      setToast({ open: true, message: 'Seleccione el almacén correspondiente.', severity: 'error' })
      
return
    }

    if (!code.trim() || !name.trim()) {
      setToast({ open: true, message: 'El código y el nombre son obligatorios.', severity: 'error' })
      
return
    }

    try {
      await addWarehouseLocation(targetWarehouseId, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type,
        notes: notes.trim() || undefined
      })
      setModalOpen(false)
      setToast({ open: true, message: `Ubicación ${code.toUpperCase()} creada con éxito.`, severity: 'success' })
      await loadData()
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al crear ubicación.', severity: 'error' })
    }
  }

  const handleDeleteLocation = async (warehouseId: string, locationId: string, locCode: string) => {
    if (!confirm(`¿Eliminar la ubicación ${locCode}?`)) return

    try {
      await deleteWarehouseLocation(warehouseId, locationId)
      setToast({ open: true, message: 'Ubicación eliminada.', severity: 'info' })
      await loadData()
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al eliminar ubicación.', severity: 'error' })
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div className='flex items-center gap-2.5 flex-wrap'>
          <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
            Ubicaciones de Almacén
          </Typography>
          <CustomChip
            size='small'
            label={`${filteredLocations.length} ubicaciones`}
            color='primary'
            variant='tonal'
          />
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          <Button
            variant='contained'
            color='primary'
            onClick={handleOpenModal}
            startIcon={<i className='tabler-plus text-sm' />}
          >
            Nuevo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className='border border-[#E6E4F0] rounded-2xl shadow-xs bg-white'>
        <CardContent className='p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap'>
          <TextField
            size='small'
            placeholder='Buscar ubicación por código, nombre o almacén...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='tabler-search text-[#6B7280] text-sm' />
                  </InputAdornment>
                ),
                className: 'text-xs rounded-full bg-[#FAFAFC]'
              }
            }}
            sx={{ minWidth: { xs: '100%', sm: 300 } }}
          />

          <div className='flex items-center gap-2 flex-wrap'>
            <TextField
              select
              size='small'
              value={selectedWarehouseFilter}
              onChange={e => setSelectedWarehouseFilter(e.target.value)}
              slotProps={{ select: { className: 'text-xs py-1.5' } }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value='ALL'>Todos los Almacenes</MenuItem>
              {warehouses.map(wh => (
                <MenuItem key={wh.id} value={wh.id}>
                  {wh.name} ({wh.locations.length})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size='small'
              value={selectedTypeFilter}
              onChange={e => setSelectedTypeFilter(e.target.value)}
              slotProps={{ select: { className: 'text-xs py-1.5' } }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value='ALL'>Todos los Tipos</MenuItem>
              <MenuItem value='INTERNAL'>Interna / Estantería</MenuItem>
              <MenuItem value='TRANSIT'>Recepción / Tránsito</MenuItem>
              <MenuItem value='SCRAP'>Merma / Cuarentena</MenuItem>
            </TextField>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Ubicaciones */}
      <Card className='border border-[#E6E4F0] rounded-2xl shadow-xs overflow-hidden bg-white'>
        <div className='flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-b border-[#E6E4F0] bg-[#FAF9FF]'>
          <div className='flex items-center gap-2.5'>
            <Typography variant='h6' className='font-semibold text-[#1E1B2E] text-sm'>
              Ubicaciones de Almacén
            </Typography>
            <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF]'>
              {filteredLocations.length} {filteredLocations.length === 1 ? 'ubicación' : 'ubicaciones'}
            </span>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <Table size='small'>
            <TableHead className='bg-[#F4F3F8] border-b border-[#E6E4F0]'>
              <TableRow>
                <TableCell className='text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3'>Código</TableCell>
                <TableCell className='text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3'>Nombre / Detalle</TableCell>
                <TableCell className='text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3'>Almacén Asociado</TableCell>
                <TableCell className='text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3'>Tipo de Zona</TableCell>
                <TableCell className='text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3'>Notas</TableCell>
                <TableCell className='text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3 text-right'>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className='py-8 text-center text-xs text-[#6B7280]'>
                    Cargando ubicaciones...
                  </TableCell>
                </TableRow>
              ) : filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='py-8 text-center text-xs text-[#6B7280]'>
                    No hay ubicaciones registradas con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLocations.map(loc => {
                  const meta = locationTypeMeta[loc.type] || locationTypeMeta.INTERNAL

                  return (
                    <TableRow key={loc.id} hover className='transition-colors hover:bg-[#FAF9FF] border-b border-[#E6E4F0] last:border-none'>
                      <TableCell className='font-mono font-bold text-xs text-[#6C5CE7] py-2.5'>
                        {loc.code}
                      </TableCell>
                      <TableCell className='text-xs font-semibold text-[#1E1B2E] py-2.5'>
                        {loc.name}
                      </TableCell>
                      <TableCell className='text-xs text-[#1E1B2E] py-2.5'>
                        <span className='font-medium'>{loc.warehouseName}</span>
                        <span className='text-[10px] text-[#6B7280] font-mono ml-1.5'>({loc.warehouseCode})</span>
                      </TableCell>
                      <TableCell className='py-2.5'>
                        <CustomChip
                          size='small'
                          label={meta.label}
                          color={meta.color}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell className='text-xs text-[#6B7280] py-2.5 max-w-[200px] truncate'>
                        {loc.notes || '—'}
                      </TableCell>
                      <TableCell className='text-right py-2.5'>
                        <Tooltip title='Eliminar'>
                          <IconButton
                            size='small'
                            onClick={() => handleDeleteLocation(loc.warehouseId, loc.id, loc.code)}
                            className='text-[#EF4444] hover:bg-[#FEE2E2]'
                          >
                            <i className='tabler-trash text-sm' />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal para Crear Ubicación */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth='xs'
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle className='font-bold text-[#1E1B2E] text-base'>
          Nueva Ubicación de Almacén
        </DialogTitle>
        <DialogContent dividers className='flex flex-col gap-3.5 py-3'>
          <TextField
            select
            label='Almacén Perteneciente'
            size='small'
            value={targetWarehouseId}
            onChange={e => setTargetWarehouseId(e.target.value)}
            fullWidth
            required
          >
            {warehouses.map(wh => (
              <MenuItem key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label='Código de Ubicación'
            placeholder='Ej: PAS-01-EST-B'
            size='small'
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            fullWidth
            required
            slotProps={{ input: { className: 'font-mono text-xs' } }}
          />

          <TextField
            label='Nombre / Descripción'
            placeholder='Ej: Pasillo 1 - Estantería B'
            size='small'
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
            required
          />

          <TextField
            select
            label='Tipo de Zona'
            size='small'
            value={type}
            onChange={e => setType(e.target.value as any)}
            fullWidth
          >
            <MenuItem value='INTERNAL'>Interna / Estantería Regular</MenuItem>
            <MenuItem value='TRANSIT'>Recepción / Tránsito / Muelle</MenuItem>
            <MenuItem value='SCRAP'>Merma / Cuarentena / Desecho</MenuItem>
          </TextField>

          <TextField
            label='Notas u Observaciones'
            placeholder='Capacidad máxima, restricciones...'
            size='small'
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions className='p-3'>
          <Button
            onClick={() => setModalOpen(false)}
            variant='outlined'
            className='rounded-full text-xs font-semibold border-[#DCD8EC] text-[#1E1B2E]'
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateLocation}
            variant='contained'
            className='rounded-full text-xs font-semibold bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white px-4'
            sx={{ textTransform: 'none' }}
          >
            Guardar Ubicación
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))} variant='filled'>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default InventoryLocationsView
