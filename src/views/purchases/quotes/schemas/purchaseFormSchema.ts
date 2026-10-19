import { z } from 'zod'

export const venezuelanRifRegex = /^[VEJG]-\d{8,9}(-\d)?$/i

export const purchaseQuoteLineSchema = z.object({
  producto_id: z.string().min(1, 'Debe seleccionar un producto o servicio'),
  producto_sku: z.string(),
  producto_nombre: z.string(),
  uom_code: z.string().default('un'),
  is_physical_stock: z.boolean(),
  cantidad: z.number().positive('La cantidad debe ser mayor a cero (> 0)'),
  costo_unitario: z.number().positive('El costo unitario debe ser mayor a cero (> 0)'),
  descuento_proveedor_porcentaje: z
    .number()
    .min(0, 'El descuento no puede ser menor a 0%')
    .max(100, 'El descuento no puede superar el 100%')
    .default(0),
  alicuota_iva: z.enum(['16', '8', '0', 'EXEMPT']).default('16')
})

export const createPurchaseQuoteFormSchema = z.object({
  proveedor_id: z.string().min(1, 'Debe seleccionar un proveedor válido'),
  identificacion_proveedor: z.string().optional(),
  referencia_proveedor: z.string().max(60, 'Máximo 60 caracteres').optional(),
  condicion_pago: z.enum(['CONTADO', 'CREDITO']),
  dias_credito: z.number().int().min(0, 'Los días de crédito no pueden ser negativos').max(365),
  moneda_base: z.enum(['USD', 'VES']),
  fecha_vencimiento_cotizacion: z.string().min(1, 'La fecha de vigencia de cotización es obligatoria'),
  fecha_estimada_entrega: z.string().min(1, 'La fecha estimada de entrega es obligatoria'),
  aplica_iva_compras: z.boolean().default(true),
  aplica_igtf: z.boolean().default(false),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  terminos_negociacion: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  items: z
    .array(purchaseQuoteLineSchema)
    .min(1, 'Debe incluir al menos un ítem con cantidad y costo mayores a cero')
})

export const cancelPurchaseQuoteFormSchema = z.object({
  motivo_anulacion: z
    .string()
    .min(5, 'El motivo de anulación es obligatorio (mínimo 5 caracteres)')
    .max(300, 'Máximo 300 caracteres')
})

export type CreatePurchaseQuoteFormValues = z.infer<typeof createPurchaseQuoteFormSchema>
export type CancelPurchaseQuoteFormValues = z.infer<typeof cancelPurchaseQuoteFormSchema>
