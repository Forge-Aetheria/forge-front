# EARS Specification: Replace native date input with template datepicker and define past-date rule in Receipts

- **Ticket**: .agents/tickets/backlog/TICK-076-forge-front-replace-native-date-input-with-template-datepicker-and-defin.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-22
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Approved

## Context

In `src/views/inventory/OperationOrderDetailView.tsx` (lines 618-628), `Fecha Programada` uses `<CustomTextField type='date' />` (native browser calendar). `react-datepicker` was not installed in `package.json`. Additionally, there is no `minDate` restriction, allowing past dates to be selected.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The system SHALL provide a reusable `AppReactDatepicker` wrapper component at `src/components/AppReactDatepicker.tsx` built on `react-datepicker` and styled consistently with Vuexy/MUI (`CustomTextField`).
- **REQ-U-002** `OperationOrderDetailView.tsx` SHALL use `AppReactDatepicker` for `Fecha Programada` instead of `<CustomTextField type='date' />`.

### Event-driven (When)

- **REQ-E-001** WHEN the user selects a date in `AppReactDatepicker`, the system SHALL update `fechaProgramada` in `YYYY-MM-DD` ISO date string format compatible with existing backend/service payloads.

### State-driven (While)

- **REQ-S-001** WHILE `isCreate` is `true` in `OperationOrderDetailView.tsx`, the datepicker SHALL default `minDate` to today (configurable via prop `allowPastDates?: boolean`, defaulting to `false` for new scheduled operations) to prevent accidental past-date scheduling unless explicitly enabled.

### Unwanted (If / Then)

- **REQ-N-001** IF `fechaProgramada` is empty or invalid, THEN `AppReactDatepicker` SHALL render safely (`selected={null}`) without throwing `Invalid Date` errors.

### Optional (Where)

- **REQ-O-001** WHERE `selectsRange` is needed in future filter views, `AppReactDatepicker` SHALL support `react-datepicker` range props seamlessly.

## Acceptance criteria

- **AC-001** GIVEN `package.json`, WHEN inspected, THEN `react-datepicker` and `@types/react-datepicker` are installed.
- **AC-002** GIVEN `OperationOrderDetailView.tsx`, WHEN creating a new receipt, THEN `Fecha Programada` opens the `react-datepicker` calendar styled with Vuexy/MUI and disables dates before today (`minDate`).
- **AC-003** GIVEN `tsc --noEmit` and `eslint`, WHEN executed on modified files, THEN zero errors occur.

## Out of scope

- Migrating all other ~25 `type='date'` inputs across Accounting/Sales/Purchases in this ticket (can follow incrementally using `AppReactDatepicker`).

## Assumptions

- `react-datepicker/dist/react-datepicker.css` can be imported in `AppReactDatepicker.tsx` and styled with MUI theme tokens (`#6C5CE7`, `#E6E4F0`).

## Open questions

- None.
