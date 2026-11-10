# Tasks: FE-ACC-REPORTS: Conexión de Reportes Financieros en Vivo con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-020-fe-acc-financial-reports-graphql.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-020/plan.md`
- **Date**: 2026-11-10

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/accounting.gql.ts` Declare financial report queries: `GET_BALANCE_SHEET_QUERY`, `GET_PROFIT_AND_LOSS_QUERY`, `GET_TRIAL_BALANCE_QUERY`, `GET_GENERAL_LEDGER_QUERY`, and `GET_ACCOUNTING_DASHBOARD_QUERY`. (REQ-U-001)
- [x] T002 `src/services/adapters/accountingAdapter.ts` Implement DualMoney unpacking helpers and report mappers (`mapGqlBalanceSheetToFrontend`, `mapGqlProfitAndLossToFrontend`, `mapGqlTrialBalanceToFrontend`, `mapGqlGeneralLedgerToFrontend`). (REQ-U-002, REQ-U-003)
- [x] T003 `src/services/accountingService.ts` Implement report fetching methods (`fetchBalanceSheet`, `fetchProfitAndLoss`, `fetchTrialBalance`, `fetchGeneralLedger`, `fetchAccountingDashboard`) with date boundary validation. (REQ-E-001, REQ-E-002, REQ-E-003, REQ-E-004, REQ-E-005, REQ-N-001, REQ-O-001)
- [x] T004 `src/views/accounting/reports/BalanceSheetView.tsx` Connect Balance Sheet and P&L views to live report queries with skeleton loading and currency toggling. (REQ-E-001, REQ-E-002, REQ-S-001, REQ-N-002)
- [x] T005 `src/views/accounting/reports/TrialBalanceView.tsx` Connect Trial Balance and General Ledger views to live report queries with skeleton loading and pagination. (REQ-E-003, REQ-E-004, REQ-S-001, REQ-N-002)
- [x] T006 `forge-front` Run quality gates: TypeScript strict compilation (`tsc --noEmit`), ESLint validation, and Next.js production build (`next build`). (AC-001, AC-002, AC-003, AC-004)

## Dependencies

- T002 depends on T001.
- T003 depends on T001, T002.
- T004 depends on T003.
- T005 depends on T003.
- T006 depends on T004, T005.

## Final verification

- [x] Run repository tests and static analysis (`tsc --noEmit`, `eslint`, `next build`).
- [x] Verify spec acceptance criteria (AC-001 to AC-004).
- [x] Confirm there is no scope drift.
