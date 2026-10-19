import { z } from 'zod';

export const contactPersonSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  cargo: z.string().min(2, 'El cargo es obligatorio'),
  telefono: z.string().min(7, 'Teléfono inválido'),
  email: z.string().email('Correo inválido').or(z.literal('')),
  rol: z.enum([
    'REPRESENTANTE_LEGAL',
    'PAGOS_RETENCIONES',
    'COMPRAS',
    'VENTAS',
    'OPERATIVO',
    'ADMINISTRATIVO'
  ]),
  is_principal: z.boolean().default(false),
  cedula_identidad: z.string().optional()
});

export const entityAddressSchema = z.object({
  id: z.string().optional(),
  tipo: z.enum(['FISCAL', 'ENTREGA', 'FACTURACION']),
  direccion: z.string().min(5, 'Dirección requerida'),
  ciudad: z.string().min(2, 'Ciudad requerida'),
  estado: z.string().min(2, 'Estado requerido'),
  pais: z.string().default('Venezuela'),
  codigo_postal: z.string().optional(),
  is_predeterminada: z.boolean().default(false)
});

export const terceroFormSchema = z.object({
  codigo: z.string().optional(),
  origen: z.enum(['NACIONAL', 'EXTRANJERO']).default('NACIONAL'),
  tipo: z.enum(['EMPRESA', 'INDIVIDUAL']),
  nombre_razon_social: z.string().min(3, 'El nombre o razón social es obligatorio'),
  nombre_comercial: z.string().optional(),
  identificacion: z.string().min(5, 'Documento de identidad / RIF obligatorio'),
  is_cliente: z.boolean().default(false),
  is_proveedor: z.boolean().default(false),
  is_contacto: z.boolean().default(false),
  telefono_principal: z.string().min(7, 'El teléfono principal es obligatorio'),
  email_principal: z.string().email('Correo electrónico principal inválido').or(z.literal('')),
  direccion: z.string().min(4, 'La dirección principal es obligatoria'),
  ciudad: z.string().min(2, 'La ciudad es obligatoria'),
  estado: z.string().min(2, 'El estado/provincia es obligatorio'),
  pais: z.string().min(2, 'El país es obligatorio').default('Venezuela'),
  codigo_postal: z.string().optional(),
  contactos_referentes: z.array(contactPersonSchema).default([]),
  direcciones_adicionales: z.array(entityAddressSchema).default([])
}).refine(data => data.is_cliente || data.is_proveedor || data.is_contacto, {
  message: 'Debe seleccionar al menos una relación comercial (Cliente, Proveedor o Contacto)',
  path: ['is_cliente']
});

export type TerceroFormSchemaType = z.infer<typeof terceroFormSchema>;
