# Especificación: Módulo de Punto de Venta (POS) Multi-Tenant Bimoneda

- **ID de Spec:** SPEC-003
- **Estado:** Propuesta (En desarrollo)
- **Fecha:** 2026-10-01
- **Alcance:** Frontend (Terminal de Venta Táctil, Motor de Cobro Mixto con IGTF 3%, Gestión de Turnos/Arqueos, Offline-First).
- **Objetivo:** Diseñar e implementar el módulo de Punto de Venta (POS) para el ERP `forge-front`, enfocado en la operativa comercial y fiscal de Venezuela (operaciones bimoneda USD/Bs, tasa BCV, cálculo dinámico de IGTF del 3%, modo dual fiscal/nota de entrega, resolución de vuelto multiformato y tickets en espera).

---

## 1. Contexto de Negocio y Requisitos Operativos

El módulo está diseñado para operar con alta velocidad (<50ms por acción) en puntos de venta retail, supermercados, ferreterías, farmacias y comercio general.

### 1.1 Dinámica Bimoneda y Tasa BCV
- **Moneda Base del Catálogo:** USD (dólares americanos).
- **Conversión Oficial en Vivo:** Conversión a Bolívares (VES) mediante la Tasa Oficial del Banco Central de Venezuela (BCV), congelada históricamente por cada transacción de venta.
- **Doble visualización obligatoria:** Todo precio unitario, subtotal, impuesto y total se visualiza simultáneamente en USD y en Bs.

### 1.2 Modo Operativo Dual
El terminal soporta dos modalidades conmutables en 1 clic:
1. **Modo A: Facturación Fiscal Legal (Factura ON):**
   - Desglose estricto de alícuotas SENIAT (IVA General 16%, Reducido 8%, Exento).
   - Aplicación selectiva del **IGTF del 3%** en pagos recibidos en divisas / métodos extranjeros.
   - Generación de correlativo fiscal y preparación para impresora fiscal o factura digital.
2. **Modo B: Control Interno / Nota de Entrega (Factura OFF):**
   - 0% IVA y 0% IGTF (Total = Subtotal neto del catálogo).
   - Generación de ticket estándar para comandera térmica de 58/80mm o envío digital por WhatsApp/PDF.

### 1.3 Motor de Pagos Divididos (Split) y Cálculo Dinámico de IGTF 3%
- En ventas mixtas (ej. Total $100: $60 con tarjeta de débito Bs. + $40 en efectivo USD):
  - La porción en Bolívares ($60) está **exenta** de IGTF.
  - La porción en divisas ($40) genera automáticamente el **3% de IGTF** ($1.20 USD o su equivalente en Bs.).
  - El modal de cobro recalcula en tiempo real el saldo pendiente considerando el IGTF generado por cada abono en divisas.

### 1.4 Resolución de Vuelto (Change)
Ante la escasez de billetes fraccionarios en divisas, el cajero puede liquidar el cambio mediante 3 vías:
1. **Efectivo en Bolívares:** Calculado a la tasa BCV del momento.
2. **Pago Móvil Digital:** Captura inmediata de cédula, banco y teléfono del cliente.
3. **Vale de Crédito en Tienda (Store Credit):** Emisión de un vale con código de barras para compras futuras.

### 1.5 Tickets en Espera (Park Orders)
- Capacidad de congelar/pausar una venta en curso si un cliente necesita buscar otro producto.
- Permite atender al siguiente cliente en la fila y retomar la venta pausada en cualquier momento con 1 clic.

---

## 2. Arquitectura de Pantallas y Layouts

Para garantizar que el cajero tenga máxima área útil de trabajo sin distracciones, separamos el POS en dos áreas:

```text
src/app/
├── (pos)/
│   └── pos/terminal/page.tsx        <-- PANTALLA COMPLETA (Layout dedicado sin sidebar de ERP)
│                                         - Header de Caja: Cajero, Terminal, Tasa BCV, Estado de Conexión
│                                         - Split Screen 65/35 (Catálogo Táctil + Carrito de Cobro)
│
└── (dashboard)/
    └── pos/
        ├── shifts/page.tsx          <-- DENTRO DEL DASHBOARD REGULAR
        │                                - Gestión de Turnos: Apertura, Sangrías (Retiros), Arqueo Ciego
        └── orders/page.tsx          <-- Historial de ventas, reimpresión y devoluciones
```

---

## 3. UI/UX: Componentes del Terminal de Venta (`/pos/terminal`)

### 3.1 Cabecera del Terminal (Top Bar)
- Identificador de Sucursal y Número de Caja (ej. *Caja #01 - Sucursal Principal*).
- Cajero activo con avatar.
- Widget de **Tasa BCV del día** destacada (`1 USD = 36.50 Bs.`) con botón para actualizar si cambia.
- Indicador de estado de conexión: 🟢 *Online* / 🟡 *Offline (Modo Autónomo Local)*.
- Botón de **Tickets en Espera** con contador de órdenes pausadas (`[ ⏸️ 2 En Espera ]`).
- Botón de cambio rápido de modo: **Factura Fiscal (ON)** vs **Nota de Entrega (OFF)**.
- Botón discreto para salir al panel del ERP.

### 3.2 Lado Izquierdo: Catálogo Táctil y Búsqueda (<50ms)
- Input de búsqueda rápida universal (autofoco permanente para lectores de código de barras USB/Bluetooth, SKU o nombre).
- Barra horizontal de categorías (pills con scroll suave: *Todos, Textil, Herramientas, Químicos, Papelería, etc.*).
- Grid de productos táctiles (cards compactas de ~130px de alto):
  - Imagen miniatura.
  - Nombre del artículo y SKU.
  - Precio dual destacado: `$22.00` y `803.00 Bs.`.
  - Indicador de stock físico disponible.
  - Si tiene variantes: badge clickeable `[ 4 Variantes ]` que abre un selector popup de talla/color en 1 toque.

### 3.3 Lado Derecho: Carrito de Venta y Desglose Bimoneda
- Selector de cliente: *"Consumidor Final"* por defecto, con botón de búsqueda o alta express (`+ Cliente`).
- Lista de ítems escaneados:
  - Nombre, variante elegida y precio unitario.
  - Controles táctiles grandes `[-]` `Cantidad` `[+]` y botón eliminar.
  - Subtotal en USD y Bs.
- Resumen financiero bimoneda:
  - Subtotal neto (USD y Bs.).
  - IVA (si modo fiscal activo).
  - Total general a pagar (USD y Bs.).
- Botones de acción inferiores:
  - `[ ⏸️ Pausar ]` (Pasa la orden a Tickets en Espera).
  - `[ 🗑️ Vaciar ]`.
  - Botón principal de cobro: **`[ 💳 COBRAR ($49.88 / 1,820.62 Bs) ]`** (grande, accesible para dedos).

### 3.4 Modal de Cobro Mixto, IGTF y Vuelto
Al presionar Cobrar se abre el modal de pagos:
- Resumen del total a pagar (USD y Bs.).
- Saldo restante pendiente en tiempo real.
- Botones de métodos de pago:
  - `Efectivo USD` (despierta cálculo de IGTF 3%).
  - `Efectivo Bs.`
  - `Punto de Venta Débito/Crédito Bs.`
  - `Pago Móvil`
  - `Zelle / Divisas Digitales` (despierta IGTF 3%).
  - `Vale de Crédito (Store Credit)`.
- Historial de abonos agregados con botón de eliminar abono.
- Si el monto entregado supera el total: selector de resolución de vuelto (Efectivo Bs. / Pago Móvil / Vale).
- Botón final: **[ Confirmar e Imprimir Comprobante ]**.

---

## 4. Modelos de Datos TypeScript (`src/types/posTypes.ts`)

```typescript
export type PaymentMethodType =
  | 'cash_usd'
  | 'cash_ves'
  | 'pos_debit'
  | 'pos_credit'
  | 'pago_movil'
  | 'zelle'
  | 'store_credit'

export type ChangeResolutionType = 'cash_ves' | 'pago_movil' | 'store_credit'

export interface POSCartItem {
  id: string                   // Unique cart line ID
  templateId: string
  variantId: string
  name: string
  variantLabel?: string        // Ej: "Talla: L · Color: Azul"
  sku: string
  barcode?: string
  uom: string
  quantity: number
  unitPriceUSD: number
  costPriceUSD: number
  vatRate?: string             // '16', '8', 'EXEMPT'
  totalUSD: number
  totalVES: number
}

export interface POSPaymentRecord {
  id: string
  method: PaymentMethodType
  amountUSD: number
  amountVES: number
  exchangeRate: number
  causesIGTF: boolean
  igtfAmountUSD: number
  igtfAmountVES: number
  reference?: string
}

export interface ParkedOrder {
  id: string
  code: string                 // "TICKET-#104"
  customerName: string
  items: POSCartItem[]
  fiscalMode: boolean
  createdAt: string
}

export interface POSShift {
  id: string
  cashierName: string
  terminalName: string
  status: 'OPEN' | 'CLOSED'
  openingDate: string
  closingDate?: string
  initialCashUSD: number
  initialCashVES: number
  systemCalculatedUSD: number
  systemCalculatedVES: number
  declaredCashUSD?: number     // Arqueo Ciego
  declaredCashVES?: number
  differenceUSD?: number
  differenceVES?: number
}
```

---

## 5. Criterios de Aceptación

- [ ] Ruta `/pos/terminal` renderiza la interfaz completa de alta velocidad sin la barra lateral del ERP.
- [ ] La cabecera muestra la Tasa BCV del día, el cajero, el estado de conexión y el toggle Fiscal ON/OFF.
- [ ] Los productos de inventario se pueden buscar por texto o escanear por código de barras.
- [ ] Al seleccionar un producto con variantes, se despliega un selector rápido para elegir la talla/presentación.
- [ ] La lista de compra calcula subtotales, IVA y totales simultáneamente en USD y en Bs.
- [ ] Función de **Tickets en Espera (Park Orders)** permite congelar y reanudar ventas con 1 toque.
- [ ] El modal de pago permite registrar pagos mixtos divididos (Split) y aplica el **3% de IGTF** dinámicamente cuando se abonan divisas/USD.
- [ ] El sistema calcula el vuelto y permite elegir entre Efectivo Bs., Pago Móvil y Vale de Crédito.
- [ ] El módulo de Turnos (`/pos/shifts`) permite simular la apertura y el **Arqueo Ciego** de caja.
- [ ] La ruta `/pos` queda registrada en la barra lateral del ERP (en modo lista y grilla táctil).
- [ ] TypeScript compila limpiamente con 0 errores (`tsc --noEmit`).

---

## 6. Plan de Implementación Paso a Paso

1. **Fase 1: Contratos y Datos Base:**
   * Crear `src/types/posTypes.ts`.
   * Crear `src/data/pos/mockPosData.ts` con configuración de caja, turnos, tasa BCV y métodos de pago.
   * Crear `src/services/posService.ts` con el motor de cálculo bimoneda, IGTF y almacenamiento local.
2. **Fase 2: Layout de Terminal de Pantalla Completa:**
   * Crear layout `/pos/terminal` independiente con topbar de caja, tasa BCV y botón de salida.
3. **Fase 3: Pantalla de Checkout Rápido:**
   * Lado izquierdo: Grid táctil de productos por categoría y popup de variantes.
   * Lado derecho: Carrito de compras, selector de cliente y totales bimoneda.
4. **Fase 4: Modal de Cobro Mixto, IGTF y Vuelto:**
   * Construir el modal de pagos multidivisa con recálculo dinámico de IGTF del 3% y liquidación de cambio.
5. **Fase 5: Módulo de Turnos y Arqueo Ciego (`/pos/shifts`):**
   * Vista dentro del dashboard para apertura y cierre ciego de caja.
6. **Fase 6: Navegación y Verificación:**
   * Agregar "Punto de Venta" en `verticalMenuData.tsx` y `horizontalMenuData.tsx`.
   * Validar compilación con `tsc --noEmit`.
