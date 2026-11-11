# Tasks: FE-INV-ADVANCED: Integración de Ajustes Físicos de Inventario y Costos en Destino con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-021-fe-inv-adjustments-landed-costs.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-021/plan.md`
- **Date**: 2026-11-10

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/inventory.gql.ts` Declare advanced inventory operations: `CREATE_INVENTORY_ADJUSTMENT_MUTATION`, `APPLY_INVENTORY_ADJUSTMENT_MUTATION`, `GET_INVENTORY_ADJUSTMENTS_QUERY`, `CREATE_LANDED_COST_MUTATION`, `UPDATE_LANDED_COST_MUTATION`, `VALIDATE_LANDED_COST_MUTATION`, `CANCEL_LANDED_COST_MUTATION`, and `GET_LANDED_COSTS_QUERY`. (REQ-U-001)
- [x] T002 `src/services/adapters/inventoryAdapter.ts` Implement serializers for adjustments (`serializeAdjustmentInput`) and landed costs (`serializeLandedCostInput`). (REQ-U-002, REQ-U-003, REQ-O-001)
- [x] T003 `src/services/inventoryService.ts` Refactor `applyStockAdjustment` and `getStockAdjustments` to invoke live GraphQL operations. (REQ-E-001, REQ-E-004, REQ-N-001)
- [x] T004 `src/services/inventory/landedCostService.ts` Refactor `getLandedCosts`, `getLandedCostById`, `createLandedCost`, `updateLandedCost`, and `validateLandedCost` to consume live GraphQL operations. (REQ-E-002, REQ-E-003, REQ-E-004, REQ-N-002)
- [x] T005 `src/views/inventory/InventoryAdjustmentsView.tsx` Connect adjustments view and landed costs views with live data binding, loading states, and non-destructive error handling. (REQ-S-001, REQ-S-002)
- [x] T006 `forge-front` Run quality gates: TypeScript strict compilation (`tsc --noEmit`), ESLint validation, and Next.js production build (`next build`). (AC-001, AC-002, AC-003)

## Dependencies

- T002 depends on T001.
- T003 depends on T001, T002.
- T004 depends on T001, T002.
- T005 depends on T003, T004.
- T006 depends on T005.

## Final verification

- [x] Run repository tests and static analysis (`tsc --noEmit`, `eslint`, `next build`).
- [x] Verify spec acceptance criteria (AC-001 to AC-003).
- [x] Confirm there is no scope drift.
