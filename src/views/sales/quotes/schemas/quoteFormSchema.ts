import { z } from 'zod';

export const quoteLineItemSchema = z.object({
  id: z.string().optional(),
  producto_id: z.string().min(1, 'Debe seleccionar un producto'),
  producto_sku: z.string().default(''),
  producto_nombre: z.string().default(''),
  is_physical_stock: z.boolean().default(true),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().min(0, 'El precio no puede ser negativo'),
  descuento_porcentaje: z.number().min(0).max(100, 'El descuento debe ser entre 0% y 100%').default(0),
  alicuota_iva: z.string().default('16'),
  stock_disponible: z.number().optional()
});

export const createQuoteFormSchema = z.object({
  cliente_id: z.string().min(1, 'Debe seleccionar un cliente'),
  identificacion_cliente: z.string().optional(),
  nombre_cliente: z.string().optional(),
  moneda_base: z.enum(['USD', 'VES']).default('USD'),
  vigencia_dias: z.number().int().min(1, 'La vigencia mínima es de 1 día').max(90, 'La vigencia máxima es de 90 días').default(15),
  aplica_iva: z.boolean().default(true),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  terminos_condiciones: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  items: z.array(quoteLineItemSchema).min(1, 'Debe agregar al menos una línea de producto o servicio')
});

export const cancelQuoteFormSchema = z.object({
  motivo_anulacion: z.string().min(5, 'El motivo de anulación debe tener al menos 5 caracteres').max(300, 'Máximo 300 caracteres')
});

export type QuoteLineItemFormValues = z.infer<typeof quoteLineItemSchema>;
export type CreateQuoteFormValues = z.infer<typeof createQuoteFormSchema>;
export type CancelQuoteFormValues = z.infer<typeof cancelQuoteFormSchema>;
