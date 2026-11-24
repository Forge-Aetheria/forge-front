# Technical Plan: Standardize primary Guardar button size in OperationOrderDetailView

- **Ticket**: .agents/tickets/backlog/TICK-010-receipts-save-button-size-consistency.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-010/spec.md`
- **Date**: 2026-11-22

## Summary

Remove the compact `py: 0.8` / `fontSize: '0.85rem'` / `size='small'` overrides from the header action buttons in `OperationOrderDetailView.tsx` and standardize horizontal padding to `px: 3.5` (primary) / `px: 3` (secondary) to match `+ Nuevo`.

## Technical context

- **Stack**: Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3, MUI 7.3.6.
- **Dependencies**: None.
- **Testing**: `tsc --noEmit` and `eslint`.

## Architecture decisions

- **ADR-001**: Remove custom `py: 0.8` and `fontSize: '0.85rem'` overrides instead of inventing a new custom height — leverages the theme's standard MUI `Button` sizing used by `+ Nuevo`.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Client or UI | `src/views/inventory/OperationOrderDetailView.tsx` | Standardize header action button `sx` and sizing props. |

## Cross-sidecar integration

None.

## Testing strategy

- **Static checks**: `tsc --noEmit` and `eslint`.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| None | N/A | Purely visual styling alignment. |
