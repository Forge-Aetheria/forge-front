# Tasks: Migrate product catalog filtering and pagination to backend GraphQL

- **Ticket**: .agents/tickets/backlog/TICK-071-forge-front-migrate-product-catalog-filtering-and-pagination-to-backend.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-071/plan.md`
- **Date**: 2026-11-22

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `../forge-backend/src/modules/inventory/services/catalog.service.ts` Add `countTemplates(where)` (`REQ-U-001`).
- [x] T002 `../forge-backend/src/modules/inventory/resolvers/catalog.resolver.ts` Expose `templatesCount(where)` GraphQL query (`REQ-U-001`).
- [x] T003 `src/graphql/inventory.gql.ts` Add `GET_TEMPLATES_PAGINATED_QUERY` (`REQ-U-002`).
- [x] T004 `src/services/inventoryService.ts` Add `buildProductTemplateWhereInput` and `searchInventoryTemplates` (`REQ-U-002`, `REQ-U-003`, `REQ-O-001`).
- [x] T005 `src/views/inventory/InventoryTable.tsx` Support controlled server-side filters, pagination count, and loading state (`REQ-E-001`, `REQ-S-001`).
- [x] T006 `src/views/inventory/InventoryCatalogView.tsx` Wire debounced server-side search/filter/pagination and `getProductCategories()` (`REQ-E-001`, `REQ-E-002`, `REQ-N-001`).
- [x] T007 [P] `src/services/inventoryWhere.test.ts` Add unit tests for `buildProductTemplateWhereInput` (`AC-003`).

## Dependencies

- T002 depends on T001.
- T004 depends on T003.
- T005, T006 depend on T004.

## Final verification

- [ ] Run unit tests (`tsx --test`), `tsc --noEmit`, and `eslint` in `forge-front`.
- [ ] Run `npm run typecheck` and `eslint` in `forge-backend`.
- [ ] Verify spec acceptance criteria (`AC-001`, `AC-002`, `AC-003`).
