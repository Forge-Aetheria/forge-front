# Technical Plan: FE-INV-INFRA: Integración de Administración de Almacenes y Ubicaciones Físicas con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-022-fe-inv-warehouses-locations-crud.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-022/spec.md`
- **Date**: 2026-11-10

## Summary

This feature transitions physical warehouse and stock location administration from browser `localStorage` mock simulation to live GraphQL operations against `forge-backend` (`src/modules/inventory` / BE-INV-03). The technical strategy declares the infrastructure operations in `src/graphql/inventory.gql.ts`, extends `categoryWarehouseService.ts` to execute live queries and mutations (`createWarehouse`, `updateWarehouse`, `createStockLocation`, `updateStockLocation`), and connects `InventoryWarehousesView.tsx` and `InventoryLocationsView.tsx` with hierarchical tree rendering and server-backed uniqueness validation.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient`, `@/graphql/inventory.gql`.
- **Persistence**: Centralized PostgreSQL database managed by `forge-backend` through Prisma 7 (Warehouse, StockLocation).
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript validation).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - Warehouse codes must be unique per tenant company.
  - Stock locations compute derived `completePath` recursively.
  - Zero dead code / no backup files (Rule R1).

## Architecture decisions

- **ADR-001: Server-Derived Complete Paths**
  - **Decision:** Always consume `completePath` as persisted and recalculated by `forge-backend` on location mutations.
  - **Rationale:** Guarantees recursive path accuracy and prevents client inconsistencies in complex multi-level warehouse trees.
  - **Rejected alternative:** Calculating paths via client string concatenation.

- **ADR-002: Dual Cache Invalidation Strategy**
  - **Decision:** Upon creating or updating warehouses or locations, immediately invalidate memory caches across `inventoryService.ts` and `categoryWarehouseService.ts`.
  - **Rationale:** Ensures that operation order pickers, delivery forms, and inventory filters reflect newly added infrastructure without requiring page refreshes.
  - **Rejected alternative:** Stale static cache with long TTL.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/inventory.gql.ts` | Declare operations: `GET_WAREHOUSES_QUERY`, `CREATE_WAREHOUSE_MUTATION`, `UPDATE_WAREHOUSE_MUTATION`, `CREATE_STOCK_LOCATION_MUTATION`, `UPDATE_STOCK_LOCATION_MUTATION`. |
| **Domain / Service** | `src/services/inventory/categoryWarehouseService.ts` | Refactor `getWarehouses`, `createWarehouse`, `updateWarehouse`, `getStockLocations`, and `createStockLocation` to consume live GraphQL operations. |
| **Client / UI** | `src/views/inventory/` | Connect `InventoryWarehousesView.tsx` and `InventoryLocationsView.tsx` with live data binding and loading states. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes warehouses and locations in `src/modules/inventory/resolvers/` (`warehouse.resolver.ts`, `stock-location.resolver.ts`).
- **Consumer**: `sidecars/forge-front` consumes these operations via `categoryWarehouseService.ts`.
- **Contract status**: 100% aligned with BE-INV-03 in `forge-backend`. No backend changes required.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all modified files.
- **Production Build**: Verify full page compilation with `pnpm exec next build`.
- **Integration Flow**:
  1. Open `/inventory/settings/warehouses`, create a new warehouse, and verify reactive rendering with UUID.
  2. Open `/inventory/settings/locations`, create a nested sub-location, and verify `completePath`.
  3. Attempt creating a warehouse with a duplicate code and verify error alert.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Duplicate warehouse code** | Unique constraint error | Catch GraphQL error and surface clear message on code input. |
| **Circular parent reference** | Server rejects mutation with cycle error | Disable selecting self or descendants as parent location. |
