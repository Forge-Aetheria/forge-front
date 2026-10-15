# Especificación: Integración Frontend-Backend para el Módulo de Inventario

- **ID de Spec:** SPEC-004
- **Estado:** En Implementación (Conforme a EARS y Constitución)
- **Fecha:** 2026-10-15
- **Alcance:** Integración del Módulo de Inventario (`forge-front`) con el Backend GraphQL (`forge-backend`).
- **Objetivo:** Conectar las pantallas existentes de Inventario (Dashboard, Tabla, Quick-View Drawer, Detalle `/inventory/[id]`) y las operaciones de Kárdex y Stock Quants con los endpoints GraphQL del backend real (`templates`, `template(id)`, `kardex`, `stockQuants`, `createStockMove`, `confirmStockMove`), preservando el soporte de fallback transparente cuando el backend local no esté levantado o no cuente con token activo.

---

## 1. Requisitos Funcionales bajo Sintaxis EARS

### 1.1 Ubiquitous (Requisitos Universales)
- `The system shall fetch product templates from the GraphQL templates query when the backend is reachable.`
- `The system shall map GraphQL product templates and EAV variants into frontend ProductTemplate models without UI regressions.`
- `The system shall support bi-currency stock valuation displaying BCV exchange rate, USD unit costs, and VES unit costs.`

### 1.2 Event-driven (Por Evento)
- `WHEN the inventory dashboard loads, the system shall query templates and calculate inventory KPIs.`
- `WHEN the user selects a variant in the detail view, the system shall fetch its chronological transaction history via the kardex query.`
- `WHEN a stock movement is confirmed, the system shall submit idempotencyKey, unitCostUsd, unitCostVes, and bcvRate to confirmStockMove.`

### 1.3 State-driven (Por Estado)
- `WHILE the backend service is offline or unreachable, the system shall automatically fallback to local mock data without throwing unhandled exceptions.`
- `WHILE the fiscal localization flag is enabled, the system shall map backend VatAliquot (GENERAL_16, REDUCED_8, EXEMPT_0) to UI fiscal badges.`

### 1.4 Unwanted Behavior (Manejo de Errores)
- `IF a requested template ID does not exist in the backend, THEN the system shall display the item not found feedback screen.`

---

## 2. Contrato GraphQL de Inventario

### 2.1 Queries
```graphql
query GetTemplates($filter: TemplateFilter, $page: Int, $perPage: Int) {
  templates(filter: $filter, page: $page, perPage: $perPage) {
    nodes {
      id
      name
      uomCode
      productType
      basePrice
      vatAliquot
      withholdingIslr
      category {
        id
        name
        completeName
      }
      attributes {
        id
        attribute {
          id
          name
          displayType
        }
      }
      variants {
        id
        sku
        barcode
        priceExtra
        standardCost
        isActive
        values {
          attributeValue {
            id
            name
            htmlColor
            attribute {
              name
            }
          }
        }
        quants {
          id
          quantity
          reservedQuantity
        }
      }
    }
    pageInfo {
      totalCount
      page
      perPage
      hasNextPage
    }
  }
}
```

```graphql
query GetKardex($variantId: ID!, $state: MoveState, $page: Int, $perPage: Int) {
  kardex(variantId: $variantId, state: $state, page: $page, perPage: $perPage) {
    nodes {
      id
      moveType
      state
      quantity
      referenceDoc
      createdAt
      locationSrc {
        id
        completePath
      }
      locationDst {
        id
        completePath
      }
      valuations {
        id
        bcvRate
        unitCostUsd
        unitCostVes
        quantity
      }
    }
    pageInfo {
      totalCount
      page
      perPage
      hasNextPage
    }
  }
}
```

---

## 3. Criterios de Aceptación (DoD)

- [ ] Redactado bajo sintaxis EARS.
- [ ] `inventoryService.ts` consulta el endpoint real de GraphQL.
- [ ] Fallback transparente si el backend no está disponible.
- [ ] Kárdex bimoneda visualizable por variante.
- [ ] `npx tsc --noEmit` compila limpiamente.
