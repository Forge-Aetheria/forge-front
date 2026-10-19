'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
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
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import type { Warehouse } from '@/types/inventoryTypes'
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
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

const InventoryWarehousesView = () => {
  const [loading, setLoading] = useState(true)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')

  // Warehouse modal state
  const [whDialogOpen, setWhDialogOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [whCode, setWhCode] = useState('')
  const [whName, setWhName] = useState('')
  const [whAddress, setWhAddress] = useState('')
  const [whManager, setWhManager] = useState('')
  const [whIsDefault, setWhIsDefault] = useState(false)

  // Inline new location row inside selected warehouse
  const [showNewLocRow, setShowNewLocRow] = useState(false)
  const [newLocCode, setNewLocCode] = useState('')
  const [newLocName, setNewLocName] = useState('')
  const [newLocType, setNewLocType] = useState<'INTERNAL' | 'TRANSIT' | 'SCRAP'>('INTERNAL')
  const [newLocNotes, setNewLocNotes] = useState('')

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const loadData = useCallback(async () => {
    const whData = await getWarehouses()

    setWarehouses(whData)
    setSelectedWarehouseId(prev => {
      if (prev && whData.some(w => w.id === prev)) return prev

      return whData[0]?.id || ''
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedWarehouse = useMemo(
    () => warehouses.find(w => w.id === selectedWarehouseId) || warehouses[0] || null,
    [warehouses, selectedWarehouseId]
  )

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
    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, {
          code: whCode,
          name: whName,
          address: whAddress,
          manager: whManager,
          isDefault: whIsDefault
        })
        setToast({ open: true, message: `Almacén "${whName}" actualizado`, severity: 'success' })
      } else {
        const created = await createWarehouse({
          code: whCode,
          name: whName,
          address: whAddress,
          manager: whManager,
          isDefault: whIsDefault
        })

        setSelectedWarehouseId(created.id)
        setToast({ open: true, message: `Almacén "${created.name}" creado`, severity: 'success' })
      }

      setWhDialogOpen(false)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el almacén'

      setToast({ open: true, message: msg, severity: 'error' })
    }
  }

  const handleDeleteWarehouse = async (wh: Warehouse) => {
    if (warehouses.length <= 1) {
      setToast({
        open: true,
        message: 'Debe existir al menos un almacén principal activo en el sistema.',
        severity: 'error'
      })

      return
    }

    await deleteWarehouse(wh.id)
    await loadData()
    setToast({ open: true, message: `Almacén "${wh.name}" eliminado`, severity: 'info' })
  }

  const handleCreateLocation = async () => {
    if (!selectedWarehouse) return

    try {
      const loc = await addWarehouseLocation(selectedWarehouse.id, {
        code: newLocCode,
        name: newLocName,
        type: newLocType,
        notes: newLocNotes
      })

      setNewLocCode('')
      setNewLocName('')
      setNewLocType('INTERNAL')
      setNewLocNotes('')
      setShowNewLocRow(false)
      await loadData()

      setToast({
        open: true,
        message: `Ubicación "${loc.code}" agregada a ${selectedWarehouse.name}`,
        severity: 'success'
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al agregar la ubicación'

      setToast({ open: true, message: msg, severity: 'error' })
    }
  }

  const handleRemoveLocation = async (locationId: string, code: string) => {
    if (!selectedWarehouse) return
    await deleteWarehouseLocation(selectedWarehouse.id, locationId)
    await loadData()
    setToast({ open: true, message: `Ubicación "${code}" eliminada`, severity: 'info' })
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Header exclusivo de Almacenes y Ubicaciones */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <Typography variant='h4' className='font-bold text-[#1E1B4B]'>
              Almacenes y Ubicaciones
            </Typography>
            <Chip
              size='small'
              label={`${warehouses.length} almacenes`}
              color='primary'
              variant='tonal'
              className='rounded-full font-bold'
            />
          </div>
          <Typography variant='body2' className='text-textSecondary'>
            Almacenes físicos y ubicaciones internas
          </Typography>
        </div>

        <div className='flex items-center gap-2.5'>
          <Button
            component={Link}
            href='/inventory'
            variant='tonal'
            color='secondary'
            className='rounded-full font-medium'
            startIcon={<i className='tabler-layout-dashboard' />}
          >
            Panel Operativo
          </Button>
          <Button
            variant='contained'
            color='primary'
            className='rounded-full font-semibold shadow-sm'
            startIcon={<i className='tabler-plus' />}
            onClick={handleOpenNewWarehouse}
          >
            Nuevo
          </Button>
        </div>
      </div>

      {/* Layout Padre-Hijo: Almacenes a la izquierda y Ubicaciones a la derecha */}
      <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl overflow-hidden'>
        <CardContent className='p-5'>
          {loading ? (
            <div className='p-8 text-center text-textSecondary'>Cargando almacenes...</div>
          ) : (
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
              {/* Columna Izquierda (4 cols): Lista de Almacenes Padre */}
              <div className='lg:col-span-4 flex flex-col gap-3'>
                <div className='flex items-center justify-between mb-1'>
                  <Typography variant='subtitle1' className='font-bold text-[#1E1B4B]'>
                    Almacenes Físicos
                  </Typography>
                  <Button
                    size='small'
                    variant='tonal'
                    color='primary'
                    className='rounded-full font-semibold text-xs'
                    startIcon={<i className='tabler-plus text-sm' />}
                    onClick={handleOpenNewWarehouse}
                  >
                    Nuevo
                  </Button>
                </div>

                {warehouses.map(wh => {
                  const isSelected = selectedWarehouse?.id === wh.id

                  return (
                    <div
                      key={wh.id}
                      onClick={() => {
                        setSelectedWarehouseId(wh.id)
                        setShowNewLocRow(false)
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#6C5CE7] bg-[#F4F3FF]/60 shadow-xs'
                          : 'border-[#E6E4F0] bg-[#FFFFFF] hover:bg-[#FAFAFE]'
                      }`}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <Typography variant='subtitle2' className='font-bold text-[#1E1B4B]'>
                              {wh.name}
                            </Typography>
                            {wh.isDefault && (
                              <Chip
                                size='small'
                                label='Principal'
                                color='primary'
                                variant='tonal'
                                className='rounded-full text-[10px] font-bold h-5'
                              />
                            )}
                          </div>
                          <Typography variant='caption' className='font-mono text-primary font-semibold block mt-0.5'>
                            Código: {wh.code}
                          </Typography>
                        </div>

                        <div className='flex items-center gap-0.5' onClick={e => e.stopPropagation()}>
                          <Tooltip title='Editar almacén'>
                            <IconButton size='small' onClick={() => handleOpenEditWarehouse(wh)}>
                              <i className='tabler-edit text-sm text-textSecondary' />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Eliminar almacén'>
                            <IconButton size='small' color='error' onClick={() => handleDeleteWarehouse(wh)}>
                              <i className='tabler-trash text-sm' />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </div>

                      {wh.address && (
                        <Typography variant='caption' className='text-textSecondary block mt-2'>
                          <i className='tabler-map-pin text-xs mr-1' />
                          {wh.address}
                        </Typography>
                      )}

                      <div className='flex items-center justify-between mt-3 pt-2.5 border-t border-[#E6E4F0]'>
                        <Typography variant='caption' className='text-textSecondary'>
                          Resp: <strong className='text-[#1E1B4B]'>{wh.manager || 'N/A'}</strong>
                        </Typography>
                        <Chip
                          size='small'
                          label={`${wh.locations.length} ubicaciones`}
                          color={isSelected ? 'primary' : 'secondary'}
                          variant='tonal'
                          className='rounded-full font-mono text-[11px] font-semibold h-5'
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Columna Derecha (8 cols): Ubicaciones Internas del Almacén Seleccionado */}
              <div className='lg:col-span-8'>
                {selectedWarehouse ? (
                  <div className='rounded-2xl border border-[#E6E4F0] bg-[#FFFFFF] overflow-hidden'>
                    <div className='p-4 bg-[#FAFAFE] border-b border-[#E6E4F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                      <div>
                        <div className='flex items-center gap-2'>
                          <Typography variant='subtitle1' className='font-bold text-[#1E1B4B]'>
                            Ubicaciones en {selectedWarehouse.name}
                          </Typography>
                          <Chip
                            size='small'
                            label={selectedWarehouse.code}
                            color='primary'
                            variant='tonal'
                            className='rounded-full font-mono text-xs font-bold'
                          />
                        </div>
                        <Typography variant='caption' className='text-textSecondary'>
                          Pasillos, estantes, rieles, zonas de recepción o cuarentena dentro de este almacén
                        </Typography>
                      </div>

                      <Button
                        size='small'
                        variant='contained'
                        color='primary'
                        className='rounded-full font-semibold shadow-xs'
                        startIcon={<i className='tabler-plus text-sm' />}
                        onClick={() => {
                          setNewLocCode(`${selectedWarehouse.code.slice(0, 3)}-EST-0${selectedWarehouse.locations.length + 1}`)
                          setShowNewLocRow(true)
                        }}
                      >
                        Nueva Ubicación
                      </Button>
                    </div>

                    <div className='overflow-x-auto'>
                      <Table size='small'>
                        <TableHead className='bg-[#F8F7FA] border-b border-[#E6E4F0]'>
                          <TableRow>
                            <TableCell
                              className='font-semibold text-xs uppercase text-textSecondary text-center'
                              style={{ width: 28, maxWidth: 28, padding: '8px 4px' }}
                            >
                              #
                            </TableCell>
                            <TableCell className='font-semibold text-xs uppercase text-textSecondary' style={{ width: 155 }}>
                              Código Ubicación
                            </TableCell>
                            <TableCell className='font-semibold text-xs uppercase text-textSecondary'>
                              Nombre / Pasillo / Estante
                            </TableCell>
                            <TableCell className='font-semibold text-xs uppercase text-textSecondary' style={{ width: 175 }}>
                              Tipo de Zona
                            </TableCell>
                            <TableCell className='font-semibold text-xs uppercase text-textSecondary'>
                              Notas
                            </TableCell>
                            <TableCell className='font-semibold text-xs uppercase text-textSecondary text-right'>
                              Acciones
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Inline New Location Row */}
                          {showNewLocRow && (
                            <TableRow className='bg-[#F4F3FF]/70 border-b-2 border-[#6C5CE7]/30'>
                              <TableCell
                                className='text-center'
                                style={{ width: 28, maxWidth: 28, padding: '6px 4px' }}
                              >
                                <span className='inline-block w-2 h-2 rounded-full bg-[#6C5CE7]' />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size='small'
                                  placeholder='PAS-A-01'
                                  value={newLocCode}
                                  onChange={e => setNewLocCode(e.target.value.toUpperCase())}
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: '10px',
                                      fontFamily: 'monospace',
                                      fontSize: '0.78rem'
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size='small'
                                  fullWidth
                                  autoFocus
                                  placeholder='Ej. Pasillo C - Estante 2'
                                  value={newLocName}
                                  onChange={e => setNewLocName(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      handleCreateLocation()
                                    }
                                  }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: '10px',
                                      fontSize: '0.8rem'
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  select
                                  size='small'
                                  fullWidth
                                  value={newLocType}
                                  onChange={e =>
                                    setNewLocType(e.target.value as 'INTERNAL' | 'TRANSIT' | 'SCRAP')
                                  }
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: '10px',
                                      fontSize: '0.78rem'
                                    }
                                  }}
                                >
                                  <MenuItem value='INTERNAL'>Interna / Estantería</MenuItem>
                                  <MenuItem value='TRANSIT'>Recepción / Tránsito</MenuItem>
                                  <MenuItem value='SCRAP'>Merma / Cuarentena</MenuItem>
                                </TextField>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size='small'
                                  fullWidth
                                  placeholder='Nota opcional...'
                                  value={newLocNotes}
                                  onChange={e => setNewLocNotes(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      handleCreateLocation()
                                    }
                                  }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: '10px',
                                      fontSize: '0.78rem'
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className='text-right whitespace-nowrap'>
                                <div className='flex items-center justify-end gap-1'>
                                  <IconButton
                                    size='small'
                                    onClick={handleCreateLocation}
                                    sx={{
                                      backgroundColor: '#6C5CE7',
                                      color: '#FFFFFF',
                                      '&:hover': { backgroundColor: '#5A4AD1' }
                                    }}
                                  >
                                    <i className='tabler-check text-base' />
                                  </IconButton>
                                  <IconButton size='small' color='error' onClick={() => setShowNewLocRow(false)}>
                                    <i className='tabler-x text-base' />
                                  </IconButton>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}

                          {selectedWarehouse.locations.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className='text-center py-8 text-textSecondary'>
                                Este almacén aún no tiene ubicaciones internas registradas.
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedWarehouse.locations.map((loc, index) => {
                              const typeInfo = locationTypeMeta[loc.type] || locationTypeMeta.INTERNAL

                              return (
                                <TableRow key={loc.id} hover className='border-b border-[#E6E4F0] last:border-none'>
                                  <TableCell
                                    className='text-center font-mono text-xs text-textSecondary'
                                    style={{ width: 28, maxWidth: 28, padding: '6px 4px' }}
                                  >
                                    {index + 1}
                                  </TableCell>
                                  <TableCell className='font-mono font-bold text-xs text-primary whitespace-nowrap'>
                                    {loc.code}
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant='body2' className='font-semibold text-[#1E1B4B]'>
                                      {loc.name}
                                    </Typography>
                                  </TableCell>
                                  <TableCell className='whitespace-nowrap'>
                                    <Chip
                                      size='small'
                                      label={typeInfo.label}
                                      color={typeInfo.color}
                                      variant='tonal'
                                      className='rounded-full text-[11px] font-semibold'
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant='caption' className='text-textSecondary'>
                                      {loc.notes || '—'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell className='text-right'>
                                    <Tooltip title='Eliminar ubicación'>
                                      <IconButton
                                        size='small'
                                        color='error'
                                        onClick={() => handleRemoveLocation(loc.id, loc.code)}
                                      >
                                        <i className='tabler-trash text-base' />
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
                  </div>
                ) : (
                  <div className='p-8 text-center text-textSecondary border border-[#E6E4F0] rounded-2xl'>
                    Seleccione un almacén a la izquierda para gestionar sus ubicaciones.
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para Crear / Editar Almacén Padre */}
      <Dialog
        open={whDialogOpen}
        onClose={() => setWhDialogOpen(false)}
        maxWidth='xs'
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle className='font-bold text-[#1E1B4B] border-b border-[#E6E4F0]'>
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
            label={<span className='text-sm font-medium text-[#1E1B4B]'>Establecer como Almacén Principal por defecto</span>}
          />
        </DialogContent>
        <DialogActions className='p-4 border-t border-[#E6E4F0]'>
          <Button
            variant='tonal'
            color='secondary'
            className='rounded-full font-semibold'
            onClick={() => setWhDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='primary'
            className='rounded-full font-semibold'
            onClick={handleSaveWarehouse}
          >
            Guardar Almacén
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
