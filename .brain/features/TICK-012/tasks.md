# Tasks: FE-PURCHASES: Integración de Solicitudes, Órdenes de Compra y Recepciones con GraphQL

- **Ticket**: legacy TICK-012-fe-purchases-orders-receptions (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-012/plan.md`
- **Date**: 2026-11-10

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/purchases.gql.ts` Create procurement GraphQL document with queries and mutations: `GET_PURCHASE_QUOTES_QUERY`, `GET_PURCHASE_QUOTE_QUERY`, `CREATE_PURCHASE_QUOTE_MUTATION`, `REGISTER_PURCHASE_QUOTE_MUTATION`, `APPROVE_PURCHASE_QUOTE_MUTATION`, `CONVERT_PURCHASE_QUOTE_TO_ORDER_MUTATION`, `CANCEL_PURCHASE_QUOTE_MUTATION`, `RECALCULATE_PURCHASE_QUOTE_BCV_MUTATION`, `CREATE_PURCHASE_RECEPTION_MUTATION`, and `GET_PURCHASE_KPIS_QUERY`. (REQ-U-001, REQ-O-001)
- [x] T002 `src/services/adapters/purchasesAdapter.ts` Create procurement adapter with 4-decimal formatting, UUIDv4 idempotency key generator, input serializers (`serializeCreatePurchaseQuoteInput`, `serializeReceptionInput`), and backend response mapper (`mapGqlPurchaseQuoteToFrontend`). (REQ-U-002, REQ-U-003, REQ-U-004)
- [x] T003 `src/services/purchasesService.ts` Refactor supplier lookup (`getSuppliers`) to query `partners(where: { isSupplier: true })` and product lookup (`getPurchaseProducts`) to query real catalog variants from `GET_TEMPLATES_QUERY`. (REQ-U-004)
- [x] T004 `src/services/purchasesService.ts` Connect quote listing (`getPurchaseQuotes`), detail retrieval (`getPurchaseQuoteById`), and creation (`createPurchaseQuote`) with GraphQL, assigning live UUIDs and backend `SC` correlatives. (REQ-E-001, REQ-E-002, REQ-N-001)
- [x] T005 `src/services/purchasesService.ts` Connect lifecycle mutations (`approvePurchaseQuote`, `convertQuoteToPurchaseOrder`, `cancelPurchaseQuote`, `createReceptionForPurchase`, and `recalculatePurchaseQuoteBcv`), managing incoming stock transit and reception arrivals. (REQ-E-003, REQ-E-004, REQ-E-005, REQ-E-006, REQ-N-002, REQ-N-003, REQ-O-001)
- [x] T006 `src/views/purchases/quotes/PurchaseMasterDetailForm.tsx` Update purchase form and detail view to handle loading states, display server error alerts non-destructively, and enforce read-only constraints on converted or canceled orders. (REQ-S-001, REQ-S-002, REQ-N-001)
- [x] T007 `forge-front` Run quality gates: TypeScript strict compilation (`tsc --noEmit`), ESLint validation, and Next.js production build (`next build`). (AC-001, AC-002, AC-003, AC-004)

## Dependencies

- T002 depends on T001.
- T003 depends on T001, T002.
- T004 depends on T001, T002, T003.
- T005 depends on T001, T002, T004.
- T006 depends on T004, T005.
- T007 depends on T006.

## Final verification

- [x] Run repository tests and static analysis (`tsc --noEmit`, `eslint`, `next build`).
- [x] Verify spec acceptance criteria (AC-001 to AC-004).
- [x] Confirm there is no scope drift.
