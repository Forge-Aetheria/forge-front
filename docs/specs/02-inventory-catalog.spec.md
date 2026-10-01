# Especificación: Módulo de Inventario y Catálogo Maestro ERP (Frontend)

- **ID de Spec:** SPEC-002
- **Estado:** Propuesta (Esperando revisión del usuario)
- **Fecha:** 2026-09-28
- **Alcance:** Exclusivamente Frontend (Desacoplado, mock data y capa de servicio tipada).
- **Objetivo:** Maquetar e implementar el catálogo maestro de inventario para un ERP general multi-tenant, permitiendo listar, filtrar e inspeccionar productos y servicios bajo el patrón *Product Template vs. Product Variant*, con experiencia híbrida (Tabla principal + Drawer de vista rápida) y soporte de localización fiscal (SENIAT) gobernado modularmente por Feature Flags.

---

## 1. Contexto de Negocio y Dominio

El módulo debe ser capaz de gestionar cualquier categoría de producto (indumentaria, maquinaria/herramientas, químicos/líquidos, materias primas, consumibles de oficina y servicios profesionales).

### 1.1 Clasificación en 3 Niveles (Estricta)
1. **Almacenable (`storable`):** Control estricto de existencias físicas y Kárdex transaccional.
2. **Consumible (`consumable`):** Entradas y salidas directas sin bloqueo rígido de inventario.
3. **Servicio (`service`):** Bien intangible (mano de obra, fletes, consultoría), no altera inventario físico.

### 1.2 Comportamiento Operativo
- Booleano `can_be_sold`: Define si el ítem es visible para módulos de Venta/Facturación.
- Booleano `can_be_purchased`: Define si el ítem es visible para módulos de Compras/Proveedores.

### 1.3 Patrón Template vs. Variant
- **Plantilla (`ProductTemplate`):** Representa el concepto general del producto (categoría, unidad de medida base, tipo, tags, precio base de venta).
- **Variante Concreta (`ProductVariant`):** Representa el ítem físico individual almacenable con su propio SKU, Código de barras (EAN/UPC), costo específico, precio extra diferencial (`price_extra`) y stock físico real.
- **Cálculo de Precio de Venta Final:**
  $$\text{Precio Venta Final} = \text{template.base\_price} + \text{variant.price\_extra}$$
- **Métricas de Stock (asociadas a la variante):**
  $$\text{Stock Disponible} = \text{Stock Físico} - \text{Stock Reservado}$$

---

## 2. Regla de Localización Fiscal (Feature Flag)

Para cumplir con la **Regla R4 de `agent.md`**:
- El sistema cuenta con una configuración global de localización:
  ```typescript
  interface TenantFiscalConfig {
    enabled: boolean          // Si está apagado, todo opera en modo neto universal
    authority: 'SENIAT' | 'NONE'
    defaultVATRate?: '16' | '8' | '0' | 'EXEMPT'
  }
  ```
- **Si `enabled === false`:**
  - No se muestran badges ni selectores de alícuotas del SENIAT.
  - Los costos, precios y márgenes se muestran como valores netos estándar:
    $$\text{Margen (\%)} = \frac{\text{Precio Venta} - \text{Costo}}{\text{Precio Venta}} \times 100$$
- **Si `enabled === true`:**
  - Se visualizan los chips de alícuota del SENIAT (`IVA 16%`, `IVA Reducido 8%`, `Exento`).
  - Se visualiza el cálculo desglosado: Base imponible, Impuesto y Precio Total con IVA.

---

## 3. UI/UX y Navegación Híbrida

### 3.1 Estructura de la Pantalla Principal (`/inventory`)
1. **KPI Cards superiores (Reutilizando `card-statistics` de `Archivador/full-version`):**
   - Total Productos Registrados (con desglose de almacenables y servicios).
   - Valor Total del Inventario Físico.
   - Ítems en Alerta de Stock Bajo / Reposición.
   - Ítems Agotados / Sin Existencias.
2. **Barra de Búsqueda y Filtros Rápidos (Reutilizando patrón de `TableFilters`):**
   - Buscador universal (por Nombre, SKU, Código de barras o Tags).
   - Filtro por Tipo (`Todos`, `Almacenable`, `Consumible`, `Servicio`).
   - Filtro Operativo (`Para la Venta`, `Para la Compra`).
   - Filtro por Categoría y Estado de Stock.
3. **Data Table Principal:**
   - **Columnas:**
     - Checkbox de selección múltiple.
     - **Artículo:** Imagen miniatura, Nombre de la plantilla, Código interno principal, badges de tags.
     - **Tipo:** Badge visual (`Almacenable` = primario, `Consumible` = info, `Servicio` = secondary).
     - **Variantes:** Badge indicando `Simple` o `N Variantes` (clickeable para desplegar en drawer).
     - **Stock Disponible:** Formateado con su UdM (`120 un`, `45.5 L`, `12 kg`).
     - **Costo / Precio Venta:** Formato monetario con indicador de margen %.
     - **Alícuota IVA:** *(Condicional si Feature Flag está activo)* Badge `IVA 16%`, `Exento`, etc.
     - **Estado:** Badge semántico (`En Stock`, `Bajo Stock`, `Agotado`).
     - **Acciones:** Menú `•••` (Ver Ficha Completa, Ajuste rápido, Editar).

### 3.2 Drawer Lateral de Vista Rápida (*Quick View Slide-over*)
- **Disparador:** Se abre inmediatamente al hacer clic en cualquier fila de la tabla o en el badge de variantes.
- **Contenido del Drawer:**
  - Cabecera con imagen destacada, SKU, nombre y botón **[ Abrir Ficha Completa ↗ ]** hacia `/inventory/[id]`.
  - Tarjetas de resumen: Tipo de producto, UdM, Operatividad (Venta/Compra).
  - Bloque financiero: Costo, Precio de venta, Margen % y alícuota fiscal (si aplica).
  - **Matriz de Variantes:** Subtabla interactiva que lista cada combinación de variante:
    - Combinación (ej: `Talla: L / Color: Azul` o `Capacidad: 5L`).
    - SKU propio de la variante.
    - Código de barras EAN/UPC.
    - Stock Físico vs. Reservado vs. Disponible.
    - Precio Final de la variante (`base_price + price_extra`).

---

## 4. Arquitectura de Archivos y Componentes Reutilizados

Siguiendo la **Regla R3 de `agent.md`**, reutilizaremos los componentes nativos de `Archivador/full-version`:

```text
src/
├── app/(dashboard)/inventory/
│   ├── page.tsx                             <-- Página /inventory
│   └── [id]/page.tsx                        <-- Página /inventory/[id] (Ficha completa)
│
├── components/
│   ├── card-statistics/                     <-- [COPIADO DE FULL-VERSION] Tarjetas KPI
│   │   └── HorizontalWithSubtitle.tsx
│   └── TablePaginationComponent.tsx         <-- [COPIADO DE FULL-VERSION] Paginador estándar
│
├── views/inventory/
│   ├── InventoryStatsCards.tsx              <-- Renderiza los 4 KPIs usando HorizontalWithSubtitle
│   ├── InventoryTableFilters.tsx            <-- Filtros rápidos y buscador
│   ├── InventoryTable.tsx                   <-- Tabla basada en estilos de Table.module.css
│   └── InventoryQuickViewDrawer.tsx         <-- Drawer lateral con Matriz de Variantes
│
├── data/inventory/
│   └── mockInventoryData.ts                 <-- Datos realistas de prueba (ropa, herramientas, líquidos, servicios)
│
├── services/
│   └── inventoryService.ts                  <-- Capa de servicio abstracta (preparada para futuro backend)
│
└── types/
    └── inventoryTypes.ts                    <-- Contrato de datos TypeScript
```

---

## 5. Modelos de Datos TypeScript (`src/types/inventoryTypes.ts`)

```typescript
export type ProductType = 'storable' | 'consumable' | 'service'
export type SENIAT_VATRate = '16' | '8' | '0' | 'EXEMPT'

export interface ProductAttributeValue {
  id: string
  name: string // ej: "Rojo", "Azul", "L", "XL", "5L"
}

export interface ProductAttribute {
  id: string
  name: string // ej: "Color", "Talla", "Volumen"
  values: ProductAttributeValue[]
}

export interface ProductVariant {
  id: string
  templateId: string
  sku: string
  barcode?: string
  combinationValues: { attributeName: string; valueName: string }[]
  costPrice: number
  priceExtra: number       // Adicional sobre base_price
  physicalStock: number
  reservedStock: number
  availableStock: number   // physicalStock - reservedStock
}

export interface ProductTemplate {
  id: string
  name: string
  defaultCode: string      // SKU principal
  barcode?: string
  productType: ProductType
  uomCode: string          // 'un', 'kg', 'L', 'm', 'paquete'
  categoryName: string
  tags: string[]
  canBeSold: boolean
  canBePurchased: boolean
  basePrice: number
  standardCost: number
  imageUrl?: string
  
  // Localización Fiscal (SENIAT) - Opcional
  vatRate?: SENIAT_VATRate
  applyISLR?: boolean
  
  // Variantes
  attributes: ProductAttribute[]
  variants: ProductVariant[]
}
```

---

## 6. Criterios de Aceptación

- [ ] La ruta `/inventory` carga la vista con KPIs, filtros y tabla de productos.
- [ ] Se listan productos de diversos rubros (ropa con variantes, líquidos en litros, herramientas y servicios intangibles).
- [ ] La tabla muestra badges distintivos para `storable`, `consumable` y `service`.
- [ ] Al hacer clic en una fila, se despliega el **Drawer lateral derecho** con la ficha rápida y la **Matriz de Variantes** detallada.
- [ ] El Drawer y la fila incluyen un enlace para navegar a la ficha completa `/inventory/[id]`.
- [ ] Existe un Feature Flag para activar/desactivar la visualización y cálculos de impuestos (SENIAT), funcionando de forma transparente en ambos modos.
- [ ] Se reutilizan los componentes de `Archivador/full-version` (`card-statistics`, `TablePaginationComponent`).
- [ ] La navegación en la barra lateral (tanto en lista como en la nueva grilla táctil) incluye el acceso directo a **Inventario**.
- [ ] TypeScript compila con 0 errores (`tsc --noEmit`).
- [ ] Cero código muerto o dependencias externas innecesarias.

---

## 7. Plan de Implementación Paso a Paso

1. **Fase 1: Contratos y Mock Data:**
   * Crear `src/types/inventoryTypes.ts` y `src/data/inventory/mockInventoryData.ts` con catálogo variado.
   * Crear `src/services/inventoryService.ts` con soporte de Feature Flag fiscal.
2. **Fase 2: Componentes Reutilizados de la Plantilla:**
   * Copiar `card-statistics/HorizontalWithSubtitle.tsx` y `TablePaginationComponent.tsx` desde `Archivador/full-version`.
3. **Fase 3: Maquetación de la Vista Principal:**
   * Crear `InventoryStatsCards.tsx`, `InventoryTableFilters.tsx` e `InventoryTable.tsx`.
4. **Fase 4: Drawer Lateral y Matriz de Variantes:**
   * Crear `InventoryQuickViewDrawer.tsx` con soporte de visualización de variantes y desglose financiero condicional.
5. **Fase 5: Rutas y Navegación:**
   * Crear `src/app/(dashboard)/inventory/page.tsx` y `src/app/(dashboard)/inventory/[id]/page.tsx`.
   * Registrar "Inventario" en `src/data/navigation/verticalMenuData.tsx`.
6. **Fase 6: Verificación de Calidad:**
   * Validar compilación TypeScript estricta y limpieza del repositorio.
