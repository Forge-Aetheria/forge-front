# Tasks: FE-UOM-CATALOG: Administrar el catálogo de unidades de medida expuesto por TICK-042

- **Ticket**: .agents/tickets/backlog/TICK-047-forge-front-fe-uom-catalog-admin.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-047/plan.md`
- **Date**: 2026-11-14

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/inventory.gql.ts` Add `CREATE_UNIT_OF_MEASURE_MUTATION` and `DEACTIVATE_UNIT_OF_MEASURE_MUTATION` documents; keep `GET_UNITS_OF_MEASURE_QUERY` and `SEED_UNITS_OF_MEASURE_MUTATION` as the shared documents. (REQ-U-003)
- [x] T002 `src/services/inventoryService.ts` Add `createUnitOfMeasure`, `deactivateUnitOfMeasure` and `seedDefaultUnitsOfMeasure` via `executeGraphQL`; keep `getUnitsOfMeasure()` returning active units. (REQ-U-001, REQ-U-002)
- [x] T003 `src/views/inventory/InventoryUnitsOfMeasureView.tsx` Create the administration view: list active units, create form (`code`, `name`), deactivate action, seed-defaults action, and `loading`/`empty`/`error` states; gate mutations with `useAuth().hasPermission('inventory:catalog:write')` and surface `GraphQLClientError` messages. (REQ-U-004, REQ-E-001, REQ-E-002, REQ-E-003, REQ-E-004, REQ-E-006, REQ-S-001, REQ-S-002, REQ-S-003, REQ-N-001, REQ-N-002, REQ-N-003, REQ-N-004, REQ-N-006)
- [x] T004 `src/app/(dashboard)/inventory/settings/uom/page.tsx` Add the route page rendering `InventoryUnitsOfMeasureView` with metadata. (REQ-O-001)
- [x] T005 [P] `src/data/navigation/verticalMenuData.tsx` Add the "Unidades de Medida" child (`/inventory/settings/uom`) under inventory settings. (REQ-O-001)
- [x] T006 [P] `src/data/navigation/horizontalMenuData.tsx` Mirror the "Unidades de Medida" navigation entry. (REQ-O-001)
- [x] T007 [P] `src/components/layout/shared/FoundlyBreadcrumbs.tsx` Add the `uom` breadcrumb label. (REQ-O-001)
- [x] T008 [P] `src/components/layout/shared/CommandPaletteDialog.tsx` Add a command-palette entry for the UoM settings page. (REQ-O-001)
- [x] T009 `src/views/inventory/components/ProductFormDrawer.tsx` Populate UoM from the backend, default `uomCode` to the first active code (never hardcoded `'un'`), add an empty-catalog state with inline "seed defaults", and remove `DEFAULT_CATEGORIES`. (REQ-U-001, REQ-U-007, REQ-E-005, REQ-S-001, REQ-N-002, REQ-N-005, REQ-O-002)
- [x] T010 `src/views/inventory/InventoryDetailView.tsx` Mirror the UoM loading/default/empty handling and remove `DEFAULT_CATEGORIES`. (REQ-U-001, REQ-U-007, REQ-E-005, REQ-N-002, REQ-N-005)
- [x] T011 [P] `src/data/purchases/mockPurchasesData.ts` Delete the unreferenced mock file. (REQ-U-008)
- [x] T012 [P] `src/data/sales/quotes/mockQuotesData.ts` Delete the unreferenced mock file. (REQ-U-008)
- [x] T013 [P] `src/services/bankAccountsService.ts` Verify `companyBankAccounts` list/create/remove/setDefault helpers still compile and map correctly; fix only if a regression is found. (REQ-U-006)
- [x] T014 [P] `src/views/settings/tabs/CompanySettingsTab.tsx` Verify the company bank-account CRUD UI (list/create/remove/setDefault) still works; fix only if a regression is found. (REQ-U-006)

## Dependencies

- T002 depends on T001.
- T003 depends on T002.
- T004 depends on T003.
- T005, T006, T007, T008 depend on T004 and can run in parallel.
- T009 and T010 depend on T002 and can run in parallel with each other.
- T011, T012, T013 and T014 are independent and can run in parallel.
- Final verification depends on all tasks.

## Final verification

- [ ] Run `npm run lint`.
- [ ] Run `npm run build` (Next.js build type-checks the new view, service and documents).
- [ ] Manual E2E against a local backend with TICK-042 deployed: empty catalog → seed; create → appears; duplicate → backend error; deactivate → disappears from admin and product selectors; product form defaults to a real code; read-only user without `inventory:catalog:write`.
- [ ] Verify AC-001..AC-008 from `spec.md`.
- [ ] Confirm no `localStorage` writes of UoM/business data and no `DEFAULT_CATEGORIES` remain.
- [ ] Confirm no backend/`schema.gql` changes and no scope drift.
