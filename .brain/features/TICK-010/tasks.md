# Tasks: Standardize primary Guardar button size in OperationOrderDetailView

- **Ticket**: .agents/tickets/backlog/TICK-010-receipts-save-button-size-consistency.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-010/plan.md`
- **Date**: 2026-11-22

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/views/inventory/OperationOrderDetailView.tsx` Standardize `Guardar`, `Cancelar`, `Validar`, `Anular`, and `Imprimir` header button sizing (`REQ-U-001`).

## Dependencies

None.

## Final verification

- [x] Run TypeScript check (`npx tsc --noEmit`) and ESLint on `OperationOrderDetailView.tsx`.
- [x] Verify spec acceptance criteria (`AC-001`, `AC-002`).
