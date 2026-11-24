# Tasks: Replace native date input with template datepicker and define past-date rule in Receipts

- **Ticket**: .agents/tickets/backlog/TICK-076-forge-front-replace-native-date-input-with-template-datepicker-and-defin.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-076/plan.md`
- **Date**: 2026-11-22

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `package.json` Install `react-datepicker` and `@types/react-datepicker`.
- [x] T002 `src/components/AppReactDatepicker.tsx` Create reusable `AppReactDatepicker` wrapper with Vuexy/MUI styling and local `YYYY-MM-DD` helpers (`REQ-U-001`, `REQ-E-001`, `REQ-N-001`, `REQ-O-001`).
- [x] T003 `src/views/inventory/OperationOrderDetailView.tsx` Replace native `type='date'` input for `fechaProgramada` with `AppReactDatepicker` and `minDate` (`REQ-U-002`, `REQ-S-001`).

## Dependencies

- T002 depends on T001.
- T003 depends on T002.

## Final verification

- [ ] Run TypeScript check (`npx tsc --noEmit`) and ESLint on modified files.
- [ ] Verify spec acceptance criteria (`AC-001`, `AC-002`, `AC-003`).
- [ ] Confirm there is no scope drift.
