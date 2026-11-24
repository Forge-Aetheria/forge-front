# Tasks: Homologate empty state component across inventory and ERP tables

- **Ticket**: .agents/tickets/backlog/TICK-072-forge-front-homologate-empty-state-component-across-inventory-and-erp-ta.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-072/plan.md`
- **Date**: 2026-11-22

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/components/EmptyTableState.tsx` Create reusable `EmptyTableState` component covering `REQ-U-001`, `REQ-U-002`, `REQ-E-001`, `REQ-S-001`, `REQ-N-001`, `REQ-O-001`.
- [x] T002 [P] `src/views/inventory/WarehouseOperationsListView.tsx` Replace inline empty state with `EmptyTableState` (`REQ-S-001`).
- [x] T003 [P] `src/views/inventory/InventoryTable.tsx` Replace inline empty state with `EmptyTableState` and filter-reset action (`REQ-S-001`, `REQ-E-001`).
- [x] T004 [P] `src/views/inventory/InventoryKardexView.tsx` Replace plain-text empty state with `EmptyTableState` (`REQ-S-001`).
- [x] T005 [P] `src/views/inventory/InventoryAdjustmentsView.tsx` Replace plain-text empty state with `EmptyTableState` (`REQ-S-001`).
- [x] T006 [P] `src/views/contacts/BankAccountsListView.tsx` Replace inline empty state with `EmptyTableState` (`REQ-S-001`).

## Dependencies

- T002, T003, T004, T005, T006 depend on T001.

## Final verification

- [ ] Run TypeScript check (`npx tsc --noEmit`) and ESLint on modified files.
- [ ] Verify spec acceptance criteria (`AC-001`, `AC-002`, `AC-003`).
- [ ] Confirm there is no scope drift.
