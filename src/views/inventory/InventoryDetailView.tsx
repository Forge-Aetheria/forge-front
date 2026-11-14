'use client'


import React, { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'

import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Switch from '@mui/material/Switch'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import { useBcvRate } from '@/hooks/useBcvRate'

import CustomChip from '@core/components/mui/Chip'

import CustomTextField from '@core/components/mui/TextField'

import type {
  ProductTemplate,
  ProductType,
  ProductVariant,
  SENIAT_VATRate,
  StockMovement,
  ProductInvoicingPolicyOption,
  ProductPurchaseControlOption,
  ProductDeliveryPolicyOption,
  LandedCostSplitMethod
} from '@/types/inventoryTypes'
import {
  getInventoryTemplates,
  getInventoryTemplateById,
  getStockMovements,
  updateProductTemplate,
  deleteProductTemplate,
  calculateFinancials,
  calculateSuggestedPriceFromMargin,
  calculateMarginFromPrice,
  getInventoryFiscalConfig,
  getProductCategories,
  getUnitsOfMeasure,
  createProductCategory,
  createProductTemplate
} from '@/services/inventoryService'
import StockAdjustmentModal from './components/StockAdjustmentModal'

type Props = {
  id: string
}

const DEFAULT_CATEGORIES = [
  'Textil & Indumentaria',
  'Herramientas & Maquinaria',
  'Químicos & Fluidos',
  'Papelería & Oficina',
  'Alimentos & Bebidas',
  'Tecnología & Electrónica',
  'Servicios Profesionales'
]


const InventoryDetailView: React.FC<Props> = ({ id }) => {
  const router = useRouter()
  const isCreate = id === 'create' || id === 'new'

  const [allTemplates, setAllTemplates] = useState<ProductTemplate[]>([])
  const [template, setTemplate] = useState<ProductTemplate | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fiscalEnabled, setFiscalEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  // Editable Form States (Coherencia con ContactDetailView)
  const [name, setName] = useState('')
  const [defaultCode, setDefaultCode] = useState('')
  const [barcode, setBarcode] = useState('')
  const [productType, setProductType] = useState<ProductType>('storable')
  const [categoryOptions, setCategoryOptions] = useState<string[]>(DEFAULT_CATEGORIES)
  const [uomOptions, setUomOptions] = useState<Array<{ code: string; name: string }>>([])
  const [categoryName, setCategoryName] = useState('Herramientas & Maquinaria')
  const [addingQuickCat, setAddingQuickCat] = useState(false)
  const [quickCatName, setQuickCatName] = useState('')
  const [uomCode, setUomCode] = useState('un')
  const [minStock, setMinStock] = useState<number>(5)
  const [canBeSold, setCanBeSold] = useState(true)
  const [canBePurchased, setCanBePurchased] = useState(true)
  const [standardCost, setStandardCost] = useState<number>(0)
  const [targetMargin, setTargetMargin] = useState<number>(30)
  const [basePrice, setBasePrice] = useState<number>(0)
  const [showMarginHelper, setShowMarginHelper] = useState<boolean>(false)
  const [vatRate, setVatRate] = useState<SENIAT_VATRate>('16')
  const [applyISLR, setApplyISLR] = useState(false)
  const [tagsText, setTagsText] = useState('')
  const [notes, setNotes] = useState('')
  const [variants, setVariants] = useState<ProductVariant[]>([])

  // Commercial Policies
  const [invoicingPolicy, setInvoicingPolicy] = useState<ProductInvoicingPolicyOption>('DEFAULT')
  const [purchaseControlPolicy, setPurchaseControlPolicy] = useState<ProductPurchaseControlOption>('DEFAULT')
  const [deliveryPolicy, setDeliveryPolicy] = useState<ProductDeliveryPolicyOption>('DEFAULT')

  // Landed Cost Configuration (for services)
  const [isLandedCost, setIsLandedCost] = useState(false)
  const [defaultSplitMethod, setDefaultSplitMethod] = useState<LandedCostSplitMethod>('BY_QUANTITY')

  // Logística (Informativo)
  const [weight, setWeight] = useState<number>(0)
  const [volume, setVolume] = useState<number>(0)

  // Modals
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const bcvRate = useBcvRate()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      if (isCreate) {
        const [allData, catsData, unitsData] = await Promise.all([
          getInventoryTemplates(),
          getProductCategories(),
          getUnitsOfMeasure()
        ])

        setUomOptions(unitsData.map(u => ({ code: u.code, name: u.name })))

        const fiscal = await getInventoryFiscalConfig()

        setAllTemplates(allData)
        setMovements([])
        setFiscalEnabled(fiscal.enabled)

        if (catsData.length > 0) {
          setCategoryOptions(catsData.map(c => c.name))
          setCategoryName(catsData[0].name)
        }

        const nextNum = String(allData.length + 1).padStart(3, '0')
        const initialSku = `ART-${nextNum}`

        setName('')
        setDefaultCode(initialSku)
        setBarcode('')
        setProductType('storable')
        setUomCode('un')
        setMinStock(5)
        setCanBeSold(true)
        setCanBePurchased(true)
        setStandardCost(10)
        setTargetMargin(30)
        setBasePrice(14.29)
        setVatRate('16')
        setApplyISLR(false)
        setTagsText('')
        setNotes('')
        setInvoicingPolicy('DEFAULT')
        setPurchaseControlPolicy('DEFAULT')
        setDeliveryPolicy('DEFAULT')
        setWeight(0)
        setVolume(0)
        setVariants([
          {
            id: 'var-single',
            templateId: '',
            sku: initialSku,
            barcode: '',
            combinationValues: [],
            costPrice: 10,
            priceExtra: 0,
            physicalStock: 0,
            reservedStock: 0,
            availableStock: 0
          }
        ])
        setTemplate({
          id: 'new',
          name: '',
          defaultCode: initialSku,
          productType: 'storable',
          uomCode: 'un',
          categoryName: catsData[0]?.name || 'Herramientas & Maquinaria',
          tags: [],
          canBeSold: true,
          canBePurchased: true,
          basePrice: 14.29,
          standardCost: 10,
          targetMargin: 30,
          attributes: [],
          variants: []
        } as ProductTemplate)

        return
      }

      const [allData, itemData, movData, catsData, unitsData] = await Promise.all([
        getInventoryTemplates(),
        getInventoryTemplateById(id),
        getStockMovements(id),
        getProductCategories(),
        getUnitsOfMeasure()
      ])

      setUomOptions(unitsData.map(u => ({ code: u.code, name: u.name })))

      const fiscal = await getInventoryFiscalConfig()

      setAllTemplates(allData)
      setTemplate(itemData)
      setMovements(movData)
      setFiscalEnabled(fiscal.enabled)

      if (catsData.length > 0) {
        setCategoryOptions(catsData.map(c => c.name))
      }

      if (itemData) {
        setName(itemData.name)
        setDefaultCode(itemData.defaultCode)
        setBarcode(itemData.barcode || '')
        setProductType(itemData.productType)
        setCategoryName(itemData.categoryName)
        setUomCode(itemData.uomCode)
        setMinStock(itemData.minStock ?? 0)
        setCanBeSold(itemData.canBeSold)
        setCanBePurchased(itemData.canBePurchased)
        setStandardCost(itemData.standardCost)
        setBasePrice(itemData.basePrice)
        const currentMargin = calculateMarginFromPrice(itemData.standardCost, itemData.basePrice)

        setTargetMargin(itemData.targetMargin ?? (currentMargin > 0 ? currentMargin : 30))
        setVatRate(itemData.vatRate || '16')
        setApplyISLR(Boolean(itemData.applyISLR))
        setTagsText((itemData.tags || []).join(', '))
        setNotes(itemData.notes || '')
        setVariants(itemData.variants || [])
        setInvoicingPolicy(itemData.invoicingPolicy || 'DEFAULT')
        setPurchaseControlPolicy(itemData.purchaseControlPolicy || 'DEFAULT')
        setDeliveryPolicy(itemData.deliveryPolicy || 'DEFAULT')
        setIsLandedCost(Boolean(itemData.isLandedCost))
        setDefaultSplitMethod(itemData.defaultSplitMethod || 'BY_QUANTITY')
        setWeight(itemData.weight ?? 0)
        setVolume(itemData.volume ?? 0)
      }
    } catch {
      setToast({ open: true, message: isCreate ? 'Error al inicializar nuevo artículo' : 'Error al cargar el artículo', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id, isCreate])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Cálculo de índices para navegación secuencial
  const currentIndex = allTemplates.findIndex(t => t.id === id)
  const totalTemplates = allTemplates.length
  const prevTemplate = currentIndex > 0 ? allTemplates[currentIndex - 1] : null

  const nextTemplate =
    currentIndex >= 0 && currentIndex < allTemplates.length - 1 ? allTemplates[currentIndex + 1] : null

  const handleCopySKU = () => {
    if (!defaultCode) return
    navigator.clipboard.writeText(defaultCode)
    setToast({ open: true, message: '¡SKU copiado al portapapeles!', severity: 'info' })
  }

  // Precio sugerido según el margen deseado (sin pisar el precio de venta hasta que el usuario lo aplique)
  const suggestedPrice = calculateSuggestedPriceFromMargin(standardCost, targetMargin)
  const suggestedProfit = Math.max(0, suggestedPrice - standardCost)

  const handleApplySuggestedPrice = () => {
    setBasePrice(suggestedPrice)
    setToast({
      open: true,
      message: `Precio sugerido ($${suggestedPrice.toFixed(2)} USD) aplicado`,
      severity: 'info'
    })
  }

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number) => {
    setVariants(prev =>
      prev.map((v, idx) => {
        if (idx !== index) return v
        const updated = { ...v, [field]: value }

        updated.availableStock = Math.max(0, Number(updated.physicalStock) - Number(updated.reservedStock || 0))

        return updated
      })
    )
  }

  const handleAddVariant = () => {
    const masterSku = defaultCode.trim().toUpperCase() || 'SKU'
    const newSku = variants.length === 0 ? masterSku : `${masterSku}-VAR-${variants.length + 1}`

    setVariants(prev => [
      ...prev,
      {
        id: `var-${Date.now()}-${prev.length + 1}`,
        templateId: isCreate ? '' : id,
        sku: newSku,
        barcode: '',
        combinationValues: [],
        costPrice: standardCost,
        priceExtra: 0,
        physicalStock: productType === 'service' ? 0 : 0,
        reservedStock: 0,
        availableStock: 0
      }
    ])
  }

  const handleRemoveVariant = (index: number) => {
    setVariants(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleSaveChanges = async () => {
    if (!name.trim()) {
      setToast({ open: true, message: 'El nombre del artículo es obligatorio', severity: 'error' })

      return
    }

    if (!defaultCode.trim()) {
      setToast({ open: true, message: 'El SKU es obligatorio', severity: 'error' })

      return
    }

    if (!canBeSold && !canBePurchased) {
      setToast({
        open: true,
        message: 'Debe marcar al menos una operación comercial (Venta o Compra)',
        severity: 'error'
      })

      return
    }

    setSaving(true)

    try {
      const parsedTags = tagsText
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      if (isCreate) {
        const payload: Omit<ProductTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
          name: name.trim(),
          defaultCode: defaultCode.trim().toUpperCase(),
          barcode: barcode.trim() || undefined,
          productType,
          categoryName,
          uomCode,
          minStock: productType === 'service' ? 0 : minStock,
          canBeSold,
          canBePurchased,
          standardCost,
          basePrice,
          targetMargin,
          notes: notes.trim() || undefined,
          vatRate,
          applyISLR,
          tags: parsedTags,
          attributes: [],
          variants:
            variants.length > 0
              ? variants.map(v => ({
                  ...v,
                  sku: v.sku.trim().toUpperCase() || defaultCode.trim().toUpperCase()
                }))
              : [
                  {
                    id: `var-${Date.now()}-1`,
                    templateId: '',
                    sku: defaultCode.trim().toUpperCase(),
                    barcode: barcode.trim() || undefined,
                    combinationValues: [],
                    costPrice: standardCost,
                    priceExtra: 0,
                    physicalStock: 0,
                    reservedStock: 0,
                    availableStock: 0
                  }
                ],
          invoicingPolicy: invoicingPolicy === 'DEFAULT' ? undefined : invoicingPolicy,
          purchaseControlPolicy: purchaseControlPolicy === 'DEFAULT' ? undefined : purchaseControlPolicy,
          deliveryPolicy: deliveryPolicy === 'DEFAULT' ? undefined : deliveryPolicy,
          isLandedCost: productType === 'service' ? isLandedCost : false,
          defaultSplitMethod: productType === 'service' && isLandedCost ? defaultSplitMethod : undefined,
          weight: weight > 0 ? weight : undefined,
          volume: volume > 0 ? volume : undefined
        }

        const created = await createProductTemplate(payload)

        setToast({ open: true, message: '¡Artículo registrado exitosamente en el catálogo!', severity: 'success' })
        setTimeout(() => {
          router.push(`/inventory/products/${created.id}`)
        }, 500)

        return
      }

      const updated = await updateProductTemplate(id, {
        name: name.trim(),
        defaultCode: defaultCode.trim().toUpperCase(),
        barcode: barcode.trim() || undefined,
        productType,
        categoryName,
        uomCode,
        minStock: productType === 'service' ? 0 : minStock,
        canBeSold,
        canBePurchased,
        standardCost,
        basePrice,
        targetMargin,
        notes: notes.trim() || undefined,
        vatRate,
        applyISLR,
        tags: parsedTags,
        variants,
        invoicingPolicy: invoicingPolicy === 'DEFAULT' ? undefined : invoicingPolicy,
        purchaseControlPolicy: purchaseControlPolicy === 'DEFAULT' ? undefined : purchaseControlPolicy,
        deliveryPolicy: deliveryPolicy === 'DEFAULT' ? undefined : deliveryPolicy,
        isLandedCost: productType === 'service' ? isLandedCost : false,
        defaultSplitMethod: productType === 'service' && isLandedCost ? defaultSplitMethod : undefined,
        weight: weight > 0 ? weight : undefined,
        volume: volume > 0 ? volume : undefined
      })

      setTemplate(updated)
      setToast({ open: true, message: 'Artículo actualizado exitosamente', severity: 'success' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el artículo'

      setToast({ open: true, message, severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (isCreate) return

    try {
      await deleteProductTemplate(id)
      setToast({ open: true, message: 'Artículo eliminado exitosamente', severity: 'success' })
      setDeleteConfirmOpen(false)
      router.push('/inventory/products')
    } catch {
      setToast({ open: true, message: 'Error al eliminar el artículo', severity: 'error' })
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[350px]'>
        <div className='flex flex-col items-center gap-3'>
          <i className='tabler-loader-2 text-4xl text-[#6C5CE7] animate-spin' />
          <Typography className='text-[#6B7280]'>Cargando ficha del artículo...</Typography>
        </div>
      </div>
    )
  }

  if (!isCreate && !template) {
    return (
      <Card className='p-8 flex flex-col items-center justify-center text-center max-w-xl mx-auto rounded-2xl border border-[#E6E4F0]'>
        <i className='tabler-package-off text-5xl text-[#EF4444] mb-3' />
        <Typography variant='h5' className='font-bold text-[#1E1B2E] mb-2'>
          Artículo no encontrado
        </Typography>
        <Typography className='text-[#6B7280] mb-5'>
          El artículo con identificador &quot;{id}&quot; no existe en el catálogo o fue eliminado.
        </Typography>
        <Button
          component={Link}
          href='/inventory/products'
          variant='contained'
          startIcon={<i className='tabler-arrow-left' />}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            px: 3,
            '&:hover': { backgroundColor: '#5A4AD1' }
          }}
        >
          Volver al Catálogo
        </Button>
      </Card>
    )
  }

  const financials = calculateFinancials(standardCost, basePrice, vatRate, fiscalEnabled, bcvRate)

  const totalPhysical = variants.reduce((acc, v) => acc + Number(v.physicalStock || 0), 0)
  const totalReserved = variants.reduce((acc, v) => acc + Number(v.reservedStock || 0), 0)
  const totalAvailable = variants.reduce((acc, v) => acc + Number(v.availableStock || 0), 0)

  const typeLabel =
    productType === 'storable'
      ? 'Almacenable'
      : productType === 'consumable'
      ? 'Consumible'
      : 'Servicio'

  const typeIcon =
    productType === 'storable'
      ? 'tabler-package'
      : productType === 'consumable'
      ? 'tabler-droplet'
      : 'tabler-briefcase'

  return (
    <div className='flex flex-col gap-6 w-full pb-12'>
      {/* Top Navigation Bar (Coherencia visual exacta con Contactos) */}
      <div className='flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap'>
        {/* Izquierda: Botón Volver + Título limpio */}
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          <Tooltip title='Volver al Catálogo'>
            <Button
              component={Link}
              href='/inventory/products'
              variant='text'
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
          <div className='min-w-0 flex-1'>
            <Tooltip title={isCreate ? 'Nuevo Artículo o Servicio' : (name || 'Artículo')}>
              <Typography variant='h4' className='font-bold text-textPrimary truncate'>
                {isCreate ? 'Nuevo Artículo o Servicio' : (name || 'Artículo')}
              </Typography>
            </Tooltip>
          </div>
        </div>

        {/* Derecha: Paginador secuencial + Cancelar + Guardar Cambios + Eliminar */}
        <div className='flex items-center gap-2.5 shrink-0'>
          {!isCreate && totalTemplates > 0 && (
            <div className='flex items-center gap-1 bg-[var(--mui-palette-action-hover)] px-2 py-0.5 rounded-lg border border-[var(--mui-palette-divider)] shrink-0'>
              <Tooltip title={prevTemplate ? `Anterior: ${prevTemplate.name}` : 'Primer artículo'}>
                <span>
                  <IconButton
                    size='small'
                    disabled={!prevTemplate}
                    onClick={() => prevTemplate && router.push(`/inventory/products/${prevTemplate.id}`)}
                    className='text-primary'
                  >
                    <i className='tabler-chevron-left text-base' />
                  </IconButton>
                </span>
              </Tooltip>

              <Typography variant='caption' className='font-semibold text-textPrimary select-none px-1 font-mono'>
                {currentIndex + 1} / {totalTemplates}
              </Typography>

              <Tooltip title={nextTemplate ? `Siguiente: ${nextTemplate.name}` : 'Último artículo'}>
                <span>
                  <IconButton
                    size='small'
                    disabled={!nextTemplate}
                    onClick={() => nextTemplate && router.push(`/inventory/products/${nextTemplate.id}`)}
                    className='text-primary'
                  >
                    <i className='tabler-chevron-right text-base' />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          )}

          {/* Cancelar */}
          <Button
            component={Link}
            href='/inventory/products'
            variant='outlined'
            color='secondary'
            size='small'
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

          {/* Guardar Cambios */}
          <Button
            variant='contained'
            color='primary'
            size='small'
            onClick={handleSaveChanges}
            disabled={saving}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
            startIcon={<i className={saving ? 'tabler-loader-2 animate-spin text-base' : 'tabler-device-floppy text-base'} />}
          >
            {saving ? 'Guardando...' : isCreate ? 'Crear Artículo' : 'Guardar'}
          </Button>

          {/* Eliminar (solo en edición) */}
          {!isCreate && (
            <Tooltip title='Eliminar artículo'>
              <IconButton
                size='small'
                color='error'
                onClick={() => setDeleteConfirmOpen(true)}
                className='shrink-0'
              >
                <i className='tabler-trash text-lg' />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Main Grid a 2 Columnas (Exactamente como Contactos: 4 izquierda / 8 derecha) */}
      <Grid container spacing={6}>
        {/* Columna Izquierda: Tarjeta Resumen & Existencias */}
        <Grid size={{ xs: 12, md: 4 }}>
          <div className='space-y-4'>
            <Card
              sx={{
                borderRadius: '20px',
                border: '1px solid #E6E4F0',
                backgroundColor: '#FFFFFF',
                p: 3,
                boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
              }}
            >
              <div className='flex items-center gap-3 mb-4'>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: productType === 'storable' ? '#F3F0FF' : productType === 'consumable' ? '#FFFBEB' : '#EFF6FF',
                    color: productType === 'storable' ? '#6C5CE7' : productType === 'consumable' ? '#D97706' : '#2563EB',
                    border:
                      productType === 'storable'
                        ? '1px solid #E9D5FF'
                        : productType === 'consumable'
                        ? '1px solid #FDE68A'
                        : '1px solid #BFDBFE'
                  }}
                >
                  <i className={`${typeIcon} text-2xl`} />
                </Avatar>
                <div>
                  <div className='flex items-center gap-1.5'>
                    <span className='font-mono font-bold text-sm text-[#6C5CE7]'>{defaultCode || 'SIN-SKU'}</span>
                    <Tooltip title='Copiar SKU'>
                      <IconButton size='small' onClick={handleCopySKU} sx={{ p: 0.5 }}>
                        <i className='tabler-copy text-xs text-[#6B7280]' />
                      </IconButton>
                    </Tooltip>
                  </div>
                  <Typography variant='caption' className='text-[#6B7280] block'>
                    {typeLabel} · UdM: {uomCode} · {categoryName}
                  </Typography>
                </div>
              </div>

              <Typography variant='subtitle1' className='font-bold text-[#1E1B2E] mb-3'>
                Resumen de Precios y Margen
              </Typography>
              <div className='space-y-3 text-sm'>
                <div className='flex items-center gap-2.5'>
                  <div className='w-8 h-8 rounded-full bg-[#F3F0FF] flex items-center justify-center text-[#6C5CE7] shrink-0'>
                    <i className='tabler-coin text-base' />
                  </div>
                  <div className='flex-1 flex justify-between items-center'>
                    <div>
                      <Typography variant='caption' className='text-[#6B7280] block'>
                        Precio Base (Sin IVA)
                      </Typography>
                      <span className='font-mono font-bold text-[#1E1B2E]'>
                        ${financials.netPrice.toFixed(2)} USD
                      </span>
                    </div>
                    <span className='font-mono text-xs text-[#6B7280]'>
                      Bs. {financials.netPriceVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className='flex items-center gap-2.5'>
                  <div className='w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center text-[#16A34A] shrink-0'>
                    <i className='tabler-chart-arrows-vertical text-base' />
                  </div>
                  <div className='flex-1 flex justify-between items-center'>
                    <div>
                      <Typography variant='caption' className='text-[#6B7280] block'>
                        Margen de Rentabilidad
                      </Typography>
                      <span className='font-mono font-bold text-[#16A34A]'>
                        {financials.marginPercentage.toFixed(1)}% (+${financials.marginAmount.toFixed(2)})
                      </span>
                    </div>
                    <CustomChip
                      size='small'
                      label={
                        financials.marginPercentage >= 30
                          ? 'Óptimo'
                          : financials.marginPercentage >= 15
                          ? 'Moderado'
                          : 'Bajo'
                      }
                      color={
                        financials.marginPercentage >= 30
                          ? 'success'
                          : financials.marginPercentage >= 15
                          ? 'warning'
                          : 'error'
                      }
                      variant='tonal'
                    />
                  </div>
                </div>
              </div>

              {productType !== 'service' && (
                <>
                  <Divider className='my-4' />

                  <div className='flex items-center justify-between mb-3'>
                    <Typography variant='subtitle1' className='font-bold text-[#1E1B2E]'>
                      Existencias Consolidadas
                    </Typography>
                  </div>

                  <div className='grid grid-cols-3 gap-2 text-center bg-[#F8F7FA] p-2.5 rounded-xl border border-[#E6E4F0]'>
                    <div>
                      <Typography variant='caption' className='text-[#6B7280] block'>
                        Físico
                      </Typography>
                      <span className='font-mono font-bold text-sm text-[#1E1B2E]'>
                        {totalPhysical} {uomCode}
                      </span>
                    </div>
                    <div className='border-x border-[#E6E4F0]'>
                      <Typography variant='caption' className='text-[#6B7280] block'>
                        Reservado
                      </Typography>
                      <span className='font-mono font-bold text-sm text-warning'>
                        {totalReserved} {uomCode}
                      </span>
                    </div>
                    <div>
                      <Typography variant='caption' className='text-[#6B7280] block'>
                        Disponible
                      </Typography>
                      <span className='font-mono font-bold text-sm text-success'>
                        {totalAvailable} {uomCode}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* Clasificación en el Sistema */}
            <Card
              sx={{
                borderRadius: '20px',
                border: '1px solid #E6E4F0',
                backgroundColor: '#FFFFFF',
                p: 3,
                boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
              }}
            >
              <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] mb-2'>
                Clasificación en el Sistema
              </Typography>
              <div className='space-y-1.5 text-xs text-[#6B7280]'>
                <div className='flex justify-between py-1 border-b border-[#F4F3F8]'>
                  <span>SKU:</span>
                  <span className='font-semibold text-[#1E1B2E] font-mono'>{defaultCode}</span>
                </div>
                <div className='flex justify-between py-1 border-b border-[#F4F3F8]'>
                  <span>Código EAN / Barras:</span>
                  <span className='font-semibold text-[#1E1B2E] font-mono'>{barcode || 'No asignado'}</span>
                </div>
                <div className='flex justify-between py-1 border-b border-[#F4F3F8]'>
                  <span>Operación Comercial:</span>
                  <span className='font-semibold text-[#1E1B2E]'>
                    {[canBeSold && 'Venta', canBePurchased && 'Compra'].filter(Boolean).join(' / ') || 'Ninguna'}
                  </span>
                </div>
                {fiscalEnabled && (
                  <div className='flex justify-between py-1 border-b border-[#F4F3F8]'>
                    <span>Alícuota Fiscal SENIAT:</span>
                    <span className='font-semibold text-[#6C5CE7] font-mono'>
                      {financials.taxLabel || '0%'} (PVP: ${financials.totalPriceWithTax.toFixed(2)})
                    </span>
                  </div>
                )}
                <div className='flex justify-between py-1 border-b border-[#F4F3F8]'>
                  <span>Variantes Activas:</span>
                  <span className='font-semibold text-[#1E1B2E]'>{variants.length} SKUs</span>
                </div>
                <div className='flex justify-between py-1'>
                  <span>Movimientos Kárdex:</span>
                  <span className='font-semibold text-[#1E1B2E]'>{movements.length} asientos</span>
                </div>
              </div>
            </Card>
          </div>
        </Grid>

        {/* Columna Derecha: Pestañas de Gestión Detallada (Igual que ContactDetailView) */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
              overflow: 'hidden'
            }}
          >
            {/* Cabecera de Pestañas */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                borderBottom: '1px solid #E6E4F0',
                px: 3,
                pt: 1,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  minHeight: 48
                },
                '& .Mui-selected': {
                  color: '#6C5CE7 !important'
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#6C5CE7'
                }
              }}
            >
              <Tab icon={<i className='tabler-id text-lg mr-1.5' />} iconPosition='start' label='Información General' />
              <Tab icon={<i className='tabler-box-seam text-lg mr-1.5' />} iconPosition='start' label='Inventario' />
              <Tab
                icon={<i className='tabler-layers-subtract text-lg mr-1.5' />}
                iconPosition='start'
                label={`Variantes y Stock (${variants.length})`}
              />
              <Tab
                icon={<i className='tabler-arrows-transfer-down text-lg mr-1.5' />}
                iconPosition='start'
                label={`Kárdex del Artículo (${movements.length})`}
              />
            </Tabs>

            <CardContent className='p-6'>
              {/* PESTAÑA 0: INFORMACIÓN GENERAL, CALCULADORA DE MARGEN Y FISCAL */}
              {activeTab === 0 && (
                <div className='space-y-6'>
                  {/* Selector de Tipo de Artículo (Píldoras idénticas a Tipo de Entidad en Contactos) */}
                  <div>
                    <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] mb-2'>
                      Tipo de Artículo
                    </Typography>
                    <div className='flex gap-3 flex-wrap'>
                      <Button
                        variant={productType === 'storable' ? 'contained' : 'outlined'}
                        onClick={() => setProductType('storable')}
                        startIcon={<i className='tabler-package' />}
                        sx={{
                          flex: 1,
                          minWidth: 150,
                          borderRadius: '9999px',
                          backgroundColor: productType === 'storable' ? '#6C5CE7' : 'transparent',
                          borderColor: productType === 'storable' ? '#6C5CE7' : '#DCD8EC',
                          color: productType === 'storable' ? '#FFFFFF' : '#1E1B2E',
                          fontWeight: 600,
                          '&:hover': { backgroundColor: productType === 'storable' ? '#5A4AD1' : '#F4F3F8' }
                        }}
                      >
                        Almacenable
                      </Button>
                      <Button
                        variant={productType === 'consumable' ? 'contained' : 'outlined'}
                        onClick={() => setProductType('consumable')}
                        startIcon={<i className='tabler-droplet' />}
                        sx={{
                          flex: 1,
                          minWidth: 150,
                          borderRadius: '9999px',
                          backgroundColor: productType === 'consumable' ? '#6C5CE7' : 'transparent',
                          borderColor: productType === 'consumable' ? '#6C5CE7' : '#DCD8EC',
                          color: productType === 'consumable' ? '#FFFFFF' : '#1E1B2E',
                          fontWeight: 600,
                          '&:hover': { backgroundColor: productType === 'consumable' ? '#5A4AD1' : '#F4F3F8' }
                        }}
                      >
                        Consumible
                      </Button>
                      <Button
                        variant={productType === 'service' ? 'contained' : 'outlined'}
                        onClick={() => setProductType('service')}
                        startIcon={<i className='tabler-briefcase' />}
                        sx={{
                          flex: 1,
                          minWidth: 150,
                          borderRadius: '9999px',
                          backgroundColor: productType === 'service' ? '#6C5CE7' : 'transparent',
                          borderColor: productType === 'service' ? '#6C5CE7' : '#DCD8EC',
                          color: productType === 'service' ? '#FFFFFF' : '#1E1B2E',
                          fontWeight: 600,
                          '&:hover': { backgroundColor: productType === 'service' ? '#5A4AD1' : '#F4F3F8' }
                        }}
                      >
                        Servicio
                      </Button>
                    </div>

                    {productType === 'service' && (
                      <div className='p-3.5 rounded-2xl border border-[#E6E4F0] bg-[#FFFFFF] flex flex-col gap-3 mt-3'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2.5'>
                            <div className='w-8 h-8 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center text-[#6C5CE7] shrink-0'>
                              <i className='tabler-calculator text-base' />
                            </div>
                            <div>
                              <span className='font-bold text-xs text-[#1E1B2E] block'>Es un Costo en Destino (Landed Cost)</span>
                              <span className='text-[11px] text-[#6B7280]'>
                                Prorratea fletes, seguros o aranceles sobre recepciones de almacén para recalcular el costo promedio (AVCO)
                              </span>
                            </div>
                          </div>
                          <Switch
                            checked={isLandedCost}
                            onChange={e => {
                              setIsLandedCost(e.target.checked)

                              if (e.target.checked) {
                                setCanBePurchased(true)
                              }
                            }}
                            size='small'
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C5CE7' },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6C5CE7' }
                            }}
                          />
                        </div>

                        {isLandedCost && (
                          <div className='pt-2.5 border-t border-[#E6E4F0] flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between'>
                            <span className='text-xs text-[#1E1B2E] font-medium'>Método de Reparto Predeterminado:</span>
                            <CustomTextField
                              select
                              size='small'
                              value={defaultSplitMethod}
                              onChange={e => setDefaultSplitMethod(e.target.value as LandedCostSplitMethod)}
                              sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            >
                              <MenuItem value='BY_QUANTITY'>Por Cantidad Recibida</MenuItem>
                              <MenuItem value='BY_COST'>Por Valor / Costo de Compra</MenuItem>
                              <MenuItem value='BY_WEIGHT'>Por Peso Total</MenuItem>
                              <MenuItem value='BY_VOLUME'>Por Volumen Total</MenuItem>
                              <MenuItem value='EQUAL'>En Partes Iguales</MenuItem>
                            </CustomTextField>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Operación Comercial (Checkboxes idénticos a Relación Comercial en Contactos) */}
                  <div>
                    <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] mb-1'>
                      Operación Comercial Permitida
                    </Typography>
                    <div className='flex gap-4 flex-wrap'>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={canBeSold}
                            onChange={e => setCanBeSold(e.target.checked)}
                            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                          />
                        }
                        label={<span className='text-sm font-medium text-[#1E1B2E]'>Puede Venderse (Facturación / POS)</span>}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={canBePurchased}
                            onChange={e => setCanBePurchased(e.target.checked)}
                            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                          />
                        }
                        label={<span className='text-sm font-medium text-[#1E1B2E]'>Puede Comprarse (Órdenes de Compra)</span>}
                      />
                    </div>
                  </div>

                  <Divider />

                  {/* Campos Principales */}
                  <Grid container spacing={4}>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <CustomTextField
                        fullWidth
                        label='Nombre Oficial del Artículo *'
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder='Ej. Taladro Percutor Industrial 850W'
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        fullWidth
                        label='SKU *'
                        value={defaultCode}
                        onChange={e => setDefaultCode(e.target.value.toUpperCase())}
                        placeholder='Ej. HER-TAL-850'
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      {addingQuickCat ? (
                        <div className='flex items-end gap-1'>
                          <CustomTextField
                            fullWidth
                            autoFocus
                            label='Nueva Categoría'
                            placeholder='Nombre de categoría...'
                            value={quickCatName}
                            onChange={e => setQuickCatName(e.target.value)}
                            onKeyDown={async e => {
                              if (e.key === 'Enter' && quickCatName.trim()) {
                                e.preventDefault()
                                const created = await createProductCategory({ name: quickCatName.trim() })

                                setCategoryOptions(prev => [...prev, created.name])
                                setCategoryName(created.name)
                                setQuickCatName('')
                                setAddingQuickCat(false)
                                setToast({
                                  open: true,
                                  message: `Categoría "${created.name}" creada`,
                                  severity: 'success'
                                })
                              }
                            }}
                          />
                          <IconButton
                            size='small'
                            onClick={async () => {
                              if (!quickCatName.trim()) return
                              const created = await createProductCategory({ name: quickCatName.trim() })

                              setCategoryOptions(prev => [...prev, created.name])
                              setCategoryName(created.name)
                              setQuickCatName('')
                              setAddingQuickCat(false)
                              setToast({
                                open: true,
                                message: `Categoría "${created.name}" creada`,
                                severity: 'success'
                              })
                            }}
                            sx={{ mb: 0.5, bgcolor: '#6C5CE7', color: '#fff', '&:hover': { bgcolor: '#5A4AD1' } }}
                          >
                            <i className='tabler-check text-sm' />
                          </IconButton>
                          <IconButton size='small' onClick={() => setAddingQuickCat(false)} sx={{ mb: 0.5 }}>
                            <i className='tabler-x text-sm' />
                          </IconButton>
                        </div>
                      ) : (
                        <div className='flex items-end gap-1'>
                          <CustomTextField
                            select
                            fullWidth
                            label='Categoría'
                            value={categoryName}
                            onChange={e => setCategoryName(e.target.value)}
                          >
                            {Array.from(new Set([...categoryOptions, categoryName])).map(cat => (
                              <MenuItem key={cat} value={cat}>
                                {cat}
                              </MenuItem>
                            ))}
                          </CustomTextField>
                          <IconButton
                            size='small'
                            title='Crear nueva categoría'
                            onClick={() => setAddingQuickCat(true)}
                            sx={{
                              mb: 0.5,
                              border: '1px solid #E6E4F0',
                              bgcolor: '#FFFFFF',
                              color: '#6C5CE7'
                            }}
                          >
                            <i className='tabler-plus text-sm' />
                          </IconButton>
                        </div>
                      )}
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        select
                        fullWidth
                        label='Unidad de Medida (UdM)'
                        value={uomCode}
                        onChange={e => setUomCode(e.target.value)}
                      >
                        {uomOptions.map(u => (
                          <MenuItem key={u.code} value={u.code}>
                            {u.name}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        fullWidth
                        label='Código de Barras (EAN / UPC)'
                        value={barcode}
                        onChange={e => setBarcode(e.target.value)}
                        placeholder='7591234567890'
                      />
                    </Grid>

                    {productType !== 'service' && (
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <CustomTextField
                          fullWidth
                          type='number'
                          label='Stock Mínimo de Alerta'
                          value={minStock}
                          onChange={e => setMinStock(Math.max(0, Number(e.target.value)))}
                        />
                      </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: productType !== 'service' ? 8 : 12 }}>
                      <CustomTextField
                        fullWidth
                        label='Etiquetas (separadas por coma)'
                        value={tagsText}
                        onChange={e => setTagsText(e.target.value)}
                        placeholder='importado, alta rotación, ferretería'
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <CustomTextField
                        fullWidth
                        multiline
                        minRows={2}
                        label='Nota / Información adicional del producto'
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder='Especificaciones técnicas, observaciones de almacén, proveedor habitual o cualquier información relevante...'
                      />
                    </Grid>
                  </Grid>

                  <Divider />

                  {/* Campos Normales de Costo, Precio de Venta y Margen */}
                  <div className='space-y-4'>
                    <Typography variant='subtitle2' className='font-bold text-[#1E1B2E]'>
                      Costo y Precio de Venta
                    </Typography>

                    <Grid container spacing={4} alignItems='flex-start'>
                      <Grid size={{ xs: 12, sm: fiscalEnabled ? 4 : 6 }}>
                        <CustomTextField
                          fullWidth
                          type='number'
                          label='Costo del Producto ($ USD) *'
                          value={standardCost === 0 ? '' : standardCost}
                          placeholder='0.00'
                          onChange={e => setStandardCost(Math.max(0, parseFloat(e.target.value) || 0))}
                          helperText={`≈ Bs. ${(standardCost * bcvRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: fiscalEnabled ? 4 : 6 }}>
                        <CustomTextField
                          fullWidth
                          type='number'
                          label='Precio de Venta ($ USD) *'
                          value={basePrice === 0 ? '' : basePrice}
                          placeholder='0.00'
                          onChange={e => setBasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          helperText={
                            fiscalEnabled
                              ? `Con IVA (${financials.taxLabel || '0%'}): $${financials.totalPriceWithTax.toFixed(2)} (Bs. ${financials.totalPriceWithTaxVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })})`
                              : `≈ Bs. ${(basePrice * bcvRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`
                          }
                        />
                      </Grid>

                      {fiscalEnabled && (
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <CustomTextField
                            select
                            fullWidth
                            label='Alícuota IVA (SENIAT)'
                            value={vatRate}
                            onChange={e => setVatRate(e.target.value as SENIAT_VATRate)}
                          >
                            <MenuItem value='16'>IVA General (16%)</MenuItem>
                            <MenuItem value='8'>IVA Reducido (8%)</MenuItem>
                            <MenuItem value='EXEMPT'>Exento (0%)</MenuItem>
                          </CustomTextField>
                        </Grid>
                      )}
                    </Grid>

                    {/* Indicador sencillo de Margen Actual + Opción de activar sugerencia de precio */}
                    <div className='flex items-center justify-between flex-wrap gap-3 px-4 py-3 rounded-xl bg-[#F8F7FA] border border-[#E6E4F0]'>
                      <div className='flex items-center gap-2.5 flex-wrap'>
                        <span className='text-xs text-[#6B7280] font-medium'>Margen actual:</span>
                        <CustomChip
                          size='small'
                          label={`${financials.marginPercentage.toFixed(1)}% (${financials.marginAmount >= 0 ? '+' : ''}$${financials.marginAmount.toFixed(2)} USD)`}
                          color={
                            financials.marginPercentage >= 30
                              ? 'success'
                              : financials.marginPercentage >= 15
                              ? 'warning'
                              : 'error'
                          }
                          variant='tonal'
                        />
                      </div>

                      <FormControlLabel
                        control={
                          <Checkbox
                            size='small'
                            checked={showMarginHelper}
                            onChange={e => setShowMarginHelper(e.target.checked)}
                            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                          />
                        }
                        label={
                          <span className='text-xs font-semibold text-[#6C5CE7] cursor-pointer'>
                            Calcular precio sugerido según margen deseado
                          </span>
                        }
                      />
                    </div>

                    {/* Panel opcional desplegable solo cuando el usuario activa la sugerencia */}
                    {showMarginHelper && (
                      <div className='p-4 rounded-xl bg-[#F4F3FF]/60 border border-[#DCD8EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                        <div className='flex items-center gap-3 flex-wrap'>
                          <div style={{ width: 155 }}>
                            <CustomTextField
                              size='small'
                              type='number'
                              label='Margen deseado (%)'
                              placeholder='0'
                              value={targetMargin === 0 ? '' : targetMargin}
                              onChange={e =>
                                setTargetMargin(Math.max(0, parseFloat(e.target.value) || 0))
                              }
                            />
                          </div>

                          <div className='flex items-center gap-1 flex-wrap pt-3'>
                            {[25, 35, 50, 100].map(preset => (
                              <CustomChip
                                key={preset}
                                label={`${preset}%`}
                                size='small'
                                onClick={() => setTargetMargin(preset)}
                                color={Math.round(targetMargin) === preset ? 'primary' : 'secondary'}
                                variant='tonal'
                              />
                            ))}
                          </div>
                        </div>

                        <div className='flex items-center gap-3 flex-wrap justify-end'>
                          <div className='text-right'>
                            <span className='text-[11px] text-[#6B7280] block'>
                              Precio sugerido ({targetMargin}% margen):
                            </span>
                            <span className='font-mono font-bold text-base text-[#1E1B2E]'>
                              ${suggestedPrice.toFixed(2)} USD{' '}
                              <span className='text-xs font-normal text-success'>
                                (+${suggestedProfit.toFixed(2)})
                              </span>
                            </span>
                          </div>

                          <Button
                            variant='contained'
                            size='small'
                            onClick={handleApplySuggestedPrice}
                            startIcon={<i className='tabler-check text-sm' />}
                            sx={{
                              borderRadius: '9999px',
                              backgroundColor: '#6C5CE7',
                              textTransform: 'none',
                              fontWeight: 600,
                              '&:hover': { backgroundColor: '#5A4AD1' }
                            }}
                          >
                            Aplicar precio
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA 1: INVENTARIO (LOGÍSTICA, POLÍTICAS Y ALMACENAMIENTO) */}
              {activeTab === 1 && (
                <div className='space-y-6'>
                  {/* Tarjeta 1: Logística */}
                  <div className='space-y-4'>
                    <div>
                      <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] flex items-center gap-1.5'>
                        <i className='tabler-truck text-[#6C5CE7] text-lg' /> Logística
                      </Typography>
                      <Typography variant='caption' className='text-[#6B7280] block mt-0.5'>
                        Información física del producto para envíos, cubicaje y almacenamiento.
                      </Typography>
                    </div>

                    <Grid container spacing={4} alignItems='flex-start'>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          type='number'
                          label='Peso (kg)'
                          placeholder='0.00'
                          value={weight === 0 ? '' : weight}
                          onChange={e => setWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                          helperText='Peso unitario del producto para control de carga y envíos'
                          InputProps={{
                            endAdornment: <span className='text-xs text-[#6B7280] font-medium'>kg</span>
                          }}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          type='number'
                          label='Volumen (m³)'
                          placeholder='0.000'
                          value={volume === 0 ? '' : volume}
                          onChange={e => setVolume(Math.max(0, parseFloat(e.target.value) || 0))}
                          helperText='Volumen cúbico para transporte y estanterías'
                          InputProps={{
                            endAdornment: <span className='text-xs text-[#6B7280] font-medium'>m³</span>
                          }}
                        />
                      </Grid>
                    </Grid>
                  </div>

                  <Divider />

                  {/* Tarjeta 2: Políticas de Facturación y Entrega */}
                  <div className='space-y-4'>
                    <div>
                      <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] flex items-center gap-1.5'>
                        <i className='tabler-clipboard-check text-[#6C5CE7] text-lg' /> Políticas de Facturación y Entrega
                      </Typography>
                      <Typography variant='caption' className='text-[#6B7280] block mt-0.5'>
                        Configura el comportamiento de despacho en almacén y facturación. Si no tiene valor, tomará la política configurada en el sistema.
                      </Typography>
                    </div>

                    <Grid container spacing={4} alignItems='flex-start'>
                      {/* 1. Política de Entrega / Despacho */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <CustomTextField
                          select
                          fullWidth
                          label='Política de Entrega / Despacho'
                          value={deliveryPolicy === 'DEFAULT' ? '' : deliveryPolicy}
                          onChange={e => setDeliveryPolicy((e.target.value || 'DEFAULT') as ProductDeliveryPolicyOption)}
                          helperText='Si no tiene valor, tomará la política configurada en el sistema'
                        >
                          <MenuItem value=''>
                            <em>Sin especificar</em>
                          </MenuItem>
                          <MenuItem value='PARTIAL'>Permitir Entregas Parciales</MenuItem>
                          <MenuItem value='ALL_AT_ONCE'>Entregar Todos a la Vez</MenuItem>
                        </CustomTextField>
                      </Grid>

                      {/* 2. Política de Facturación (Ventas) */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <CustomTextField
                          select
                          fullWidth
                          label='Política de Facturación (Ventas)'
                          value={invoicingPolicy === 'DEFAULT' ? '' : invoicingPolicy}
                          onChange={e => setInvoicingPolicy((e.target.value || 'DEFAULT') as ProductInvoicingPolicyOption)}
                          helperText='Si no tiene valor, tomará la política configurada en el sistema'
                        >
                          <MenuItem value=''>
                            <em>Sin especificar</em>
                          </MenuItem>
                          <MenuItem value='ORDERED'>Cantidades Pedidas</MenuItem>
                          <MenuItem value='DELIVERED'>Cantidades Entregadas</MenuItem>
                        </CustomTextField>
                      </Grid>

                      {/* 3. Política de Control (Compras) */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <CustomTextField
                          select
                          fullWidth
                          label='Política de Control (Compras)'
                          value={purchaseControlPolicy === 'DEFAULT' ? '' : purchaseControlPolicy}
                          onChange={e => setPurchaseControlPolicy((e.target.value || 'DEFAULT') as ProductPurchaseControlOption)}
                          helperText='Si no tiene valor, tomará la política configurada en el sistema'
                        >
                          <MenuItem value=''>
                            <em>Sin especificar</em>
                          </MenuItem>
                          <MenuItem value='ORDERED'>Cantidades Pedidas</MenuItem>
                          <MenuItem value='RECEIVED'>Cantidades Recibidas</MenuItem>
                        </CustomTextField>
                      </Grid>
                    </Grid>

                    {/* Banner informativo de trazabilidad */}
                    <div className='p-3.5 rounded-xl bg-[#F8F7FA] border border-[#E6E4F0] flex items-center gap-3'>
                      <div className='w-8 h-8 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center shrink-0 text-[#6C5CE7]'>
                        <i className='tabler-info-circle text-base' />
                      </div>
                      <div className='text-xs text-[#6B7280] leading-relaxed'>
                        <span className='font-semibold text-[#1E1B2E]'>Trazabilidad Operacional: </span>
                        Al procesar ventas o compras de este producto, el sistema evaluará automáticamente las entregas y recepciones de almacén antes de habilitar la emisión o registro de facturas.
                      </div>
                    </div>
                  </div>

                  <Divider />

                  {/* Tarjeta 3: Almacenamiento y Reposición */}
                  <div className='space-y-4'>
                    <div>
                      <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] flex items-center gap-1.5'>
                        <i className='tabler-building-warehouse text-[#6C5CE7] text-lg' /> Almacenamiento y Reposición
                      </Typography>
                      <Typography variant='caption' className='text-[#6B7280] block mt-0.5'>
                        Parámetros de stock mínimo para alertas y reposición de almacén.
                      </Typography>
                    </div>

                    <Grid container spacing={4} alignItems='flex-start'>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          type='number'
                          label='Stock Mínimo de Seguridad'
                          value={minStock === 0 ? '' : minStock}
                          placeholder='0'
                          onChange={e => setMinStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          helperText='Nivel umbral para alertas de reabastecimiento en almacén'
                          disabled={productType === 'service'}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <div className='p-3.5 rounded-xl bg-[#F8F7FA] border border-[#E6E4F0] flex items-center justify-between'>
                          <div>
                            <span className='text-xs text-[#6B7280] block font-medium'>Stock Físico Consolidado</span>
                            <span className='text-lg font-bold text-[#1E1B2E] font-mono'>
                              {variants.reduce((acc, v) => acc + (v.physicalStock || 0), 0)} {uomCode}
                            </span>
                          </div>
                          <div className='text-right'>
                            <span className='text-xs text-[#6B7280] block font-medium'>Disponible para Venta</span>
                            <span className='text-lg font-bold text-success font-mono'>
                              {variants.reduce((acc, v) => acc + (v.availableStock || 0), 0)} {uomCode}
                            </span>
                          </div>
                        </div>
                      </Grid>
                    </Grid>
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: MATRIZ DE VARIANTES */}
              {activeTab === 2 && (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between flex-wrap gap-2'>
                    <div>
                      <Typography variant='subtitle1' className='font-bold text-[#1E1B2E]'>
                        Variantes Físicas y SKUs Específicos
                      </Typography>
                      <Typography variant='caption' className='text-[#6B7280]'>
                        Edite el SKU, sobreprecio o stock de cada variante y presione &quot;Guardar&quot; arriba
                      </Typography>
                    </div>
                    <Button
                      size='small'
                      variant='outlined'
                      startIcon={<i className='tabler-plus text-base' />}
                      onClick={handleAddVariant}
                      sx={{ borderRadius: '9999px', textTransform: 'none', fontWeight: 600 }}
                    >
                      Añadir Variante
                    </Button>
                  </div>

                  <div className='overflow-x-auto border border-[#E6E4F0] rounded-xl'>
                    <Table size='small'>
                      <TableHead className='bg-[#F8F7FA]'>
                        <TableRow>
                          <TableCell
                            className='font-bold text-xs text-center'
                            style={{ width: 28, maxWidth: 28, padding: '8px 4px' }}
                          >
                            #
                          </TableCell>
                          <TableCell className='font-bold text-xs'>Combinación / Variante</TableCell>
                          <TableCell className='font-bold text-xs'>SKU Específico</TableCell>
                          <TableCell className='font-bold text-xs text-right'>Sobreprecio ($)</TableCell>
                          <TableCell className='font-bold text-xs text-center'>Stock Físico</TableCell>
                          <TableCell className='font-bold text-xs text-center'>Disponible</TableCell>
                          <TableCell className='font-bold text-xs text-right'>Precio Final</TableCell>
                          <TableCell className='font-bold text-xs text-center' style={{ width: 60 }}>
                            Acciones
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {variants.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className='text-center py-6 text-[#6B7280]'>
                              <Typography variant='body2' className='mb-2'>
                                No hay variantes específicas configuradas (se gestiona como artículo estándar único).
                              </Typography>
                              <Button
                                size='small'
                                variant='outlined'
                                startIcon={<i className='tabler-plus' />}
                                onClick={handleAddVariant}
                                sx={{ borderRadius: '9999px', textTransform: 'none' }}
                              >
                                Añadir Variante
                              </Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          variants.map((v, idx) => {
                            const finalPrice = basePrice + Number(v.priceExtra || 0)

                            return (
                              <TableRow key={v.id || idx} hover>
                                <TableCell
                                  className='text-center font-mono text-xs text-[#6B7280]'
                                  style={{ width: 28, maxWidth: 28, padding: '6px 4px' }}
                                >
                                  {idx + 1}
                                </TableCell>
                                <TableCell className='text-xs font-medium text-[#1E1B2E]'>
                                  {v.combinationValues.length > 0
                                    ? v.combinationValues.map(c => `${c.attributeName}: ${c.valueName}`).join(' · ')
                                    : 'Estándar (Única)'}
                                </TableCell>
                                <TableCell>
                                  <CustomTextField
                                    size='small'
                                    value={v.sku}
                                    onChange={e => handleVariantChange(idx, 'sku', e.target.value.toUpperCase())}
                                  />
                                </TableCell>
                                <TableCell align='right' style={{ width: 120 }}>
                                  <CustomTextField
                                    size='small'
                                    type='number'
                                    value={v.priceExtra}
                                    onChange={e => handleVariantChange(idx, 'priceExtra', parseFloat(e.target.value) || 0)}
                                  />
                                </TableCell>
                                <TableCell align='center' style={{ width: 110 }}>
                                  <CustomTextField
                                    size='small'
                                    type='number'
                                    disabled={productType === 'service'}
                                    value={v.physicalStock}
                                    onChange={e =>
                                      handleVariantChange(idx, 'physicalStock', Math.max(0, parseInt(e.target.value, 10) || 0))
                                    }
                                  />
                                </TableCell>
                                <TableCell className='text-center font-mono text-xs font-bold text-success'>
                                  {v.availableStock} {uomCode}
                                </TableCell>
                                <TableCell className='text-right font-mono text-xs font-bold text-[#1E1B2E]'>
                                  ${finalPrice.toFixed(2)}
                                </TableCell>
                                <TableCell align='center' style={{ width: 60 }}>
                                  {variants.length > 1 && (
                                    <IconButton
                                      size='small'
                                      color='error'
                                      onClick={() => handleRemoveVariant(idx)}
                                      title='Eliminar variante'
                                    >
                                      <i className='tabler-trash text-sm' />
                                    </IconButton>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: KÁRDEX DEL ARTÍCULO */}
              {activeTab === 3 && (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between flex-wrap gap-2'>
                    <div>
                      <Typography variant='subtitle1' className='font-bold text-[#1E1B2E]'>
                        Historial de Movimientos en Kárdex
                      </Typography>
                      <Typography variant='caption' className='text-[#6B7280]'>
                        Trazabilidad de entradas, salidas y conteos físicos registrados para este artículo
                      </Typography>
                    </div>
                    {productType !== 'service' && !isCreate && (
                      <Button
                        size='small'
                        variant='contained'
                        color='primary'
                        startIcon={<i className='tabler-plus text-base' />}
                        onClick={() => setAdjustModalOpen(true)}
                      >
                        Ajustar
                      </Button>
                    )}
                  </div>

                  <div className='overflow-x-auto border border-[#E6E4F0] rounded-xl'>
                    <Table size='small'>
                      <TableHead className='bg-[#F8F7FA]'>
                        <TableRow>
                          <TableCell
                            className='font-bold text-xs text-center'
                            style={{ width: 28, maxWidth: 28, padding: '8px 4px' }}
                          >
                            #
                          </TableCell>
                          <TableCell className='font-bold text-xs'>Fecha</TableCell>
                          <TableCell className='font-bold text-xs'>Referencia</TableCell>
                          <TableCell className='font-bold text-xs'>SKU Variante</TableCell>
                          <TableCell className='font-bold text-xs text-right'>Entrada (+)</TableCell>
                          <TableCell className='font-bold text-xs text-right'>Salida (-)</TableCell>
                          <TableCell className='font-bold text-xs text-right'>Saldo</TableCell>
                          <TableCell className='font-bold text-xs'>Motivo / Responsable</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {movements.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className='text-center py-8 text-[#6B7280]'>
                              No hay movimientos de Kárdex registrados para este artículo.
                            </TableCell>
                          </TableRow>
                        ) : (
                          movements.map((mov, idx) => (
                            <TableRow key={mov.id} hover>
                              <TableCell
                                className='text-center font-mono text-xs text-[#6B7280]'
                                style={{ width: 28, maxWidth: 28, padding: '6px 4px' }}
                              >
                                {idx + 1}
                              </TableCell>
                              <TableCell className='text-xs font-mono text-[#6B7280] whitespace-nowrap'>
                                {new Date(mov.fecha).toLocaleDateString('es-VE', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </TableCell>
                              <TableCell className='text-xs font-mono font-bold text-[#6C5CE7]'>
                                {mov.documento_referencia}
                              </TableCell>
                              <TableCell className='text-xs font-mono'>{mov.variante_sku}</TableCell>
                              <TableCell className='text-xs font-mono font-bold text-success text-right'>
                                {mov.cantidad_entrada > 0 ? `+${mov.cantidad_entrada}` : '—'}
                              </TableCell>
                              <TableCell className='text-xs font-mono font-bold text-error text-right'>
                                {mov.cantidad_salida > 0 ? `-${mov.cantidad_salida}` : '—'}
                              </TableCell>
                              <TableCell className='text-xs font-mono font-bold text-right bg-[#FAFAFE]'>
                                {mov.saldo_resultante} {mov.uom_code}
                              </TableCell>
                              <TableCell className='text-xs'>
                                <span className='font-medium text-[#1E1B2E] block'>{mov.motivo || 'Movimiento'}</span>
                                <span className='text-[11px] text-[#6B7280]'>{mov.usuario_responsable}</span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modal de Ajuste de Stock */}
      {!isCreate && template && (
        <StockAdjustmentModal
          open={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          templates={allTemplates}
          preselectedProductId={template.id}
          onSuccess={record => {
            loadData()
            setToast({
              open: true,
              message: `Ajuste ${record.correlativo} aplicado. Nuevo stock: ${record.stock_contado} ${record.uom_code}.`,
              severity: 'success'
            })
          }}
        />
      )}

      {/* Diálogo de Confirmación de Eliminación */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle className='font-bold text-[#1E1B2E]'>¿Eliminar artículo del catálogo?</DialogTitle>
        <DialogContent>
          <Typography variant='body2' className='text-[#6B7280]'>
            ¿Está seguro de que desea eliminar <strong>{name}</strong> ({defaultCode})? Esta acción lo removerá del
            listado activo de inventario.
          </Typography>
        </DialogContent>
        <DialogActions className='p-4 pt-0'>
          <Button variant='tonal' color='secondary' onClick={() => setDeleteConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button variant='contained' color='error' onClick={handleConfirmDelete}>
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

export default InventoryDetailView
