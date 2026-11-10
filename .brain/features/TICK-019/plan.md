# Technical Plan: FE-ACC-INVOICES: Integración de Facturación CxC/CxP, Notas de Crédito y Pagos con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-019-fe-acc-invoices-credit-notes-payments.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-019/spec.md`
- **Date**: 2026-11-10

## Summary

This feature transitions commercial invoicing (`/accounting/invoices`), credit notes (`/accounting/credit-notes`), and treasury payments (`/accounting/payments`) from browser `localStorage` mock simulation to live GraphQL operations against `forge-backend` (`src/modules/accounting` / BE-ACC-01 Phases 2 & 3). The technical strategy expands `src/graphql/accounting.gql.ts`, extends `accountingAdapter.ts` with invoice, payment, and credit note serializers, and refactors `accountingService.ts` to manage customer and supplier invoices, credit notes, and payment allocations against real backend entities with UUIDv4 idempotency keys and strict bimonetary decimal precision.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient`, `crypto.randomUUID` for UUIDv4 idempotency generation, `@/graphql/accounting.gql`.
- **Persistence**: Centralized PostgreSQL database managed by `forge-backend` through Prisma 7 (AccountingInvoice, Payment, CreditNote, InvoicePaymentAllocation).
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript validation).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - All monetary values, taxes, and exchange rates must be formatted as 4-decimal strings (`Decimal(12,4)` scalar in GraphQL).
  - Server-calculated taxes and snapshots dictate invoice totals.
  - Zero dead code / no backup files (Rule R1).

## Architecture decisions

- **ADR-001: Server-Authoritative Invoice Posting and Tax Calculation**
  - **Decision:** Delegate tax computation, accounting entry generation, and invoice number assignment (`FAC-CLI-YYYY-XXXX`, `FAC-PROV-YYYY-XXXX`) entirely to `forge-backend`.
  - **Rationale:** Ensures fiscal compliance and prevents client manipulation of tax bases or currency conversion rules.
  - **Rejected alternative:** Calculating taxes and fabricating invoice numbers in browser client code.

- **ADR-002: Multi-Allocation Payment Reconciliation Engine**
  - **Decision:** Utilize the `registerPayment` mutation accepting an array of allocations (`allocations: [{ invoiceId, amountUsd, amountVes }]`).
  - **Rationale:** Supports partial payments, single payments covering multiple invoices, and automatic FX differential calculation by the server.
  - **Rejected alternative:** Individual single-invoice payment endpoints.

- **ADR-003: Pre-Flight Over-Allocation Client Validation**
  - **Decision:** In the payment form, prevent allocating an amount greater than the target invoice's remaining pending balance (`saldoPendienteUsd`).
  - **Rationale:** Protects against negative invoice balances and eliminates avoidable server rejection errors.
  - **Rejected alternative:** Allowing unrestricted payment amounts and relying on server exceptions.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/accounting.gql.ts` | Declare operations for `accountingInvoices`, `createCustomerInvoice`, `postCustomerInvoice`, `createSupplierInvoice`, `postSupplierInvoice`, `cancelCustomerInvoice`, `cancelSupplierInvoice`, `payments`, `registerPayment`, `cancelPayment`, `creditNotes`, `postCreditNote`, `cancelCreditNote`. |
| **Adapter** | `src/services/adapters/accountingAdapter.ts` | Add invoice, payment, and credit note serializers and mappers (`mapGqlInvoiceToFrontend`, `mapGqlPaymentToFrontend`, `mapGqlCreditNoteToFrontend`). |
| **Domain / Service** | `src/services/accountingService.ts` | Refactor `getInvoices`, `createInvoice`, `postInvoice`, `getPayments`, `createPayment`, `getCreditNotes`, and `createCreditNote` to consume live GraphQL operations. |
| **Client / UI** | `src/views/accounting/invoices/`, `payments/`, `credit-notes/` | Connect views with live GraphQL endpoints, loading states, and error alerts. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes invoicing and treasury in `src/modules/accounting/resolvers/` (`accounting-invoice.resolver.ts`, `payment.resolver.ts`, `credit-note.resolver.ts`).
- **Consumer**: `sidecars/forge-front` consumes these operations via `src/services/accountingService.ts`.
- **Contract status**: 100% aligned with BE-ACC-01 Phases 2 and 3 in `forge-backend`. No backend changes required.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all modified files.
- **Production Build**: Verify full page compilation with `pnpm exec next build`.
- **Integration Flow**:
  1. Create and post a customer invoice on `/accounting/invoices`.
  2. Verify automatic generation of the double-entry journal entry.
  3. Register a payment against the invoice on `/accounting/payments` and verify status changes to `PAID`.
  4. Issue a credit note on `/accounting/credit-notes` and verify balance reduction.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Allocation exceeding pending balance** | Backend rejects payment with validation error | Client-side validation clamps allocation to `saldoPendienteUsd`. |
| **Missing default account mapping** | Foreign key rejection on invoice posting | Ensure default accounts are resolved from tenant chart of accounts. |
| **Closed fiscal period** | Mutation rejected by backend guard | Catch error and display clear notification to the user. |
