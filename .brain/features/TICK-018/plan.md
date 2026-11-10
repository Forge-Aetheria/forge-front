# Technical Plan: FE-ACC-CORE: Integración del Plan de Cuentas (PUC), Diarios y Asientos Contables con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-018-fe-acc-core-puc-journals-entries.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-018/spec.md`
- **Date**: 2026-11-10

## Summary

This feature transitions the core accounting ledger in `forge-front` from browser `localStorage` mock simulation to live transactional GraphQL operations against `forge-backend` (`src/modules/accounting` / BE-ACC-01 Phase 1). The technical strategy creates `src/graphql/accounting.gql.ts`, develops a dedicated transformation adapter (`src/services/adapters/accountingAdapter.ts`), and refactors `accountingService.ts` to execute live queries and mutations for the chart of accounts (`Account`), journals (`Journal`), and journal entries (`JournalEntry`), enforcing strict bimonetary double-entry balancing and UUIDv4 idempotency.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient`, `crypto.randomUUID` for UUIDv4 idempotency keys, `@/services/inventoryService` (active BCV rate).
- **Persistence**: Centralized PostgreSQL database managed by `forge-backend` through Prisma 7 (Account, Journal, JournalEntry, JournalEntryLine, FiscalPeriod).
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript checking).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - Double-entry rule: Sum of debits must equal sum of credits in both USD and VES within 0.01 tolerance.
  - Decimal precision: All monetary values and exchange rates are formatted as 4-decimal strings (`Decimal(12,4)` scalar in GraphQL).
  - Zero dead code / no backup files (Rule R1).

## Architecture decisions

- **ADR-001: Dedicated Accounting Adapter Layer (`accountingAdapter.ts`)**
  - **Decision:** Create `src/services/adapters/accountingAdapter.ts` to convert between backend GraphQL accounting models (`Account`, `Journal`, `JournalEntry`) and frontend UI representations (`Account`, `Journal`, `JournalEntry`).
  - **Rationale:** Shields UI tables from backend enum naming differences (`ASSET` vs `ASSET_CURRENT`, `SALE` vs `VENTAS`) and centralizes 4-decimal serialization.
  - **Rejected alternative:** Exposing raw GraphQL types directly across UI tables and modals.

- **ADR-002: Client-Side Pre-Flight Double Entry Balancing**
  - **Decision:** Before transmitting `createJournalEntry`, calculate and verify that `abs(totalDebitUsd - totalCreditUsd) <= 0.01` and `abs(totalDebitVes - totalCreditVes) <= 0.01`.
  - **Rationale:** Prevents unnecessary network round-trips for unbalanced entries and provides instantaneous UI feedback to accountants.
  - **Rejected alternative:** Relying solely on the backend exception filter to reject unbalanced entries.

- **ADR-003: Idempotent Two-Step Post Cycle**
  - **Decision:** Entries are created in `DRAFT` status via `createJournalEntry` and subsequently confirmed via `postJournalEntry` using an explicit `idempotencyKey`.
  - **Rationale:** Preserves the ability to draft complex multi-line seats while guaranteeing that posting is atomic and replay-safe.
  - **Rejected alternative:** Posting immediately upon creation without draft review.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/accounting.gql.ts` | Create file declaring queries `GET_ACCOUNTS_QUERY`, `GET_JOURNALS_QUERY`, `GET_JOURNAL_ENTRIES_QUERY`, and mutations `CREATE_ACCOUNT_MUTATION`, `UPDATE_ACCOUNT_MUTATION`, `SEED_DEFAULT_CHART_MUTATION`, `CREATE_JOURNAL_MUTATION`, `CREATE_JOURNAL_ENTRY_MUTATION`, `POST_JOURNAL_ENTRY_MUTATION`, `REVERSE_JOURNAL_ENTRY_MUTATION`. |
| **Adapter** | `src/services/adapters/accountingAdapter.ts` | Create adapter implementing `mapGqlAccountToFrontend`, `mapGqlJournalToFrontend`, `mapGqlEntryToFrontend`, and serializers `serializeAccountInput`, `serializeJournalEntryInput`. |
| **Domain / Service** | `src/services/accountingService.ts` | Refactor `getAccounts`, `createAccount`, `updateAccount`, `seedChartOfAccounts`, `getJournals`, `createJournal`, `getJournalEntries`, `createJournalEntry`, `postJournalEntry`, `reverseJournalEntry` to invoke GraphQL operations. |
| **Client / UI** | `src/views/accounting/` | Connect `ChartOfAccountsView.tsx`, `JournalsListView.tsx`, and `JournalEntryFormView.tsx` with live GraphQL endpoints, loading states, and error alerts. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes the accounting core in `src/modules/accounting/resolvers/` (`account.resolver.ts`, `journal.resolver.ts`, `journal-entry.resolver.ts`).
- **Consumer**: `sidecars/forge-front` consumes these endpoints via `src/services/accountingService.ts`.
- **Contract status**: 100% aligned with BE-ACC-01 Phase 1 in `forge-backend`. No backend changes required.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all modified files.
- **Production Build**: Verify full page compilation with `pnpm exec next build`.
- **Integration Flow**:
  1. Open `/accounting/chart-of-accounts` and verify PUC loads from `accounts` query (or trigger seed).
  2. Create an account and verify reactive insertion.
  3. Open `/accounting/journal-entries`, create a balanced entry with debits = credits, and submit.
  4. Post the draft entry and verify status changes to `POSTED`.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Double-entry rounding discrepancy** | Backend rejects entry if USD/VES differ by > 0.01 | Use centralized 4-decimal formatting and pre-flight balance validation. |
| **Closed fiscal period** | Mutation rejected by backend guard | Verify that posting date falls within an open period and surface error message clearly. |
| **Missing account mapping** | Foreign key rejection on line items | Enforce selecting accounts from the verified PUC list. |
