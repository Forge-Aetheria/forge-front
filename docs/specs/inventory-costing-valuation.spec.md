# SPEC-010 · Costeo y Valorización de Inventario (Costo Promedio Ponderado + Costos en Destino)

> Estado: **Aprobado** · Módulos: Inventario, Compras, Ventas, Contabilidad · Normativa: VEN-NIF (NIC 2) / SENIAT

## 1. Objetivo

Valorizar el inventario de forma automática y auditable usando el **Costo Promedio Ponderado Móvil (AVCO)** calculado **por variante (SKU)**, permitir **stock negativo configurable** y registrar **Costos en Destino** (fletes, aranceles, seguros, nacionalización) que se prorratean sobre el costo de la mercancía recibida.

> UEPS/LIFO está prohibido por VEN-NIF y la Ley de ISLR. El método es fijo: Costo Promedio Ponderado.

## 2. Reglas de Negocio

### 2.1 Costo Promedio por Variante
- El costo vigente de cada variante es `ProductVariant.costPrice` (USD, moneda funcional).
- `ProductTemplate.standardCost` refleja el promedio ponderado por stock de sus variantes (o el costo de la única variante).
- **Entrada (Recepción validada `IN/…`):**

$$C_{nuevo} = \frac{(Q_{actual} \times C_{actual}) + (Q_{recibida} \times C_{compra})}{Q_{actual} + Q_{recibida}}$$

- **Salida (Despacho validado `OUT/…`, merma, ajuste negativo):** sale al costo promedio vigente; **el costo promedio no cambia**.
- **Transferencia interna:** no altera el costo.
- Cada movimiento del Kárdex guarda: `costo_unitario_usd` (costo de la transacción), `costo_promedio_usd` (costo resultante), `valor_movimiento_usd` y `saldo_valorizado_usd`.

### 2.2 Política de Stock Negativo (configurable)
Configurada en **Ajustes → Fiscalidad y Parámetros → Política de Inventario** (`FiscalRulesConfig.negativeStockPolicy`):

| Modo | Comportamiento |
|---|---|
| `FLEXIBLE` (por defecto) | Permite despachar sin existencia. La salida se valora al último costo conocido y el stock queda negativo. |
| `BLOCK` | Bloquea la validación del despacho si el stock físico es insuficiente. |

**Regularización (modo flexible):** si llega una recepción con stock ≤ 0, el nuevo costo promedio es el costo de compra y la diferencia entre el costo de compra y el costo con que salieron las unidades en negativo se registra en el Kárdex como `ajuste_stock_negativo_usd` (impacta Costo de Ventas).

### 2.3 Costos en Destino (Landed Costs)
1. Se crea un **producto tipo Servicio** marcado como **"Costo en Destino"** (`isLandedCost = true`) con un método de reparto por defecto.
2. Se crea el documento **Costo en Destino** (`CD/2026/XXXX`) en *Inventario → Operaciones → Costos en Destino*, seleccionando una o varias **recepciones realizadas** y agregando las líneas de costo (servicio, monto USD, método de reparto).
3. Métodos de reparto: `EQUAL` (partes iguales), `BY_QUANTITY` (por cantidad), `BY_COST` (por valor de compra), `BY_WEIGHT` (por peso), `BY_VOLUME` (por volumen).
4. **Validar** el documento:
   - Asigna el monto a cada línea recibida.
   - La porción correspondiente a las unidades **aún en existencia** incrementa el costo promedio: $C_{nuevo} = C_{actual} + \frac{Monto_{existencia}}{Q_{actual}}$.
   - La porción de unidades **ya vendidas** se imputa a **Costo de Ventas**.
   - Registra un movimiento `LANDED_COST` (cantidad 0, solo valor) en el Kárdex.
   - Genera el asiento contable: **Debe** `1.1.03.01 Inventario` (+ `5.1.01.01 Costo de Ventas` por la porción vendida) / **Haber** `2.1.01.01 CxP Proveedores`.
5. Un documento validado es inmutable.

## 3. Criterios EARS

- **EARS-COST-01:** *WHEN* a receipt is validated, *the system shall* recompute the weighted average cost of each received variant and persist it in `costPrice`.
- **EARS-COST-02:** *WHEN* a delivery or negative adjustment is validated, *the system shall* value the outgoing quantity at the current average cost without changing it.
- **EARS-COST-03:** *WHILE* `negativeStockPolicy = 'BLOCK'`, *IF* physical stock is insufficient, *THEN the system shall* block the delivery validation with an explicit message.
- **EARS-COST-04:** *WHILE* `negativeStockPolicy = 'FLEXIBLE'`, *the system shall* allow the delivery and leave the physical stock negative.
- **EARS-COST-05:** *WHEN* a landed cost document is validated, *the system shall* allocate each cost line by its split method, increase the average cost of the on-hand portion, post the sold portion to COGS, write a `LANDED_COST` Kárdex movement and create the journal entry.
- **EARS-COST-06:** *IF* a landed cost has no receipts, no cost lines or a total ≤ 0, *THEN the system shall* block validation.
- **EARS-COST-07:** The Kárdex *shall* display transaction cost, average cost and valued balance per movement.

## 4. Componentes

| Pieza | Ruta |
|---|---|
| Motor de costeo | `src/services/inventory/costingService.ts` |
| Costos en destino (servicio) | `src/services/inventory/landedCostService.ts` |
| Listado | `/inventory/operations/landed-costs` → `LandedCostsListView.tsx` |
| Formulario completo | `/inventory/operations/landed-costs/[id]` (`create` para nuevo) → `LandedCostDetailView.tsx` |
| Marca en producto | Ficha de producto → tipo *Servicio* → "Es un Costo en Destino" |
| Configuración | `FiscalRulesTab.tsx` → Política de Inventario |
