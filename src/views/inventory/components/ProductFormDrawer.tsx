'use client'

import React, { useState, useEffect } from 'react'

import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'

import CustomTextField from '@core/components/mui/TextField'

import type {
  ProductTemplate,
  ProductType,
  SENIAT_VATRate,
  ProductVariant,
  ProductAttribute,
  ProductInvoicingPolicyOption,
  ProductPurchaseControlOption,
  ProductDeliveryPolicyOption,
  LandedCostSplitMethod
} from '@/types/inventoryTypes'
import {
  createProductTemplate,
  updateProductTemplate,
  calculateSuggestedPriceFromMargin,
  calculateMarginFromPrice,
  getActiveBcvRate,
  getProductCategories,
  createProductCategory
} from '@/services/inventoryService'
import { productFormSchema } from '../schemas/productFormSchema'

interface Props {
  open: boolean
  onClose: () => void
  initialProduct?: ProductTemplate | null
  fiscalEnabled: boolean
  onSuccess: (saved: ProductTemplate) => void
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

const DEFAULT_UOMS = [
  { code: 'un', label: 'Unidad (un)' },
  { code: 'kg', label: 'Kilogramo (kg)' },
  { code: 'L', label: 'Litro (L)' },
  { code: 'm', label: 'Metro (m)' },
  { code: 'paquete', label: 'Paquete / Caja' },
  { code: 'servicio', label: 'Servicio / Hora' }
]

const ProductFormDrawer: React.FC<Props> = ({
  open,
  onClose,
  initialProduct,
  fiscalEnabled,
  onSuccess
}) => {
  const isEdit = Boolean(initialProduct)
  const bcvRate = getActiveBcvRate()

  // Form States
  const [name, setName] = useState('')
  const [defaultCode, setDefaultCode] = useState('')
  const [barcode, setBarcode] = useState('')
  const [productType, setProductType] = useState<ProductType>('storable')
  const [uomCode, setUomCode] = useState('un')
  const [categoryOptions, setCategoryOptions] = useState<string[]>(DEFAULT_CATEGORIES)
  const [categoryName, setCategoryName] = useState('Herramientas & Maquinaria')
  const [addingQuickCat, setAddingQuickCat] = useState(false)
  const [quickCatName, setQuickCatName] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [notes, setNotes] = useState('')
  const [canBeSold, setCanBeSold] = useState(true)
  const [canBePurchased, setCanBePurchased] = useState(true)
  const [minStock, setMinStock] = useState<number>(5)

  // Pricing & Margin States
  const [standardCost, setStandardCost] = useState<number>(10)
  const [targetMargin, setTargetMargin] = useState<number>(35)
  const [basePrice, setBasePrice] = useState<number>(15)
  const [showMarginHelper, setShowMarginHelper] = useState<boolean>(false)

  // Fiscal States
  const [vatRate, setVatRate] = useState<SENIAT_VATRate>('16')
  const [applyISLR, setApplyISLR] = useState(false)

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

  // Variants & Attributes Generator States
  const [attrName1, setAttrName1] = useState('')
  const [attrValues1, setAttrValues1] = useState('')
  const [attrName2, setAttrName2] = useState('')
  const [attrValues2, setAttrValues2] = useState('')
  const [variants, setVariants] = useState<ProductVariant[]>([])

  // UI Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      getProductCategories().then(cats => {
        const names = cats.map(c => c.name)

        if (names.length > 0) setCategoryOptions(names)
      })
    }

    if (initialProduct && open) {
      setName(initialProduct.name)
      setDefaultCode(initialProduct.defaultCode)
      setBarcode(initialProduct.barcode || '')
      setProductType(initialProduct.productType)
      setUomCode(initialProduct.uomCode)
      setCategoryName(initialProduct.categoryName)
      setTagsInput(initialProduct.tags.join(', '))
      setNotes(initialProduct.notes || '')
      setCanBeSold(initialProduct.canBeSold)
      setCanBePurchased(initialProduct.canBePurchased)
      setMinStock(initialProduct.minStock ?? 5)
      setStandardCost(initialProduct.standardCost)
      setBasePrice(initialProduct.basePrice)
      setTargetMargin(
        initialProduct.targetMargin ??
          calculateMarginFromPrice(initialProduct.standardCost, initialProduct.basePrice)
      )
      setVatRate(initialProduct.vatRate || '16')
      setApplyISLR(Boolean(initialProduct.applyISLR))
      setInvoicingPolicy(initialProduct.invoicingPolicy || 'DEFAULT')
      setPurchaseControlPolicy(initialProduct.purchaseControlPolicy || 'DEFAULT')
      setDeliveryPolicy(initialProduct.deliveryPolicy || 'DEFAULT')
      setIsLandedCost(Boolean(initialProduct.isLandedCost))
      setDefaultSplitMethod(initialProduct.defaultSplitMethod || 'BY_QUANTITY')
      setWeight(initialProduct.weight ?? 0)
      setVolume(initialProduct.volume ?? 0)
      setVariants(initialProduct.variants.map(v => ({ ...v })))

      if (initialProduct.attributes[0]) {
        setAttrName1(initialProduct.attributes[0].name)
        setAttrValues1(initialProduct.attributes[0].values.map(val => val.name).join(', '))
      } else {
        setAttrName1('')
        setAttrValues1('')
      }

      if (initialProduct.attributes[1]) {
        setAttrName2(initialProduct.attributes[1].name)
        setAttrValues2(initialProduct.attributes[1].values.map(val => val.name).join(', '))
      } else {
        setAttrName2('')
        setAttrValues2('')
      }
    } else if (open) {
      const randomNum = Math.floor(100 + Math.random() * 900)
      const defaultSku = `ART-${randomNum}`

      setName('')
      setDefaultCode(defaultSku)
      setBarcode('')
      setProductType('storable')
      setUomCode('un')
      setCategoryName('Herramientas & Maquinaria')
      setAddingQuickCat(false)
      setQuickCatName('')
      setTagsInput('Nuevo, Catálogo')
      setNotes('')
      setCanBeSold(true)
      setCanBePurchased(true)
      setMinStock(5)
      setStandardCost(10)
      setTargetMargin(35)
      setBasePrice(15)
      setShowMarginHelper(false)
      setVatRate('16')
      setApplyISLR(false)
      setInvoicingPolicy('DEFAULT')
      setPurchaseControlPolicy('DEFAULT')
      setDeliveryPolicy('DEFAULT')
      setIsLandedCost(false)
      setDefaultSplitMethod('BY_QUANTITY')
      setWeight(0)
      setVolume(0)
      setAttrName1('')
      setAttrValues1('')
      setAttrName2('')
      setAttrValues2('')
      setVariants([
        {
          id: `var-init-1`,
          templateId: '',
          sku: defaultSku,
          barcode: '',
          combinationValues: [],
          costPrice: 10,
          priceExtra: 0,
          physicalStock: 10,
          reservedStock: 0,
          availableStock: 10
        }
      ])
    }

    setErrorMsg(null)
  }, [initialProduct, open])

  // Handlers
  const handleCostChange = (newCost: number) => {
    const safeCost = Math.max(0, newCost)

    setStandardCost(safeCost)
    setVariants(prev =>
      prev.map(v => ({
        ...v,
        costPrice: safeCost
      }))
    )
  }

  const currentMarginPercent = calculateMarginFromPrice(standardCost, basePrice)
  const suggestedPrice = calculateSuggestedPriceFromMargin(standardCost, targetMargin)
  const suggestedProfit = Math.max(0, suggestedPrice - standardCost)

  // Generate Cartesian Product of Variants
  const handleGenerateVariants = () => {
    const vals1 = attrValues1
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const vals2 = attrValues2
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const masterSku = defaultCode.trim() || 'SKU'

    if (vals1.length === 0) {
      setVariants([
        {
          id: `var-single`,
          templateId: initialProduct?.id || '',
          sku: masterSku,
          barcode: barcode || '',
          combinationValues: [],
          costPrice: standardCost,
          priceExtra: 0,
          physicalStock: productType === 'service' ? 0 : 10,
          reservedStock: 0,
          availableStock: productType === 'service' ? 0 : 10
        }
      ])

      return
    }

    const generated: ProductVariant[] = []

    vals1.forEach(v1 => {
      const code1 = v1.slice(0, 3).toUpperCase()

      if (vals2.length > 0 && attrName2.trim()) {
        vals2.forEach(v2 => {
          const code2 = v2.slice(0, 3).toUpperCase()

          generated.push({
            id: `var-${Date.now()}-${generated.length}`,
            templateId: initialProduct?.id || '',
            sku: `${masterSku}-${code1}-${code2}`,
            barcode: '',
            combinationValues: [
              { attributeName: attrName1.trim() || 'Atributo 1', valueName: v1 },
              { attributeName: attrName2.trim() || 'Atributo 2', valueName: v2 }
            ],
            costPrice: standardCost,
            priceExtra: 0,
            physicalStock: productType === 'service' ? 0 : 5,
            reservedStock: 0,
            availableStock: productType === 'service' ? 0 : 5
          })
        })
      } else {
        generated.push({
          id: `var-${Date.now()}-${generated.length}`,
          templateId: initialProduct?.id || '',
          sku: `${masterSku}-${code1}`,
          barcode: '',
          combinationValues: [{ attributeName: attrName1.trim() || 'Opción', valueName: v1 }],
          costPrice: standardCost,
          priceExtra: 0,
          physicalStock: productType === 'service' ? 0 : 5,
          reservedStock: 0,
          availableStock: productType === 'service' ? 0 : 5
        })
      }
    })

    setVariants(generated)
  }

  const handleUpdateVariantField = (
    idx: number,
    field: keyof ProductVariant,
    value: string | number
  ) => {
    setVariants(prev => {
      const copy = [...prev]
      const item = { ...copy[idx], [field]: value }

      if (field === 'physicalStock') {
        const phys = Number(value) || 0

        item.physicalStock = Math.max(0, phys)
        item.availableStock = Math.max(0, item.physicalStock - (item.reservedStock || 0))
      }

      copy[idx] = item

      return copy
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    const builtAttributes: ProductAttribute[] = []

    if (attrName1.trim() && attrValues1.trim()) {
      builtAttributes.push({
        id: 'attr-1',
        name: attrName1.trim(),
        values: attrValues1
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
          .map((v, i) => ({ id: `v1-${i}`, name: v }))
      })
    }

    if (attrName2.trim() && attrValues2.trim()) {
      builtAttributes.push({
        id: 'attr-2',
        name: attrName2.trim(),
        values: attrValues2
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
          .map((v, i) => ({ id: `v2-${i}`, name: v }))
      })
    }

    const finalVariants =
      variants.length > 0
        ? variants.map(v => ({
            ...v,
            sku: v.sku.trim() || defaultCode.trim(),
            physicalStock: productType === 'service' ? 0 : v.physicalStock,
            availableStock:
              productType === 'service' ? 0 : Math.max(0, v.physicalStock - (v.reservedStock || 0))
          }))
        : [
            {
              id: `var-${Date.now()}`,
              templateId: initialProduct?.id || '',
              sku: defaultCode.trim(),
              barcode: barcode.trim(),
              combinationValues: [],
              costPrice: standardCost,
              priceExtra: 0,
              physicalStock: 0,
              reservedStock: 0,
              availableStock: 0
            }
          ]

    const validation = productFormSchema.safeParse({
      name: name.trim(),
      defaultCode: defaultCode.trim(),
      barcode: barcode.trim() || undefined,
      productType,
      uomCode,
      categoryName,
      tags,
      notes: notes.trim() || undefined,
      canBeSold,
      canBePurchased,
      standardCost,
      targetMargin: Math.max(0, targetMargin),
      basePrice,
      minStock: productType === 'service' ? 0 : minStock,
      vatRate,
      applyISLR,
      invoicingPolicy,
      purchaseControlPolicy,
      deliveryPolicy,
      isLandedCost: productType === 'service' ? isLandedCost : false,
      defaultSplitMethod: productType === 'service' && isLandedCost ? defaultSplitMethod : undefined,
      weight: weight > 0 ? weight : undefined,
      volume: volume > 0 ? volume : undefined,
      variants: finalVariants
    })

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Verifique los campos obligatorios')

      return
    }

    try {
      setIsSubmitting(true)

      if (isEdit && initialProduct) {
        const updated = await updateProductTemplate(initialProduct.id, {
          ...validation.data,
          attributes: builtAttributes,
          variants: finalVariants
        })

        onSuccess(updated)
      } else {
        const created = await createProductTemplate({
          ...validation.data,
          attributes: builtAttributes,
          variants: finalVariants
        })

        onSuccess(created)
      }

      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el producto')
    } finally {
      setIsSubmitting(false)
    }
  }

  const netProfitUsd = basePrice - standardCost

  const taxRatePercent =
    fiscalEnabled && vatRate !== 'EXEMPT' && vatRate !== '0' ? parseFloat(vatRate) / 100 : 0

  const finalPriceWithTaxUsd = basePrice * (1 + taxRatePercent)

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: '620px', md: '680px' },
            backgroundColor: '#FFFFFF',
            borderLeft: '1px solid #E6E4F0'
          }
        }
      }}
    >
      <form onSubmit={handleSubmit} className='flex flex-col h-full justify-between'>
        {/* Sticky Header */}
        <div className='p-5 border-b border-[#E6E4F0] flex items-center justify-between bg-[#FAFAFC]'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-[#F0EEF9] text-[#6C5CE7] flex items-center justify-center'>
              <i className={isEdit ? 'tabler-edit text-xl' : 'tabler-package-import text-xl'} />
            </div>
            <div>
              <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                {isEdit ? `Editar Artículo: ${initialProduct?.defaultCode}` : 'Nuevo Artículo o Servicio'}
              </Typography>
              <span className='text-xs text-[#6B7280]'>
                Configuración de plantilla maestra, calculadora de márgenes y variantes
              </span>
            </div>
          </div>
          <IconButton size='small' onClick={onClose}>
            <i className='tabler-x text-lg text-[#6B7280]' />
          </IconButton>
        </div>

        {/* Scrollable Body */}
        <div className='p-6 overflow-y-auto flex-1 flex flex-col gap-6'>
          {errorMsg && (
            <Alert severity='error' sx={{ borderRadius: '14px' }}>
              {errorMsg}
            </Alert>
          )}

          {/* 1. Clasificación del Artículo */}
          <div className='flex flex-col gap-2'>
            <span className='text-xs font-bold uppercase tracking-wider text-[#6B7280]'>
              1. Clasificación de Inventario (3 Niveles)
            </span>
            <div className='grid grid-cols-3 gap-2.5'>
              {[
                {
                  type: 'storable' as ProductType,
                  label: 'Almacenable',
                  desc: 'Control Kárdex y Stock',
                  icon: 'tabler-box'
                },
                {
                  type: 'consumable' as ProductType,
                  label: 'Consumible',
                  desc: 'Suministro directo',
                  icon: 'tabler-package'
                },
                {
                  type: 'service' as ProductType,
                  label: 'Servicio',
                  desc: 'Intangible / Mano de obra',
                  icon: 'tabler-briefcase'
                }
              ].map(item => {
                const active = productType === item.type

                return (
                  <button
                    key={item.type}
                    type='button'
                    onClick={() => setProductType(item.type)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      active
                        ? 'bg-[#F0EEF9] border-[#6C5CE7] text-[#1E1B2E] shadow-xs'
                        : 'bg-[#FFFFFF] border-[#E6E4F0] text-[#6B7280] hover:bg-[#FAFAFC]'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <i className={`${item.icon} text-lg ${active ? 'text-[#6C5CE7]' : 'text-[#9CA3AF]'}`} />
                      {active && <i className='tabler-circle-check-filled text-[#6C5CE7] text-sm' />}
                    </div>
                    <span className='font-bold text-xs text-[#1E1B2E]'>{item.label}</span>
                    <span className='text-[10px] text-[#6B7280] leading-tight'>{item.desc}</span>
                  </button>
                )
              })}
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

          {/* 2. Información Maestra */}
          <div className='bg-[#FAFAFC] p-4 rounded-2xl border border-[#E6E4F0] flex flex-col gap-4'>
            <span className='text-xs font-bold uppercase tracking-wider text-[#1E1B2E] flex items-center gap-1.5'>
              <i className='tabler-tag text-[#6C5CE7]' /> 2. Identificación y Categoría
            </span>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <CustomTextField
                  fullWidth
                  label='Nombre del Producto o Servicio *'
                  placeholder='Ej. Bomba Centrífuga 1.5HP / Camisa Oxford...'
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth
                  label='SKU *'
                  placeholder='Ej. HER-BOM-01'
                  value={defaultCode}
                  onChange={e => {
                    const val = e.target.value.toUpperCase()

                    setDefaultCode(val)

                    if (variants.length === 1 && variants[0].combinationValues.length === 0) {
                      handleUpdateVariantField(0, 'sku', val)
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
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
                        }
                      }}
                    />
                    <IconButton
                      size='small'
                      color='primary'
                      onClick={async () => {
                        if (!quickCatName.trim()) return
                        const created = await createProductCategory({ name: quickCatName.trim() })

                        setCategoryOptions(prev => [...prev, created.name])
                        setCategoryName(created.name)
                        setQuickCatName('')
                        setAddingQuickCat(false)
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
                      {Array.from(new Set([...categoryOptions, categoryName])).map(c => (
                        <MenuItem key={c} value={c}>
                          {c}
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
                  label='Unidad de Medida'
                  value={uomCode}
                  onChange={e => setUomCode(e.target.value)}
                >
                  {DEFAULT_UOMS.map(u => (
                    <MenuItem key={u.code} value={u.code}>
                      {u.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Stock Mín.'
                  disabled={productType === 'service'}
                  value={minStock}
                  onChange={e => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  label='Código de Barras (EAN/UPC)'
                  placeholder='7591234567890'
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  label='Etiquetas (separadas por coma)'
                  placeholder='Industrial, Oferta, Importado'
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  multiline
                  minRows={2}
                  label='Nota / Información adicional del producto'
                  placeholder='Especificaciones técnicas, observaciones de almacén, proveedor habitual o cualquier información relevante...'
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </Grid>
            </Grid>

            <div className='flex items-center gap-6 pt-1'>
              <label className='flex items-center gap-2 text-xs font-medium text-[#1E1B2E] cursor-pointer'>
                <Switch
                  size='small'
                  checked={canBeSold}
                  onChange={e => setCanBeSold(e.target.checked)}
                />
                Disponible para la Venta
              </label>
              <label className='flex items-center gap-2 text-xs font-medium text-[#1E1B2E] cursor-pointer'>
                <Switch
                  size='small'
                  checked={canBePurchased}
                  onChange={e => setCanBePurchased(e.target.checked)}
                />
                Disponible para la Compra
              </label>
            </div>
          </div>

          {/* 3. Costo y Precio de Venta */}
          <div className='bg-[#FAFAFC] p-4 rounded-2xl border border-[#E6E4F0] flex flex-col gap-3'>
            <div className='flex items-center justify-between flex-wrap gap-2'>
              <span className='text-xs font-bold uppercase tracking-wider text-[#1E1B2E] flex items-center gap-1.5'>
                <i className='tabler-coin text-[#6C5CE7]' /> 3. Costo y Precio de Venta
              </span>
              <Chip
                size='small'
                label={`Tasa BCV: ${bcvRate.toFixed(2)} Bs/USD`}
                sx={{
                  borderRadius: '9999px',
                  backgroundColor: '#F0EEF9',
                  color: '#6C5CE7',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }}
              />
            </div>

            <Grid container spacing={3} alignItems='flex-start'>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Costo del Producto ($ USD) *'
                  value={standardCost === 0 ? '' : standardCost}
                  placeholder='0.00'
                  onChange={e => handleCostChange(parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.1 }}
                  helperText={`≈ Bs. ${(standardCost * bcvRate).toFixed(2)}`}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Precio de Venta ($ USD) *'
                  value={basePrice === 0 ? '' : basePrice}
                  placeholder='0.00'
                  onChange={e => setBasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  inputProps={{ min: 0, step: 0.1 }}
                  helperText={`≈ Bs. ${(basePrice * bcvRate).toFixed(2)}`}
                />
              </Grid>
            </Grid>

            {/* Indicador sencillo de Margen + Toggle para sugerir precio */}
            <div className='flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-xl bg-white border border-[#E6E4F0]'>
              <div className='flex items-center gap-2'>
                <span className='text-xs text-[#6B7280]'>Margen actual:</span>
                <Chip
                  size='small'
                  label={`${currentMarginPercent.toFixed(1)}% (${netProfitUsd >= 0 ? '+' : ''}$${netProfitUsd.toFixed(2)} USD)`}
                  color={currentMarginPercent >= 30 ? 'success' : currentMarginPercent >= 15 ? 'warning' : 'error'}
                  variant='tonal'
                  className='rounded-full font-mono font-bold text-xs'
                />
              </div>

              <label className='flex items-center gap-1.5 text-xs font-semibold text-[#6C5CE7] cursor-pointer'>
                <Switch
                  size='small'
                  checked={showMarginHelper}
                  onChange={e => setShowMarginHelper(e.target.checked)}
                />
                Sugerir precio según margen
              </label>
            </div>

            {showMarginHelper && (
              <div className='p-3.5 rounded-xl bg-[#F0EEF9]/50 border border-[#DCD8EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <div style={{ width: 145 }}>
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
                  <div className='flex items-center gap-1 pt-3'>
                    {[25, 35, 50, 100].map(preset => (
                      <button
                        key={preset}
                        type='button'
                        onClick={() => setTargetMargin(preset)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                          Math.round(targetMargin) === preset
                            ? 'bg-[#6C5CE7] text-white border-[#6C5CE7]'
                            : 'bg-white text-[#6C5CE7] border-[#DCD8EC]'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className='flex items-center gap-2.5 justify-end flex-wrap'>
                  <div className='text-right'>
                    <span className='text-[10px] text-[#6B7280] block'>Precio sugerido:</span>
                    <strong className='font-mono text-sm text-[#1E1B2E]'>
                      ${suggestedPrice.toFixed(2)} USD{' '}
                      <span className='text-[11px] text-[#10B981] font-normal'>
                        (+${suggestedProfit.toFixed(2)})
                      </span>
                    </strong>
                  </div>
                  <Button
                    type='button'
                    variant='contained'
                    size='small'
                    onClick={() => setBasePrice(suggestedPrice)}
                    startIcon={<i className='tabler-check text-xs' />}
                    sx={{
                      borderRadius: '9999px',
                      backgroundColor: '#6C5CE7',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      '&:hover': { backgroundColor: '#5B4CDB' }
                    }}
                  >
                    Aplicar precio
                  </Button>
                </div>
              </div>
            )}

            {/* Fiscal SENIAT Section inside Pricing */}
            {fiscalEnabled && (
              <>
                <Divider sx={{ borderColor: '#E6E4F0', my: 0.5 }} />
                <div className='flex items-center justify-between flex-wrap gap-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-[#1E1B2E]'>Alícuota IVA (SENIAT):</span>
                    {(['16', '8', 'EXEMPT'] as SENIAT_VATRate[]).map(rate => (
                      <button
                        key={rate}
                        type='button'
                        onClick={() => setVatRate(rate)}
                        className={`h-[24px] px-2.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          vatRate === rate
                            ? 'bg-[#6C5CE7] text-white border-[#6C5CE7]'
                            : 'bg-white text-[#6B7280] border-[#DCD8EC]'
                        }`}
                      >
                        {rate === 'EXEMPT' ? '0% Exento' : `IVA ${rate}%`}
                      </button>
                    ))}
                  </div>

                  <div className='text-xs font-bold text-[#1E1B2E]'>
                    PVP c/IVA: <span className='text-[#6C5CE7]'>${finalPriceWithTaxUsd.toFixed(2)}</span>{' '}
                    <span className='text-[#6B7280] font-normal'>
                      (Bs. {(finalPriceWithTaxUsd * bcvRate).toFixed(2)})
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 4. Variantes y Existencias Iniciales */}
          <div className='bg-[#FFFFFF] p-4 rounded-2xl border border-[#E6E4F0] flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-bold uppercase tracking-wider text-[#1E1B2E] flex items-center gap-1.5'>
                <i className='tabler-grid-dots text-[#6C5CE7]' /> 4. Matriz de Variantes y Stock ({variants.length})
              </span>
              {productType !== 'service' && (
                <Button
                  size='small'
                  variant='outlined'
                  onClick={handleGenerateVariants}
                  sx={{
                    borderRadius: '9999px',
                    textTransform: 'none',
                    fontSize: '0.72rem',
                    borderColor: '#6C5CE7',
                    color: '#6C5CE7',
                    py: 0.3
                  }}
                  startIcon={<i className='tabler-wand text-sm' />}
                >
                  Generar Combinaciones
                </Button>
              )}
            </div>

            {productType !== 'service' && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Atributo 1 (Opcional)'
                    placeholder='Ej. Talla o Presentación'
                    value={attrName1}
                    onChange={e => setAttrName1(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 7 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Valores Atributo 1 (separados por coma)'
                    placeholder='Ej. S, M, L'
                    value={attrValues1}
                    onChange={e => setAttrValues1(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Atributo 2 (Opcional)'
                    placeholder='Ej. Color'
                    value={attrName2}
                    onChange={e => setAttrName2(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 7 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Valores Atributo 2 (separados por coma)'
                    placeholder='Ej. Azul, Blanco'
                    value={attrValues2}
                    onChange={e => setAttrValues2(e.target.value)}
                  />
                </Grid>
              </Grid>
            )}

            <div className='overflow-x-auto border border-[#E6E4F0] rounded-xl'>
              <Table size='small'>
                <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Variante</TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }}>SKU Específico</TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, width: 95 }}>Extra ($)</TableCell>
                    {productType !== 'service' && (
                      <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, width: 95 }}>
                        Stock Físico
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {variants.map((v, idx) => (
                    <TableRow key={v.id || idx}>
                      <TableCell sx={{ fontSize: '0.75rem' }}>
                        {v.combinationValues.length > 0
                          ? v.combinationValues.map(c => `${c.valueName}`).join(' / ')
                          : 'Estándar (Única)'}
                      </TableCell>
                      <TableCell>
                        <CustomTextField
                          size='small'
                          value={v.sku}
                          onChange={e => handleUpdateVariantField(idx, 'sku', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <CustomTextField
                          size='small'
                          type='number'
                          value={v.priceExtra}
                          onChange={e =>
                            handleUpdateVariantField(idx, 'priceExtra', parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      {productType !== 'service' && (
                        <TableCell>
                          <CustomTextField
                            size='small'
                            type='number'
                            value={v.physicalStock}
                            onChange={e =>
                              handleUpdateVariantField(
                                idx,
                                'physicalStock',
                                Math.max(0, parseInt(e.target.value) || 0)
                              )
                            }
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 5. Logística */}
          <div className='bg-[#FAFAFC] p-4 rounded-2xl border border-[#E6E4F0] flex flex-col gap-3'>
            <div>
              <span className='text-xs font-bold uppercase tracking-wider text-[#1E1B2E] flex items-center gap-1.5'>
                <i className='tabler-truck text-[#6C5CE7]' /> 5. Logística (Informativo)
              </span>
              <span className='text-[11px] text-[#6B7280] block mt-0.5'>
                Información dimensional y peso para control de envíos y fletes.
              </span>
            </div>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  type='number'
                  label='Peso (kg)'
                  placeholder='0.00'
                  value={weight === 0 ? '' : weight}
                  onChange={e => setWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                  InputProps={{
                    endAdornment: <span className='text-xs text-[#6B7280] font-medium'>kg</span>
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  type='number'
                  label='Volumen (m³)'
                  placeholder='0.000'
                  value={volume === 0 ? '' : volume}
                  onChange={e => setVolume(Math.max(0, parseFloat(e.target.value) || 0))}
                  InputProps={{
                    endAdornment: <span className='text-xs text-[#6B7280] font-medium'>m³</span>
                  }}
                />
              </Grid>
            </Grid>
          </div>

          {/* 6. Políticas de Facturación y Entrega */}
          <div className='bg-[#FAFAFC] p-4 rounded-2xl border border-[#E6E4F0] flex flex-col gap-3'>
            <div>
              <span className='text-xs font-bold uppercase tracking-wider text-[#1E1B2E] flex items-center gap-1.5'>
                <i className='tabler-clipboard-check text-[#6C5CE7]' /> 6. Políticas de Facturación y Entrega
              </span>
              <span className='text-[11px] text-[#6B7280] block mt-0.5'>
                Si no se especifica un valor, tomará la política configurada en el sistema.
              </span>
            </div>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Política de Entrega / Despacho'
                  value={deliveryPolicy}
                  onChange={e => setDeliveryPolicy(e.target.value as ProductDeliveryPolicyOption)}
                  helperText='Si no tiene valor, toma la del sistema'
                >
                  <MenuItem value='DEFAULT'><em>Sin especificar</em></MenuItem>
                  <MenuItem value='PARTIAL'>Permitir Entregas Parciales</MenuItem>
                  <MenuItem value='ALL_AT_ONCE'>Entregar Todos a la Vez</MenuItem>
                </CustomTextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Política de Facturación (Ventas)'
                  value={invoicingPolicy}
                  onChange={e => setInvoicingPolicy(e.target.value as ProductInvoicingPolicyOption)}
                  helperText='Si no tiene valor, toma la del sistema'
                >
                  <MenuItem value='DEFAULT'><em>Sin especificar</em></MenuItem>
                  <MenuItem value='ORDERED'>Cantidades Pedidas</MenuItem>
                  <MenuItem value='DELIVERED'>Cantidades Entregadas</MenuItem>
                </CustomTextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Política de Control (Compras)'
                  value={purchaseControlPolicy}
                  onChange={e => setPurchaseControlPolicy(e.target.value as ProductPurchaseControlOption)}
                  helperText='Si no tiene valor, toma la del sistema'
                >
                  <MenuItem value='DEFAULT'><em>Sin especificar</em></MenuItem>
                  <MenuItem value='ORDERED'>Cantidades Pedidas</MenuItem>
                  <MenuItem value='RECEIVED'>Cantidades Recibidas</MenuItem>
                </CustomTextField>
              </Grid>
            </Grid>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className='p-4 border-t border-[#E6E4F0] bg-[#FAFAFC] flex items-center justify-end gap-3'>
          <Button
            type='button'
            variant='outlined'
            onClick={onClose}
            disabled={isSubmitting}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              borderColor: '#DCD8EC',
              color: '#6B7280',
              fontWeight: 600,
              px: 3
            }}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            variant='contained'
            disabled={isSubmitting}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              backgroundColor: '#6C5CE7',
              color: '#FFFFFF',
              fontWeight: 600,
              px: 4,
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.3)',
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={16} color='inherit' />
              ) : (
                <i className='tabler-device-floppy text-base' />
              )
            }
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default ProductFormDrawer
