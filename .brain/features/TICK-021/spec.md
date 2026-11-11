# EARS Specification: FE-INV-ADVANCED: Integración de Ajustes Físicos de Inventario y Costos en Destino con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-021-fe-inv-adjustments-landed-costs.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-10
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, physical inventory adjustments (`/inventory/adjustments`) and landed costs (`/inventory/operations/landed-costs/*`) currently simulate stock differences and cost capitalizations in browser `localStorage` (`inventoryStorage.ts` and `landedCostService.ts`). Physical stock counts do not generate signed `ADJUSTMENT` Kardex moves, and landed costs do not capitalize import expenses into variant standard costs or post accounting journal entries.

In `forge-backend`, the advanced inventory module (`src/modules/inventory`, BE-INV-04) provides transactional operations:
- Inventory adjustments (`createInventoryAdjustment`, `applyInventoryAdjustment`, `cancelInventoryAdjustment`) enforcing strict audit tracking, signed `ADJUSTMENT` Kardex moves, and quant updates.
- Landed costs (`createLandedCost`, `updateLandedCost`, `validateLandedCost`, `cancelLandedCost`) prorating expenses across purchase receptions (`EQUAL`, `BY_QUANTITY`, `BY_COST`, `BY_WEIGHT`, `BY_VOLUME`), capitalising them into `ProductVariant.standardCost`, and posting balanced journal entries.

Connecting `forge-front` to these endpoints establishes verifiable stock count reconciliation and import valuation.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The system SHALL declare `CREATE_INVENTORY_ADJUSTMENT_MUTATION`, `APPLY_INVENTORY_ADJUSTMENT_MUTATION`, `GET_INVENTORY_ADJUSTMENTS_QUERY`, `CREATE_LANDED_COST_MUTATION`, `VALIDATE_LANDED_COST_MUTATION`, and `GET_LANDED_COSTS_QUERY` in `src/graphql/inventory.gql.ts`.
- **REQ-U-002** The system SHALL format all quantities, differences, and landed cost amounts as 4-decimal strings (`String` scalar for `Decimal(12,4)` backend compatibility).
- **REQ-U-003** The system SHALL generate a unique UUIDv4 `idempotencyKey` for every adjustment creation, adjustment application, landed cost creation, and landed cost validation.

### Event-driven (When)

- **REQ-E-001** WHEN the user applies a physical count adjustment on `/inventory/adjustments`, the system SHALL execute `createInventoryAdjustment` followed by `applyInventoryAdjustment`, updating warehouse quants and generating signed `ADJUSTMENT` moves.
- **REQ-E-002** WHEN the user registers a landed cost document on `/inventory/operations/landed-costs/create`, the system SHALL execute `createLandedCost` linking purchase reception IDs and itemized expense lines.
- **REQ-E-003** WHEN the user validates a landed cost on `/inventory/operations/landed-costs/[id]`, the system SHALL invoke `validateLandedCost` with an `idempotencyKey`, capitalising costs into the inventory ledger and creating the accounting journal entry.
- **REQ-E-004** WHEN listing adjustments or landed costs, the system SHALL query live data from `inventoryAdjustments` and `landedCosts`.

### State-driven (While)

- **REQ-S-001** WHILE an adjustment or landed cost mutation is in transit, the system SHALL disable submission buttons and show a loading spinner.
- **REQ-S-002** WHILE a landed cost is in `APPLIED` status, the system SHALL lock all fields and present the document in read-only mode.

### Unwanted (If / Then)

- **REQ-N-001** IF an adjustment produces negative stock under a strict `BLOCK` negative stock policy, THEN the system SHALL capture the backend exception and surface a clear error alert.
- **REQ-N-002** IF a network timeout occurs during landed cost validation, THEN the system SHALL enable re-submission using the same `idempotencyKey` without duplicating capitalization layers.

### Optional (Where)

- **REQ-O-001** WHERE a service product is flagged as `isLandedCost`, the system SHALL permit selecting it as a landed cost expense line with its `defaultSplitMethod`.

## Acceptance criteria

- **AC-001** GIVEN a physical stock count with a discrepancy, WHEN submitting the adjustment, THEN the system SHALL execute `createInventoryAdjustment` and `applyInventoryAdjustment`, updating the quant balance.
- **AC-002** GIVEN a landed cost linking a confirmed purchase reception, WHEN clicking validate, THEN the system SHALL execute `validateLandedCost` and update the status to `APPLIED`.
- **AC-003** GIVEN an applied landed cost, WHEN viewing its detail, THEN all editing controls SHALL be disabled.

## Out of scope

- Automated barcode scanner hardware count batching.
- Third-party customs broker API synchronization.

## Assumptions

- Internal stock locations exist in `StockLocation`.
- Purchase receptions exist in `PurchaseReception`.

## Open questions

- None.
