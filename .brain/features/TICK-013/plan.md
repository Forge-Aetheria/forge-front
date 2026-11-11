# Technical Plan: FE-CONTACTS: Integración de Mutaciones de Cuentas Bancarias y Pago Móvil con GraphQL

- **Ticket**: legacy TICK-013-fe-contacts-bank-accounts-mutations (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-013/spec.md`
- **Date**: 2026-11-10

## Summary

This feature transitions bank account and Pago Móvil management from browser `localStorage` mock persistence to live GraphQL operations against `forge-backend` (`src/modules/contacts` / BE-CONT-01). The technical strategy connects `bankAccountsService.ts`, the list view (`/contacts/bank-accounts`), and creation views (`/contacts/bank-accounts/create`) to backend operations (`banks`, `addPartnerBankAccount`, `removePartnerBankAccount`, `addPartnerMobilePayment`, and `removePartnerMobilePayment`), validates 20-digit SUDEBAN bank code integrity, and populates partner bank instruments with real backend UUIDs.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient`, `@/graphql/contacts.gql`.
- **Persistence**: PostgreSQL database managed by `forge-backend` via Prisma 7 (Partner, Bank, PartnerBankAccount, PartnerMobilePayment).
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript validation).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - Bank accounts must be exactly 20 numeric digits whose first 4 digits match the SUDEBAN bank code.
  - Financial instruments are add/remove only: no in-place edit (rule CG-11).
  - Zero dead code / no backup files (Rule R1).

## Architecture decisions

- **ADR-001: Automatic Bank Resolution from Account Prefix**
  - **Decision:** Derive the associated `bankId` automatically by comparing the first 4 digits of the entered account number with the active SUDEBAN bank catalog (`banks`).
  - **Rationale:** Prevents user entry mismatches and ensures that `PartnerBankAccount` always points to the correct foreign key `Bank`.
  - **Rejected alternative:** Requiring the user to independently select the bank and re-type the 4-digit code in the account field without cross-validation.

- **ADR-002: Add/Remove Payment Instrument Pattern (Rule CG-11)**
  - **Decision:** Conform strictly to the backend invariant that bank accounts and Pago Móvil records are never modified in place; editing is treated as removal of the old record and addition of the updated instrument.
  - **Rationale:** Ensures clean audit trails and eliminates ambiguous partial payment states.
  - **Rejected alternative:** Exposing simulated update endpoints in client code.

- **ADR-003: Graceful Error Surfacing on Mismatched Codes**
  - **Decision:** Validate the 20-digit bank code client-side before sending GraphQL mutations, and catch backend duplicate errors, presenting clear alerts on the form.
  - **Rationale:** Prevents unnecessary network round-trips for obvious formatting errors and keeps entered fields intact upon server rejection.
  - **Rejected alternative:** Generic submission alerts that wipe entered account details.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/contacts.gql.ts` | Add `GET_BANKS_QUERY`, `ADD_PARTNER_BANK_ACCOUNT_MUTATION`, `REMOVE_PARTNER_BANK_ACCOUNT_MUTATION`, `ADD_PARTNER_MOBILE_PAYMENT_MUTATION`, and `REMOVE_PARTNER_MOBILE_PAYMENT_MUTATION`. |
| **Domain / Service** | `src/services/bankAccountsService.ts` | Refactor `getBankAccounts`, `createBankAccount`, `deleteBankAccount`, and add `fetchBanks` to invoke live GraphQL operations and query `partner.bankAccounts`. |
| **Client / UI** | `src/views/contacts/bank-accounts/` & `BankAccountFormView.tsx` | Connect bank selector to live `banks` catalog, enforce 20-digit validation, and manage submission loading states. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes `banks`, `addPartnerBankAccount`, `removePartnerBankAccount`, and Pago Móvil operations in `src/modules/contacts/resolvers/`.
- **Consumer**: `sidecars/forge-front` consumes these endpoints via `bankAccountsService.ts`.
- **Contract status**: 100% aligned with BE-CONT-01 in `forge-backend`. No backend changes required.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all modified files.
- **Production Build**: Verify full page compilation with `pnpm exec next build`.
- **Integration Flow**:
  1. Open `/contacts/bank-accounts/create` and verify that active SUDEBAN banks load dynamically.
  2. Input a valid 20-digit account matching the selected bank code and submit.
  3. Verify successful creation and presence of the account in the partner's banking list.
  4. Test deleting an account and confirm removal via `removePartnerBankAccount`.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Bank code mismatch** | Backend rejects account with validation error | Client-side validation checks leading 4 digits against bank code before submission. |
| **Duplicate account per partner** | Server returns duplicate violation | Catch GraphQL error and display inline alert without wiping form state. |
| **Inactive bank selection** | Foreign key rejection | Filter banks query to `active: true` banks only. |
