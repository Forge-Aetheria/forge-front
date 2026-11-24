# EARS Specification: Migrate product catalog filtering and pagination to backend GraphQL

- **Ticket**: .agents/tickets/backlog/TICK-071-forge-front-migrate-product-catalog-filtering-and-pagination-to-backend.md
- **Repository**: forge-front (with `templatesCount` query in `forge-backend`)
- **Domain**: forge-front
- **Date**: 2026-11-22
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Approved

## Context

`InventoryCatalogView.tsx` calls `getInventoryTemplates()` with hardcoded `{ take: 100, skip: 0 }`, and `InventoryTable.tsx` filters and slices the 100-item array in memory. Meanwhile, `forge-backend` `CatalogResolver.templates` already accepts `FindManyProductTemplateArgs` (`where`, `take`, `skip`, `orderBy`), but lacks a `templatesCount(where)` query to report total matching records for `TablePagination`.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** `forge-backend` (`CatalogResolver` / `CatalogService`) SHALL expose `templatesCount(where: ProductTemplateWhereInput): Int!` returning the total count of templates matching `where` for the active tenant.
- **REQ-U-002** `forge-front` (`inventoryService.ts`) SHALL expose `searchInventoryTemplates` querying `templates(where, take, skip)` and `templatesCount(where)` in a single GraphQL request.
- **REQ-U-003** `buildProductTemplateWhereInput` SHALL map `search` (matching `name`, `variants.sku`, `variants.barcode` case-insensitively), `productType`, and `category` to `ProductTemplateWhereInput`.

### Event-driven (When)

- **REQ-E-001** WHEN the user changes `search` (debounced 300ms), `productType`, `category`, `page`, or `rowsPerPage` in `InventoryCatalogView` / `InventoryTable`, the system SHALL fetch the corresponding slice from the backend and update `totalCount`.
- **REQ-E-002** WHEN `InventoryCatalogView` loads, it SHALL fetch categories via `getProductCategories()` so the category filter dropdown always lists all categories regardless of the current page.

### State-driven (While)

- **REQ-S-001** WHILE a server-side query is in flight after filter/page changes, the table SHALL indicate loading state without resetting the filter inputs.

### Unwanted (If / Then)

- **REQ-N-001** IF a previous debounced query resolves after a newer filter/page change, THEN stale results SHALL NOT overwrite newer state (or latest request wins).

### Optional (Where)

- **REQ-O-001** WHERE client-only filters (`stockStatus !== 'ALL'` or `operation !== 'ALL'`, which are not fields on `ProductTemplateWhereInput`) are active, the system SHALL still apply server-side `where` filters and refine the returned set cleanly.

## Acceptance criteria

- **AC-001** GIVEN `forge-backend` `CatalogResolver`, WHEN `templatesCount(where)` is queried, THEN it returns the exact Prisma `count` matching `where`.
- **AC-002** GIVEN `InventoryCatalogView` and `InventoryTable`, WHEN changing search, productType, category, page, or rowsPerPage, THEN `GET_TEMPLATES_PAGINATED_QUERY` is executed with the corresponding `where`, `take`, and `skip` variables.
- **AC-003** GIVEN `buildProductTemplateWhereInput` unit tests, `tsc --noEmit`, `eslint`, and `forge-backend` `typecheck` / `lint`, WHEN executed, THEN all pass with 0 errors.

## Out of scope

- Adding `canBeSold`, `canBePurchased`, or `stockStatus` computed filters to the Prisma `ProductTemplate` schema.

## Assumptions

- `ProductTemplateWhereInput` in `forge-backend` supports `OR`, `name.contains`, `variants.some`, `productType.equals`, and `category.is.name.equals`.

## Open questions

- None.
