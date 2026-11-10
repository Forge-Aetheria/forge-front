# Tasks: FE-ACC-INVOICES: Integración de Facturación CxC/CxP, Notas de Crédito y Pagos con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-019-fe-acc-invoices-credit-notes-payments.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-019/plan.md`
- **Date**: 2026-11-10

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/accounting.gql.ts` Declare invoicing, treasury, and credit note GraphQL operations: queries (`GET_INVOICES_QUERY`, `GET_INVOICE_QUERY`, `GET_PAYMENTS_QUERY`, `GET_CREDIT_NOTES_QUERY`) and mutations (`CREATE_CUSTOMER_INVOICE_MUTATION`, `POST_CUSTOMER_INVOICE_MUTATION`, `CREATE_SUPPLIER_INVOICE_MUTATION`, `POST_SUPPLIER_INVOICE_MUTATION`, `CANCEL_INVOICE_MUTATION`, `REGISTER_PAYMENT_MUTATION`, `CANCEL_PAYMENT_MUTATION`, `POST_CREDIT_NOTE_MUTATION`, `CANCEL_CREDIT_NOTE_MUTATION`). (REQ-U-001)
- [x] T002 `src/services/adapters/accountingAdapter.ts` Implement serialization and mapping helpers for invoices, payments, and credit notes (`mapGqlInvoiceToFrontend`, `mapGqlPaymentToFrontend`, `mapGqlCreditNoteToFrontend`, `serializePaymentInput`). (REQ-U-002, REQ-U-003, REQ-U-004)
- [x] T003 `src/services/accountingService.ts` Refactor customer and supplier invoicing methods (`getInvoices`, `getInvoiceById`, `createInvoice`, `postInvoice`, `cancelInvoice`) to consume live GraphQL operations. (REQ-E-001, REQ-E-002, REQ-E-003, REQ-O-001)
- [x] T004 `src/services/accountingService.ts` Refactor payment and credit note methods (`getPayments`, `registerPayment`, `cancelPayment`, `getCreditNotes`, `postCreditNote`, `cancelCreditNote`) to consume live GraphQL operations with balance validation. (REQ-E-004, REQ-E-005, REQ-N-001, REQ-N-002, REQ-N-003)
- [x] T005 `src/views/accounting/invoices/InvoicesListView.tsx` Connect invoicing, payments, and credit notes views with live GraphQL endpoints, loading states, and non-destructive error handling. (REQ-S-001, REQ-S-002, REQ-N-001)
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
