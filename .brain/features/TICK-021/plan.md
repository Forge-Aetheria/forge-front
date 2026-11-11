# Technical Plan: FE-INV-ADVANCED: Integración de Ajustes Físicos de Inventario y Costos en Destino con GraphQL

- **Ticket**: legacy TICK-021-fe-inv-adjustments-landed-costs (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-021/spec.md`
- **Date**: 2026-11-10

## Summary

This feature transitions physical inventory adjustments (`/inventory/adjustments`) and landed costs (`/inventory/operations/landed-costs/*`) from browser `localStorage` mock persistence to live transactional GraphQL operations against `forge-backend` (`src/modules/inventory` / BE-INV-04). The technical strategy expands `src/graphql/inventory.gql.ts`, extends `inventoryAdapter.ts` with adjustment and landed cost serializers, and refactors `landedCostService.ts` and `inventoryService.ts` to manage audit-backed physical counts and import cost capitalizations with UUIDv4 idempotency and 4-decimal precision.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient`, `crypto.randomUUID` for UUIDv4 idempotency generation, `@/graphql/inventory.gql`.
- **Persistence**: PostgreSQL multi-tenant database managed by `forge-backend` through Prisma 7 (InventoryAudit, LandedCost, StockMove, StockQuant, ProductVariant).
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript validation).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - Quantities and landed cost amounts must be formatted as 4-decimal strings (`Decimal(12,4)` scalar in GraphQL).
  - Zero dead code / no backup files (Rule R1).

## Architecture decisions

- **ADR-001: Signed Adjustment Kardex Moves**
  - **Decision:** Physical counts use `createInventoryAdjustment` followed by `applyInventoryAdjustment`, generating signed `ADJUSTMENT` moves on the server.
  - **Rationale:** Ensures complete auditability and automatically updates `StockQuant` without client arithmetic.
  - **Rejected alternative:** Writing direct stock move diffs without an audit document.

- **ADR-002: Server-Side Landed Cost Proration and Journal Posting**
  - **Decision:** Execute `validateLandedCost`, allowing the backend to compute exact proration splits, capitalize into `standardCost`, and post the balanced accounting journal entry.
  - **Rationale:** Guarantees VEN-NIF compliance and eliminates manual journal entry fabrication in the frontend.
  - **Rejected alternative:** Calculating proration and cost adjustments in the browser.

- **ADR-003: Idempotent Two-Step Validation Cycle**
  - **Decision:** Landed costs and adjustments are drafted first and confirmed/applied via dedicated mutations accepting an `idempotencyKey`.
  - **Rationale:** Provides draft review capabilities and prevents duplicate capitalization layers upon network retries.
  - **Rejected alternative:** Immediate single-step auto-application.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/inventory.gql.ts` | Declare operations: `CREATE_INVENTORY_ADJUSTMENT_MUTATION`, `APPLY_INVENTORY_ADJUSTMENT_MUTATION`, `GET_INVENTORY_ADJUSTMENTS_QUERY`, `CREATE_LANDED_COST_MUTATION`, `UPDATE_LANDED_COST_MUTATION`, `VALIDATE_LANDED_COST_MUTATION`, `CANCEL_LANDED_COST_MUTATION`, and `GET_LANDED_COSTS_QUERY`. |
| **Adapter** | `src/services/adapters/inventoryAdapter.ts` | Add serializers `serializeAdjustmentInput` and `serializeLandedCostInput`. |
| **Domain / Service** | `src/services/inventory/landedCostService.ts` & `src/services/inventoryService.ts` | Refactor `applyStockAdjustment`, `getLandedCosts`, `createLandedCost`, and `validateLandedCost` to consume live GraphQL operations. |
| **Client / UI** | `src/views/inventory/` | Connect `InventoryAdjustmentsView.tsx` and `LandedCostDetailView.tsx` with live data binding and loading states. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes adjustments and landed costs in `src/modules/inventory/resolvers/` (`inventory-adjustment.resolver.ts`, `landed-cost.resolver.ts`).
- **Consumer**: `sidecars/forge-front` consumes these endpoints via `landedCostService.ts` and `inventoryService.ts`.
- **Contract status**: 100% aligned with BE-INV-04 in `forge-backend`. No backend changes required.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all modified files.
- **Production Build**: Verify full page compilation with `pnpm exec next build`.
- **Integration Flow**:
  1. Record a physical stock count adjustment on `/inventory/adjustments` and verify `applyInventoryAdjustment` execution.
  2. Create a landed cost on `/inventory/operations/landed-costs/create` and verify document creation.
  3. Validate the landed cost and verify status changes to `APPLIED`.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Negative stock violation on adjustment** | Mutation rejected by `BLOCK` policy | Catch exception and display clear notification to the user. |
| **Missing reception linkage** | Validation failure on landed cost | Verify that linked reception exists before submission. |
