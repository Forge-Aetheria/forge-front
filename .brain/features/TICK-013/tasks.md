# Tasks: FE-CONTACTS: Integración de Mutaciones de Cuentas Bancarias y Pago Móvil con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-013-fe-contacts-bank-accounts-mutations.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-013/plan.md`
- **Date**: 2026-11-10

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/contacts.gql.ts` Declare GraphQL operations `GET_BANKS_QUERY`, `ADD_PARTNER_BANK_ACCOUNT_MUTATION`, `REMOVE_PARTNER_BANK_ACCOUNT_MUTATION`, `ADD_PARTNER_MOBILE_PAYMENT_MUTATION`, and `REMOVE_PARTNER_MOBILE_PAYMENT_MUTATION`. (REQ-U-001)
- [x] T002 `src/services/bankAccountsService.ts` Implement `fetchBanks` to query the live SUDEBAN bank catalog from `GET_BANKS_QUERY` and add bank code validation helper. (REQ-U-002, REQ-U-003, REQ-N-001)
- [x] T003 `src/services/bankAccountsService.ts` Refactor `getBankAccounts`, `createBankAccount`, and `deleteBankAccount` to invoke live GraphQL operations for partner instruments and link Pago Móvil. (REQ-E-001, REQ-E-002, REQ-E-003, REQ-E-004, REQ-O-001)
- [x] T004 `src/views/contacts/BankAccountDetailView.tsx` Update bank account form and list view to consume active banks, manage loading submission state, and display validation alerts non-destructively. (REQ-S-001, REQ-N-002, REQ-N-003)
- [x] T005 `forge-front` Run quality gates: TypeScript strict compilation (`tsc --noEmit`), ESLint validation, and Next.js production build (`next build`). (AC-001, AC-002, AC-003, AC-004)

## Dependencies

- T002 depends on T001.
- T003 depends on T001, T002.
- T004 depends on T002, T003.
- T005 depends on T004.

## Final verification

- [x] Run repository tests and static analysis (`tsc --noEmit`, `eslint`, `next build`).
- [x] Verify spec acceptance criteria (AC-001 to AC-004).
- [x] Confirm there is no scope drift.
