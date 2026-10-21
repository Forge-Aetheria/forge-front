import { z } from 'zod'

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2, 'El SKU de la variante es obligatorio'),
  barcode: z.string().optional(),
  costPrice: z.number().min(0, 'El costo no puede ser negativo'),
  priceExtra: z.number().default(0),
  physicalStock: z.number().min(0, 'El stock físico no puede ser negativo').default(0),
  reservedStock: z.number().min(0).default(0),
  combinationValues: z
    .array(
      z.object({
        attributeName: z.string(),
        valueName: z.string()
      })
    )
    .default([])
})

export const productFormSchema = z.object({
  name: z.string().min(3, 'El nombre del artículo debe tener al menos 3 caracteres'),
  defaultCode: z.string().min(2, 'El SKU es obligatorio'),
  barcode: z.string().optional(),
  productType: z.enum(['storable', 'consumable', 'service']),
  uomCode: z.string().min(1, 'La unidad de medida es obligatoria'),
  categoryName: z.string().min(2, 'La categoría es obligatoria'),
  tags: z.array(z.string()).default([]),
  canBeSold: z.boolean().default(true),
  canBePurchased: z.boolean().default(true),
  standardCost: z.number().min(0, 'El costo estándar no puede ser negativo'),
  targetMargin: z
    .number()
    .min(0, 'El margen no puede ser menor a 0%')
    .optional(),
  basePrice: z.number().min(0, 'El precio base de venta no puede ser negativo'),
  minStock: z.number().min(0, 'El stock mínimo no puede ser negativo').optional(),
  weight: z.number().min(0, 'El peso no puede ser negativo').optional(),
  volume: z.number().min(0, 'El volumen no puede ser negativo').optional(),
  notes: z.string().optional(),
  vatRate: z.enum(['16', '8', '0', 'EXEMPT']).default('16'),
  applyISLR: z.boolean().default(false),
  invoicingPolicy: z.enum(['DEFAULT', 'ORDERED', 'DELIVERED']).default('DEFAULT'),
  purchaseControlPolicy: z.enum(['DEFAULT', 'ORDERED', 'RECEIVED']).default('DEFAULT'),
  deliveryPolicy: z.enum(['DEFAULT', 'PARTIAL', 'ALL_AT_ONCE']).default('DEFAULT'),
  isLandedCost: z.boolean().optional(),
  defaultSplitMethod: z.enum(['EQUAL', 'BY_QUANTITY', 'BY_COST', 'BY_WEIGHT', 'BY_VOLUME']).optional(),
  variants: z.array(productVariantSchema).min(1, 'Debe registrar al menos una variante')
})

export const stockAdjustmentFormSchema = z.object({
  producto_id: z.string().min(1, 'Debe seleccionar un producto'),
  variante_id: z.string().min(1, 'Debe seleccionar una variante'),
  stock_contado: z.number().min(0, 'El stock físico contado no puede ser negativo'),
  motivo: z.enum([
    'CONTEO_FISICO',
    'ROTURA_MERMA',
    'CADUCIDAD',
    'CONSUMO_INTERNO',
    'CORRECCION_SISTEMA'
  ]),
  observaciones: z.string().max(250, 'Máximo 250 caracteres').optional()
})

export type ProductFormValues = z.infer<typeof productFormSchema>
export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentFormSchema>
