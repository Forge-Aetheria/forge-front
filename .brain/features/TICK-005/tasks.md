# Tasks: Align filter inputs vertically in Kardex and Movements Ledger view

- **Ticket**: .agents/tickets/backlog/TICK-005-kardex-filters-visual-alignment.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-005/plan.md`
- **Date**: 2026-11-22

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/views/inventory/InventoryKardexView.tsx` Update filter grid to `items-end` and add `label='Buscar'` to the search `CustomTextField` (`REQ-U-001`).

## Dependencies

None.

## Final verification

- [x] Run TypeScript check (`npx tsc --noEmit`) and ESLint on `InventoryKardexView.tsx`.
- [x] Verify spec acceptance criteria (`AC-001`, `AC-002`).
