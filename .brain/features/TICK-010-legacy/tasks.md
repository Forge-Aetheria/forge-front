# Tasks: FE-INV-STOCK: Conexión de Movimientos de Almacén y Quants de Inventario con Backend GraphQL

- **Ticket**: legacy TICK-010-fe-inv-stock-warehouse-quants (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-010/plan.md`
- **Date**: 2026-11-09

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/inventory.gql.ts` Declare GraphQL operations `GET_STOCK_LOCATIONS_QUERY`, `GET_STOCK_QUANTS_QUERY`, `GET_VARIANT_AVAILABILITY_QUERY`, and ensure `CREATE_STOCK_MOVE_MUTATION` and `CONFIRM_STOCK_MOVE_MUTATION` contain complete valuation fields. (REQ-U-001)
- [x] T002 `src/services/adapters/inventoryAdapter.ts` Implement stock move serializers (`serializeCreateStockMoveInput`, `serializeConfirmStockMoveInput`), move type mapping (`mapOperationTypeToMoveType`), location resolution helpers, and UUIDv4 idempotency key generator. (REQ-U-002, REQ-U-003, REQ-U-004, REQ-O-001)
- [x] T003 `src/services/inventoryService.ts` Implement `fetchStockLocations`, `fetchVariantAvailability`, and `fetchStockQuants` to retrieve live stock balances and locations from the backend. (REQ-E-004)
- [x] T004 `src/services/inventory/operationOrdersService.ts` Refactor `validateOperationOrder` to invoke `createStockMove` and `confirmStockMove` with idempotency, bimonetary valuation, and real status updates to `COMPLETED`. (REQ-E-001, REQ-E-003, REQ-N-001, REQ-N-002, REQ-N-003)
- [x] T005 `src/services/salesQuotesService.ts` Refactor `createDeliveryForQuote` to invoke `createStockMove` for storable lines with backend UUIDs and link the resulting move ID. (REQ-E-002)
- [x] T006 `src/views/inventory/OperationOrderDetailView.tsx` Connect order validation button with loading state (`validating`), handle negative stock `BLOCK` error alerts without resetting view, and enforce read-only state for completed orders. (REQ-S-001, REQ-S-002, REQ-N-001)
- [x] T007 `forge-front` Run quality gates: TypeScript strict compilation (`tsc --noEmit`), ESLint validation, and Next.js production build (`next build`). (AC-001, AC-002, AC-003, AC-004)

## Dependencies

- T002 depends on T001.
- T003 depends on T001, T002.
- T004 depends on T001, T002, T003.
- T005 depends on T001, T002, T003.
- T006 depends on T004.
- T007 depends on T005, T006.

## Final verification

- [x] Run repository tests and static analysis (`tsc --noEmit`, `eslint`, `next build`).
- [x] Verify spec acceptance criteria (AC-001 to AC-004).
- [x] Confirm there is no scope drift.
