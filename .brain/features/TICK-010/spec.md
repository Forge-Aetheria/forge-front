# EARS Specification: Standardize primary Guardar button size in OperationOrderDetailView

- **Ticket**: .agents/tickets/backlog/TICK-010-receipts-save-button-size-consistency.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-22
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Approved

## Context

In `src/views/inventory/OperationOrderDetailView.tsx` (lines 443-556), the header action buttons (`Guardar`, `Cancelar`, `Validar`, `Anular`) apply compact overrides (`py: 0.8`, `fontSize: '0.85rem'`, and `size='small'` on `Imprimir`), making `Guardar` visibly smaller than primary action buttons such as `+ Nuevo` in `InventoryCatalogView.tsx` (`px: 3.5`, standard MUI contained button sizing).

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The header primary and secondary action buttons (`Guardar`, `Cancelar`, `Validar`, `Anular`, `Imprimir`) in `OperationOrderDetailView.tsx` SHALL use standard MUI button sizing (`px: 3.5` for primary actions, no `py: 0.8` or `fontSize: '0.85rem'` shrink overrides) matching `+ Nuevo`.

## Acceptance criteria

- **AC-001** GIVEN `OperationOrderDetailView.tsx`, WHEN rendered in create or detail mode, THEN `Guardar` / `Validar` match the height and typography of primary `+ Nuevo` buttons.
- **AC-002** GIVEN `tsc --noEmit` and `eslint`, WHEN executed on `OperationOrderDetailView.tsx`, THEN zero errors occur.

## Out of scope

- Redesigning unrelated modules outside `OperationOrderDetailView.tsx`.

## Assumptions

- Standard MUI `Button` default height without `size='small'` or `py: 0.8` matches the `+ Nuevo` button in `InventoryCatalogView.tsx` and `WarehouseOperationsListView.tsx`.

## Open questions

- None.
