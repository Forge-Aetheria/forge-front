'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CustomChip from '@core/components/mui/Chip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import type { ProductCategory, ProductTemplate } from '@/types/inventoryTypes'
import {
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  getInventoryTemplates
} from '@/services/inventoryService'

const InventoryCategoriesView = () => {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [templates, setTemplates] = useState<ProductTemplate[]>([])

  // Search & Inline new/edit states
  const [searchCat, setSearchCat] = useState('')
  const [showNewCatRow, setShowNewCatRow] = useState(false)
  const [newCatCode, setNewCatCode] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')

  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatCode, setEditCatCode] = useState('')
  const [editCatName, setEditCatName] = useState('')
  const [editCatDesc, setEditCatDesc] = useState('')

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const loadData = useCallback(async () => {
    const [catData, prodData] = await Promise.all([getProductCategories(), getInventoryTemplates()])

    setCategories(catData)
    setTemplates(prodData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Count products per category
  const productCountByCategory = useMemo(() => {
    const map: Record<string, number> = {}

    templates.forEach(t => {
      map[t.categoryName] = (map[t.categoryName] || 0) + 1
    })

    return map
  }, [templates])

  const filteredCategories = useMemo(() => {
    if (!searchCat.trim()) return categories
    const q = searchCat.toLowerCase()

    return categories.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    )
  }, [categories, searchCat])

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      setToast({ open: true, message: 'El nombre de la categoría es obligatorio', severity: 'error' })

      return
    }

    try {
      const created = await createProductCategory({
        code: newCatCode,
        name: newCatName,
        description: newCatDesc
      })

      setNewCatCode('')
      setNewCatName('')
      setNewCatDesc('')
      setShowNewCatRow(false)
      await loadData()

      setToast({
        open: true,
        message: `Categoría "${created.name}" creada exitosamente`,
        severity: 'success'
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la categoría'

      setToast({ open: true, message: msg, severity: 'error' })
    }
  }

  const handleStartEditCategory = (cat: ProductCategory) => {
    setEditingCatId(cat.id)
    setEditCatCode(cat.code)
    setEditCatName(cat.name)
    setEditCatDesc(cat.description || '')
  }

  const handleSaveEditCategory = async (id: string) => {
    if (!editCatName.trim()) {
      setToast({ open: true, message: 'El nombre de la categoría no puede estar vacío', severity: 'error' })

      return
    }

    try {
      await updateProductCategory(id, {
        code: editCatCode,
        name: editCatName,
        description: editCatDesc
      })
      setEditingCatId(null)
      await loadData()

      setToast({ open: true, message: 'Categoría actualizada correctamente', severity: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la categoría'

      setToast({ open: true, message: msg, severity: 'error' })
    }
  }

  const handleDeleteCategory = async (cat: ProductCategory) => {
    const usedCount = productCountByCategory[cat.name] || 0

    if (usedCount > 0) {
      setToast({
        open: true,
        message: `No se puede eliminar "${cat.name}" porque tiene ${usedCount} producto(s) asociado(s).`,
        severity: 'error'
      })

      return
    }

    await deleteProductCategory(cat.id)
    await loadData()
    setToast({ open: true, message: `Categoría "${cat.name}" eliminada`, severity: 'info' })
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Header exclusivo de Categorías */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div className='flex items-center gap-2.5 flex-wrap'>
          <Typography variant='h4' className='font-bold text-[#1E1B4B]'>
            Categorías de Productos
          </Typography>
          <CustomChip
            size='small'
            label={`${filteredCategories.length} categorías`}
            color='primary'
            variant='tonal'
          />
        </div>

        <div className='flex items-center gap-2.5'>
          <Button
            variant='contained'
            color='primary'
            className='font-semibold shadow-sm'
            startIcon={<i className='tabler-plus' />}
            onClick={() => setShowNewCatRow(true)}
          >
            Nuevo
          </Button>
        </div>
      </div>

      {/* Tabla de Categorías */}
      <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl overflow-hidden'>
        <CardContent className='p-5 border-b border-[#E6E4F0] bg-[#FAFAFE]'>
          <div className='w-full sm:max-w-lg'>
            <TextField
              fullWidth
              size='small'
              placeholder='Buscar categoría por código, nombre o descripción...'
              value={searchCat}
              onChange={e => setSearchCat(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='tabler-search text-textSecondary' />
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
              Categorías Configuradas
            </Typography>
            <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF]'>
              {filteredCategories.length} {filteredCategories.length === 1 ? 'categoría' : 'categorías'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className='p-8 text-center text-textSecondary'>Cargando categorías...</div>
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
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5' style={{ width: 130 }}>
                    Código Prefijo
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5' style={{ minWidth: 220 }}>
                    Nombre de la Categoría
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5'>
                    Descripción / Uso
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-center py-2.5'>
                    Artículos
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-right py-2.5'>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Inline New Category Row */}
                {showNewCatRow && (
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
                        placeholder='Ej. FER'
                        value={newCatCode}
                        onChange={e => setNewCatCode(e.target.value.toUpperCase())}
                        sx={{
                          width: 105,
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#FFFFFF',
                            borderRadius: '10px',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem'
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size='small'
                        fullWidth
                        autoFocus
                        placeholder='Nombre de la nueva categoría...'
                        value={newCatName}
                        onChange={e => {
                          setNewCatName(e.target.value)

                          if (!newCatCode) {
                            setNewCatCode(
                              e.target.value
                                .slice(0, 3)
                                .toUpperCase()
                                .replace(/[^A-Z0-9]/g, '')
                            )
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleCreateCategory()
                          }
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#FFFFFF',
                            borderRadius: '10px',
                            fontSize: '0.82rem'
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size='small'
                        fullWidth
                        placeholder='Descripción opcional...'
                        value={newCatDesc}
                        onChange={e => setNewCatDesc(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleCreateCategory()
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
                    <TableCell className='text-center'>
                      <CustomChip size='small' label='Nueva' color='primary' variant='tonal' />
                    </TableCell>
                    <TableCell className='text-right whitespace-nowrap'>
                      <div className='flex items-center justify-end gap-1'>
                        <Tooltip title='Guardar Categoría (Enter)'>
                          <IconButton
                            size='small'
                            onClick={handleCreateCategory}
                            sx={{
                              backgroundColor: '#6C5CE7',
                              color: '#FFFFFF',
                              '&:hover': { backgroundColor: '#5A4AD1' }
                            }}
                          >
                            <i className='tabler-check text-base' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Cancelar'>
                          <IconButton size='small' color='error' onClick={() => setShowNewCatRow(false)}>
                            <i className='tabler-x text-base' />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {filteredCategories.map((cat, idx) => {
                  const isEditing = editingCatId === cat.id
                  const count = productCountByCategory[cat.name] || 0

                  return (
                    <TableRow key={cat.id} hover className='border-b border-[#E6E4F0] last:border-none hover:bg-[#FAF9FF] transition-colors'>
                      <TableCell
                        className='text-center font-mono text-xs text-textSecondary'
                        style={{ width: 28, maxWidth: 28, padding: '6px 4px' }}
                      >
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size='small'
                            value={editCatCode}
                            onChange={e => setEditCatCode(e.target.value.toUpperCase())}
                            sx={{ width: 95 }}
                          />
                        ) : (
                          <CustomChip
                            size='small'
                            label={cat.code}
                            color='primary'
                            variant='tonal'
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size='small'
                            fullWidth
                            value={editCatName}
                            onChange={e => setEditCatName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEditCategory(cat.id)
                            }}
                          />
                        ) : (
                          <Typography variant='body2' className='font-bold text-[#1E1B4B]'>
                            {cat.name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size='small'
                            fullWidth
                            value={editCatDesc}
                            onChange={e => setEditCatDesc(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEditCategory(cat.id)
                            }}
                          />
                        ) : (
                          <Typography variant='caption' className='text-textSecondary'>
                            {cat.description || 'Sin descripción adicional'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell className='text-center'>
                        <CustomChip
                          size='small'
                          label={`${count} art.`}
                          color={count > 0 ? 'secondary' : 'default'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell className='text-right whitespace-nowrap'>
                        {isEditing ? (
                          <div className='flex items-center justify-end gap-1'>
                            <IconButton
                              size='small'
                              color='primary'
                              onClick={() => handleSaveEditCategory(cat.id)}
                            >
                              <i className='tabler-check text-base' />
                            </IconButton>
                            <IconButton size='small' color='secondary' onClick={() => setEditingCatId(null)}>
                              <i className='tabler-x text-base' />
                            </IconButton>
                          </div>
                        ) : (
                          <div className='flex items-center justify-end gap-1'>
                            <Tooltip title='Editar categoría'>
                              <IconButton size='small' onClick={() => handleStartEditCategory(cat)}>
                                <i className='tabler-edit text-base text-textSecondary hover:text-primary' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Eliminar categoría'>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleDeleteCategory(cat)}
                              >
                                <i className='tabler-trash text-base' />
                              </IconButton>
                            </Tooltip>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

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

export default InventoryCategoriesView
