# EARS Specification: FE-UOM-CATALOG: Administrar el catálogo de unidades de medida expuesto por TICK-042

- **Ticket**: .agents/tickets/backlog/TICK-047-forge-front-fe-uom-catalog-admin.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-14
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

`forge-front` only **reads** the canonical `UnitOfMeasure` catalog exposed by TICK-042; it cannot
seed, create or deactivate units, and its product views fall back to local category constants.

Verified evidence in `sidecars/forge-front` (`main`, after PR #33):

- `src/graphql/inventory.gql.ts:565-575` declares `GetUnitsOfMeasure`; `:576-586` declares
  `SeedUnitsOfMeasure` but no consumer imports it. There are **no** GraphQL documents for
  `createUnitOfMeasure` or `deactivateUnitOfMeasure`.
- `src/services/inventoryService.ts:182-188` exposes only `getUnitsOfMeasure()` (active units); there
  are no create/deactivate/seed helpers.
- `src/views/inventory/components/ProductFormDrawer.tsx:39,131-133` and
  `src/views/inventory/InventoryDetailView.tsx:65,155-158,233` load units with
  `getUnitsOfMeasure()`; on failure or empty they leave `uomOptions` empty with no empty state or seed
  action. Both default `uomCode` to `'un'` (`ProductFormDrawer.tsx:83`, `InventoryDetailView.tsx:105`),
  which does not match the backend seed code `UNI`.
- `src/views/settings/tabs/` contains only `BcvSettingsTab`, `CompanySettingsTab`, `FiscalRulesTab` and
  `UsersManagementTab`; there is no UoM administration view, and no catalog view exists under
  `src/views/inventory/`.
- Local fallbacks remain: `DEFAULT_CATEGORIES` in `ProductFormDrawer.tsx:57,84` and
  `InventoryDetailView.tsx:75,103`; `src/data/purchases/mockPurchasesData.ts` and
  `src/data/sales/quotes/mockQuotesData.ts` have no remaining references.

Backend contract available (TICK-042, PR #57, `schema.gql`):

- Query `unitsOfMeasure: [UnitOfMeasure!]!` returns **active** units only.
- `createUnitOfMeasure(input: CreateUnitOfMeasureInput!): UnitOfMeasure!` where input is `{ code, name }`.
- `deactivateUnitOfMeasure(code: String!): UnitOfMeasure!` (looks up by uppercase code).
- `seedDefaultUnitsOfMeasure: [UnitOfMeasure!]!` (ids `UNI`, `KG`, `LT`, …).
- Permissions: `inventory:catalog:read` for the query, `inventory:catalog:write` for mutations
  (`src/modules/inventory/resolvers/unit-of-measure.resolver.ts`).

Company bank accounts from TICK-042 are already integrated (`src/services/bankAccountsService.ts`,
`src/views/settings/tabs/CompanySettingsTab.tsx`); this ticket only verifies them.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The system SHALL treat the backend `unitsOfMeasure` query as the single source of
  unit-of-measure options for inventory views; no local UoM list SHALL be used as a business fallback.
- **REQ-U-002** The system SHALL provide service functions in `src/services/inventoryService.ts` for
  `getUnitsOfMeasure()`, `createUnitOfMeasure({ code, name })`, `deactivateUnitOfMeasure(code)` and
  `seedDefaultUnitsOfMeasure()`, all executed through `executeGraphQL`.
- **REQ-U-003** The system SHALL declare the corresponding GraphQL documents for
  `createUnitOfMeasure` and `deactivateUnitOfMeasure`, and consume the existing
  `SeedUnitsOfMeasure` document.
- **REQ-U-004** The system SHALL provide a unit-of-measure administration view reachable from the
  inventory settings area, listing active units with `loading`, `empty` and `error` states.
- **REQ-U-005** The system SHALL persist no unit-of-measure business data in `localStorage`; only UI
  preferences (theme, columns) may remain there.
- **REQ-U-006** The system SHALL keep company bank accounts functional against
  `companyBankAccounts`, `createCompanyBankAccount`, `removeCompanyBankAccount` and
  `setDefaultCompanyBankAccount`, without regressions.
- **REQ-U-007** The system SHALL remove the local `DEFAULT_CATEGORIES` fallbacks from
  `ProductFormDrawer` and `InventoryDetailView`, using only backend categories.
- **REQ-U-008** The system SHALL remove the unreferenced files
  `src/data/purchases/mockPurchasesData.ts` and `src/data/sales/quotes/mockQuotesData.ts`.

### Event-driven (When)

- **REQ-E-001** WHEN the administration view mounts, the system SHALL request `unitsOfMeasure` and
  render the active catalog.
- **REQ-E-002** WHEN the user submits a new unit with `code` and `name`, the system SHALL call
  `createUnitOfMeasure`, then refresh the catalog from the backend.
- **REQ-E-003** WHEN the user confirms deactivation of a unit, the system SHALL call
  `deactivateUnitOfMeasure(code)` and refresh the catalog from the backend.
- **REQ-E-004** WHEN the catalog is empty and the user triggers “seed defaults”, the system SHALL call
  `seedDefaultUnitsOfMeasure` and render the returned units.
- **REQ-E-005** WHEN a product form or product detail view opens, the system SHALL populate its UoM
  selector from the active backend catalog and default `uomCode` to the first available code rather
  than the hardcoded `'un'`.
- **REQ-E-006** WHEN a create, deactivate or seed operation succeeds, the system SHALL show success
  feedback and reflect the backend result without a page reload.

### State-driven (While)

- **REQ-S-001** WHILE the catalog is empty, the system SHALL show an empty state with “seed defaults”
  and create actions instead of a blank selector.
- **REQ-S-002** WHILE a create, deactivate or seed request is in flight, the system SHALL disable the
  relevant submit/deactivate controls and show progress.
- **REQ-S-003** WHILE the catalog is loading, the system SHALL show a loading indicator and keep UoM
  selectors disabled.
- **REQ-S-004** WHILE only active units are returned by the backend, the administration list SHALL
  show active units only; a deactivated unit SHALL disappear from the list and from product selectors
  after refresh.

### Unwanted (If / Then)

- **REQ-N-001** IF `createUnitOfMeasure` fails (duplicate code, permission, validation), THEN the
  system SHALL show the backend error and SHALL NOT persist the unit locally.
- **REQ-N-002** IF the `unitsOfMeasure` query fails, THEN the system SHALL show an error state with a
  retry action and SHALL NOT fall back to local constants.
- **REQ-N-003** IF `deactivateUnitOfMeasure` fails (not found, permission), THEN the system SHALL show
  the backend error and keep the current list unchanged.
- **REQ-N-004** IF the user lacks `inventory:catalog:write`, THEN the system SHALL present the
  administration view in read-only mode and SHALL NOT issue mutations.
- **REQ-N-005** IF a product form opens with an empty catalog, THEN the system SHALL NOT silently keep
  `uomCode = 'un'`; it SHALL show the empty state / seed action and block saving without a valid code.
- **REQ-N-006** IF the backend normalizes a code (trim/uppercase), THEN the system SHALL display and
  use the returned `code` value.

### Optional (Where)

- **REQ-O-001** WHERE the administration view is placed under the inventory settings routes
  (e.g. `/inventory/settings/uom`), the system SHALL register the route and navigation entry
  consistently with existing settings pages.
- **REQ-O-002** WHERE the product form detects an empty catalog, the system SHALL offer an inline
  “seed defaults” action in addition to the settings view.

## Acceptance criteria

- **AC-001** GIVEN an empty UoM catalog, WHEN the administration view loads, THEN it shows an empty
  state with seed/create actions and no mock data.
- **AC-002** GIVEN a valid code and name, WHEN the user submits the form, THEN `createUnitOfMeasure`
  is called, the unit appears after refresh, and errors surface without local persistence.
- **AC-003** GIVEN an active unit, WHEN the user deactivates it, THEN `deactivateUnitOfMeasure` is
  called and the unit disappears from the list and from product selectors after refresh.
- **AC-004** GIVEN an empty catalog, WHEN the user triggers “seed defaults”, THEN
  `seedDefaultUnitsOfMeasure` is called and the seeded units render.
- **AC-005** GIVEN a product form, WHEN it opens with a populated catalog, THEN the UoM selector is
  populated from `unitsOfMeasure` and defaults to a real code (not `'un'`).
- **AC-006** GIVEN a failing `unitsOfMeasure` query, WHEN the view loads, THEN an error state with
  retry is shown and no local UoM constant is used.
- **AC-007** GIVEN the company bank accounts settings, WHEN the user lists/creates/removes/sets a
  default account, THEN the `companyBankAccounts` operations still succeed.
- **AC-008** GIVEN the repository after the change, THEN `DEFAULT_CATEGORIES` no longer exists in the
  product views and the two unreferenced mock files are deleted.

## Out of scope

- Backend changes, new GraphQL operations, or `schema.gql` edits.
- Renaming/editing an existing unit (the backend exposes no update mutation).
- Displaying inactive units in the administration view (the backend query returns active units only;
  see open questions).
- Redesigning how `uomCode` is stored on purchase/sales lines.

## Assumptions

- The backend TICK-042 contract (PR #57) is deployed to the target environment.
- `executeGraphQL` propagates authorization/permission errors with a stable code the UI can display.
- The inventory settings navigation supports adding a new child route/tab.
- The backend uppercases and trims `code` on create and resolves deactivate by uppercase code.

## Open questions

- Where should the administration view live: a new `/inventory/settings/uom` page or a tab inside an
  existing inventory settings page?
- Should seeding be offered automatically when the catalog is empty, or only on explicit user action?
- Should a follow-up backend ticket expose an `includeInactive` filter and an update mutation so the
  admin can show/reactivate/rename units?
- Should deactivation be blocked when products reference the code, or is silent removal from selectors
  acceptable?
