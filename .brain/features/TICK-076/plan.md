# Technical Plan: Replace native date input with template datepicker and define past-date rule in Receipts

- **Ticket**: .agents/tickets/backlog/TICK-076-forge-front-replace-native-date-input-with-template-datepicker-and-defin.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-076/spec.md`
- **Date**: 2026-11-22

## Summary

Install `react-datepicker` and `@types/react-datepicker`, create a reusable `AppReactDatepicker` component at `src/components/AppReactDatepicker.tsx` matching Vuexy MUI styling, and replace the native `type='date'` input in `OperationOrderDetailView.tsx` with `minDate` set to today for new operations.

## Technical context

- **Stack**: Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3, MUI 7.3.6.
- **Dependencies**: `react-datepicker`, `@types/react-datepicker` (explicitly approved by user to homologate date pickers across the ERP).
- **Persistence**: N/A (stores `YYYY-MM-DD` string in component state).
- **Testing**: `tsc --noEmit` and `eslint` on modified files.
- **Constraints**: Avoid timezone off-by-one bugs when converting between `YYYY-MM-DD` strings and `Date` objects (parse local `YYYY-MM-DD` components explicitly).

## Architecture decisions

- **ADR-001**: Use `react-datepicker` wrapped in `src/components/AppReactDatepicker.tsx` with a `CustomTextField` `customInput` — matches Vuexy template architecture and supports both single dates and ranges (`selectsRange`). Rejected alternative: `@mui/x-date-pickers` (heavier dependency tree and requires adapter setup).

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Dependencies | `package.json`, `package-lock.json` | Add `react-datepicker` and `@types/react-datepicker`. |
| Client or UI | `src/components/AppReactDatepicker.tsx` | Create reusable Vuexy-styled `AppReactDatepicker` component + `parseLocalDate` / `formatLocalDate` helpers. |
| Client or UI | `src/views/inventory/OperationOrderDetailView.tsx` | Replace `<CustomTextField type='date' />` with `AppReactDatepicker` and `minDate={isCreate ? new Date() : undefined}`. |

## Cross-sidecar integration

None.

## Testing strategy

- **Manual or E2E**: Verify `tsc --noEmit` and `eslint` pass.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| UTC timezone shift (`new Date('2026-11-22')` becomes Nov 21 in UTC-4) | Wrong date displayed/saved | Parse and format `YYYY-MM-DD` using local year/month/day components. |
