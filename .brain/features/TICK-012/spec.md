# EARS Specification: FE-PURCHASES: Integración de Solicitudes, Órdenes de Compra y Recepciones con GraphQL

- **Ticket**: legacy TICK-012-fe-purchases-orders-receptions (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-09
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, the purchases module (`src/services/purchasesService.ts` and views under `/purchases/quotes`) operates using simulated local data and in-memory mock collections. Supplier lists, product lookups, correlatives (`SC-YYYY-XXXX`, `OC-YYYY-XXXX`), and status transitions are generated client-side without validating supplier terms or updating central inventory transits.

In `forge-backend`, the procurement domain (`src/modules/purchases`, PR #28) provides an enterprise-grade procurement lifecycle:
- Negotiation quotes (`PurchaseQuote`) with atomic `SC` correlatives.
- Transition state machine: `DRAFT` → `RFQ_SENT` → `APPROVED` → `PURCHASE_ORDER` / `CANCELED`.
- Formal approval that freezes the bimonetary rate snapshot and per-line fiscal treatment.
- Conversion to purchase order (`PurchaseOrder`) with atomic `OC` correlatives that automatically registers incoming stock transit (`StockQuant.incomingQuantity`).
- Warehouse receptions (`PurchaseReception`) that apply stock arrival directly into inventory.
- Real-time procurement KPIs (`PurchaseKpis`).

Connecting `forge-front` to these operations provides true end-to-end procurement and inventory integration.

## EARS Requirements

### Ubiquitous

Requirements that always apply, without an activation condition.

- **REQ-U-001** The system SHALL declare all procurement queries and mutations in `src/graphql/purchases.gql.ts`:
  - Queries: `purchaseQuotes`, `purchaseQuote(id)`, `purchaseOrders`, `purchaseOrder(id)`, `purchaseReceptions(orderId)`, `purchaseKpis`.
  - Mutations: `createPurchaseQuote`, `registerPurchaseQuote`, `approvePurchaseQuote`, `convertQuoteToPurchaseOrder`, `cancelPurchaseQuote`, `recalculatePurchaseQuoteBcv`, `createPurchaseReception`.
- **REQ-U-002** The system SHALL format all numeric quantities, unit costs, discounts, and exchange rates (`quantity`, `unitCost`, `discountPercent`, `exchangeRate`) as 4-decimal strings (`String` scalar for `Decimal` backend compatibility).
- **REQ-U-003** The system SHALL generate a unique UUIDv4 `idempotencyKey` for every mutation request (`createPurchaseQuote`, `registerPurchaseQuote`, `approvePurchaseQuote`, `convertQuoteToPurchaseOrder`, `createPurchaseReception`, `cancelPurchaseQuote`).
- **REQ-U-004** The system SHALL query suppliers exclusively from `partners(where: { isSupplier: true })` and product lines from synchronized catalog variants (`TICK-009`).

### Event-driven (When)

- **REQ-E-001** WHEN the user registers a purchase quote or request for quotation (RFQ) on `/purchases/quotes/create`, the system SHALL execute `createPurchaseQuote` sending the supplier UUID, warehouse UUID, lines with variant UUIDs, and requested delivery date.
- **REQ-E-002** WHEN the user requests RFQ emission (`registerPurchaseQuote`), the system SHALL invoke the mutation and display the backend-generated correlative `SC-YYYY-NNNN`.
- **REQ-E-003** WHEN the user approves a purchase quote (`approvePurchaseQuote`), the system SHALL freeze the document state and rate snapshot as confirmed by the server.
- **REQ-E-004** WHEN the user converts an approved quote to a purchase order (`convertQuoteToPurchaseOrder`), the system SHALL update the document to `PURCHASE_ORDER`, display the correlative `OC-YYYY-NNNN`, and reflect incoming stock transit in the UI.
- **REQ-E-005** WHEN warehouse reception is recorded (`createPurchaseReception`), the system SHALL send received line quantities, update order fulfillment status, and reflect physical stock arrival in the warehouse ledger.
- **REQ-E-006** WHEN the user navigates to `/purchases/quotes`, the system SHALL fetch live metrics from `purchaseKpis` rather than computing client-side aggregates.

### State-driven (While)

- **REQ-S-001** WHILE a mutation is processing, the system SHALL set action buttons to loading state and disable repetitive clicks to prevent duplicate requests.
- **REQ-S-002** WHILE a purchase document is in `PURCHASE_ORDER` or `CANCELED` status, the system SHALL lock line editing and display the document in read-only mode.

### Unwanted (If / Then)

- **REQ-N-001** IF the backend rejects quote registration due to an invalid supplier UUID or missing supplier profile, THEN the system SHALL capture the GraphQL error and display a specific alert banner without wiping entered lines.
- **REQ-N-002** IF the user attempts to receive quantities exceeding the ordered quantity (over-reception violation), THEN the system SHALL display the server rejection message and highlight the affected lines.
- **REQ-N-003** IF a network timeout occurs during order conversion or approval, THEN the system SHALL enable retrying with the same `idempotencyKey` without generating duplicate orders.

### Optional (Where)

- **REQ-O-001** WHERE a multi-currency purchase is registered in VES, the system SHALL allow invoking `recalculatePurchaseQuoteBcv` with the active BCV rate to refresh equivalent amounts.

## Acceptance criteria

- **AC-001** GIVEN a new purchase quote with 2 variant lines and a valid supplier (`isSupplier: true`), WHEN the user clicks "Guardar", THEN the system SHALL invoke `createPurchaseQuote` with real UUIDs and return the document in `DRAFT`.
- **AC-002** GIVEN a draft quote, WHEN the user registers as RFQ, THEN the system SHALL invoke `registerPurchaseQuote` and display the sequential code `SC-2026-NNNN`.
- **AC-003** GIVEN an approved quote, WHEN the user clicks "Convertir a Orden de Compra", THEN the system SHALL execute `convertQuoteToPurchaseOrder` and display the purchase order code `OC-2026-NNNN`.
- **AC-004** GIVEN a purchase order with remaining quantities, WHEN `createPurchaseReception` is submitted, THEN the system SHALL register the arrival and update received quantities in the UI.

## Out of scope

- Supplier invoice registration and Accounts Payable linkage (handled in accounting module).
- Automated purchase email dispatch to suppliers.

## Assumptions

- Suppliers are registered in `Partner` with `isSupplier: true`.
- Catalog variants exist with valid UUIDs.
- Warehouses and internal locations are seeded in `StockLocation`.

## Open questions

- None.
