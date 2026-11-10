# EARS Specification: FE-ACC-REPORTS: Conexión de Reportes Financieros en Vivo con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-020-fe-acc-financial-reports-graphql.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-10
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, the financial statements and audit reports under `/accounting/reports/*` (`/balance-sheet`, `/profit-and-loss`, `/trial-balance`, `/general-ledger`) and `/accounting/dashboard` currently calculate financial metrics and rows using in-memory mock datasets in browser `localStorage`.

In `forge-backend`, the accounting reports engine (`src/modules/accounting/resolvers/accounting-report.resolver.ts`, BE-ACC-01) provides server-side financial statements computed from posted ledger lines:
- `balanceSheet(asOf, includeDrafts, ratePolicy, closingRate)`: Complete Venezuelan / international balance sheet with equation check (Assets = Liabilities + Equity).
- `profitAndLoss(dateFrom, dateTo, includeDrafts, ratePolicy, closingRate)`: Income statement covering gross margin, operating results, and net income.
- `trialBalance(asOf, includeDrafts, ratePolicy, closingRate)`: Trial balance verifying debit and credit equality across the chart of accounts.
- `generalLedger(dateFrom, dateTo, accountId, includeDrafts)`: Paged general ledger with cumulative running balance.
- `accountingDashboard`: Financial health KPIs.

Connecting `forge-front` to these queries provides real-time audit-compliant financial reporting.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The system SHALL declare `GET_BALANCE_SHEET_QUERY`, `GET_PROFIT_AND_LOSS_QUERY`, `GET_TRIAL_BALANCE_QUERY`, `GET_GENERAL_LEDGER_QUERY`, and `GET_ACCOUNTING_DASHBOARD_QUERY` in `src/graphql/accounting.gql.ts`.
- **REQ-U-002** The system SHALL support bimonetary projection (USD and VES) across all financial reports, consuming `DualMoney` server value objects.
- **REQ-U-003** The system SHALL format all report date parameters as ISO Date strings (`YYYY-MM-DD`).

### Event-driven (When)

- **REQ-E-001** WHEN the user views `/accounting/reports/balance-sheet`, the system SHALL query `balanceSheet` and render asset, liability, and equity sections with server equation validation.
- **REQ-E-002** WHEN the user views `/accounting/reports/profit-and-loss`, the system SHALL query `profitAndLoss` and render revenues, costs, operating expenses, and net profit.
- **REQ-E-003** WHEN the user views `/accounting/reports/trial-balance`, the system SHALL query `trialBalance` and render the sums and balances table.
- **REQ-E-004** WHEN the user views `/accounting/reports/general-ledger`, the system SHALL query `generalLedger` and present chronologically ordered entries with running balances.
- **REQ-E-005** WHEN the user views `/accounting` or `/accounting/dashboard`, the system SHALL render real-time dashboard KPIs.

### State-driven (While)

- **REQ-S-001** WHILE a financial report query is in transit, the system SHALL display skeleton rows across table components.

### Unwanted (If / Then)

- **REQ-N-001** IF the selected date range has `dateFrom > dateTo`, THEN the system SHALL display an inline validation warning and prevent network dispatch.
- **REQ-N-002** IF the backend returns an authorization or query error, THEN the system SHALL surface a user-friendly alert banner.

### Optional (Where)

- **REQ-O-001** WHERE `includeDrafts` is enabled, the system SHALL request unposted simulated balances.

## Acceptance criteria

- **AC-001** GIVEN `/accounting/reports/balance-sheet`, WHEN the view loads, THEN the system SHALL query `balanceSheet` and display balanced totals in USD and VES.
- **AC-002** GIVEN a date range on `/accounting/reports/profit-and-loss`, WHEN selecting dates, THEN the system SHALL query `profitAndLoss` and present gross and net margin.
- **AC-003** GIVEN `/accounting/reports/trial-balance`, WHEN loading, THEN the system SHALL query `trialBalance` and confirm debit and credit equality.
- **AC-004** GIVEN `/accounting/reports/general-ledger`, WHEN selecting an account, THEN the system SHALL display its itemized entries with running balances.

## Out of scope

- PDF export rendering (handled in subsequent export increment).
- Automated statutory tax declarations (SENIAT portal upload).

## Assumptions

- Journal entries exist in `POSTED` status to populate balances.
- Historical exchange rates are recorded on ledger lines.

## Open questions

- None.
