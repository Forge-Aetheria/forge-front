'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import CustomChip from '@core/components/mui/Chip'

import type { Warehouse } from '@/types/inventoryTypes'
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
} from '@/services/inventoryService'

const InventoryWarehousesView = () => {
  const [loading, setLoading] = useState(true)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [searchWh, setSearchWh] = useState('')

  // Warehouse modal state
  const [whDialogOpen, setWhDialogOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [whCode, setWhCode] = useState('')
  const [whName, setWhName] = useState('')
  const [whAddress, setWhAddress] = useState('')
  const [whManager, setWhManager] = useState('')
  const [whIsDefault, setWhIsDefault] = useState(false)

  // Delete confirm dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null)

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const whData = await getWarehouses()

      setWarehouses(whData)
    } catch {
      setToast({ open: true, message: 'Error al consultar los almacenes', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredWarehouses = useMemo(() => {
    if (!searchWh.trim()) return warehouses
    const q = searchWh.toLowerCase()

    return warehouses.filter(
      w =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.address || '').toLowerCase().includes(q) ||
        (w.manager || '').toLowerCase().includes(q)
    )
  }, [warehouses, searchWh])

  const handleOpenNewWarehouse = () => {
    setEditingWarehouse(null)
    setWhCode(`ALM-0${warehouses.length + 1}`)
    setWhName('')
    setWhAddress('')
    setWhManager('Elena Rivas')
    setWhIsDefault(warehouses.length === 0)
    setWhDialogOpen(true)
  }

  const handleOpenEditWarehouse = (wh: Warehouse) => {
    setEditingWarehouse(wh)
    setWhCode(wh.code)
    setWhName(wh.name)
    setWhAddress(wh.address || '')
    setWhManager(wh.manager || '')
    setWhIsDefault(wh.isDefault)
    setWhDialogOpen(true)
  }

  const handleSaveWarehouse = async () => {
    if (!whName.trim()) {
      setToast({ open: true, message: 'El nombre del almacén es obligatorio', severity: 'error' })

      return
    }

    if (!whCode.trim()) {
      setToast({ open: true, message: 'El código del almacén es obligatorio', severity: 'error' })

      return
    }

    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, {
          code: whCode.trim().toUpperCase(),
          name: whName.trim(),
          address: whAddress.trim(),
          manager: whManager.trim(),
          isDefault: whIsDefault
        })
        setToast({ open: true, message: `Almacén "${whName}" actualizado exitosamente`, severity: 'success' })
      } else {
        const created = await createWarehouse({
          code: whCode.trim().toUpperCase(),
          name: whName.trim(),
          address: whAddress.trim(),
          manager: whManager.trim(),
          isDefault: whIsDefault
        })

        setToast({ open: true, message: `Almacén "${created.name}" registrado exitosamente`, severity: 'success' })
      }

      setWhDialogOpen(false)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el almacén'

      setToast({ open: true, message: msg, severity: 'error' })
    }
  }

  const handleOpenDeleteConfirm = (wh: Warehouse) => {
    if (warehouses.length <= 1) {
      setToast({
        open: true,
        message: 'Debe existir al menos un almacén principal activo en el sistema.',
        severity: 'error'
      })

      return
    }

    setWarehouseToDelete(wh)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!warehouseToDelete) return

    try {
      await deleteWarehouse(warehouseToDelete.id)
      setDeleteConfirmOpen(false)
      setWarehouseToDelete(null)
      await loadData()
      setToast({ open: true, message: `Almacén "${warehouseToDelete.name}" eliminado`, severity: 'info' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar el almacén'

      setToast({ open: true, message: msg, severity: 'error' })
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Header exclusivo de Almacenes Físicos */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div className='flex items-center gap-2.5 flex-wrap'>
          <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
            Almacenes Físicos
          </Typography>
          <CustomChip
            size='small'
            label={`${warehouses.length} almacenes`}
            color='primary'
            variant='tonal'
          />
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          <Button
            variant='contained'
            startIcon={<i className='tabler-plus text-base' />}
            onClick={handleOpenNewWarehouse}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              px: 3.5,
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
          >
            Nuevo
          </Button>
        </div>
      </div>

      {/* Tabla Principal de Almacenes */}
      <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl overflow-hidden'>
        <CardContent className='p-5 border-b border-[#E6E4F0] bg-[#FAFAFE]'>
          <div className='w-full sm:max-w-lg'>
            <TextField
              fullWidth
              size='small'
              placeholder='Buscar almacén por código, nombre, dirección o responsable...'
              value={searchWh}
              onChange={e => setSearchWh(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='tabler-search text-[#6B7280]' />
                    </InputAdornment>
                  )
                }
              }}
            />
          </div>
        </CardContent>

        {/* Toolbar Strip unificado con estándar Foundly */}
        <div className='flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-b border-[#E6E4F0] bg-[#FAF9FF]'>
          <div className='flex items-center gap-2.5'>
            <Typography variant='h6' className='font-semibold text-[#1E1B2E] text-sm'>
              Almacenes Registrados
            </Typography>
            <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF]'>
              {filteredWarehouses.length} {filteredWarehouses.length === 1 ? 'almacén' : 'almacenes'}
            </span>
          </div>

          <Button
            component={Link}
            href='/inventory/settings/locations'
            variant='outlined'
            size='small'
            startIcon={<i className='tabler-map-pin text-sm' />}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              borderColor: '#DCD8EC',
              color: '#6C5CE7',
              '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F4F3FF' }
            }}
          >
            Gestionar Ubicaciones
          </Button>
        </div>

        {loading ? (
          <div className='p-8 text-center text-[#6B7280]'>Cargando almacenes...</div>
        ) : (
          <div className='overflow-x-auto'>
            <Table size='small'>
              <TableHead className='bg-[#F4F3F8] border-b border-[#E6E4F0]'>
                <TableRow>
                  <TableCell
                    className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-center'
                    style={{ width: 36, maxWidth: 36, padding: '10px 4px' }}
                  >
                    #
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5' style={{ width: 140 }}>
                    Código
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5' style={{ minWidth: 200 }}>
                    Nombre del Almacén
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5' style={{ minWidth: 220 }}>
                    Dirección Física
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5' style={{ width: 160 }}>
                    Responsable
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-center py-2.5' style={{ width: 140 }}>
                    Ubicaciones
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-right py-2.5' style={{ width: 100 }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredWarehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='text-center py-10 text-[#6B7280]'>
                      <i className='tabler-building-warehouse text-3xl mb-2 inline-block text-[#9CA3AF]' />
                      <Typography variant='body2'>
                        No se encontraron almacenes con el criterio de búsqueda.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWarehouses.map((wh, idx) => (
                    <TableRow key={wh.id} hover className='border-b border-[#E6E4F0] last:border-none'>
                      <TableCell
                        className='text-center font-mono text-xs text-[#9CA3AF]'
                        style={{ width: 36, maxWidth: 36, padding: '8px 4px' }}
                      >
                        {idx + 1}
                      </TableCell>
                      <TableCell className='py-3'>
                        <span className='font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-[#F4F3FF] text-[#6C5CE7] border border-[#E9D5FF]'>
                          {wh.code}
                        </span>
                      </TableCell>
                      <TableCell className='py-3'>
                        <div className='flex items-center gap-2'>
                          <span className='font-bold text-sm text-[#1E1B2E]'>
                            {wh.name}
                          </span>
                          {wh.isDefault && (
                            <CustomChip
                              size='small'
                              label='Principal'
                              color='primary'
                              variant='tonal'
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='py-3'>
                        {wh.address ? (
                          <div className='flex items-center gap-1.5 text-xs text-[#6B7280]'>
                            <i className='tabler-map-pin text-sm text-[#9CA3AF] shrink-0' />
                            <span>{wh.address}</span>
                          </div>
                        ) : (
                          <span className='text-xs text-[#9CA3AF]'>—</span>
                        )}
                      </TableCell>
                      <TableCell className='py-3'>
                        <div className='flex items-center gap-1.5 text-xs text-[#1E1B2E] font-medium'>
                          <i className='tabler-user text-sm text-[#9CA3AF]' />
                          <span>{wh.manager || 'No asignado'}</span>
                        </div>
                      </TableCell>
                      <TableCell align='center' className='py-3'>
                        <Tooltip title='Ver ubicaciones en el módulo de ubicaciones'>
                          <Button
                            component={Link}
                            href={`/inventory/settings/locations?warehouseId=${wh.id}`}
                            size='small'
                            variant='text'
                            sx={{
                              p: 0,
                              minWidth: 'auto',
                              textTransform: 'none',
                              '&:hover': { bgcolor: 'transparent' }
                            }}
                          >
                            <CustomChip
                              size='small'
                              label={`${wh.locations.length} ubicaciones`}
                              color='secondary'
                              variant='tonal'
                              className='cursor-pointer'
                            />
                          </Button>
                        </Tooltip>
                      </TableCell>
                      <TableCell align='right' className='py-3'>
                        <div className='flex items-center justify-end gap-1'>
                          <Tooltip title='Editar almacén'>
                            <IconButton size='small' onClick={() => handleOpenEditWarehouse(wh)}>
                              <i className='tabler-edit text-base text-[#6B7280] hover:text-[#6C5CE7]' />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Eliminar almacén'>
                            <IconButton size='small' color='error' onClick={() => handleOpenDeleteConfirm(wh)}>
                              <i className='tabler-trash text-base' />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Modal para Crear / Editar Almacén */}
      <Dialog
        open={whDialogOpen}
        onClose={() => setWhDialogOpen(false)}
        maxWidth='xs'
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle className='font-bold text-[#1E1B2E] border-b border-[#E6E4F0]'>
          {editingWarehouse ? 'Editar Almacén' : 'Nuevo Almacén Físico'}
        </DialogTitle>
        <DialogContent className='pt-5 flex flex-col gap-4'>
          <TextField
            label='Código Corto del Almacén *'
            size='small'
            fullWidth
            placeholder='Ej. ALM-CENTRAL o SUC-ESTE'
            value={whCode}
            onChange={e => setWhCode(e.target.value.toUpperCase())}
            sx={{ mt: 1 }}
          />
          <TextField
            label='Nombre del Almacén *'
            size='small'
            fullWidth
            placeholder='Ej. Almacén Central Los Cortijos'
            value={whName}
            onChange={e => setWhName(e.target.value)}
          />
          <TextField
            label='Dirección Física / Ubicación Geográfica'
            size='small'
            fullWidth
            placeholder='Ej. Zona Industrial, Galpón 4...'
            value={whAddress}
            onChange={e => setWhAddress(e.target.value)}
          />
          <TextField
            label='Responsable / Jefe de Almacén'
            size='small'
            fullWidth
            placeholder='Ej. Elena Rivas'
            value={whManager}
            onChange={e => setWhManager(e.target.value)}
          />
          <FormControlLabel
            control={<Checkbox checked={whIsDefault} onChange={e => setWhIsDefault(e.target.checked)} />}
            label={<span className='text-sm font-medium text-[#1E1B2E]'>Establecer como Almacén Principal por defecto</span>}
          />
        </DialogContent>
        <DialogActions className='p-4 border-t border-[#E6E4F0]'>
          <Button
            variant='outlined'
            color='secondary'
            size='small'
            sx={{ borderRadius: '9999px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
            onClick={() => setWhDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='primary'
            size='small'
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
            onClick={handleSaveWarehouse}
          >
            Guardar Almacén
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmación de Eliminación */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth='xs'
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle className='font-bold text-[#1E1B2E] border-b border-[#E6E4F0]'>
          ¿Eliminar almacén?
        </DialogTitle>
        <DialogContent className='pt-4'>
          <Typography variant='body2' className='text-[#6B7280]'>
            ¿Está seguro de que desea eliminar el almacén{' '}
            <strong>{warehouseToDelete?.name}</strong> ({warehouseToDelete?.code})?
          </Typography>
        </DialogContent>
        <DialogActions className='p-4 border-t border-[#E6E4F0]'>
          <Button
            variant='outlined'
            color='secondary'
            size='small'
            sx={{ borderRadius: '9999px', textTransform: 'none', fontWeight: 600 }}
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='error'
            size='small'
            sx={{ borderRadius: '9999px', textTransform: 'none', fontWeight: 600 }}
            onClick={handleConfirmDelete}
          >
            Sí, Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} variant='filled' className='rounded-xl'>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default InventoryWarehousesView
