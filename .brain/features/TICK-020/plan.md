# Technical Plan: FE-ACC-REPORTS: Conexión de Reportes Financieros en Vivo con GraphQL

- **Ticket**: legacy TICK-020-fe-acc-financial-reports-graphql (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-020/spec.md`
- **Date**: 2026-11-10

## Summary

This feature transitions the financial statements and reporting suite in `forge-front` from browser `localStorage` mock calculations to live server-computed GraphQL queries against `forge-backend` (`accounting-report.resolver.ts` and `dashboard.resolver.ts` / BE-ACC-01). The technical strategy declares the statement queries in `src/graphql/accounting.gql.ts`, develops report data mappers in `accountingAdapter.ts` to transform server `DualMoney` value objects into frontend report rows, and connects `BalanceSheetView.tsx`, `ProfitAndLossView.tsx`, `TrialBalanceView.tsx`, `GeneralLedgerView.tsx`, and `AccountingDashboardView.tsx` with live data binding and reactive currency toggling.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient`, `@/graphql/accounting.gql`.
- **Persistence**: Server-aggregated from posted ledger lines in PostgreSQL (`JournalEntryLine`).
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript validation).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - All financial figures must reflect bimonetary amounts (USD and VES) directly as computed by the server engine.
  - Zero dead code / no backup files (Rule R1).

## Architecture decisions

- **ADR-001: Server-Side Financial Aggregate Computation**
  - **Decision:** Consume `balanceSheet`, `profitAndLoss`, `trialBalance`, and `generalLedger` server queries instead of calculating balances from client-side account arrays.
  - **Rationale:** Guarantees accounting integrity, handles multi-period cutoff dates, respects rate policies, and eliminates client calculation discrepancies.
  - **Rejected alternative:** Fetching all journal entries to sum balances in the browser.

- **ADR-002: DualMoney Normalization in Adapter Layer**
  - **Decision:** Unpack server `DualMoney` objects (`{ usd: { amount }, ves: { amount } }`) into standard numeric amounts in `accountingAdapter.ts`.
  - **Rationale:** Decouples report UI components from GraphQL value object nesting, allowing seamless currency switching between USD and VES.
  - **Rejected alternative:** Rewriting every table cell in the report views to manually navigate `DualMoney` structures.

- **ADR-003: Pre-Flight Date Boundary Validation**
  - **Decision:** Validate that `dateFrom <= dateTo` client-side before dispatching `profitAndLoss` and `generalLedger` queries.
  - **Rationale:** Prevents unnecessary server errors and provides instantaneous UI guidance.
  - **Rejected alternative:** Relying solely on server exception messages.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/accounting.gql.ts` | Declare queries: `GET_BALANCE_SHEET_QUERY`, `GET_PROFIT_AND_LOSS_QUERY`, `GET_TRIAL_BALANCE_QUERY`, `GET_GENERAL_LEDGER_QUERY`, and `GET_ACCOUNTING_DASHBOARD_QUERY`. |
| **Adapter** | `src/services/adapters/accountingAdapter.ts` | Add mappers: `mapGqlBalanceSheetToFrontend`, `mapGqlProfitAndLossToFrontend`, `mapGqlTrialBalanceToFrontend`, `mapGqlGeneralLedgerToFrontend`. |
| **Domain / Service** | `src/services/accountingService.ts` | Implement `fetchBalanceSheet`, `fetchProfitAndLoss`, `fetchTrialBalance`, `fetchGeneralLedger`, and `fetchAccountingDashboard`. |
| **Client / UI** | `src/views/accounting/reports/` | Connect `BalanceSheetView.tsx`, `ProfitAndLossView.tsx`, `TrialBalanceView.tsx`, and `GeneralLedgerView.tsx` with live data queries and skeleton loaders. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes the reports engine in `src/modules/accounting/resolvers/accounting-report.resolver.ts` and `dashboard.resolver.ts`.
- **Consumer**: `sidecars/forge-front` consumes these queries via `src/services/accountingService.ts`.
- **Contract status**: 100% aligned with BE-ACC-01 in `forge-backend`. No backend changes required.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all modified files.
- **Production Build**: Verify full page compilation with `pnpm exec next build`.
- **Integration Flow**:
  1. Access `/accounting/reports/balance-sheet` and verify live balance sheet loads.
  2. Access `/accounting/reports/profit-and-loss`, select date range, and verify P&L metrics.
  3. Access `/accounting/reports/trial-balance` and verify debit/credit sums.
  4. Access `/accounting/reports/general-ledger` and verify chronological items.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Empty ledger results** | Reports return zero balances for new tenants | Provide informative empty states with guidance to post initial journal entries. |
| **Date formatting mismatch** | Server rejects non-ISO dates | Use strict `toISOString().slice(0, 10)` formatting. |
