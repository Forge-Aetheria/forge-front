# EARS Specification: Align filter inputs vertically in Kardex and Movements Ledger view

- **Ticket**: .agents/tickets/backlog/TICK-005-kardex-filters-visual-alignment.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-22
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Approved

## Context

In `src/views/inventory/InventoryKardexView.tsx` (lines 231-299), the filter toolbar uses `items-center` on a 12-column grid where the search `CustomTextField` (`md:col-span-5`) has no `label` prop while `Filtrar por Artículo` (`md:col-span-4`) and `Tipo de Movimiento` (`md:col-span-3`) do have `label` props. Because `CustomTextField` renders its label above the input box, the unlabeled search box sits vertically misaligned relative to the two labeled select dropdowns.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** All three filter inputs in `InventoryKardexView.tsx` SHALL share a consistent label structure (`label='Buscar'`, `label='Filtrar por Artículo'`, `label='Tipo de Movimiento'`) and align on the same horizontal baseline (`items-end`).

## Acceptance criteria

- **AC-001** GIVEN `InventoryKardexView.tsx`, WHEN rendered on desktop (`md:grid-cols-12`) or mobile (`grid-cols-1`), THEN all three filter inputs align vertically at the same top/bottom baseline.
- **AC-002** GIVEN `tsc --noEmit` and `eslint`, WHEN executed on `InventoryKardexView.tsx`, THEN zero errors occur.

## Out of scope

- Backend Kardex query changes.

## Assumptions

- `CustomTextField` renders a consistent label height above the input when `label` is provided.

## Open questions

- None.
