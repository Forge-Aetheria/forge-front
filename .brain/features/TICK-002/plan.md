# Technical Plan: Homologate empty state component across inventory and ERP tables

- **Ticket**: .agents/tickets/backlog/TICK-002-homologate-table-empty-states.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-002/spec.md`
- **Date**: 2026-11-22

## Summary

Create a reusable `EmptyTableState` component in `src/components/EmptyTableState.tsx` modeled on the `WarehouseOperationsListView.tsx` visual standard (icon in `#6C5CE7`, bold `#1E1B2E` title, `#6B7280` description, optional action button) and replace the 5 inconsistent empty table implementations across Inventory and Contacts.

## Technical context

- **Stack**: Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3, MUI 7.3.6, Tailwind CSS 4.1.17.
- **Dependencies**: None added (`@mui/material` and Tabler icons already present).
- **Persistence**: N/A (UI presentation only).
- **Testing**: `tsc --noEmit` and `eslint` on modified files.
- **Constraints**: Must render valid `<tr><td colSpan={...}>` markup when used inside `<TableBody>` to avoid React hydration/DOM nesting warnings.

## Architecture decisions

- **ADR-001**: Place component at `src/components/EmptyTableState.tsx` with `asTableRow?: boolean` (default `true`) and `colSpan?: number` — avoids wrapping boilerplate in every table while still supporting non-table containers when `asTableRow={false}`. Rejected alternative: placing inside `src/views/inventory/components/` (rejected because `BankAccountsListView` is in `src/views/contacts/`).

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Client or UI | `src/components/EmptyTableState.tsx` | Create reusable `EmptyTableState` component. |
| Client or UI | `src/views/inventory/WarehouseOperationsListView.tsx` | Replace inline empty `<TableRow>` with `EmptyTableState`. |
| Client or UI | `src/views/inventory/InventoryTable.tsx` | Replace inline empty `<TableRow>` with `EmptyTableState` (including filter reset option). |
| Client or UI | `src/views/inventory/InventoryKardexView.tsx` | Replace plain-text empty `<TableRow>` with `EmptyTableState`. |
| Client or UI | `src/views/inventory/InventoryAdjustmentsView.tsx` | Replace plain-text empty `<TableRow>` with `EmptyTableState`. |
| Client or UI | `src/views/contacts/BankAccountsListView.tsx` | Replace inline empty `<TableRow>` with `EmptyTableState`. |

## Cross-sidecar integration

None. Frontend-only UI homologation.

## Testing strategy

- **Unit**: N/A (pure presentational MUI component).
- **Manual or E2E**: Verify typecheck (`npx tsc --noEmit`) and ESLint (`npx eslint`) pass across all 6 files.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Invalid HTML nesting (`<div>` directly inside `<tbody>`) | React hydration warning | Default `asTableRow = true` wraps content in `<TableRow><TableCell colSpan={colSpan}>`. |
