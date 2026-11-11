# Tasks: FE-ACC-CORE: Integración del Plan de Cuentas (PUC), Diarios y Asientos Contables con GraphQL

- **Ticket**: legacy TICK-018-fe-acc-core-puc-journals-entries (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-018/plan.md`
- **Date**: 2026-11-10

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/accounting.gql.ts` Declare core accounting GraphQL operations: queries (`GET_ACCOUNTS_QUERY`, `GET_ACCOUNT_QUERY`, `GET_JOURNALS_QUERY`, `GET_JOURNAL_ENTRIES_QUERY`) and mutations (`CREATE_ACCOUNT_MUTATION`, `UPDATE_ACCOUNT_MUTATION`, `DEACTIVATE_ACCOUNT_MUTATION`, `SEED_DEFAULT_CHART_MUTATION`, `CREATE_JOURNAL_MUTATION`, `CREATE_JOURNAL_ENTRY_MUTATION`, `POST_JOURNAL_ENTRY_MUTATION`, `CANCEL_JOURNAL_ENTRY_MUTATION`, `REVERSE_JOURNAL_ENTRY_MUTATION`). (REQ-U-001)
- [x] T002 `src/services/adapters/accountingAdapter.ts` Create accounting adapter implementing 4-decimal formatting, UUIDv4 idempotency key generator, double-entry pre-flight balance validator, and entity mappers (`mapGqlAccountToFrontend`, `mapGqlJournalToFrontend`, `mapGqlEntryToFrontend`). (REQ-U-002, REQ-U-003, REQ-U-004)
- [x] T003 `src/services/accountingService.ts` Refactor chart of accounts methods (`getAccounts`, `createAccount`, `updateAccount`, `seedChartOfAccounts`, `deactivateAccount`) to consume live GraphQL operations. (REQ-E-001, REQ-E-002)
- [x] T004 `src/services/accountingService.ts` Refactor journals and journal entries methods (`getJournals`, `createJournal`, `getJournalEntries`, `createJournalEntry`, `postJournalEntry`, `reverseJournalEntry`, `cancelJournalEntry`) to consume live GraphQL operations with double-entry validation. (REQ-E-003, REQ-E-004, REQ-E-005, REQ-S-001, REQ-N-001, REQ-N-002, REQ-O-001)
- [x] T005 `src/views/accounting/chart-of-accounts/ChartOfAccountsView.tsx` Update accounting views for chart of accounts, journals, and journal entries with live data binding, loading states, and non-destructive error handling. (REQ-S-002, REQ-N-001, REQ-N-002)
- [x] T006 `forge-front` Run quality gates: TypeScript strict compilation (`tsc --noEmit`), ESLint validation, and Next.js production build (`next build`). (AC-001, AC-002, AC-003, AC-004)

## Dependencies

- T002 depends on T001.
- T003 depends on T001, T002.
- T004 depends on T001, T002, T003.
- T005 depends on T003, T004.
- T006 depends on T005.

## Final verification

- [x] Run repository tests and static analysis (`tsc --noEmit`, `eslint`, `next build`).
- [x] Verify spec acceptance criteria (AC-001 to AC-004).
- [x] Confirm there is no scope drift.
