# Technical Plan: Align filter inputs vertically in Kardex and Movements Ledger view

- **Ticket**: .agents/tickets/backlog/TICK-005-kardex-filters-visual-alignment.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-005/spec.md`
- **Date**: 2026-11-22

## Summary

Add `label='Buscar'` to the search `CustomTextField` in `InventoryKardexView.tsx` and update the filter grid alignment from `items-center` to `items-end`.

## Technical context

- **Stack**: Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3, Tailwind CSS 4.1.17.
- **Dependencies**: None.
- **Testing**: `tsc --noEmit` and `eslint`.

## Architecture decisions

- **ADR-001**: Add `label='Buscar'` + `items-end` rather than removing labels from the select inputs — preserves field clarity while guaranteeing identical heights and baselines.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Client or UI | `src/views/inventory/InventoryKardexView.tsx` | Use `items-end` on filter grid and add `label='Buscar'` to the search `CustomTextField`. |

## Cross-sidecar integration

None.

## Testing strategy

- **Static checks**: `tsc --noEmit` and `eslint`.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| None | N/A | Isolated layout adjustment. |
