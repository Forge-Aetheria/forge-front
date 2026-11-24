# Technical Plan: FE-INV-STOCK: Conexión de Movimientos de Almacén y Quants de Inventario con Backend GraphQL

- **Ticket**: legacy TICK-010-fe-inv-stock-warehouse-quants (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-010/spec.md`
- **Date**: 2026-11-09

## Summary

This feature replaces simulated browser-storage warehouse validations with live transactional GraphQL Kardex operations against `forge-backend`. The technical strategy connects `OperationOrderDetailView.tsx` and `operationOrdersService.ts` to `createStockMove` and `confirmStockMove`, computes bimonetary valuation (USD, VES, and active BCV rate) with 4-decimal precision, guarantees idempotency with UUIDv4 keys, links sales delivery generation (`salesQuotesService.ts`) to real outgoing stock moves, and reads live physical and reserved balances from `StockQuant`.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient`, `crypto.randomUUID` for UUIDv4 generation, `@/graphql/inventory.gql`.
- **Persistence**: PostgreSQL multi-tenant database managed by `forge-backend` via Prisma 7 (Kardex, StockMove, StockQuant, StockLocation, StockValuationLayer).
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript checking).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - Monetary values, quantities, and exchange rates must be formatted as 4-decimal strings (`Decimal(12,4)` backend scalar).
  - `idempotencyKey` must be a valid UUIDv4 string per confirmation call.
  - Repository hygiene: zero dead code or unused backup files (Rule R1).

## Architecture decisions

- **ADR-001: Two-Phase Kardex Execution (`createStockMove` + `confirmStockMove`)**
  - **Decision:** The warehouse validation process creates the move in draft status first (`createStockMove`), then confirms it atomically with bimonetary valuation and idempotency key (`confirmStockMove`).
  - **Rationale:** Strictly honors the backend BE-INV-02 Kardex state machine (`DRAFT` → `DONE`). If stock verification fails under a strict `BLOCK` negative stock policy, no unbalanced stock move is confirmed.
  - **Rejected alternative:** Attempting single-step unvalidated stock moves or bypassing backend valuation.

- **ADR-002: Dynamic Warehouse Location Resolution**
  - **Decision:** Query `stockLocations` to resolve internal locations for source (`locationSrcId`) and destination (`locationDstId`), caching the location map in memory.
  - **Rationale:** Ensures valid foreign key relationships in PostgreSQL without hardcoding static UUIDs in frontend code.
  - **Rejected alternative:** Hardcoding static location IDs or relying on arbitrary user-typed location names.

- **ADR-003: Direct Backend Outgoing Move for Sales Deliveries**
  - **Decision:** Refactor `salesQuotesService.createDeliveryForQuote` to execute `createStockMove` with `moveType: OUTGOING` and the sales order correlative, storing the resulting move ID on the quote.
  - **Rationale:** Eliminates synthetic browser storage order generation and links sales orders directly to the transactional inventory ledger.
  - **Rejected alternative:** Continuing to populate local mock operation orders in `localStorage`.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/inventory.gql.ts` | Add `GET_STOCK_LOCATIONS_QUERY`, `GET_STOCK_QUANTS_QUERY`, and `GET_VARIANT_AVAILABILITY_QUERY` definitions. Ensure `CREATE_STOCK_MOVE_MUTATION` and `CONFIRM_STOCK_MOVE_MUTATION` match backend inputs. |
| **Adapter** | `src/services/adapters/inventoryAdapter.ts` | Add `serializeCreateStockMoveInput`, `serializeConfirmStockMoveInput`, `mapOperationTypeToMoveType`, and bimonetary decimal helpers. |
| **Domain / Service** | `src/services/inventory/operationOrdersService.ts` | Refactor `validateOperationOrder` to invoke GraphQL `createStockMove` and `confirmStockMove` with idempotency, bimonetary valuation, and real status updates. |
| **Domain / Service** | `src/services/salesQuotesService.ts` | Refactor `createDeliveryForQuote` to invoke `createStockMove` for storable lines with backend UUIDs. |
| **Domain / Service** | `src/services/inventoryService.ts` | Add `fetchStockLocations` and `fetchVariantAvailability` helpers. |
| **Client / UI** | `src/views/inventory/OperationOrderDetailView.tsx` | Manage `validating` button state, catch `BLOCK` negative stock errors, and display contextual alerts without losing order view state. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes `createStockMove`, `confirmStockMove`, `stockQuants`, and `stockLocations` in `src/modules/inventory/resolvers/`.
- **Consumer**: `sidecars/forge-front` consumes these operations via `operationOrdersService.ts`, `salesQuotesService.ts`, and `inventoryService.ts`.
- **Contract status**: Fully aligned with BE-INV-02 and BE-INV-04 in `forge-backend`. No schema changes required on the backend.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all modified files.
- **Production Build**: Verify full page compilation with `pnpm exec next build`.
- **Integration Verification**:
  1. Validate an incoming receipt order and verify `createStockMove` (INCOMING) + `confirmStockMove` execution.
  2. Validate an outgoing delivery order with insufficient stock and verify `BLOCK` policy error handling.
  3. Generate delivery from an approved sales quote and verify `OUTGOING` move creation.
  4. Confirm that stock quants reflect updated physical and reserved quantities.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Negative stock rejection (`BLOCK` policy)** | Backend rejects confirmation if available stock < requested quantity | Catch GraphQL error in service and display explicit user alert showing available balance. |
| **Missing or invalid location UUIDs** | Foreign key rejection on `locationSrcId` / `locationDstId` | Implement `resolveLocationIds` with automatic fallback to primary internal stock location. |
| **Network timeout during multi-line confirmation** | Incomplete batch validation | Generate and persist `idempotencyKey` per line, enabling safe user re-try without duplicate ledger entries. |
