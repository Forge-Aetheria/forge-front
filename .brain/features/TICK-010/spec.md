# EARS Specification: FE-INV-STOCK: Conexión de Movimientos de Almacén y Quants de Inventario con Backend GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-010-fe-inv-stock-warehouse-quants.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-09
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, warehouse operations (Receipts, Deliveries, and Internal Transfers) managed through `src/services/inventory/operationOrdersService.ts` and rendered in `OperationOrderDetailView.tsx` currently simulate stock adjustments in the browser using `localStorage`. When an order is validated, physical and reserved stock quantities are manually calculated on client-side template objects, disconnecting the frontend from the real transactional Kardex and ignoring bimonetary valuation.

In `forge-backend`, the inventory engine implements the atomic Kardex lifecycle via `createStockMove(input: CreateStockMoveInput!)` and `confirmStockMove(moveId: ID!, input: ConfirmStockMoveInput!)`. The backend enforces idempotency via `idempotencyKey` (UUIDv4), applies bimonetary valuation (`unitCostUsd`, `unitCostVes`, `bcvRate`), updates physical and reserved stock balances in `StockQuant`, and applies strict or flexible negative stock policies (`BLOCK` vs `FLEXIBLE`). Furthermore, `salesQuotesService.ts` retains a synthetic delivery creation stub (`createDeliveryForQuote`) that must be linked to the live stock move API.

This specification governs connecting warehouse validation and sales deliveries to the backend GraphQL Kardex operations.

## EARS Requirements

### Ubiquitous

Requirements that always apply, without an activation condition.

- **REQ-U-001** The system SHALL declare `CREATE_STOCK_MOVE_MUTATION`, `CONFIRM_STOCK_MOVE_MUTATION`, `GET_STOCK_QUANTS_QUERY`, `GET_VARIANT_AVAILABILITY_QUERY`, and `GET_STOCK_LOCATIONS_QUERY` in `src/graphql/inventory.gql.ts` conforming strictly to the backend inventory schema.
- **REQ-U-002** The system SHALL serialize all numeric quantities, costs, and exchange rates (`quantity`, `unitCostUsd`, `unitCostVes`, `bcvRate`) as 4-decimal strings (`String` scalar for `Decimal` backend compatibility).
- **REQ-U-003** The system SHALL generate a unique UUIDv4 `idempotencyKey` for every `confirmStockMove` request to ensure safe retryability without duplicating stock movements or valuation layers.
- **REQ-U-004** The system SHALL map warehouse operation types to backend `MoveType` enums:
  - `'RECEIPT'` → `INCOMING`
  - `'DELIVERY'` → `OUTGOING`
  - `'TRANSFER'` → `INTERNAL_TRANSFER`

### Event-driven (When)

- **REQ-E-001** WHEN the user clicks "Validar / Procesar Entrega/Recepción" in `OperationOrderDetailView.tsx`, the system SHALL create and confirm a stock move in `forge-backend` for each storable item line, transmitting location IDs, processed quantity, bimonetary unit costs, and the active BCV rate.
- **REQ-E-002** WHEN a delivery order is generated from an approved sales quote (`createDeliveryForQuote` in `salesQuotesService.ts`), the system SHALL invoke `createStockMove` with `OUTGOING` move type, linking the sales order reference.
- **REQ-E-003** WHEN a stock move confirmation succeeds, the system SHALL update the local operation order state to `COMPLETED`, record the returned move ID and valuation layers, and display a success notification.
- **REQ-E-004** WHEN viewing product inventory or order lines, the system SHALL query live stock balances from `stockQuants` or `inventoryVariantAvailability` rather than computing synthetic in-memory sums.

### State-driven (While)

- **REQ-S-001** WHILE a stock move validation is processing over the network, the system SHALL disable validation action buttons and display a loading indicator to prevent concurrent duplicate submissions.
- **REQ-S-002** WHILE an operation order is in `COMPLETED` or `CANCELLED` state, the system SHALL present the order in read-only mode and disable further quantity alterations.

### Unwanted (If / Then)

- **REQ-N-001** IF the backend rejects a stock move due to insufficient physical inventory under a strict `BLOCK` negative stock policy, THEN the system SHALL capture the GraphQL error and display a clear alert message specifying the deficient variant and available balance.
- **REQ-N-002** IF a network timeout or connection failure occurs during confirmation, THEN the system SHALL allow the user to retry the confirmation using the existing `idempotencyKey` without duplicating inventory transactions.
- **REQ-N-003** IF an operation order contains items with unassigned or invalid variant UUIDs, THEN the system SHALL prompt the user to link valid catalog variants before validating the warehouse move.

### Optional (Where)

- **REQ-O-001** WHERE specific warehouse locations (`locationSrcId`, `locationDstId`) are configured, the system SHALL transmit their exact backend UUIDs; otherwise, the system SHALL resolve and use the default internal warehouse location for the active tenant.

## Acceptance criteria

- **AC-001** GIVEN a receipt order with 1 storable item, WHEN the user validates the order, THEN the system SHALL execute `createStockMove` with `moveType: INCOMING` and `confirmStockMove` with a valid `idempotencyKey`, updating the order to `COMPLETED`.
- **AC-002** GIVEN a delivery order with insufficient stock under `BLOCK` policy, WHEN the user attempts validation, THEN the system SHALL abort confirmation and display an inline error detailing the insufficient stock.
- **AC-003** GIVEN an approved sales quote, WHEN `createDeliveryForQuote` is called, THEN the system SHALL create a draft outgoing stock move in the backend linked to the quote number.
- **AC-004** GIVEN confirmed stock moves in the backend, WHEN querying stock in `/inventory/products` or `/inventory/kardex`, THEN the interface SHALL present the live physical and reserved balances returned by `StockQuant`.

## Out of scope

- Landed cost allocation and proration (governed by landed costs module).
- Physical barcode scanner hardware driver integration.
- Automated serial number / lot tracking.

## Assumptions

- Backend inventory infrastructure (warehouses and internal stock locations) exists and can be queried.
- Products referenced in warehouse operations have synchronized backend UUIDs (delivered via `TICK-009`).
- The active BCV exchange rate is available via `getActiveBcvRate` or GraphQL query.

## Open questions

- None.
