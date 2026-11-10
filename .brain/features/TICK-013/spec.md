# EARS Specification: FE-CONTACTS: Integración de Mutaciones de Cuentas Bancarias y Pago Móvil con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-013-fe-contacts-bank-accounts-mutations.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-10
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, while third-party partner records (`Partner`) are now synchronized with `forge-backend` (PR #17 / TICK-008), the dedicated banking view (`/contacts/bank-accounts/`) and its underlying service (`src/services/bankAccountsService.ts`) continue persisting bank accounts and Pago Móvil in browser `localStorage`.

In `forge-backend`, the contacts module (`src/modules/contacts`, BE-CONT-01) provides live banking operations:
- A global SUDEBAN bank catalog query (`banks`).
- Add and remove mutations for bank accounts (`addPartnerBankAccount`, `removePartnerBankAccount`).
- Add and remove mutations for Pago Móvil (`addPartnerMobilePayment`, `removePartnerMobilePayment`).
- Invariant enforcement: accounts must be 20 numeric digits with the first 4 matching the bank code, Pago Móvil must use Venezuelan mobile prefixes, and payment instruments are add/remove only (no in-place edit).

Connecting `bankAccountsService.ts` to these GraphQL operations establishes true financial instrument synchronization.

## EARS Requirements

### Ubiquitous

Requirements that always apply, without an activation condition.

- **REQ-U-001** The system SHALL declare `ADD_PARTNER_BANK_ACCOUNT_MUTATION`, `REMOVE_PARTNER_BANK_ACCOUNT_MUTATION`, `ADD_PARTNER_MOBILE_PAYMENT_MUTATION`, `REMOVE_PARTNER_MOBILE_PAYMENT_MUTATION`, and `GET_BANKS_QUERY` in `src/graphql/contacts.gql.ts`.
- **REQ-U-002** The system SHALL validate that Venezuelan bank account numbers contain exactly 20 digits and that their leading 4 digits match the SUDEBAN code of the chosen bank.
- **REQ-U-003** The system SHALL query the live bank catalog using `GET_BANKS_QUERY` (`banks(where: { active: { equals: true } })`) to populate bank selection dropdowns.

### Event-driven (When)

- **REQ-E-001** WHEN the user registers a bank account for a partner on `/contacts/bank-accounts/create`, the system SHALL execute `addPartnerBankAccount` linking `partnerId`, `bankId`, `currency`, and `accountNumber`.
- **REQ-E-002** WHEN the user registers Pago Móvil for a partner, the system SHALL execute `addPartnerMobilePayment` linking `partnerId`, `bankId`, `phone`, and `docId`.
- **REQ-E-003** WHEN the user deletes a bank account or Pago Móvil instrument, the system SHALL execute `removePartnerBankAccount` or `removePartnerMobilePayment` and update the view reactively.
- **REQ-E-004** WHEN listing third-party bank accounts, the system SHALL query live accounts from `partners` and their nested `bankAccounts` relations.

### State-driven (While)

- **REQ-S-001** WHILE a banking mutation is in transit, the system SHALL set submit buttons to loading state and disable repetitive clicks to prevent duplicate network calls.

### Unwanted (If / Then)

- **REQ-N-001** IF the account number does not match the 4-digit code of the selected bank, THEN the system SHALL display an inline error indicator and reject submission.
- **REQ-N-002** IF the backend rejects account creation due to a duplicate account number for the partner, THEN the system SHALL capture the GraphQL error and display a specific alert banner without clearing form inputs.
- **REQ-N-003** IF a network timeout occurs, THEN the system SHALL notify the user with an actionable message.

### Optional (Where)

- **REQ-O-001** WHERE an account belongs to the tenant organization itself (`is_empresa: true`), the system SHALL manage company treasury accounts cleanly with default indicators.

## Acceptance criteria

- **AC-001** GIVEN the bank account registration form, WHEN the user selects a partner and a SUDEBAN bank, THEN the bank selector SHALL display active banks loaded via `banks`.
- **AC-002** GIVEN an account number of 20 digits matching the bank code, WHEN submitting, THEN the system SHALL execute `addPartnerBankAccount` and return the created record with backend UUID.
- **AC-003** GIVEN an account with mismatched bank code, WHEN submitting, THEN the system SHALL reject submission with an inline validation alert.
- **AC-004** GIVEN an active partner bank account, WHEN clicking delete and confirming, THEN the system SHALL execute `removePartnerBankAccount` and remove it from the list.

## Out of scope

- Direct bank API integrations or webhook reconciliation.
- Automated wire transfer dispatch (SEPA / ACH / BCV Cámara).

## Assumptions

- The backend has seeded the global SUDEBAN bank catalog.
- Partners exist with valid UUIDs.

## Open questions

- None.
