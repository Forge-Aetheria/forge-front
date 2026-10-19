# Especificación: Módulo de Inventario, Catálogo y Operaciones de Almacén [SPEC-002]

- **ID de Spec:** SPEC-002
- **Estado:** Actualizado / En Revisión (Evolución sobre propuesta de arquitectura inicial)
- **Fecha de Actualización:** 2026-10-17 (Versión original: 2026-09-28)
- **Épica:** Gestión de Inventario, Catálogo Maestro, Kárdex y Operaciones de Almacén
- **Alcance:** Exclusivamente Frontend (Desacoplado, mock data reactiva y servicios tipados, preparado para futura conexión REST).
- **Gobernanza:** `constitution.md` (Clean Light UI, Foundly Tokens, Geometría de Píldora) y `agent.md` (Sintaxis formal EARS, Reglas R1 a R5).

---

## 1. Contexto de Negocio y Dominio

El módulo de **Inventario y Almacén** centraliza la gestión física, comercial y de valoración de cualquier rubro manejado por el ERP Foundly (textiles, consumibles, herramientas, químicos/líquidos y servicios profesionales). 

Se organiza en dos grandes pilares operativos:
1. **Centro de Control y Operaciones de Almacén (`/inventory`):** Panel ejecutivo con flujo diario de inventario (recepciones de compras pendientes, entregas de ventas por despachar, alertas de reposición y valoración monetaria dual).
2. **Catálogo Maestro y Trazabilidad (`/inventory/products`, `/inventory/kardex`, `/inventory/adjustments`):** Catálogo de artículos con variantes, calculadora de rentabilidad, historial transaccional de movimientos (Kárdex) y tomas físicas de inventario.

### 1.1 Clasificación en 3 Niveles (Preservada del Modelo Base)
1. **Almacenable (`storable`):** Bienes tangibles sujetos a control estricto de existencias físicas, control de stock mínimo, reservas de venta y Kárdex transaccional.
2. **Consumible (`consumable`):** Bienes de gasto directo o suministros internos con seguimiento de compras/salidas pero sin bloqueo rígido de inventario.
3. **Servicio (`service`):** Bienes intangibles (mano de obra, consultoría, fletes, instalaciones) que no descuentan existencias físicas de almacén.

### 1.2 Comportamiento y Operatividad Comercial
- **`can_be_sold`:** Determina si el artículo es seleccionable en Cotizaciones, Facturación y Punto de Venta (POS).
- **`can_be_purchased`:** Determina si el artículo es seleccionable en Órdenes de Compra y Recepciones de Proveedores.

### 1.3 Patrón Plantilla vs. Variante (*Product Template vs. Product Variant*)
- **Plantilla de Producto (`ProductTemplate`):** Define los atributos globales del artículo (categoría, unidad de medida base, tipo de inventario, tags, costo estándar y precio de venta base).
- **Variante Concreta (`ProductVariant`):** Representa el SKU individual físico almacenable con su propia combinación de atributos (ej. *Talla: M / Color: Azul*), código de barras específico (EAN/UPC), costo particular, diferencial de precio (`price_extra`) y existencias reales.
- **Reglas de Cálculo Financiero y Stock por Variante:**
  $$\text{Precio Venta Final} = \text{template.base\_price} + \text{variant.price\_extra}$$
  $$\text{Stock Disponible} = \text{Stock Físico} - \text{Stock Reservado (Comprometido en Ventas)}$$

### 1.4 Gestión de Costo, Precio de Venta y Sugerencia por Margen
El formulario del producto presenta de forma directa y limpia:
- **Campos principales:** `Costo del Producto ($ USD)` y `Precio de Venta ($ USD)`, mostrando siempre en vivo el **Margen Actual (%)** sobre costo y la utilidad neta en dólares:
  $$\text{Margen (\%)} = \frac{PV - \text{Costo}}{\text{Costo}} \times 100 \quad \Big(\text{Utilidad Neta} = PV - \text{Costo}\Big)$$
- **Asistente Opcional de Precio Sugerido por Margen:** El usuario dispone de una opción activable (*"Calcular precio sugerido según margen deseado"*) donde ingresa libremente cualquier porcentaje de margen objetivo ($M\%$, sin tope, ej. `100%`, `150%`). El sistema calcula el precio sugerido:
  $$\text{Precio Venta Sugerido} = \text{Costo} \times \left(1 + \frac{M}{100}\right)$$
  Y permite aplicarlo directamente al campo `Precio de Venta` mediante el botón compacto **"Aplicar precio"**.
- **Nota / Información Adicional:** Campo de texto multilínea (`notes`) para registrar observaciones técnicas, ubicación en estante o notas internas del artículo.
- **Bimonetarismo Dual:** Todo cálculo desglosa simultáneamente su contravalor en Moneda Local (`VES`) según la tasa oficial activa del BCV (`tasa_bcv_id`).

### 1.5 Kárdex Transaccional y Ajustes de Stock en Línea
- **Kárdex Multidireccional:** Todo evento de almacén (Entrada por Compra, Salida por Venta, Merma/Deterioro, Devolución o Toma Física) genera un movimiento inmutable con: `Fecha`, `Documento Origen`, `Tipo de Movimiento`, `Cantidad Entrada/Salida`, `Saldo Continuo Resultante` y `Usuario Responsable`.
- **Ajustes de Inventario en Línea (`/inventory/adjustments`):** La tabla mantiene un diseño limpio sin scroll horizontal mostrando únicamente `#`, `Correlativo / Fecha`, `Artículo / SKU`, `Motivo de Auditoría`, `Stock Sistema`, `Conteo Real` y `Diferencia`. Al hacer clic en **`+ Nuevo`**, se inserta una fila editable directamente en la tabla para buscar el producto/SKU, elegir el motivo y escribir el **"Conteo Real"** (aplicable con `✓`, `Enter` o en lote con **"Aplicar Todo"**). Al hacer clic sobre cualquier movimiento histórico de la tabla, se despliega un Drawer lateral con todo el detalle del ajuste (impacto financiero USD/VES, costo unitario, responsable y observaciones).

### 1.6 Configuración de Categorías, Almacenes y Ubicaciones (`/inventory/settings/...`)
Bajo el submenú desplegable **Configuración** dentro de **Inventario**, se disponen dos vistas independientes:
- **Categorías de Productos (`/inventory/settings/categories`):** Permite crear, editar en línea y eliminar categorías con código prefijo (`TEX`, `HER`, `QUI`), nombre y descripción, mostrando cuántos artículos pertenecen a cada categoría y bloqueando la eliminación si existen productos asociados. Asimismo, los formularios de producto incluyen un botón rápido (`+`) para crear categorías al vuelo.
- **Almacenes y Ubicaciones (`/inventory/settings/warehouses`):** Opera bajo una relación **Padre-Hijo**: a la izquierda se administran los **Almacenes Físicos** (`Almacén Central`, `Depósito Sucursal Valencia`, etc.) y a la derecha se gestionan en línea sus **Ubicaciones Internas** (*Pasillos, Estantes, Recepción/Tránsito o Merma/Cuarentena*).

### 1.7 Operaciones de Almacén: Recepciones, Entregas y Transferencias Internas (`/inventory/operations/...`)
Bajo el submenú desplegable **Operaciones** dentro de **Inventario**, se agrupan todos los flujos operativos diarios de almacén:
- **Recepciones (`/inventory/operations/receipts`):** Órdenes de ingreso de mercancía desde proveedores (`IN/2026/XXXX`). Al validar una orden, incrementa el stock físico de cada variante procesada y genera automáticamente el asiento `PURCHASE_RECEIPT` en el Kárdex.
- **Órdenes de Entrega (`/inventory/operations/deliveries`):** Órdenes de salida y despacho de ventas hacia clientes (`OUT/2026/XXXX`). Al validar una orden, verifica disponibilidad de stock físico, descuenta las unidades despachadas y genera el asiento `SALE_DELIVERY` en el Kárdex.
- **Transferencias Internas (`/inventory/operations/transfers`):** Órdenes de traslado entre almacenes físicos o reubicación entre ubicaciones internas (`INT/2026/XXXX`), utilizando los almacenes y ubicaciones configurados en `/inventory/settings/warehouses` y dejando trazabilidad `INTERNAL_TRANSFER` en el Kárdex.
- **Ajustes de Stock (`/inventory/adjustments`):** Toma física y ajustes directos en línea por conteo o merma.

---

## 2. Regla de Localización Fiscal (Feature Flag R4)

Se mantiene y profundiza la configuración global del Feature Flag fiscal:
```typescript
export interface TenantFiscalConfig {
  enabled: boolean;          // Si es false, opera en modo neto universal
  authority: 'SENIAT' | 'NONE';
  defaultVATRate: '16' | '8' | '0' | 'EXEMPT';
}
```
- **Si `enabled === false` (Modo Neto Universal):**
  - Se ocultan badges de SENIAT y campos de retención impositiva.
  - La rentabilidad y precios operan como valores netos comerciales puros.
- **Si `enabled === true` (Modo SENIAT):**
  - Desglose transparente de alícuotas (`IVA 16%`, `IVA Reducido 8%`, `Exento`).
  - Cálculo visible: Base Gravada + Impuesto IVA = Total con Impuesto.
  - Indicador condicional de retención `applyISLR` para servicios profesionales o ítems sujetos a retención en facturación.

---

## 3. Arquitectura de Vistas, Navegación y Reutilización (Vuexy & Foundly)

### 3.1 Estructura de Submenús en el Menú Dual (Regla R5)
El menú lateral vertical (`verticalMenuData.tsx`) y el menú horizontal (`horizontalMenuData.tsx`) registran **Inventario** como un módulo con sub-rutas especializadas:

```text
📦 Inventario (tabler-packages) [Desplegable]
   ├── 📊 Panel Operativo                      -> /inventory
   ├── 🚜 Operaciones (tabler-forklift) [Submenú]
   │   ├── 📥 Recepciones                      -> /inventory/operations/receipts
   │   ├── 📤 Órdenes de Entrega               -> /inventory/operations/deliveries
   │   ├── 🔁 Transferencias Internas          -> /inventory/operations/transfers
   │   └── ⚖️ Ajustes de Stock                 -> /inventory/adjustments
   ├── 🏷️ Catálogo de Productos                -> /inventory/products
   ├── 🔄 Kárdex y Movimientos                 -> /inventory/kardex
   └── ⚙️ Configuración (tabler-settings) [Submenú]
       ├── 🗂️ Categorías de Productos          -> /inventory/settings/categories
       └── 🏢 Almacenes y Ubicaciones          -> /inventory/settings/warehouses
```

Rutas secundarias y dinámicas:
- `/inventory/products/[id]` ➔ Ficha Completa del Producto (con navegación secuencial `[ ◄ ] X / N [ ► ]`, pestañas y matriz).

### 3.2 Mapeo y Reutilización de Patrones (Regla R3)

| Vista / Sección | Patrón de Referencia Vuexy | Adaptación en Foundly Clean Light UI |
| :--- | :--- | :--- |
| **Dashboard Operativo (`/inventory`)** | `apps/ecommerce/dashboard` & `card-statistics` | Tarjetas KPI de operaciones (Recepciones pendientes, Entregas/Despachos de ventas, Alertas de reposición, Valoración USD/VES). Tarjetas blancas `#FFFFFF`, bordes `#E6E4F0` (20px radius). |
| **Operaciones: Recepciones, Entregas y Transferencias (`/inventory/operations/...`)** | `apps/logistics/orders` + `Drawer` | Vistas especializadas (`WarehouseOperationsListView.tsx`) por tipo (`RECEIPT`, `DELIVERY`, `INTERNAL_TRANSFER`) con tabla sin scroll horizontal, filtros por estado (`Listas`, `En Espera`, `Realizadas`), Drawer de creación multilínea con selector de almacén/ubicación origen y destino, y Drawer de detalle con botón `"Validar Operación"` que actualiza el stock y el Kárdex automáticamente. |
| **Catálogo de Productos (`/inventory/products`)** | `apps/ecommerce/products/list` | DataGrid paginada, filtros con altura estándar (38px), chip de alícuotas `16%`/`0%`, columna `#` compacta (28px), acción de editar que navega directo a la ficha completa y switch responsivo a tarjetas móviles (`InventoryMobileList`). |
| **Drawer de Vista Rápida** | `apps/ecommerce/products/list` (Quick View) | Slide-over lateral limpio de consulta con resumen financiero, chips de estado y matriz de variantes. |
| **Drawer de Creación de Producto** | `apps/ecommerce/products/add` | Drawer lateral amplio (`680px`) con selector de tipo (`Almacenable`, `Consumible`, `Servicio`), creación rápida de categorías (`+`), campos normales de Costo y Precio de Venta + opción activable de precio sugerido por margen (sin límite superior) con botón `"Aplicar precio"`, campo de nota (`notes`), generador de variantes y validación Zod. |
| **Ficha Completa de Producto (`/inventory/products/[id]`)** | `views/contacts/ContactDetailView` | Cabecera y layout 4/8 idéntico a Contactos (`← Volver`, título limpio, paginador `< X / N >`, `Cancelar`, `Guardar Cambios`, `🗑️ Eliminar`), edición en vivo de datos generales, costo/precio/margen, notas y pestañas (*General y Variantes*, *Kárdex del Producto*, *Precios y Margen*). |
| **Kárdex y Movimientos (`/inventory/kardex`)** | `apps/logistics/dashboard` (Data table) | Historial tabular de entradas/salidas con badges semánticos (verde entrada, carmesí salida, ámbar ajuste) y saldo continuo en tiempo real. |
| **Ajustes de Inventario en Línea (`/inventory/adjustments`)** | `apps/invoice/list` + `Drawer` | Vista limpia directo a filtros y tabla sin tarjetas KPI superiores ni columnas de impacto/observaciones que generen scroll horizontal. Botón **`+ Nuevo`** inserta filas editables en la tabla (buscador `<Autocomplete>` de producto/SKU, motivo y columna `"Conteo Real"` con guardado individual `✓`/`Enter` o masivo `"Aplicar Todo"`). Clic en cualquier movimiento abre un Drawer lateral con el detalle completo del ajuste. |
| **Categorías de Productos (`/inventory/settings/categories`)** | `apps/ecommerce/products/category` | Vista independiente exclusiva para categorías (`InventoryCategoriesView.tsx`) con buscador, conteo de artículos asociados y creación/edición en línea (`+ Nuevo`). |
| **Almacenes y Ubicaciones (`/inventory/settings/warehouses`)** | `apps/logistics/dashboard` | Vista independiente exclusiva (`InventoryWarehousesView.tsx`) en relación Padre-Hijo: tarjetas de almacenes físicos a la izquierda (`+ Nuevo Almacén`) y tabla editable en línea de sus ubicaciones internas a la derecha (`+ Nueva Ubicación`). |

---

## 4. Definición de Tipos e Interfaces (TypeScript) y Esquemas de Validación

### 4.1 Tipos del Dominio de Inventario (`src/types/inventoryTypes.ts`)
```typescript
export type ProductType = 'storable' | 'consumable' | 'service';

export type SENIAT_VATRate = '16' | '8' | '0' | 'EXEMPT';

export type StockMovementType =
  | 'PURCHASE_RECEIPT'   // Entrada por compra a proveedor
  | 'SALE_DELIVERY'      // Salida por venta / despacho
  | 'ADJUSTMENT_IN'      // Ajuste positivo (sobrante físico)
  | 'ADJUSTMENT_OUT'     // Ajuste negativo (merma / daño / pérdida)
  | 'INITIAL_INVENTORY'  // Carga inicial de inventario
  | 'INTERNAL_TRANSFER'; // Traslado entre almacenes

export type AdjustmentReason =
  | 'CONTEO_FISICO'
  | 'ROTURA_MERMA'
  | 'CADUCIDAD'
  | 'CONSUMO_INTERNO'
  | 'CORRECCION_SISTEMA';

export interface ProductAttributeValue {
  id: string;
  name: string; // ej: "Rojo", "Azul", "M", "L", "500ml"
}

export interface ProductAttribute {
  id: string;
  name: string; // ej: "Color", "Talla", "Capacidad"
  values: ProductAttributeValue[];
}

export interface ProductVariant {
  id: string;
  templateId: string;
  sku: string;
  barcode?: string;
  combinationValues: { attributeName: string; valueName: string }[];
  costPrice: number;
  priceExtra: number;
  physicalStock: number;
  reservedStock: number;
  availableStock: number; // physicalStock - reservedStock
}

export interface ProductTemplate {
  id: string;
  name: string;
  defaultCode: string; // SKU
  barcode?: string;
  productType: ProductType;
  uomCode: string; // 'un', 'kg', 'L', 'm', 'paquete'
  categoryName: string;
  tags: string[];
  canBeSold: boolean;
  canBePurchased: boolean;
  basePrice: number; // en USD
  standardCost: number; // en USD
  targetMargin?: number; // % margen deseado sugerido sin tope (ej. 35, 100, 150)
  imageUrl?: string;
  minStock?: number;
  notes?: string; // Nota / Información adicional del producto

  // Localización Fiscal (SENIAT)
  vatRate?: SENIAT_VATRate;
  applyISLR?: boolean;

  // Variantes
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  fecha: string; // ISO String
  producto_id: string;
  producto_nombre: string;
  variante_id?: string;
  variante_sku: string;
  uom_code: string;
  tipo_movimiento: StockMovementType;
  documento_referencia: string; // ej: "COT-2026-0042", "REC-0012", "AJU-2026-0001"
  cantidad_entrada: number;
  cantidad_salida: number;
  costo_unitario: number;
  saldo_resultante: number;
  motivo?: string;
  usuario_responsable: string;
}

export interface StockAdjustmentRecord {
  id: string;
  correlativo: string; // ej: "AJU-2026-0001"
  fecha: string;
  producto_id: string;
  producto_nombre: string;
  variante_id: string;
  variante_sku: string;
  uom_code: string;
  motivo: AdjustmentReason;
  observaciones?: string;
  stock_sistema: number;
  stock_contado: number;
  diferencia: number; // stock_contado - stock_sistema
  costo_unitario_usd: number;
  impacto_usd: number;
  usuario_responsable: string;
  estado: 'APPLIED';
}

export interface WarehouseOperationsDashboard {
  recepciones_pendientes: number;
  entregas_pendientes: number;
  articulos_stock_bajo: number;
  articulos_agotados: number;
  total_articulos_catalogo: number;
  valor_total_inventario_usd: number;
  valor_total_inventario_ves: number;
  tasa_bcv: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  code: string; // ej. "TEX", "HER", "QUI"
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface WarehouseLocation {
  id: string;
  warehouseId: string;
  code: string; // ej. "PAS-A-EST-01"
  name: string; // ej. "Pasillo A - Estante 1"
  type: 'INTERNAL' | 'TRANSIT' | 'SCRAP';
  notes?: string;
  isActive: boolean;
}

export interface Warehouse {
  id: string;
  code: string; // ej. "ALM-CENTRAL"
  name: string; // ej. "Almacén Central"
  address?: string;
  manager?: string;
  isDefault: boolean;
  isActive: boolean;
  locations: WarehouseLocation[];
  createdAt?: string;
}

export type WarehouseOperationType = 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER';

export type WarehouseOperationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'WAITING'
  | 'READY'
  | 'LATE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface WarehouseOperationLine {
  id: string;
  producto_id: string;
  producto_nombre: string;
  variante_id: string;
  variante_sku: string;
  uom_code: string;
  cantidad_demanda: number;
  cantidad_procesada: number;
  costo_unitario_usd: number;
}

export interface WarehouseOperationOrder {
  id: string;
  codigo: string; // ej. "IN/2026/0091", "OUT/2026/0042", "INT/2026/0015"
  tipo: WarehouseOperationType;
  estado: WarehouseOperationStatus;
  tercero_nombre: string;
  documento_origen?: string;
  almacen_origen_id?: string;
  almacen_origen_nombre: string;
  ubicacion_origen_nombre?: string;
  almacen_destino_id?: string;
  almacen_destino_nombre: string;
  ubicacion_destino_nombre?: string;
  fecha_programada: string;
  fecha_efectiva?: string;
  total_articulos: number;
  responsable: string;
  notas?: string;
  lineas: WarehouseOperationLine[];
  createdAt?: string;
}
```

### 4.2 Esquemas de Validación con Zod
```typescript
import { z } from 'zod';

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2, 'El SKU de la variante es obligatorio'),
  barcode: z.string().optional(),
  costPrice: z.number().min(0, 'El costo no puede ser negativo'),
  priceExtra: z.number().default(0),
  physicalStock: z.number().min(0, 'El stock físico inicial no puede ser negativo').default(0),
  combinationValues: z.array(
    z.object({
      attributeName: z.string(),
      valueName: z.string()
    })
  )
});

export const productFormSchema = z.object({
  name: z.string().min(3, 'El nombre del artículo debe tener al menos 3 caracteres'),
  defaultCode: z.string().min(2, 'El SKU es obligatorio'),
  barcode: z.string().optional(),
  productType: z.enum(['storable', 'consumable', 'service']),
  uomCode: z.string().min(1, 'La unidad de medida es requerida'),
  categoryName: z.string().min(2, 'La categoría es obligatoria'),
  tags: z.array(z.string()).default([]),
  canBeSold: z.boolean().default(true),
  canBePurchased: z.boolean().default(true),
  standardCost: z.number().min(0, 'El costo estándar no puede ser negativo'),
  targetMargin: z.number().min(0, 'El margen no puede ser negativo').optional(),
  basePrice: z.number().min(0, 'El precio base no puede ser negativo'),
  minStock: z.number().min(0).optional(),
  notes: z.string().optional(),
  vatRate: z.enum(['16', '8', '0', 'EXEMPT']).default('16'),
  applyISLR: z.boolean().default(false),
  variants: z.array(productVariantSchema).min(1, 'Debe incluir al menos una variante')
});

export const stockAdjustmentFormSchema = z.object({
  producto_id: z.string().min(1, 'Seleccione un producto'),
  variante_id: z.string().min(1, 'Seleccione una variante'),
  stock_contado: z.number().min(0, 'El stock físico contado no puede ser negativo'),
  motivo: z.enum(['CONTEO_FISICO', 'ROTURA_MERMA', 'CADUCIDAD', 'CONSUMO_INTERNO', 'CORRECCION_SISTEMA']),
  observaciones: z.string().max(250).optional()
});
```

---

## 5. Matriz de Requerimientos Funcionales en Sintaxis EARS

### 5.1 Requisitos Ubicuos (Universal)
- **EARS-UB-01 (Identidad Foundly Clean Light UI):** *The system shall* render all surfaces, cards, and data containers in pure white (`#FFFFFF`) with 1px lavender border (`#E6E4F0`), rounded corners of 20px, and prohibited dark cards or containers.
- **EARS-UB-02 (Geometría de Píldora):** *The system shall* render all primary/secondary buttons, filter buttons, badges, and status indicators with complete pill geometry (`rounded-full`, 9999px).
- **EARS-UB-03 (Bimonetarismo Dual con Tasa BCV):** *The system shall* display inventory valuation, product standard costs, and sale prices simultaneously in Base Currency (`USD`) and Local Currency (`VES`) based on the active official BCV rate.
- **EARS-UB-04 (Iconografía Vectorial Tabler):** *The system shall* strictly use vector Tabler Icons (`tabler-*`) for all categories, navigation items, and action buttons, completely avoiding emojis in UI controls.
- **EARS-UB-05 (Columna de Índice Compacta):** *The system shall* restrict the `#` index column in product and movement tables to `28px` with minimal horizontal padding (`px: 0.5`) to preserve horizontal workspace.
- **EARS-UB-06 (Etiquetas de Alícuota Monolínea):** *The system shall* render VAT tax indicators strictly in a single compact line displaying `16%` (gravado) or `0%` (exento / sin IVA) with fixed height `h-[22px]` (`whitespace-nowrap`, `leading-none`).
- **EARS-UB-07 (Submenús Duales de Navegación):** *The system shall* expose the Inventory module in both horizontal and vertical menus as an expandable parent containing: Panel Operativo (`/inventory`), el submenú anidado **Operaciones** con Recepciones (`/inventory/operations/receipts`), Órdenes de Entrega (`/inventory/operations/deliveries`), Transferencias Internas (`/inventory/operations/transfers`) y Ajustes de Stock (`/inventory/adjustments`), Catálogo de Productos (`/inventory/products`), Kárdex y Movimientos (`/inventory/kardex`), y el submenú anidado **Configuración** con Categorías de Productos (`/inventory/settings/categories`) y Almacenes y Ubicaciones (`/inventory/settings/warehouses`).
- **EARS-UB-08 (Estándar DataGrid Maestro en Catálogo y Operaciones):** *The system shall* equip the Product Catalog table and Warehouse Operations list with master indeterminate checkbox selection, individual row selection, dynamic column visibility selector (`Columnas`), and batch action controls (`Acciones` / `{N} seleccionados`).
- **EARS-UB-09 (Botón Primario Conciso "Nuevo"):** *The system shall* render the primary record creation button labeled strictly as `"Nuevo"` (or `"+ Nuevo"` with `tabler-plus`), avoiding verbose labels like `"Nueva Recepción"`, `"Nueva Entrega"`, or `"Nuevo Producto"`.
- **EARS-UB-10 (Encabezados Compactos):** *The system shall* restrict descriptive subtitles under section headers to short, single-line summaries to conserve screen real estate and prevent clutter.

### 5.2 Requisitos Basados en Eventos (Event-driven)
- **EARS-EV-01 (Sugerencia y Aplicación de Precio por Margen):** *WHEN* the user activates the margin suggestion option and enters any target margin percentage ($M\%$, sin tope superior), *the system shall* calculate the suggested price $\text{suggestedPrice} = \text{standardCost} \times (1 + M / 100)$ and, upon clicking `"Aplicar precio"`, copy that value into the `basePrice` field.
- **EARS-EV-02 (Cálculo en Vivo de Margen Actual):** *WHEN* the user enters or changes the product cost or sale price, *the system shall* immediately calculate and display the resulting profit margin percentage and net dollar profit.
- **EARS-EV-03 (Creación de Producto - HU3):** *WHEN* the user clicks `"Guardar Producto"` with a valid form, *the system shall* persist the new template and its variants in the inventory mock service, generate initial kárdex records for any non-zero initial stock, and emit a success Toast: *"Producto {name} registrado exitosamente"*.
- **EARS-EV-04 (Edición en Ficha Completa - HU3):** *WHEN* the user clicks the edit action on a product, *the system shall* navigate to `/inventory/products/[id]` (coherente con la cabecera y distribución 4/8 de Contactos: botón Volver, título limpio, paginador `< X / N >`, Cancelar, Guardar Cambios y Eliminar), allowing direct editing of general info, pricing, notes, and variants.
- **EARS-EV-05 (Generación de Matriz de Variantes):** *WHEN* the user configures attributes (ej. Tallas [S, M] y Colores [Azul, Blanco]), *the system shall* auto-generate the cartesian product of variants with suggested SKUs based on the master code (`{masterCode}-{TALLA}-{COLOR}`).
- **EARS-EV-06 (Registro de Ajuste de Stock en Línea - HU5):** *WHEN* the user clicks `"+ Nuevo"` in `/inventory/adjustments`, *the system shall* insert an editable row directly into the table where the user searches for the product/SKU, inputs the counted stock, and confirms either individually (`✓` / `Enter`) or in batch (`"Aplicar Todo"`), updating `physicalStock`, `availableStock`, and the Kárdex immediately.
- **EARS-EV-07 (Detalle de Ajuste al Hacer Clic - HU5):** *WHEN* the user clicks on any historical adjustment row in `/inventory/adjustments`, *the system shall* open a side Drawer displaying the complete audit details (correlativo, fecha, producto/SKU, comparativa de stock, impacto financiero en USD y VES, motivo, usuario responsable y observaciones).
- **EARS-EV-08 (Navegación Secuencial en Ficha - HU2):** *WHEN* the user clicks `[ ◄ ]` or `[ ► ]` in `/inventory/products/[id]`, *the system shall* load the previous or next product record preserving the active catalog filters.
- **EARS-EV-09 (Gestión de Categorías - HU6):** *WHEN* the user creates or renames a category in `/inventory/settings/categories` (or via the quick `+` button in product forms), *the system shall* persist the category in `localStorage` and automatically synchronize all products linked to that category.
- **EARS-EV-10 (Gestión Padre-Hijo de Almacenes y Ubicaciones - HU6):** *WHEN* the user selects a physical warehouse in `/inventory/settings/warehouses`, *the system shall* display its internal locations on the right panel and allow adding new shelf/aisle/zone locations inline (`+ Nueva Ubicación`).
- **EARS-EV-11 (Validación de Órdenes de Operación - HU7):** *WHEN* the user clicks `"Validar Operación"` inside a Receipt (`RECEIPT`), Delivery (`DELIVERY`), or Internal Transfer (`INTERNAL_TRANSFER`) order, *the system shall* transition the order status to `COMPLETED`, update `physicalStock` and `availableStock` accordingly (`+` on receipts, `-` on deliveries), and record the corresponding `StockMovement` (`PURCHASE_RECEIPT`, `SALE_DELIVERY`, or `INTERNAL_TRANSFER`) in the Kárdex.

### 5.3 Requisitos Basados en Estado (State-driven)
- **EARS-ST-01 (Desglose SENIAT Condicional - Feature Flag R4):** *WHILE* `fiscalEnabled` is `true`, *the system shall* display the SENIAT alícuota badge (`16%`, `8%`, `0%`, `Exento`) and compute the estimated VAT and final consumer price in both USD and VES.
- **EARS-ST-02 (Modo Neto Universal - Feature Flag R4):** *WHILE* `fiscalEnabled` is `false`, *the system shall* operate strictly in universal net mode ($\text{Precio Venta} = \text{Neto}$), hiding all tax chips and SENIAT mentions.
- **EARS-ST-03 (Omisión de Control Físico en Servicios):** *WHILE* a product has `productType === 'service'`, *the system shall* display `N/A` in stock cells, hide warehouse inventory metrics, and disable stock adjustments.
- **EARS-ST-04 (Alerta Visual de Stock Crítico):** *WHILE* a physical variant has `availableStock === 0`, *the system shall* display the badge `Agotado` in crimson `#EF4444`, and *WHILE* `availableStock <= minStock`, *the system shall* display `Stock Bajo` in amber `#F59E0B`.
- **EARS-ST-05 (Switch Móvil Responsivo < 768px):** *WHILE* the viewport width is less than 768px, *the system shall* automatically swap the catalog table into clean Foundly cards (`InventoryMobileList`) without horizontal scrollbars.
- **EARS-ST-06 (Skeletons Durante Carga):** *WHILE* the operational dashboard, product catalog or kárdex data is loading, *the system shall* render responsive skeleton loaders.

### 5.4 Requisitos de Excepción (Unwanted Behavior)
- **EARS-EX-01 (SKU Duplicado):** *IF* the user attempts to register a SKU or variant SKU that already exists in the catalog, *THEN the system shall* highlight the field in red `#EF4444` and block submission with an error: *"El SKU ya está en uso por otro artículo"*.
- **EARS-EX-02 (Margen Negativo):** *IF* the user enters a negative target margin ($< 0\%$), *THEN the system shall* clamp the input to `0`.
- **EARS-EX-03 (Stock Negativo en Ajuste):** *IF* the user attempts to enter a counted stock less than 0, *THEN the system shall* restrict the input field to non-negative values ($\ge 0$).
- **EARS-EX-04 (Artículo no Encontrado):** *IF* a user accesses `/inventory/products/[id]` with an invalid identifier, *THEN the system shall* render a friendly 404 card with a button labeled `"Volver al Catálogo"` without crashing the application.
- **EARS-EX-05 (Categoría en Uso):** *IF* the user attempts to delete a product category that has one or more associated products, *THEN the system shall* block deletion and display an error message indicating how many products use that category.
- **EARS-EX-06 (Stock Insuficiente en Orden de Entrega):** *IF* the user attempts to validate a Delivery order (`DELIVERY`) where a `storable` product line exceeds the current `physicalStock`, *THEN the system shall* block validation and display an error toast indicating the available stock.

---

## 6. Criterios de Aceptación (DoD) Comprobables por Historia de Usuario

### HU1: Centro de Mando y Dashboard Operativo (`/inventory`)
- [x] **CA-HU1-01:** La pantalla inicial `/inventory` muestra las métricas operativas del almacén: Recepciones pendientes, Despachos de ventas pendientes, Artículos en stock bajo y Artículos agotados.
- [x] **CA-HU1-02:** Muestra el bloque financiero de Valor Total del Inventario desglosado en USD y en VES con la tasa oficial BCV visible.
- [x] **CA-HU1-03:** Incluye botones de acceso rápido con diseño de píldora para `"Nuevo Producto"`, `"Ajuste Rápido"` y `"Consultar Kárdex"`.

### HU2: Catálogo de Productos y Vista Rápida Responsiva (`/inventory/products`)
- [x] **CA-HU2-01:** La ruta `/inventory/products` presenta la tabla con columnas: `#`, `Artículo / SKU`, `Tipo`, `Variantes`, `Stock Disponible`, `Costo / Venta`, `Alícuota IVA` (condicional), `Estado` y `Acciones`.
- [x] **CA-HU2-02:** Los filtros rápidos permiten filtrar por búsqueda universal, tipo de producto (`Almacenable`, `Consumible`, `Servicio`), categoría y estado de existencias.
- [x] **CA-HU2-03:** Al hacer clic en cualquier fila se abre el `InventoryQuickViewDrawer` limpio de consulta rápida, y al hacer clic en el botón de editar (`tabler-edit`) navega directamente a la ficha completa `/inventory/products/[id]`.
- [x] **CA-HU2-04:** En pantallas móviles (< 768px), la tabla cambia automáticamente a tarjetas estilizadas (`InventoryMobileList`).

### HU3: Creación y Edición de Artículos con Costo, Precio, Margen Sugerido y Notas
- [x] **CA-HU3-01:** El botón `"Nuevo Producto"` abre el formulario con validación Zod, campos directos de Costo y Precio de Venta, indicador de margen actual, creación rápida de categoría (`+`) y campo de Nota (`notes`).
- [x] **CA-HU3-02:** Incluye la opción activable para sugerir el precio de venta según cualquier porcentaje de margen deseado (sin límite superior, ej. `100%`) y aplicarlo con el botón compacto `"Aplicar precio"`.
- [x] **CA-HU3-03:** Permite configurar atributos dinámicos (Talla, Color, Capacidad) y generar automáticamente la matriz de variantes con SKUs diferenciados.
- [x] **CA-HU3-04:** La ficha completa (`/inventory/products/[id]`) respeta el diseño de cabecera y layout 4/8 de Contactos (`← Volver`, título limpio, paginador `< X / N >`, `Cancelar`, `Guardar Cambios` y `Eliminar`).

### HU4: Kárdex Transaccional y Trazabilidad (`/inventory/kardex`)
- [x] **CA-HU4-01:** La ruta `/inventory/kardex` muestra el historial cronológico de movimientos de inventario con filtros por producto y tipo de movimiento.
- [x] **CA-HU4-02:** Cada movimiento refleja claramente: `Fecha`, `Documento Origen`, `Tipo`, `Entrada/Salida`, `Saldo Resultante` y `Responsable`.

### HU5: Ajustes de Inventario en Línea y Detalle de Auditoría (`/inventory/adjustments`)
- [x] **CA-HU5-01:** La ruta `/inventory/adjustments` va directo a los filtros y la tabla limpia (sin tarjetas KPI superiores ni columnas de impacto/observaciones que generen scroll horizontal).
- [x] **CA-HU5-02:** El botón `"+ Nuevo"` inserta una fila en blanco editable en la tabla para buscar el producto/SKU con autocompletado, elegir el motivo y escribir la cantidad en `"Conteo Real"`, permitiendo aplicar fila por fila (`✓` o `Enter`) o en lote (`"Aplicar Todo"`).
- [x] **CA-HU5-03:** Al hacer clic en cualquier ajuste histórico de la tabla, se abre un Drawer lateral con todo el detalle del movimiento (impacto USD/VES, costo unitario, usuario responsable y observaciones).

### HU6: Configuración de Categorías y de Almacenes con Ubicaciones (`/inventory/settings/...`)
- [x] **CA-HU6-01:** El submenú `Inventario -> Configuración` expone dos apartados independientes: `Categorías de Productos` (`/inventory/settings/categories`) y `Almacenes y Ubicaciones` (`/inventory/settings/warehouses`).
- [x] **CA-HU6-02:** La vista exclusiva `/inventory/settings/categories` permite crear y editar categorías en línea, ver cuántos artículos tiene cada una y proteger contra el borrado de categorías en uso.
- [x] **CA-HU6-03:** La vista exclusiva `/inventory/settings/warehouses` muestra los almacenes físicos a la izquierda y permite gestionar en línea sus ubicaciones internas (pasillos, estantes, tránsito, merma) a la derecha.

### HU7: Operaciones de Almacén — Recepciones, Entregas y Transferencias Internas (`/inventory/operations/...`)
- [x] **CA-HU7-01:** El submenú `Inventario -> Operaciones` agrupa `Recepciones` (`/inventory/operations/receipts`), `Órdenes de Entrega` (`/inventory/operations/deliveries`), `Transferencias Internas` (`/inventory/operations/transfers`) y `Ajustes de Stock` (`/inventory/adjustments`).
- [x] **CA-HU7-02:** Cada vista operativa muestra sus órdenes por documento con filtros por estado (`Listas`, `En Espera`, `Realizadas`), flujo de almacén origen ➔ destino y sin scroll horizontal.
- [x] **CA-HU7-03:** Al hacer clic en cualquier orden se abre el Drawer de detalle donde se puede ajustar la cantidad procesada por línea y pulsar `"Validar Operación"`, actualizando el stock físico en el catálogo y asentando el movimiento en el Kárdex.
- [x] **CA-HU7-04:** Permite crear nuevas órdenes multilínea eligiendo almacén/ubicación origen y destino reales, con opción de `"Guardar p/ Procesar Luego"` o `"Crear y Validar Ahora"`.

---

## 7. Plan de Implementación Paso a Paso en Frontend (Completado)

1. **Fase 1: Enriquecimiento de Contratos y Mock Data**
   - Actualizado `src/types/inventoryTypes.ts` agregando `notes`, `ProductCategory`, `Warehouse`, `WarehouseLocation`, `WarehouseOperationOrder`, `WarehouseOperationLine`, tipos de Kárdex, Ajustes (`StockAdjustmentRecord`) y Esquemas Zod (`productFormSchema.ts`).
   - Actualizado `src/data/inventory/mockInventoryData.ts` y `src/services/inventoryService.ts` con persistencia reactiva en `localStorage`.

2. **Fase 2: Registro de Submenús en la Navegación (Regla R5)**
   - Actualizado `src/data/navigation/verticalMenuData.tsx` y `src/data/navigation/horizontalMenuData.tsx` con los submenús anidados `Operaciones` (`Recepciones`, `Órdenes de Entrega`, `Transferencias Internas`, `Ajustes de Stock`) y `Configuración` (`Categorías de Productos`, `Almacenes y Ubicaciones`).

3. **Fase 3: Centro de Mando y Dashboard Operativo (`/inventory`)**
   - Implementado `src/views/inventory/InventoryDashboard.tsx` como centro de operaciones con KPIs, alertas de reposición, flujo de operaciones en vivo y accesos directos.

4. **Fase 4: Catálogo Maestro de Productos (`/inventory/products`)**
   - Creada la ruta `src/app/(dashboard)/inventory/products/page.tsx` y `InventoryCatalogView.tsx`.
   - Configurados `InventoryTable.tsx`, `InventoryMobileList.tsx` y `ProductFormDrawer.tsx` con terminología limpia (`Almacenable`, `Consumible`, `Servicio`, `SKU`), creación rápida de categorías (`+`), sugerencia opcional de precio por margen sin tope y campo de notas.

5. **Fase 5: Kárdex Transaccional (`/inventory/kardex`)**
   - Creada `src/app/(dashboard)/inventory/kardex/page.tsx` y `InventoryKardexView.tsx`.

6. **Fase 6: Ajustes de Inventario en Línea (`/inventory/adjustments`)**
   - Creada `src/app/(dashboard)/inventory/adjustments/page.tsx` e `InventoryAdjustmentsView.tsx` con filas editables en línea (`+ Nuevo`), guardado individual/masivo y Drawer de detalle al hacer clic en cualquier movimiento.

7. **Fase 7: Ficha Completa del Producto (`/inventory/products/[id]`)**
   - Refactorizado `InventoryDetailView.tsx` con la cabecera y distribución 4/8 de Contactos, navegación secuencial `< X / N >`, edición completa y eliminación con confirmación.

8. **Fase 8: Configuración Separada de Categorías y Almacenes/Ubicaciones (`/inventory/settings/...`)**
   - Creadas las vistas independientes `InventoryCategoriesView.tsx` (`/inventory/settings/categories`) e `InventoryWarehousesView.tsx` (`/inventory/settings/warehouses`).

9. **Fase 9: Submenú de Operaciones — Recepciones, Entregas y Transferencias Internas (`/inventory/operations/...`)**
   - Creado `WarehouseOperationsListView.tsx` y las rutas `/inventory/operations/receipts`, `/inventory/operations/deliveries` y `/inventory/operations/transfers` con creación multilínea, selección de almacén/ubicación origen y destino, y validación en vivo contra el stock del catálogo y el Kárdex.

