# Technical Plan: Migrate product catalog filtering and pagination to backend GraphQL

- **Ticket**: .agents/tickets/backlog/TICK-001-products-server-side-filtering.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-001/spec.md`
- **Date**: 2026-11-22

## Summary

Add `templatesCount(where)` to `forge-backend` `CatalogResolver`/`CatalogService` and migrate `InventoryCatalogView` + `InventoryTable` to server-side pagination and filtering via `GET_TEMPLATES_PAGINATED_QUERY` (`templates` + `templatesCount`), with debounced search and full category list loading.

## Technical context

- **Stack**: `forge-backend` (NestJS 11, GraphQL, Prisma 7), `forge-front` (Next.js 16, React 19, MUI 7).
- **Dependencies**: None added.
- **Testing**: `node:test` (`tsx --test`) for `buildProductTemplateWhereInput`, `tsc --noEmit`, `eslint`, and `forge-backend` `typecheck` / `lint` / `jest`.

## Architecture decisions

- **ADR-001**: Query `templates` and `templatesCount` together in a single GraphQL operation (`GET_TEMPLATES_PAGINATED_QUERY`) rather than two separate HTTP calls — halves network round-trips and keeps rows + total count consistent.
- **ADR-002**: Keep `InventoryTable` controlled from `InventoryCatalogView` via `serverPagination` props (`filters`, `onFiltersChange`, `page`, `rowsPerPage`, `totalCount`, `categories`, `tableLoading`) while preserving backwards compatibility for any other caller.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Backend Service | `forge-backend/src/modules/inventory/services/catalog.service.ts` | Add `countTemplates(where)`. |
| Backend Resolver | `forge-backend/src/modules/inventory/resolvers/catalog.resolver.ts` | Add `templatesCount(where)` query. |
| Frontend GraphQL | `forge-front/src/graphql/inventory.gql.ts` | Add `GET_TEMPLATES_PAGINATED_QUERY`. |
| Frontend Service | `forge-front/src/services/inventoryService.ts` | Add `buildProductTemplateWhereInput` and `searchInventoryTemplates`. |
| Frontend UI | `forge-front/src/views/inventory/InventoryCatalogView.tsx` | Manage server-side filter/page state, debounce search, load categories via `getProductCategories()`. |
| Frontend UI | `forge-front/src/views/inventory/InventoryTable.tsx` | Support server-side controlled filters, pagination count, and loading indicator. |
| Tests | `forge-front/src/services/inventoryWhere.test.ts` | Unit tests for `buildProductTemplateWhereInput`. |

## Cross-sidecar integration

`forge-front` consumes `templates` and the new `templatesCount` query from `forge-backend` `CatalogResolver`.

## Testing strategy

- **Unit**: `buildProductTemplateWhereInput` tested with `tsx --test`.
- **Static checks**: `tsc --noEmit` + `eslint` on `forge-front`, `npm run typecheck` + `eslint` on `forge-backend`.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `stockStatus` / `operation` are not in `ProductTemplateWhereInput` | Filtering by stock status on a 10-row page could miss items | When `stockStatus !== 'ALL'` or `operation !== 'ALL'`, request `take: 100, skip: 0` with the other server filters and slice client-side; otherwise use exact `take: rowsPerPage, skip: page * rowsPerPage`. |
