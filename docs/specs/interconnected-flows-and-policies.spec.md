# Especificación Formal: Interconexión de Flujos Operativos y Políticas de Facturación y Entrega (Ventas, Compras, Inventario y Contabilidad)

- **ID de Spec:** SPEC-009
- **Épica:** Interconexión Integral del ERP (Ventas ➔ Inventario ➔ Compras ➔ Contabilidad) y Motor de Políticas de Facturación y Entrega
- **Estado:** Propuesta (Esperando Aprobación del Usuario)
- **Fecha:** 2026-10-20
- **Autor:** Antigravity (Pair Programming con Usuario)
- **Marco Metodológico:** Spec-Driven Development (SDD) conforme a `agent.md` y `constitution.md`.

---

## 1. Contexto, Objetivos y Jerarquía de Políticas

### 1.1 Contexto de Negocio
Para que el ERP Foundly opere como un sistema integral de nivel empresarial (estilo Odoo / SAP), los documentos no deben existir como silos desconectados. 
Una venta o compra debe ser capaz de:
1. Disparar su correspondiente movimiento en **Almacén** (Orden de Entrega o Recepción).
2. Disparar su correspondiente registro en **Contabilidad** (Factura de Venta o Factura de Proveedor con sus cuentas CxC/CxP).
3. **Controlar estrictamente las cantidades a facturar** según la naturaleza de cada producto mediante **Políticas de Facturación y Entrega**.

### 1.2 Regla de Negocio: Jerarquía de Políticas (General vs. Por Producto)
El usuario ha establecido explícitamente:
> *"Necesitamos lo que son las políticas de entrega y políticas de facturación que eso debe estipularse por producto y también tener una opción que sea general, pero si un producto tiene una diferente a esa, que tome la del producto."*

Esta jerarquía se modela de la siguiente manera:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. POLÍTICA POR PRODUCTO (Específica del Producto en Catálogo)│
│    Valores: 'DEFAULT' (Heredar) | 'ORDERED' | 'DELIVERED'   │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ¿El producto tiene 'DEFAULT'?
                               │
                   ┌───────────┴───────────┐
                   │ SÍ                    │ NO
                   ▼                       ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │ 2. POLÍTICA GENERAL       │   │ SE APLICA LA DEL PRODUCTO │
    │    (Ajustes del Sistema)  │   │ (Sobrescribe la general)  │
    └───────────────────────────┘   └───────────────────────────┘
```

#### A. Política de Facturación en Ventas (`Invoicing Policy`):
- **`ORDERED` (Sobre cantidades pedidas / ordenadas):** Se puede emitir la factura del cliente inmediatamente tras la confirmación de la venta, incluso antes del despacho. (Estándar para servicios, licencias, anticipos o ventas de mostrador).
- **`DELIVERED` (Sobre cantidades entregadas):** Solo se puede facturar lo que el almacén ya haya despachado y validado en la Orden de Entrega (`WarehouseOperationOrder: DELIVERY`). Si se pidieron 10 unidades y se entregaron 4, el sistema factura únicamente 4.

#### B. Política de Control en Compras (`Purchase Control Policy`):
- **`ORDERED` (Sobre cantidades pedidas / ordenadas):** Se puede registrar la Factura de Proveedor con base en lo ordenado en la Orden de Compra.
- **`RECEIVED` (Sobre cantidades recibidas):** Solo se puede registrar la Factura de Proveedor con base en lo que Almacén haya contado y validado en la Recepción (`WarehouseOperationOrder: RECEPTION`).

#### C. Política de Entrega / Despacho (`Delivery Policy`):
- **`ALL_AT_ONCE` (Entregar todo junto):** Se despacha cuando todo el pedido esté disponible.
- **`PARTIAL` (Permitir entregas parciales):** Se pueden generar entregas y conduces sucesivos a medida que haya disponibilidad.

---

## 2. Delimitación Estricta de Alcance (Boundary)

1. **Capa Frontend (`forge-front`):**
   - Interconexión implementada a nivel de servicios cliente (`salesQuotesService.ts`, `purchasesService.ts`, `inventoryService.ts`, `accountingService.ts`, `settingsService.ts`) con reactividad instantánea en `localStorage`.
   - Soporte para migración directa a GraphQL Mutations cuando el backend esté disponible.
2. **Identidad Visual Foundly Clean Light UI (`constitution.md`):**
   - Fondos `#FFFFFF`, bordes `1px #E6E4F0`, radios de `20px` a `24px`.
   - Botones primarios en píldora (`rounded-full`), morado `#6C5CE7`, verde `#10B981` y carmesí `#EF4444`.
   - Íconos vectoriales Tabler (`tabler-*`), cero emojis en controles.

---

## 3. Definición de Tipos y Contratos de Datos (TypeScript)

### 3.1 Tipos de Políticas
```typescript
// En src/types/policyTypes.ts o en los respectivos archivos de dominio:

export type SalesInvoicingPolicy = 'ORDERED' | 'DELIVERED';
export type PurchaseControlPolicy = 'ORDERED' | 'RECEIVED';
export type DeliveryPolicy = 'ALL_AT_ONCE' | 'PARTIAL';

export type ProductInvoicingPolicyOption = 'DEFAULT' | SalesInvoicingPolicy;
export type ProductPurchaseControlOption = 'DEFAULT' | PurchaseControlPolicy;
```

### 3.2 Extensión de Ajustes Generales (`src/types/settingsTypes.ts`)
```typescript
export interface CommercialPoliciesSettings {
  salesInvoicingPolicyDefault: SalesInvoicingPolicy;      // Default: 'ORDERED'
  purchaseControlPolicyDefault: PurchaseControlPolicy;    // Default: 'ORDERED'
  deliveryPolicyDefault: DeliveryPolicy;                  // Default: 'PARTIAL'
}
```

### 3.3 Extensión de Productos en Catálogo (`src/types/inventoryTypes.ts`)
```typescript
export interface ProductTemplate {
  // ... campos existentes ...
  invoicingPolicy?: ProductInvoicingPolicyOption;         // Default: 'DEFAULT'
  purchaseControlPolicy?: ProductPurchaseControlOption;   // Default: 'DEFAULT'
  deliveryPolicy?: DeliveryPolicy;                        // Default: 'PARTIAL'
}
```

### 3.4 Trazabilidad de Cantidades en Líneas de Venta y Compra
```typescript
// En src/types/salesTypes.ts:
export interface QuoteItem {
  // ... campos existentes ...
  cantidad_entregada?: number;  // Despachada efectivamente por almacén
  cantidad_facturada?: number;  // Facturada efectivamente en contabilidad
}

// En src/types/purchasesTypes.ts:
export interface PurchaseQuoteLine {
  // ... campos existentes ...
  cantidad_recibida?: number;   // Recibida efectivamente por almacén
  cantidad_facturada?: number;  // Facturada en cuentas por pagar
}
```

---

## 4. Matriz de Requisitos en Sintaxis EARS

### 4.1 Resolución de Políticas (Jerarquía)
- **EARS-POL-01 (Ubiquitous):** *The system shall* determine the effective invoicing policy for any product line by checking the product's individual setting first (`invoicingPolicy !== 'DEFAULT'`); if set to `'DEFAULT'` or undefined, *the system shall* fall back to the system's global `salesInvoicingPolicyDefault`.
- **EARS-POL-02 (Ubiquitous):** *The system shall* determine the effective purchase control policy for any product line by checking the product's individual setting first (`purchaseControlPolicy !== 'DEFAULT'`); if set to `'DEFAULT'` or undefined, *the system shall* fall back to the system's global `purchaseControlPolicyDefault`.

### 4.2 Interconexión Ventas ➔ Facturación (`/sales` ➔ `/accounting/invoices`)
- **EARS-S2I-01 (Event-driven):** *WHEN* the user clicks `"Crear Factura"` in an approved sales quote/order (`/sales/quotes/[id]`), *the system shall* evaluate the effective invoicing policy for each line.
- **EARS-S2I-02 (State-driven):** *WHILE* a line has effective policy `'ORDERED'`, *the system shall* set the billable quantity to `(cantidad_ordenada - cantidad_facturada)`.
- **EARS-S2I-03 (State-driven):** *WHILE* a line has effective policy `'DELIVERED'`, *the system shall* set the billable quantity to `(cantidad_entregada - cantidad_facturada)`.
- **EARS-S2I-04 (Unwanted Behavior):** *IF* all items in the order require prior delivery (`DELIVERED`) and `cantidad_entregada === 0`, *THEN the system shall* prevent invoice creation, displaying an informative alert: *"No existen cantidades entregadas pendientes por facturar según la política del producto. Debe validar la entrega en almacén antes de facturar."*
- **EARS-S2I-05 (Event-driven):** *WHEN* billable quantities are validated, *the system shall* navigate to `/accounting/invoices` pre-populating customer, client's default CxC account, BCV rate, product lines and origin document reference (`COT-2026-xxxx`).

### 4.3 Interconexión Ventas ➔ Almacén (`/sales` ➔ `/inventory/operations/delivery`)
- **EARS-S2W-01 (Event-driven):** *WHEN* a sales quote is approved or converted to order with storable items, *the system shall* display a primary action button `"Generar Despacho / Entrega"`.
- **EARS-S2W-02 (Event-driven):** *WHEN* the user clicks `"Generar Despacho / Entrega"`, *the system shall* create a `WarehouseOperationOrder` of type `'DELIVERY'` in `/inventory/operations/delivery` linked to the sales document, with status `'READY'`.
- **EARS-S2W-03 (State-driven):** *WHILE* an active delivery order exists, *the system shall* render a smart pill badge in the quote detail view: `Despacho: OUT-2026-xxxx [Ver Despacho]`.
- **EARS-S2W-04 (Event-driven):** *WHEN* the warehouse team validates the delivery order (`estado: 'DONE'`), *the system shall* update `cantidad_entregada` on the sales quote, unlocking billable quantities for `'DELIVERED'` products.

### 4.4 Interconexión Compras ➔ Almacén (`/purchases` ➔ `/inventory/operations/reception`)
- **EARS-P2W-01 (Event-driven):** *WHEN* a purchase order is approved, *the system shall* render the button `"Recibir Productos"`.
- **EARS-P2W-02 (Event-driven):** *WHEN* clicked, *the system shall* generate a `WarehouseOperationOrder` of type `'RECEPTION'` in `/inventory/operations/reception` linked to the purchase correlative, with status `'READY'`.
- **EARS-P2W-03 (Event-driven):** *WHEN* the warehouse validates the reception (`estado: 'DONE'`), *the system shall* increase physical stock in inventory, update average cost and record `cantidad_recibida` on the purchase order lines.

### 4.5 Interconexión Compras ➔ Facturación (`/purchases` ➔ `/accounting/invoices`)
- **EARS-P2I-01 (Event-driven):** *WHEN* the user clicks `"Crear Factura de Proveedor"` in a purchase order, *the system shall* evaluate the effective control policy for each line.
- **EARS-P2I-02 (State-driven):** *WHILE* a line has effective policy `'RECEIVED'`, *the system shall* set the billable quantity to `(cantidad_recibida - cantidad_facturada)`.
- **EARS-P2I-03 (Unwanted Behavior):** *IF* all items require prior reception and `cantidad_recibida === 0`, *THEN the system shall* block invoice generation with an explicit notice: *"No hay cantidades recibidas pendientes de facturar según la política de control de compra. Debe recibir la mercancía en almacén previamente."*
- **EARS-P2I-04 (Event-driven):** *WHEN* billable quantities exist, *the system shall* navigate to `/accounting/invoices?type=SUPPLIER` pre-loading supplier, default CxP account, BCV rate and lines.

### 4.6 Gestión de Políticas en Configuración y Catálogo
- **EARS-SET-01 (Ubiquitous):** *The system shall* render in `/settings` (pestaña Empresa o Comercial) los selectores para la política general de facturación de ventas y control de compras.
- **EARS-PRD-01 (Ubiquitous):** *The system shall* render in the product form drawer (`ProductFormDrawer.tsx`) an accordion or section `"Políticas de Facturación y Control"` allowing the user to select:
  - *Política de Venta:* `[Heredar del Sistema (General)]`, `[Facturar Cantidades Pedidas]`, `[Facturar Cantidades Entregadas]`.
  - *Política de Compra:* `[Heredar del Sistema (General)]`, `[Controlar sobre Cantidades Pedidas]`, `[Controlar sobre Cantidades Recibidas]`.

---

## 5. Criterios de Aceptación (BDD)

### Escenario 1: Venta con Política "Facturar sobre cantidades pedidas"
```gherkin
GIVEN un producto "Servicio de Asesoría Técnica" con política "ORDERED"
  AND una cotización aprobada por 5 unidades a $100 c/u
WHEN el usuario hace clic en "Crear Factura" sin haber realizado entregas de almacén
THEN el sistema abre la Factura de Cliente prellenada por las 5 unidades ($500 + IVA)
  AND vincula la factura con la cotización origen.
```

### Escenario 2: Venta de producto físico con Política "Facturar sobre cantidades entregadas" (Bloqueo previo a entrega)
```gherkin
GIVEN un producto físico "Tubería PVC 4 pulgadas" con política "DELIVERED"
  AND una cotización aprobada por 20 unidades
  AND el almacén aún no ha validado ninguna entrega (cantidad_entregada = 0)
WHEN el usuario intenta hacer clic en "Crear Factura"
THEN el sistema muestra una advertencia informativa:
  "No hay cantidades entregadas disponibles para facturar. Debe despachar en almacén primero."
  AND no permite crear la factura en blanco.
```

### Escenario 3: Venta con entrega parcial y facturación sobre entregas
```gherkin
GIVEN el pedido anterior de 20 unidades de "Tubería PVC"
WHEN el usuario hace clic en "Generar Despacho / Entrega"
  AND el almacén valida una entrega parcial de 8 unidades (OUT-2026-0001)
WHEN el usuario regresa a la venta y hace clic en "Crear Factura"
THEN el sistema genera la Factura de Cliente calculada exactamente sobre las 8 unidades entregadas
  AND indica que restan 12 unidades pendientes por entregar y facturar.
```

### Escenario 4: Compra con recepción y facturación de proveedor
```gherkin
GIVEN una orden de compra aprobada a un proveedor por 50 unidades de materia prima
  AND la política del producto es "Controlar sobre cantidades recibidas (RECEIVED)"
WHEN el usuario hace clic en "Recibir Productos"
  AND almacén confirma la recepción de las 50 unidades (IN-2026-0001)
THEN el stock físico aumenta inmediatamente en 50 unidades
WHEN el usuario hace clic en "Crear Factura de Proveedor"
THEN el sistema abre la Factura de Proveedor (CxP) por las 50 unidades con la cuenta CxP del proveedor preseleccionada.
```

---

## 6. Plan de Implementación Paso a Paso

1. **Paso 1: Tipos y Esquemas (`src/types/`)**
   - Incorporar tipos de políticas en `inventoryTypes.ts`, `settingsTypes.ts`, `salesTypes.ts` y `purchasesTypes.ts`.
2. **Paso 2: Configuración General y Catálogo de Productos**
   - Agregar campos de políticas generales en `settingsService.ts`.
   - Agregar campos de política en `ProductFormDrawer.tsx` y seeds de `mockInventoryData.ts`.
3. **Paso 3: Motor de Evaluación de Políticas (Helper Utility)**
   - Crear función `resolveEffectiveInvoicingPolicy(product, generalSettings)` y `calculateBillableLines(...)`.
4. **Paso 4: Puente Ventas ➔ Facturación e Inventario**
   - Actualizar `salesQuotesService.ts` y `QuoteDetailView.tsx` con botones `"Crear Factura"` y `"Generar Despacho"`, y badges vinculados.
5. **Paso 5: Puente Compras ➔ Facturación e Inventario**
   - Actualizar `purchasesService.ts` y `PurchaseDetailView.tsx` con botones `"Crear Factura de Proveedor"` y `"Recibir Productos"`, y badges vinculados.
6. **Paso 6: Recepción de Contexto en `InvoiceFormView.tsx`**
   - Soporte para parámetros de precarga desde Ventas (`?from_quote=id`) o Compras (`?from_purchase=id`).
7. **Paso 7: Verificación de Tipos y Calidad**
   - `npx tsc --noEmit` con **cero errores** y verificación de flujos en navegador.
