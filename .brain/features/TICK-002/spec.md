# EARS Specification: Homologate empty state component across inventory and ERP tables

- **Ticket**: .agents/tickets/backlog/TICK-002-homologate-table-empty-states.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-22
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Approved

## Context

Empty state rendering inside data tables is inconsistent across `forge-front`:
- `src/views/inventory/WarehouseOperationsListView.tsx` (lines 579-590) renders a `#6C5CE7` icon, `Typography variant='body1'` title, and `Typography variant='caption'` hint.
- `src/views/inventory/InventoryTable.tsx` (lines 420-427) renders a muted `#9CA3AF` icon and plain `Typography variant='body2'`.
- `src/views/inventory/InventoryKardexView.tsx` (lines 367-372) renders plain text with no icon.
- `src/views/inventory/InventoryAdjustmentsView.tsx` (lines 660-665) renders plain text with no icon.
- `src/views/contacts/BankAccountsListView.tsx` (lines 260-271) renders a `#CBD5E1` icon, `subtitle1`, and `caption` with slate palette.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The system SHALL provide a single reusable `EmptyTableState` component at `src/components/EmptyTableState.tsx` for rendering empty states inside MUI `<TableBody>` (`<TableRow><TableCell colSpan={colSpan}>`) as well as standalone containers.
- **REQ-U-002** The `EmptyTableState` component SHALL accept `icon` (Tabler icon class), `title`, optional `description`, optional `actionLabel` / `onAction` / `actionHref`, and `colSpan` (when rendered as a table row) or `asTableRow` flag.

### Event-driven (When)

- **REQ-E-001** WHEN a table has zero rows because active search/filter criteria match no records and an `onClearFilters` or `actionLabel` handler is provided, the system SHALL render the empty state with a clear filter/action trigger.

### State-driven (While)

- **REQ-S-001** WHILE a table has zero rows to display (`filteredRows.length === 0` and not loading), the system SHALL render `EmptyTableState` with consistent `#6C5CE7` / `#1E1B2E` / `#6B7280` Foundly typography and spacing.

### Unwanted (If / Then)

- **REQ-N-001** IF `colSpan` is omitted while `asTableRow` is `true`, THEN the component SHALL default `colSpan` safely (`colSpan={1}`) or render without throwing runtime warnings.

### Optional (Where)

- **REQ-O-001** WHERE `description` contains bold text or custom JSX, the component SHALL accept `React.ReactNode` for `description`.

## Acceptance criteria

- **AC-001** GIVEN any of the 5 target tables (`InventoryTable`, `WarehouseOperationsListView`, `InventoryKardexView`, `InventoryAdjustmentsView`, `BankAccountsListView`) has 0 rows, WHEN rendered, THEN all 5 use `EmptyTableState` with unified icon, title, and description styling.
- **AC-002** GIVEN `InventoryTable` or `InventoryKardexView` has active filters returning 0 rows, WHEN the user clicks the clear-filters action (if provided), THEN filters reset and rows reload/re-appear.
- **AC-003** GIVEN `npm run lint` / `tsc --noEmit` is executed in `forge-front`, WHEN checked, THEN there are zero TypeScript or lint errors in the modified files.

## Out of scope

- Modifying tables outside the 5 verified views (other modules can adopt `EmptyTableState` incrementally).
- Backend API changes.

## Assumptions

- Tabler icon classes (`tabler-*`) and MUI `TableRow`/`TableCell`/`Typography`/`Button` are available across all client views.

## Open questions

- None.
