'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

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
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Divider from '@mui/material/Divider'

import CustomChip from '@core/components/mui/Chip'

import type { Account } from '@/types/accountingTypes'
import { accountingService } from '@/services/accountingService'

import type { ProductCategory, ProductTemplate } from '@/types/inventoryTypes'
import {
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  getInventoryTemplates
} from '@/services/inventoryService'

// Helper component for Searchable PUC Account Autocomplete
interface AccountAutocompleteProps {
  label: string
  valueId: string
  onChange: (id: string, account?: Account) => void
  accounts: Account[]
  helperText: string
  badgeColor?: string
  placeholder?: string
  preferredTypes?: string[]
}

const SearchableAccountField: React.FC<AccountAutocompleteProps> = ({
  label,
  valueId,
  onChange,
  accounts,
  helperText,
  badgeColor = '#6C5CE7',
  placeholder = 'Escribe para buscar código o nombre...'
}) => {
  const selectedAccount = useMemo(() => accounts.find(a => a.id === valueId) || null, [accounts, valueId])

  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-xs font-bold text-[#1E1B2E] flex items-center justify-between'>
        <span>{label}</span>
        {selectedAccount && (
          <span className='font-mono text-[11px] font-semibold text-[#6C5CE7] bg-[#F5F3FF] px-2 py-0.5 rounded'>
            {selectedAccount.codigo}
          </span>
        )}
      </label>
      <Autocomplete
        options={accounts}
        getOptionLabel={opt => `${opt.codigo} - ${opt.nombre}`}
        value={selectedAccount}
        onChange={(_, newVal) => {
          onChange(newVal ? newVal.id : '', newVal || undefined)
        }}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        filterOptions={(options, { inputValue }) => {
          const q = inputValue.toLowerCase().trim()

          if (!q) return options

          return options.filter(
            opt =>
              opt.codigo.toLowerCase().includes(q) ||
              opt.nombre.toLowerCase().includes(q) ||
              (opt.tipoCuentaNombre || '').toLowerCase().includes(q)
          )
        }}
        renderOption={(props, option) => (
          <li
            {...props}
            key={option.id}
            className='px-3.5 py-2 hover:bg-[#F5F3FF] cursor-pointer flex items-center justify-between text-xs border-b border-[#F3F4F6] last:border-none'
          >
            <div className='flex items-center gap-2.5 overflow-hidden'>
              <span
                className='font-mono font-bold text-xs px-2 py-0.5 rounded'
                style={{ backgroundColor: `${badgeColor}15`, color: badgeColor }}
              >
                {option.codigo}
              </span>
              <span className='text-[#1E1B2E] font-medium truncate'>{option.nombre}</span>
            </div>
            <span className='text-[10px] text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full shrink-0 ml-2'>
              {option.tipoCuentaNombre || option.subtipo}
            </span>
          </li>
        )}
        renderInput={params => (
          <TextField
            {...params}
            size='small'
            placeholder={placeholder}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                backgroundColor: '#FAFAFC',
                fontSize: '0.875rem'
              }
            }}
          />
        )}
      />
      <span className='text-[11px] text-[#6B7280]'>{helperText}</span>
    </div>
  )
}

const InventoryCategoriesView: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  // Navigation mode: 'LIST' or 'FORM' (Vista Completa)
  const [activeView, setActiveView] = useState<'LIST' | 'FORM'>('LIST')
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)

  // Full View Form State
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formCuentaIngresosId, setFormCuentaIngresosId] = useState('')
  const [formCuentaGastosId, setFormCuentaGastosId] = useState('')
  const [formCuentaValoracionId, setFormCuentaValoracionId] = useState('')
  const [formCuentaCostosDestinoId, setFormCuentaCostosDestinoId] = useState('')
  const [savingForm, setSavingForm] = useState(false)

  // List View Filter State
  const [searchCat, setSearchCat] = useState('')

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const loadData = useCallback(async () => {
    try {
      const [catData, prodData, accData] = await Promise.all([
        getProductCategories(),
        getInventoryTemplates(),
        accountingService.getAccounts()
      ])

      setCategories(catData)
      setTemplates(prodData)
      setAccounts(accData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Count products per category
  const productCountByCategory = useMemo(() => {
    const map: Record<string, number> = {}

    templates.forEach(t => {
      const catKey = t.categoryName || ''

      map[catKey] = (map[catKey] || 0) + 1
    })

    return map
  }, [templates])

  // Products belonging to the currently edited category
  const categoryProducts = useMemo(() => {
    if (!editingCategory) return []

    return templates.filter(
      t => t.categoryName?.toLowerCase() === editingCategory.name.toLowerCase()
    )
  }, [editingCategory, templates])

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

  // Switch to Full View to CREATE new category
  const handleOpenCreate = () => {
    setEditingCategory(null)
    setFormCode('')
    setFormName('')
    setFormDesc('')
    setFormIsActive(true)
    setFormCuentaIngresosId('acc-410101')
    setFormCuentaGastosId('acc-510101')
    setFormCuentaValoracionId('acc-110301')
    setFormCuentaCostosDestinoId('acc-110302')
    setActiveView('FORM')
  }

  // Switch to Full View to EDIT existing category
  const handleOpenEdit = (cat: ProductCategory) => {
    setEditingCategory(cat)
    setFormCode(cat.code)
    setFormName(cat.name)
    setFormDesc(cat.description || '')
    setFormIsActive(cat.isActive !== false)
    setFormCuentaIngresosId(cat.cuentaIngresosId || 'acc-410101')
    setFormCuentaGastosId(cat.cuentaGastosId || 'acc-510101')
    setFormCuentaValoracionId(cat.cuentaValoracionInventarioId || (cat.code === 'SRV' ? '' : 'acc-110301'))
    setFormCuentaCostosDestinoId(cat.cuentaCostosDestinoId || (cat.code === 'SRV' ? '' : 'acc-110302'))
    setActiveView('FORM')
  }

  // Save changes from Full View
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = formName.trim()

    if (!trimmedName) {
      setToast({ open: true, message: 'El nombre de la categoría es obligatorio', severity: 'error' })

      return
    }

    setSavingForm(true)

    try {
      const incAcc = accounts.find(a => a.id === formCuentaIngresosId)
      const expAcc = accounts.find(a => a.id === formCuentaGastosId)
      const valAcc = accounts.find(a => a.id === formCuentaValoracionId)
      const dstAcc = accounts.find(a => a.id === formCuentaCostosDestinoId)

      const payload = {
        name: trimmedName,
        code: formCode.trim().toUpperCase() || trimmedName.slice(0, 3).toUpperCase(),
        description: formDesc.trim(),
        isActive: formIsActive,
        cuentaIngresosId: formCuentaIngresosId || undefined,
        cuentaIngresosCodigo: incAcc?.codigo,
        cuentaIngresosNombre: incAcc?.nombre,
        cuentaGastosId: formCuentaGastosId || undefined,
        cuentaGastosCodigo: expAcc?.codigo,
        cuentaGastosNombre: expAcc?.nombre,
        cuentaValoracionInventarioId: formCuentaValoracionId || undefined,
        cuentaValoracionInventarioCodigo: valAcc?.codigo,
        cuentaValoracionInventarioNombre: valAcc?.nombre,
        cuentaCostosDestinoId: formCuentaCostosDestinoId || undefined,
        cuentaCostosDestinoCodigo: dstAcc?.codigo,
        cuentaCostosDestinoNombre: dstAcc?.nombre
      }

      if (editingCategory) {
        await updateProductCategory(editingCategory.id, payload)
        setToast({
          open: true,
          message: `Categoría "${trimmedName}" actualizada exitosamente`,
          severity: 'success'
        })
      } else {
        await createProductCategory(payload)
        setToast({
          open: true,
          message: `Categoría "${trimmedName}" creada exitosamente`,
          severity: 'success'
        })
      }

      await loadData()
      setActiveView('LIST')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la categoría'

      setToast({ open: true, message: msg, severity: 'error' })
    } finally {
      setSavingForm(false)
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

    try {
      await deleteProductCategory(cat.id)
      await loadData()
      setToast({ open: true, message: `Categoría "${cat.name}" eliminada`, severity: 'info' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la categoría'

      setToast({ open: true, message: msg, severity: 'error' })
    }
  }

  // =========================================================================
  // RENDER: VISTA COMPLETA (FULL FORM VIEW)
  // =========================================================================
  if (activeView === 'FORM') {
    const usedCount = editingCategory ? productCountByCategory[editingCategory.name] || 0 : 0

    return (
      <form onSubmit={handleSaveForm} className='flex flex-col gap-6 w-full pb-12'>
        {/* Barra Superior con Navegación y Acciones según especificaciones Foundly */}
        <div className='flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap'>
          {/* Izquierda: Botón Volver Circular + Título y Badge */}
          <div className='flex items-center gap-3 min-w-0 flex-1'>
            <Tooltip title='Volver a Categorías'>
              <Button
                variant='text'
                onClick={() => setActiveView('LIST')}
                sx={{
                  minWidth: 'auto',
                  width: 38,
                  height: 38,
                  p: 0,
                  borderRadius: '9999px',
                  color: '#6B7280',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E6E4F0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' }
                }}
              >
                <i className='tabler-arrow-left text-lg' />
              </Button>
            </Tooltip>
            <div className='flex items-center gap-2.5 min-w-0'>
              <Typography variant='h4' className='font-bold text-textPrimary truncate'>
                {editingCategory ? (formName || editingCategory.name || 'Categoría') : 'Nueva Categoría de Productos'}
              </Typography>
              {formCode && (
                <CustomChip
                  size='small'
                  label={formCode.toUpperCase()}
                  color='primary'
                  variant='tonal'
                />
              )}
            </div>
          </div>

          {/* Derecha: Botones de Acción (Única ubicación, sin duplicados) */}
          <div className='flex items-center gap-2.5 shrink-0'>
            <Button
              variant='outlined'
              color='secondary'
              size='small'
              onClick={() => setActiveView('LIST')}
              className='shrink-0'
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                fontWeight: 600,
                px: 2.5
              }}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              variant='contained'
              color='primary'
              size='small'
              disabled={savingForm}
              className='shrink-0'
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': { backgroundColor: '#5B4CDB' }
              }}
              startIcon={<i className={savingForm ? 'tabler-loader-2 animate-spin text-base' : 'tabler-device-floppy text-base'} />}
            >
              {savingForm ? 'Guardando...' : editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
            </Button>
            {editingCategory && (
              <Tooltip title='Eliminar Categoría'>
                <IconButton
                  size='small'
                  color='error'
                  onClick={() => handleDeleteCategory(editingCategory)}
                  className='shrink-0'
                >
                  <i className='tabler-trash text-lg' />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Layout en Grid: Principal (8 cols) + Panel Lateral Informativo (4 cols) */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
          {/* Columna Principal */}
          <div className='lg:col-span-8 flex flex-col gap-6'>
            {/* Tarjeta 1: Información General de la Categoría */}
            <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl overflow-hidden'>
              <CardContent className='p-6 flex flex-col gap-4'>
                <div className='flex items-center justify-between pb-2 border-b border-[#F3F4F6]'>
                  <div>
                    <Typography variant='h6' className='font-bold text-[#1E1B2E] flex items-center gap-2'>
                      <i className='tabler-category text-[#6C5CE7]' /> Información General
                    </Typography>
                    <span className='text-xs text-[#6B7280]'>
                      Identificación y parámetros descriptivos de la categoría
                    </span>
                  </div>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formIsActive}
                        onChange={e => setFormIsActive(e.target.checked)}
                        color='primary'
                      />
                    }
                    label={
                      <span className='text-xs font-bold text-[#1E1B2E]'>
                        {formIsActive ? 'Activa' : 'Inactiva'}
                      </span>
                    }
                  />
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  <div className='sm:col-span-1'>
                    <TextField
                      fullWidth
                      size='small'
                      label='Código Prefijo'
                      placeholder='Ej. TEX'
                      value={formCode}
                      onChange={e => setFormCode(e.target.value.toUpperCase())}
                      helperText='Identificador para variantes y SKUs'
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          backgroundColor: '#FAFAFC',
                          fontFamily: 'monospace',
                          fontWeight: 700
                        }
                      }}
                    />
                  </div>

                  <div className='sm:col-span-2'>
                    <TextField
                      fullWidth
                      size='small'
                      required
                      label='Nombre de la Categoría'
                      placeholder='Ej. Textil & Indumentaria'
                      value={formName}
                      onChange={e => {
                        setFormName(e.target.value)

                        if (!formCode && !editingCategory) {
                          setFormCode(
                            e.target.value
                              .slice(0, 3)
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, '')
                          )
                        }
                      }}
                      helperText='Nombre visible en catálogo y operaciones'
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          backgroundColor: '#FAFAFC',
                          fontWeight: 600
                        }
                      }}
                    />
                  </div>
                </div>

                <TextField
                  fullWidth
                  size='small'
                  multiline
                  rows={2}
                  label='Descripción / Uso'
                  placeholder='Detalle de los artículos, materiales o suministros que agrupa esta categoría...'
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: '#FAFAFC'
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Tarjeta 2: Cuentas de Propiedad (Resultados / Facturación - Odoo) */}
            <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl overflow-hidden'>
              <CardContent className='p-6 flex flex-col gap-4'>
                <div className='pb-2 border-b border-[#F3F4F6]'>
                  <Typography variant='h6' className='font-bold text-[#1E1B2E] flex items-center gap-2'>
                    <i className='tabler-receipt-2 text-[#6C5CE7]' /> Cuentas de Propiedad (Ventas y Resultados)
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Rigen de forma predeterminada para la facturación a clientes y el registro del costo de ventas directo
                  </span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
                  <SearchableAccountField
                    label='Cuenta de Ingresos (Ventas a Clientes)'
                    valueId={formCuentaIngresosId}
                    onChange={id => setFormCuentaIngresosId(id)}
                    accounts={accounts}
                    badgeColor='#059669'
                    helperText='Haber: Se acredita automáticamente al facturar productos de esta categoría.'
                  />

                  <SearchableAccountField
                    label='Cuenta de Gastos / Costos (Costo de Ventas)'
                    valueId={formCuentaGastosId}
                    onChange={id => setFormCuentaGastosId(id)}
                    accounts={accounts}
                    badgeColor='#E11D48'
                    helperText='Debe: Se debita al despachar productos o registrar costo directo de ventas.'
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 3: Cuentas de Valoración de Inventario y Costos en Destino */}
            <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl overflow-hidden'>
              <CardContent className='p-6 flex flex-col gap-4'>
                <div className='pb-2 border-b border-[#F3F4F6]'>
                  <Typography variant='h6' className='font-bold text-[#1E1B2E] flex items-center gap-2'>
                    <i className='tabler-packages text-[#6C5CE7]' /> Cuentas de Valoración de Inventario y Costos en Destino
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Rigen los asientos contables automáticos en la recepción física en almacén y el prorrateo de fletes/aranceles aduanales
                  </span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
                  <SearchableAccountField
                    label='Cuenta de Valoración de Inventario'
                    valueId={formCuentaValoracionId}
                    onChange={id => setFormCuentaValoracionId(id)}
                    accounts={accounts}
                    badgeColor='#6C5CE7'
                    helperText='Debe en recepciones y fletes: Activo monetario donde reside el valor del stock.'
                  />

                  <SearchableAccountField
                    label='Cuenta de Costos en Destino / Mercancías en Tránsito'
                    valueId={formCuentaCostosDestinoId}
                    onChange={id => setFormCuentaCostosDestinoId(id)}
                    accounts={accounts}
                    badgeColor='#2563EB'
                    helperText='Haber en prorrateos: Contrapartida puente donde se absorben los fletes y aranceles.'
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna Lateral Informativa */}
          <div className='lg:col-span-4 flex flex-col gap-6'>
            {/* Tarjeta de Resumen y Artículos Asociados */}
            <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl overflow-hidden'>
              <CardContent className='p-5 flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-bold uppercase tracking-wider text-[#6B7280]'>
                    Artículos Vinculados
                  </span>
                  <CustomChip
                    size='small'
                    label={`${usedCount} artículos`}
                    color={usedCount > 0 ? 'primary' : 'default'}
                    variant='tonal'
                  />
                </div>

                {usedCount > 0 ? (
                  <div className='flex flex-col gap-2'>
                    <span className='text-xs text-[#6B7280]'>
                      Los siguientes productos están asignados a esta categoría y heredan su configuración contable:
                    </span>
                    <div className='flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1'>
                      {categoryProducts.slice(0, 6).map(prod => (
                        <div
                          key={prod.id}
                          className='p-2 rounded-xl border border-[#F3F4F6] bg-[#FAFAFC] flex items-center justify-between text-xs'
                        >
                          <span className='font-semibold text-[#1E1B2E] truncate max-w-[190px]'>
                            {prod.name}
                          </span>
                          <span className='text-[10px] font-mono text-[#6C5CE7] bg-[#F5F3FF] px-1.5 py-0.5 rounded'>
                            {prod.variants?.length || 1} var.
                          </span>
                        </div>
                      ))}
                    </div>
                    {categoryProducts.length > 6 && (
                      <span className='text-[11px] text-[#9CA3AF] text-center italic'>
                        y {categoryProducts.length - 6} artículo(s) más...
                      </span>
                    )}
                  </div>
                ) : (
                  <div className='p-4 rounded-xl bg-[#FAFAFC] border border-[#F3F4F6] text-center'>
                    <i className='tabler-box-off text-2xl text-[#9CA3AF] block mb-1' />
                    <span className='text-xs text-[#6B7280]'>
                      Aún no hay artículos vinculados a esta categoría.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tarjeta Informativa de Herencia Contable ERP */}
            <Card className='border border-[#DDD6FE] bg-[#FAF9FF] shadow-xs rounded-2xl overflow-hidden'>
              <CardContent className='p-5 flex flex-col gap-3.5'>
                <div className='flex items-center gap-2 text-[#6C5CE7]'>
                  <i className='tabler-info-circle text-xl' />
                  <span className='font-bold text-sm text-[#1E1B2E]'>
                    Herencia Contable Automática
                  </span>
                </div>

                <span className='text-xs text-[#4C1D95] leading-relaxed'>
                  Al definir las cuentas en la categoría, cualquier producto asociado heredará automáticamente estos códigos en sus asientos contables, evitando configuraciones repetitivas.
                </span>

                <Divider sx={{ borderColor: '#E9D5FF' }} />

                <div className='flex flex-col gap-2 text-xs'>
                  <span className='font-bold text-[#1E1B2E] text-[11px] uppercase tracking-wide'>
                    Ciclo Contable Integrado (VEN-NIF NIC 2):
                  </span>

                  <div className='flex items-start gap-2 p-2 rounded-lg bg-white border border-[#E9D5FF]'>
                    <i className='tabler-trending-up text-[#059669] text-base shrink-0 mt-0.5' />
                    <div>
                      <strong className='text-[#065F46] block text-[11px]'>Facturación de Venta:</strong>
                      <span className='text-[10px] text-[#6B7280]'>CxC Clientes (Debe) ➔ Cuenta de Ingresos (Haber)</span>
                    </div>
                  </div>

                  <div className='flex items-start gap-2 p-2 rounded-lg bg-white border border-[#E9D5FF]'>
                    <i className='tabler-trending-down text-[#E11D48] text-base shrink-0 mt-0.5' />
                    <div>
                      <strong className='text-[#991B1B] block text-[11px]'>Despacho de Almacén:</strong>
                      <span className='text-[10px] text-[#6B7280]'>Costo de Ventas (Debe) ➔ Valoración Inventario (Haber)</span>
                    </div>
                  </div>

                  <div className='flex items-start gap-2 p-2 rounded-lg bg-white border border-[#E9D5FF]'>
                    <i className='tabler-ship text-[#2563EB] text-base shrink-0 mt-0.5' />
                    <div>
                      <strong className='text-[#1E40AF] block text-[11px]'>Costo en Destino (Landed Costs):</strong>
                      <span className='text-[10px] text-[#6B7280]'>Valoración Inventario (Debe) ➔ Costos en Destino (Haber)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    )
  }

  // =========================================================================
  // RENDER: LISTADO DE CATEGORÍAS (LIST VIEW)
  // =========================================================================
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
            startIcon={<i className='tabler-plus text-base' />}
            onClick={handleOpenCreate}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              color: '#FFFFFF',
              fontWeight: 600,
              textTransform: 'none',
              px: 3.5,
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
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
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5' style={{ width: 110 }}>
                    Código Prefijo
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5' style={{ minWidth: 200 }}>
                    Nombre de la Categoría
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5' style={{ minWidth: 280 }}>
                    Cuentas Contables (Odoo / PUC)
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5'>
                    Descripción / Uso
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-center py-2.5' style={{ width: 90 }}>
                    Artículos
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-right py-2.5' style={{ width: 120 }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCategories.map((cat, idx) => {
                  const count = productCountByCategory[cat.name] || 0

                  return (
                    <TableRow
                      key={cat.id}
                      hover
                      onClick={() => handleOpenEdit(cat)}
                      className='border-b border-[#E6E4F0] last:border-none hover:bg-[#FAF9FF] transition-colors cursor-pointer'
                    >
                      <TableCell
                        className='text-center font-mono text-xs text-textSecondary'
                        style={{ width: 28, maxWidth: 28, padding: '6px 4px' }}
                      >
                        {idx + 1}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <CustomChip
                          size='small'
                          label={cat.code}
                          color='primary'
                          variant='tonal'
                          onClick={() => handleOpenEdit(cat)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col'>
                          <Typography variant='body2' className='font-bold text-[#1E1B4B] hover:text-[#6C5CE7] transition-colors'>
                            {cat.name}
                          </Typography>
                          {!cat.isActive && (
                            <span className='text-[10px] text-[#EF4444] font-semibold'>Inactiva</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className='flex flex-col gap-1 py-1'>
                          <div className='flex items-center gap-1.5 flex-wrap'>
                            <span className='text-[10px] uppercase font-bold text-[#6B7280]'>Resultados:</span>
                            <Tooltip title={`Cuenta de Ingresos: ${cat.cuentaIngresosNombre || 'Ingresos por Venta'}`}>
                              <span className='inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'>
                                <i className='tabler-trending-up text-xs' />
                                {cat.cuentaIngresosCodigo || '4.1.01.01'}
                              </span>
                            </Tooltip>
                            <Tooltip title={`Cuenta de Gastos/Costos: ${cat.cuentaGastosNombre || 'Costo de Ventas'}`}>
                              <span className='inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'>
                                <i className='tabler-trending-down text-xs' />
                                {cat.cuentaGastosCodigo || '5.1.01.01'}
                              </span>
                            </Tooltip>
                          </div>
                          {cat.code !== 'SRV' && (
                            <div className='flex items-center gap-1.5 flex-wrap mt-0.5'>
                              <span className='text-[10px] uppercase font-bold text-[#6B7280]'>Inventario:</span>
                              <Tooltip title={`Valoración de Inventario: ${cat.cuentaValoracionInventarioNombre || 'Inventario de Mercancía'}`}>
                                <span className='inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#F5F3FF] text-[#6C5CE7] border border-[#DDD6FE]'>
                                  <i className='tabler-box text-xs' />
                                  {cat.cuentaValoracionInventarioCodigo || '1.1.03.01'}
                                </span>
                              </Tooltip>
                              <Tooltip title={`Cuenta Costos en Destino: ${cat.cuentaCostosDestinoNombre || 'Mercancías en Tránsito / Costos en Destino'}`}>
                                <span className='inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'>
                                  <i className='tabler-ship text-xs' />
                                  {cat.cuentaCostosDestinoCodigo || '1.1.03.02'}
                                </span>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' className='text-textSecondary line-clamp-2'>
                          {cat.description || 'Sin descripción adicional'}
                        </Typography>
                      </TableCell>
                      <TableCell className='text-center' onClick={e => e.stopPropagation()}>
                        <CustomChip
                          size='small'
                          label={`${count} art.`}
                          color={count > 0 ? 'secondary' : 'default'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell className='text-right whitespace-nowrap' onClick={e => e.stopPropagation()}>
                        <div className='flex items-center justify-end gap-1'>
                          <Tooltip title='Editar categoría (Vista Completa)'>
                            <IconButton
                              size='small'
                              onClick={() => handleOpenEdit(cat)}
                              sx={{
                                color: '#6C5CE7',
                                backgroundColor: 'rgba(108, 92, 231, 0.08)',
                                '&:hover': { backgroundColor: 'rgba(108, 92, 231, 0.16)' }
                              }}
                            >
                              <i className='tabler-edit text-base' />
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
