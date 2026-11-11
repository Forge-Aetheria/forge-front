# Technical Plan: FE-PURCHASES: Integración de Solicitudes, Órdenes de Compra y Recepciones con GraphQL

- **Ticket**: legacy TICK-012-fe-purchases-orders-receptions (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-012/spec.md`
- **Date**: 2026-11-09

## Summary

This feature transitions the procurement and purchasing lifecycle from browser `localStorage` mock simulation to live transactional GraphQL operations against `forge-backend` (`src/modules/purchases`). The technical strategy connects `purchasesService.ts` and the views under `/purchases/quotes` to backend queries and mutations (`createPurchaseQuote`, `registerPurchaseQuote`, `approvePurchaseQuote`, `convertQuoteToPurchaseOrder`, `createPurchaseReception`, and `cancelPurchaseQuote`), populates supplier selectors from verified `Partner` suppliers, feeds variant pickers from real catalog variants, guarantees idempotency using UUIDv4 keys, and preserves server-calculated bimonetary fiscal totals without client recalculation.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient`, `crypto.randomUUID` for UUIDv4 idempotency keys, `@/graphql/contacts.gql` (Partner suppliers), `@/graphql/inventory.gql` (catalog variants and warehouses).
- **Persistence**: Centralized PostgreSQL database managed by `forge-backend` through Prisma 7 (PurchaseQuote, PurchaseOrder, PurchaseReception, PurchaseLine, StockQuant).
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript validation).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - Quantities, prices, exchange rates, and totals must be formatted as 4-decimal strings (`Decimal(12,4)` backend scalar).
  - `idempotencyKey` is mandatory for all state mutations.
  - Client totals are never trusted: server-calculated snapshots (`PurchaseTotals`, `RateSnapshot`) dictate document financial amounts.
  - Zero dead code / no backup files (Rule R1).

## Architecture decisions

- **ADR-001: Server-Authoritative Procurement State Machine and Totals**
  - **Decision:** Delegate quote registration (`SC`), rate snapshot freezing on approval, order conversion (`OC`), and fiscal computations (IVA, IGTF, retentions) entirely to `forge-backend`.
  - **Rationale:** Ensures financial and regulatory fidelity. The server recalculates and validates taxes, prevents state skipping (`INVALID_STATE_TRANSITION`), and records immutable rate snapshots.
  - **Rejected alternative:** Continuing to generate sequential `SC` and `OC` numbers and calculate tax totals in browser client code.

- **ADR-002: Live Provider Consumption for Suppliers and Products**
  - **Decision:** Feed the supplier directory from `GET_PARTNERS_QUERY` (`isSupplier: true`) and line items from `GET_TEMPLATES_QUERY`, mapping them dynamically inside `purchasesService.ts`.
  - **Rationale:** Guarantees that purchase orders only reference real entities exist in the database, avoiding foreign key errors upon submission.
  - **Rejected alternative:** Maintaining static local mock lists of suppliers and products in `mockPurchasesData.ts`.

- **ADR-003: Dedicated Procurement Adapter for GraphQL Contracts**
  - **Decision:** Create `src/services/adapters/purchasesAdapter.ts` to encapsulate input serialization, enum conversion, and GraphQL response mapping.
  - **Rationale:** Keeps `purchasesService.ts` and view components clean and focused on workflow orchestration and UI state.
  - **Rejected alternative:** Inlining GraphQL payload builders and complex nested object mappers directly inside component callbacks.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/purchases.gql.ts` | Create file declaring `GET_PURCHASE_QUOTES_QUERY`, `GET_PURCHASE_QUOTE_QUERY`, `CREATE_PURCHASE_QUOTE_MUTATION`, `REGISTER_PURCHASE_QUOTE_MUTATION`, `APPROVE_PURCHASE_QUOTE_MUTATION`, `CONVERT_PURCHASE_QUOTE_TO_ORDER_MUTATION`, `CANCEL_PURCHASE_QUOTE_MUTATION`, `CREATE_PURCHASE_RECEPTION_MUTATION`, and `GET_PURCHASE_KPIS_QUERY`. |
| **Adapter** | `src/services/adapters/purchasesAdapter.ts` | Create adapter implementing `serializeCreatePurchaseQuoteInput`, `serializeReceptionInput`, and `mapGqlPurchaseQuoteToFrontend`. |
| **Domain / Service** | `src/services/purchasesService.ts` | Refactor `getPurchaseQuotes`, `getPurchaseQuoteById`, `createPurchaseQuote`, `approvePurchaseQuote`, `cancelPurchaseQuote`, `convertQuoteToPurchaseOrder`, `createReceptionForPurchase`, and supplier/product queries to consume live GraphQL operations. |
| **Client / UI** | `src/views/purchases/quotes/PurchaseMasterDetailForm.tsx` & `PurchaseDetailView.tsx` | Ensure form submission and action buttons pass backend UUIDs, show loading state, and handle server error alerts gracefully. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes the purchases API in `src/modules/purchases/resolvers/` (`purchase-quote.resolver.ts`, `purchase-order.resolver.ts`, `purchase-reception.resolver.ts`, `purchase-kpi.resolver.ts`).
- **Consumer**: `sidecars/forge-front` consumes these endpoints via `src/services/purchasesService.ts`.
- **Contract status**: 100% aligned with BE-PUR-01 in `forge-backend`. No backend changes required.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all modified files.
- **Production Build**: Verify full page compilation with `pnpm exec next build`.
- **E2E Integration Flow**:
  1. Register a purchase quote selecting a real `Partner` supplier and catalog variant.
  2. Emit RFQ and verify sequential `SC-2026-NNNN` correlative assigned by backend.
  3. Approve quote and confirm rate snapshot is frozen.
  4. Convert quote to purchase order and verify `OC-2026-NNNN` correlative and status `PURCHASE_ORDER`.
  5. Record physical reception and verify stock update in warehouse inventory.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Invalid supplier profile** | Backend rejects quote creation if supplier lacks tax profile | Validate that selected supplier has valid RIF and docNumber before submission. |
| **Over-reception violation** | Reception rejected if received quantity > ordered quantity | Front-end validation prevents entering quantities greater than remaining demand. |
| **Network timeout on order conversion** | Incomplete transition | Idempotency keys (`UUIDv4`) ensure safe retry without duplicating purchase orders or stock transit. |
