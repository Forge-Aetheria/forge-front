# Technical Plan: FE-UOM-CATALOG: Administrar el catálogo de unidades de medida expuesto por TICK-042

- **Ticket**: .agents/tickets/backlog/TICK-047-forge-front-fe-uom-catalog-admin.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-047/spec.md`
- **Date**: 2026-11-14

## Summary

`forge-front` consumes the TICK-042 `UnitOfMeasure` catalog for reads only. This plan adds the full
administration path (list, seed defaults, create, deactivate), wires it through the GraphQL/service
layers, integrates an empty-catalog state into the product forms with a real default code, gates
writes by `inventory:catalog:write`, verifies the already-integrated company bank accounts, and
removes residual local category fallbacks and dead mock files.

Requirement coverage: REQ-U-001..008, REQ-E-001..006, REQ-S-001..004, REQ-N-001..006, REQ-O-001..002.

## Technical context

- **Stack**: Next.js (App Router), React 19, TypeScript, MUI + Tailwind, client components. GraphQL via
  a small `executeGraphQL` client (`src/libs/graphqlClient.ts`) that throws `GraphQLClientError` with
  `code`/`extensions`.
- **Dependencies**: `useAuth().hasPermission(permission)` from `src/contexts/AuthContext.tsx`;
  `executeGraphQL`; existing catalog views (`InventoryCategoriesView`, `InventoryWarehousesView`) as
  UI patterns; `bankAccountsService`/`CompanySettingsTab` for bank-account verification.
- **Persistence**: none for business data. No `localStorage` writes for UoM; only UI preferences.
- **Backend contract (TICK-042, PR #57)**: `unitsOfMeasure` returns **active** units only;
  `createUnitOfMeasure({ code, name })` uppercases/trims and rejects duplicates with `ConflictException`;
  `deactivateUnitOfMeasure(code)` resolves by uppercase code; `seedDefaultUnitsOfMeasure` inserts
  `UNI`, `KG`, `LT`, etc. Permissions `inventory:catalog:read` / `inventory:catalog:write`.
- **Testing**: the frontend has **no unit-test runner** (`package.json` only has `dev`, `build`,
  `lint`, `format`). Verification relies on `npm run lint`, `npm run build` (which type-checks) and a
  manual E2E checklist against a local backend.
- **Constraints**: no backend or `schema.gql` changes; no rename/update (backend has no mutation);
  inactive units are not retrievable, so the admin lists active units only.

## Architecture decisions

- **ADR-001**: Place administration in a dedicated route `/inventory/settings/uom` with a new
  `InventoryUnitsOfMeasureView`, mirroring `categories`/`warehouses`. Rationale: product-catalog
  configuration lives under `inventory/settings`; a separate page keeps concerns clear and the nav
  pattern consistent. Rejected alternative: a tab inside `SettingsMainView` — mixes tenant settings
  with catalog data and breaks the existing nested-route convention.
- **ADR-002**: Add typed GraphQL documents and service helpers rather than calling `executeGraphQL`
  from the view. Rationale: matches `inventoryService`'s existing category-helper pattern and keeps
  error mapping centralized. Rejected alternative: direct client calls in the component — duplicates
  request/error handling.
- **ADR-003**: Treat the catalog as **active-only** and make deactivation remove the unit from the UI
  after refresh; do not keep a local tombstone list. Rationale: the backend query returns active units
  only; client-side tombstones would be business state in `localStorage`, violating REQ-U-005.
  Rejected alternative: cache inactive units locally — violates the no-local-business-data rule.
- **ADR-004**: Default `uomCode` to the first active catalog `code` and block product save when the
  catalog is empty. Rationale: fixes the `'un'` vs `UNI` mismatch and prevents invalid references.
  Rejected alternative: keep `'un'` as a silent fallback — produces invalid product data.
- **ADR-005**: Gate mutations with `useAuth().hasPermission('inventory:catalog:write')` and render a
  read-only view otherwise. Rationale: consistent frontend UX and avoids predictable `FORBIDDEN`
  errors; the backend remains the authority. Rejected alternative: rely only on backend rejection —
  worse UX and more failed requests.
- **ADR-006**: Offer an inline "seed defaults" action in the product form empty state instead of
  auto-seeding on mount. Rationale: seeding is a state-changing operation and must be explicit
  (REQ-O-002, REQ-S-001). Rejected alternative: auto-seed on empty load — surprising side effect.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Contract / API | `schema.gql` (backend) | No change; consume existing TICK-042 operations. |
| Data / service | `src/graphql/inventory.gql.ts` | Add `CREATE_UNIT_OF_MEASURE_MUTATION`, `DEACTIVATE_UNIT_OF_MEASURE_MUTATION`; reuse `GET_UNITS_OF_MEASURE_QUERY` and `SEED_UNITS_OF_MEASURE_MUTATION`. |
| Data / service | `src/services/inventoryService.ts` | Add `createUnitOfMeasure`, `deactivateUnitOfMeasure`, `seedDefaultUnitsOfMeasure`; keep `getUnitsOfMeasure()` (active). |
| UI (state) | `src/views/inventory/InventoryUnitsOfMeasureView.tsx` (new) | List/create/deactivate/seed with loading/empty/error, permission gating, success/error feedback. |
| UI (route) | `src/app/(dashboard)/inventory/settings/uom/page.tsx` (new) | Thin page rendering the view with metadata. |
| UI (nav) | `src/data/navigation/verticalMenuData.tsx`, `src/data/navigation/horizontalMenuData.tsx` | Add "Unidades de Medida" child under inventory settings. |
| UI (nav) | `src/components/layout/shared/FoundlyBreadcrumbs.tsx`, `src/components/layout/shared/CommandPaletteDialog.tsx` | Add `uom` breadcrumb label and command-palette entry. |
| UI (product) | `src/views/inventory/components/ProductFormDrawer.tsx` | Populate UoM from backend, default to first active code, empty state + inline seed action, remove `DEFAULT_CATEGORIES`. |
| UI (product) | `src/views/inventory/InventoryDetailView.tsx` | Same UoM handling, remove `DEFAULT_CATEGORIES`. |
| Cleanup | `src/data/purchases/mockPurchasesData.ts`, `src/data/sales/quotes/mockQuotesData.ts` | Delete (unreferenced). |
| Verification | `src/services/bankAccountsService.ts`, `src/views/settings/tabs/CompanySettingsTab.tsx` | No functional change; confirm `companyBankAccounts` CRUD still works. |

## Cross-sidecar integration

This feature **consumes** the backend contract exposed by TICK-042 (backend PR #57, issue #28); it
does not expose a new contract. No `.brain/features/TICK-047/contract.md` applies. Reference ticket
issue: https://github.com/Forge-Aetheria/forge-brain/issues/33.

## Testing strategy

- **Unit**: none available in the repo (no Jest/Vitest). Logic is kept thin in the service layer and
  the view delegates to it, minimizing untested branching.
- **Static verification**: `npm run lint` and `npm run build` (Next.js build type-checks the new view,
  service functions and documents).
- **Integration / manual E2E** (local backend with TICK-042 deployed):
  1. Empty catalog → view shows empty state; "seed defaults" populates `UNI/KG/LT/...`.
  2. Create a unit with a new code → appears after refresh; duplicate code shows the backend error.
  3. Deactivate a unit → disappears from the list and from product form/detail selectors.
  4. Product form opens with a populated catalog → defaults to a real code, not `'un'`.
  5. Read-only user without `inventory:catalog:write` → no mutation controls.
  6. Simulate a query failure → error state with retry, no local constants.
  7. Settings → company bank accounts: list/create/remove/set-default still succeed.
- **Regression**: confirm product create/edit still saves `uomCode` and category from backend.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Backend returns active units only, so deactivated units vanish with no restore UI | Users cannot reactivate/rename | Document the limitation and open a follow-up backend ticket (`includeInactive`/update); deactivation is reversible only via backend for now. |
| Empty catalog blocks product creation | Users cannot create products until seeded | Inline seed action + empty state guidance in the product form (REQ-O-002). |
| Removing `DEFAULT_CATEGORIES` exposes empty category lists when backend fails | Empty selectors | Show explicit empty/error states and require selecting a real category; do not reintroduce constants. |
| Permission name drift (`inventory:catalog:write`) | Mutations hidden or shown incorrectly | Centralize the permission string and confirm against the backend resolver; backend remains authority. |
| Deleting mock files breaks an unnoticed import | Build failure | Run `npm run build` and a repo-wide grep before deletion; files currently have no referrers. |
| Code normalization (uppercase) confuses users | Duplicate-looking entries | Display returned backend `code`; normalize input before submit and surface conflicts. |
| No automated tests in the frontend | Regressions undetected | Keep service logic typed and thin; rely on build lint + the manual E2E checklist above. |
