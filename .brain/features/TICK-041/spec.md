# EARS Specification: FE-DATA-CLEANUP: Eliminar mocks y persistencia localStorage en vistas; operar CRUD real contra la DB

- **Ticket**: .agents/tickets/backlog/TICK-041-forge-front-fe-data-cleanup-mocks-localstorage-crud-real.md
- **Repository**: forge-front
- **Domain**: shared
- **Date**: 2026-11-14
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

`forge-front` still mixes real GraphQL data with mock datasets and `localStorage` persistence across accounting, inventory, purchases, sales, POS, settings, contacts and bank accounts. This creates a second source of truth: views can display, create or edit records that never reach the DB, hide backend errors and bypass tenant isolation.

Verified evidence:

- **Inventory**: `src/services/inventory/inventoryStorage.ts:1-7` imports mock datasets from `src/data/inventory/mockInventoryData.ts`; `loadStored*` returns those mocks when `localStorage` is empty (`inventoryStorage.ts:58-226`). `getActiveBcvRate()` returns a hardcoded `36.5` (`inventoryStorage.ts:29-33`) while settings uses `54.20` and POS uses another default.
- **Accounting**: `src/services/accountingService.ts:87,133,217,435` defines `DEFAULT_ACCOUNTS`, `DEFAULT_JOURNALS`, `DEFAULT_INVOICES` and `DEFAULT_ENTRIES`; getters read `localStorage` with those defaults (`:700-729`, `:879-961`, `:1014-1071`, `:2050-2081`) and some mutations fall back to local persistence when GraphQL fails.
- **Settings**: `src/services/settingsService.ts:61-181` defines `DEFAULT_PROFILE`, `DEFAULT_COMPANY`, `DEFAULT_BCV`, `DEFAULT_USERS` and `DEFAULT_FISCAL_RULES`; they are read/written in `localStorage` (`:421-445`, `:542-598`).
- **Bank accounts**: `src/services/bankAccountsService.ts:13-...` defines `INITIAL_BANK_ACCOUNTS` and serves them from `localStorage` (`:253-271`).
- **Purchases / sales / POS**: `src/services/purchasesService.ts:16-23,43-72` starts from mock quotes/suppliers/products and persists to `forge_purchases_quotes_v1`; `src/services/salesQuotesService.ts:122-140` does the same for sales; `src/services/posService.ts:1-60` uses `mockCurrentShift`, `defaultBCVRate` and persists shift/BCV/parked orders in `localStorage`.
- **Contacts**: `src/app/(dashboard)/contacts/page.tsx:11` renders `<EntityContactsTab terceroId="tercero-demo" />`, an ID that does not exist in the DB.
- **View catalogs**: `CreditNoteFormView.tsx:58,100` / `RegisterCreditNoteModal.tsx:53,71` use `DEFAULT_CONTACTS`; `InvoiceFormView.tsx:177-179` mixes `CONTACT_OPTIONS`; `JournalEntryFormView.tsx:32` uses `DEFAULT_CONTACT_SUGGESTIONS`; `ProductFormDrawer.tsx:54-64` and `InventoryDetailView.tsx:72-82` use `DEFAULT_CATEGORIES`/`DEFAULT_UOMS`.

The cross-sidecar contract for this feature lives in `.brain/features/TICK-041/contract.md` and must be completed before implementation of any missing backend operation.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The system SHALL treat the backend DB as the single source of truth for all business data (contacts, accounts, journals, entries, invoices, inventory, quotes, orders, shifts and bank accounts).
- **REQ-U-002** The system SHALL NOT persist business data in `localStorage`; only authentication/session state and UI preferences MAY remain local.
- **REQ-U-003** The system SHALL read business lists and records through the existing GraphQL operations exposed by `forge-backend`.
- **REQ-U-004** The system SHALL persist create, edit, cancel and delete operations through GraphQL mutations and SHALL refresh the affected view from the backend after success.
- **REQ-U-005** The system SHALL present explicit `loading`, `empty` and `error` states in every affected list/detail view.
- **REQ-U-006** The system SHALL scope every query and mutation to the JWT tenant; no view SHALL synthesize tenant data locally.
- **REQ-U-007** The system SHALL remove all mock datasets used as runtime fallbacks (`mockInventoryData`, `initialMock*`, `mock*Lookup`, `DEFAULT_*` business seeds, `INITIAL_BANK_ACCOUNTS`).
- **REQ-U-008** The system SHALL keep only non-business UI preferences in `localStorage` (for example, visible columns, theme, report currency toggle).
- **REQ-U-009** The system SHALL implement against the operations and error semantics recorded in `.brain/features/TICK-041/contract.md`.

### Event-driven (When)

- **REQ-E-001** WHEN a list view loads, the system SHALL query the backend and SHALL render an empty state when the DB returns zero records.
- **REQ-E-002** WHEN the user creates a record, the system SHALL execute the corresponding mutation and SHALL reload the list/detail from the backend.
- **REQ-E-003** WHEN the user edits a record, the system SHALL execute the corresponding mutation and SHALL reload the affected record from the backend.
- **REQ-E-004** WHEN the user cancels, deletes or changes the status of a record, the system SHALL execute the mutation and SHALL reload the affected view.
- **REQ-E-005** WHEN the application reloads, the system SHALL reconstruct every affected view from backend data and SHALL NOT hydrate business data from `localStorage`.
- **REQ-E-006** WHEN the settings view opens, the system SHALL load profile, company/tenant configuration, users and fiscal defaults from `me`, `tenantOnboarding`, `tenantUsers` and backend configuration queries.
- **REQ-E-007** WHEN `/contacts` loads without an explicit contact id, the system SHALL show the real contact list/selector and SHALL NOT render `tercero-demo`.
- **REQ-E-008** WHEN a product/invoice/quote form opens, the system SHALL load contacts, categories, UoMs, warehouses, locations and accounts from backend queries.
- **REQ-E-009** WHEN the POS starts, the system SHALL load the active shift, BCV rate and fiscal mode from backend/tenant state.
- **REQ-E-010** WHEN an accounting tenant has no chart of accounts, the system SHALL offer seeding through the existing backend mutation and SHALL NOT seed local defaults.
- **REQ-E-011** WHEN the user selects a record id that no longer exists, the system SHALL show a not-found/empty state and SHALL NOT substitute a mock record.

### State-driven (While)

- **REQ-S-001** WHILE a backend request is in flight, the system SHALL show a loading indicator and SHALL NOT render mock records.
- **REQ-S-002** WHILE a query returns no rows, the system SHALL show an empty state with the next valid action (create, seed or change filters).
- **REQ-S-003** WHILE a mutation is in flight, the system SHALL disable duplicate submission controls for that action.
- **REQ-S-004** WHILE the backend is unavailable, the system SHALL keep the error state and SHALL NOT replace data with local defaults.
- **REQ-S-005** WHILE a tenant session is active, the system SHALL render only records returned for that tenant.

### Unwanted (If / Then)

- **REQ-N-001** IF a GraphQL query or mutation fails, THEN the system SHALL surface the backend error and SHALL NOT persist the operation locally.
- **REQ-N-002** IF the backend does not expose a required query or mutation, THEN the system SHALL block that capability and record the missing dependency in `contract.md`, instead of falling back to mocks.
- **REQ-N-003** IF legacy business data exists in `localStorage`, THEN the system SHALL ignore it for rendering and SHALL NOT merge it into backend results.
- **REQ-N-004** IF a mutation succeeds but the follow-up refresh fails, THEN the system SHALL show a partial-success state with retry and SHALL NOT reconstruct the record locally.
- **REQ-N-005** IF the BCV rate or fiscal configuration is unavailable, THEN the system SHALL show an explicit error/blocked state and SHALL NOT use a hardcoded fallback rate.
- **REQ-N-006** IF the authenticated user lacks permission for a module, THEN the system SHALL show a forbidden state and SHALL NOT display mock or seeded data.
- **REQ-N-007** IF a stored UI preference references a removed column or filter, THEN the system SHALL fall back to documented UI defaults without affecting business data.

### Optional (Where)

- **REQ-O-001** WHERE a UI preference is purely cosmetic (columns, theme, report currency), the system SHALL persist it locally without mixing it with business data.
- **REQ-O-002** WHERE a backend catalog endpoint is not yet available, the system SHALL disable the dependent selector with an explicit message and a linked backend dependency.
- **REQ-O-003** WHERE legacy `localStorage` business keys exist, the system SHALL ignore them and MAY offer a one-time cleanup notice to the user.

## Acceptance criteria

- **AC-001** GIVEN an empty tenant DB, WHEN an inventory, accounting, contacts, purchase, sale or POS list loads, THEN the view shows an empty state and no mock records.
- **AC-002** GIVEN a valid tenant session, WHEN the user creates a contact/account/journal/quote, THEN the record appears after a backend refetch and exists in the DB.
- **AC-003** GIVEN an existing record, WHEN the user edits it, THEN the updated values come from the backend response/refetch.
- **AC-004** GIVEN the backend returns an error, WHEN the user submits a mutation, THEN the UI shows the error and `localStorage` remains unchanged for business data.
- **AC-005** GIVEN legacy business data in `localStorage`, WHEN the app reloads, THEN the views ignore it and render from the DB.
- **AC-006** GIVEN a page with `tercero-demo`, WHEN `/contacts` loads, THEN a real contact list/selector is shown and no demo entity appears.
- **AC-007** GIVEN the settings view, WHEN it loads, THEN profile/company/users/fiscal defaults come from backend queries, not `DEFAULT_*` seeds.
- **AC-008** GIVEN POS startup, WHEN tenant state is loaded, THEN shift, BCV and fiscal mode come from the backend.
- **AC-009** GIVEN a missing backend operation, WHEN the dependent UI is opened, THEN the capability is blocked and documented in `contract.md`.
- **AC-010** GIVEN UI columns/theme preferences, WHEN the user reloads, THEN those preferences persist while business data is refetched.

## Out of scope

- Implementing missing backend queries/mutations; those require separate `forge-backend` tickets declared as dependencies.
- Migrating legacy `localStorage` business data into the DB.
- Redesigning layouts or visual components; only the data layer and states change.
- Authentication, session storage and tenant selection.
- Automated test infrastructure beyond the existing lint/build/typecheck gates.

## Assumptions

- `forge-backend` already exposes GraphQL modules for accounting, inventory, purchases, sales, POS, contacts and IAM.
- Existing operations such as `activeBcvRate`, `tenantUsers`, `tenantOnboarding`, partner bank accounts, accounts, journals, entries, invoices, quotes and inventory products are reachable from `forge-front`.
- Some required operations may be missing (company bank accounts, feature flags, some catalogs); those are recorded as blocking dependencies rather than invented.
- The current frontend has no unit test runner; verification will use lint, typecheck, build and manual/API checks against a real DB.

## Open questions

- Which backend operation should expose company bank accounts, or should the frontend reuse partner bank accounts with a company partner id?
- Does the backend expose tenant-level feature flags and fiscal mode, or must they be derived from tenant settings/onboarding?
- Which BCV source is canonical for inventory, accounting and POS: `activeBcvRate`, tenant settings, or a new shared query?
- Should TICK-041 be executed as one large change or split into module tickets (inventory, accounting, settings, purchases/sales/POS, contacts) with TICK-041 as the umbrella?
- Should legacy `localStorage` business keys be cleared automatically or only ignored?
