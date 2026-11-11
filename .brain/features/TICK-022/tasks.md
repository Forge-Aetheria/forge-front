# Tasks: FE-INV-INFRA: Integración de Administración de Almacenes y Ubicaciones Físicas con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-022-fe-inv-warehouses-locations-crud.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-022/plan.md`
- **Date**: 2026-11-10

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/inventory.gql.ts` Declare infrastructure GraphQL operations: queries (`GET_WAREHOUSES_QUERY`, `GET_STOCK_LOCATION_QUERY`) and mutations (`CREATE_WAREHOUSE_MUTATION`, `UPDATE_WAREHOUSE_MUTATION`, `CREATE_STOCK_LOCATION_MUTATION`, `UPDATE_STOCK_LOCATION_MUTATION`). (REQ-U-001)
- [x] T002 `src/services/inventory/categoryWarehouseService.ts` Refactor `getWarehouses`, `createWarehouse`, and `updateWarehouse` to consume live GraphQL operations with cache invalidation. (REQ-E-001, REQ-E-002, REQ-N-001)
- [x] T003 [P] `src/services/inventory/categoryWarehouseService.ts` Refactor `getStockLocations`, `createStockLocation`, and `updateStockLocation` to consume live GraphQL operations and support `completePath` hierarchy. (REQ-U-002, REQ-E-003, REQ-E-004, REQ-N-002)
- [x] T004 `src/views/inventory/InventoryWarehousesView.tsx` Connect warehouses and locations views with live data binding, loading states, and non-destructive error alerts. (REQ-S-001, REQ-N-001)
- [x] T005 `forge-front` Run quality gates: TypeScript strict compilation (`tsc --noEmit`), ESLint validation, and Next.js production build (`next build`). (AC-001, AC-002, AC-003)

## Dependencies

- T002 depends on T001.
- T003 depends on T001.
- T004 depends on T002, T003.
- T005 depends on T004.

## Final verification

- [x] Run repository tests and static analysis (`tsc --noEmit`, `eslint`, `next build`).
- [x] Verify spec acceptance criteria (AC-001 to AC-003).
- [x] Confirm there is no scope drift.
