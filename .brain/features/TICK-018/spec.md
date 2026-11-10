# EARS Specification: FE-ACC-CORE: Integración del Plan de Cuentas (PUC), Diarios y Asientos Contables con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-018-fe-acc-core-puc-journals-entries.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-10
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, the core accounting views under `/accounting` (`/accounting/chart-of-accounts`, `/accounting/journals`, and `/accounting/journal-entries`) and their corresponding service (`src/services/accountingService.ts`) currently simulate accounting books, charts of accounts, and journal entries in browser `localStorage`. Accounting seats are not validated by the double-entry engine in PostgreSQL and no audit entries are recorded.

In `forge-backend`, the accounting core module (`src/modules/accounting`, BE-ACC-01 Phase 1) provides a complete Schema-First accounting ledger:
- Chart of accounts (`Account`) with hierarchical code structuring, currency scoping, and initial PUC seeding (`seedDefaultChartOfAccounts`).
- Journals (`Journal`) supporting `SALE`, `PURCHASE`, `CASH`, `BANK`, and `GENERAL` types with default account linkages.
- Journal entries (`JournalEntry` & `JournalEntryLine`) enforcing strict double-entry balancing (debits equal credits in both USD and VES within 0.01 tolerance), open fiscal period verification, immutable posted states, and reverse entry generation.

Connecting `forge-front` to these operations provides enterprise-grade bimonetary financial persistence.

## EARS Requirements

### Ubiquitous

Requirements that always apply, without an activation condition.

- **REQ-U-001** The system SHALL declare core accounting GraphQL operations in `src/graphql/accounting.gql.ts`:
  - Queries: `accounts`, `account(id)`, `journals`, `journal(id)`, `journalEntries`, `journalEntry(id)`.
  - Mutations: `createAccount`, `updateAccount`, `deactivateAccount`, `seedDefaultChartOfAccounts`, `createJournal`, `updateJournal`, `deactivateJournal`, `createJournalEntry`, `postJournalEntry`, `cancelJournalEntry`, `reverseJournalEntry`.
- **REQ-U-002** The system SHALL format all debit and credit monetary amounts and exchange rates as 4-decimal strings (`String` scalar for `Decimal(12,4)` backend compatibility).
- **REQ-U-003** The system SHALL validate balanced double-entry equality (sum of debits equals sum of credits in both USD and VES) prior to submitting journal entries.
- **REQ-U-004** The system SHALL generate a unique UUIDv4 `idempotencyKey` for every `createJournalEntry`, `postJournalEntry`, and `reverseJournalEntry` mutation.

### Event-driven (When)

- **REQ-E-001** WHEN the user views `/accounting/chart-of-accounts`, the system SHALL query `accounts` from the backend; if the chart is empty, provide an option to invoke `seedDefaultChartOfAccounts`.
- **REQ-E-002** WHEN the user creates or edits an account in the PUC drawer, the system SHALL execute `createAccount` or `updateAccount` and update the tree reactively.
- **REQ-E-003** WHEN the user views `/accounting/journals`, the system SHALL query `journals` and render active tenant journals.
- **REQ-E-004** WHEN the user submits a new entry on `/accounting/journal-entries`, the system SHALL execute `createJournalEntry` storing the entry in `DRAFT` status.
- **REQ-E-005** WHEN the user confirms posting a draft entry, the system SHALL execute `postJournalEntry` freezing the entry in `POSTED` status.

### State-driven (While)

- **REQ-S-001** WHILE a journal entry is in `POSTED` status, the system SHALL lock all line fields against editing and permit neutralization only through `reverseJournalEntry`.
- **REQ-S-002** WHILE an accounting mutation is processing over the network, the system SHALL disable submission buttons and display a progress indicator.

### Unwanted (If / Then)

- **REQ-N-001** IF debit and credit sums do not balance within 0.01 tolerance in either USD or VES, THEN the system SHALL block submission and highlight the unbalanced discrepancy.
- **REQ-N-002** IF the backend rejects posting due to a closed fiscal period or missing period, THEN the system SHALL surface the server error alert without losing entered line items.

### Optional (Where)

- **REQ-O-001** WHERE a journal entry line involves a third-party partner, the system SHALL link `contactId` to a valid `Partner` UUID.

## Acceptance criteria

- **AC-001** GIVEN an empty chart of accounts, WHEN clicking seed default PUC, THEN the system SHALL execute `seedDefaultChartOfAccounts` and display the seeded Venezuelan accounts.
- **AC-002** GIVEN an unbalanced journal entry, WHEN the user attempts to submit, THEN the system SHALL block submission and indicate the difference.
- **AC-003** GIVEN a balanced entry with 2 lines, WHEN submitting, THEN the system SHALL execute `createJournalEntry` and return the entry in `DRAFT`.
- **AC-004** GIVEN a draft entry, WHEN clicking post, THEN the system SHALL execute `postJournalEntry` and update status to `POSTED`.

## Out of scope

- Invoices and payments linkage (handled in `TICK-019`).
- Statement generation and financial reports (handled in `TICK-020`).

## Assumptions

- Fiscal periods exist and are open for the current year.
- Active BCV exchange rate is available for VES debit/credit computation.

## Open questions

- None.
