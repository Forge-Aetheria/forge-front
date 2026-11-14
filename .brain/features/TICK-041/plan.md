# Technical Plan: FE-DATA-CLEANUP: Eliminar mocks y persistencia localStorage en vistas; operar CRUD real contra la DB

- **Ticket**: .agents/tickets/backlog/TICK-041-forge-front-fe-data-cleanup-mocks-localstorage-crud-real.md
- **Repository**: forge-front
- **Domain**: shared
- **Spec**: `.brain/features/TICK-041/spec.md`
- **Date**: 2026-11-14

## Summary

Replace the mixed mock/`localStorage`/GraphQL data layer in `forge-front` with a single backend-backed data flow. Every affected view must load from GraphQL, mutate through GraphQL, expose loading/empty/error states, and keep `localStorage` limited to session and UI preferences. The work spans inventory, accounting, settings/company, bank accounts, purchases, sales, POS, contacts and view-level catalogs.

The strategy is phased and contract-driven:

1. Complete `.brain/features/TICK-041/contract.md` with the operations actually available and the missing ones.
2. Remove mock fallbacks and local persistence module by module, starting with inventory and accounting.
3. Replace settings/company/bank-account/local catalog sources with backend queries.
4. Remove purchases/sales/POS mocks and local persistence.
5. Verify no business data remains in `localStorage` and every CRUD path hits the DB.

Because several backend operations are missing (company bank accounts, feature flags/fiscal mode, some catalogs), TICK-041 must either obtain those contracts or explicitly block the dependent UI. Missing operations become linked `forge-backend` tickets, not frontend mocks.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.9.3, MUI 7.3.6, custom `executeGraphQL` client in `src/libs/graphqlClient.ts`.
- **Dependencies**: existing GraphQL modules in `src/graphql/*.gql.ts`; services in `src/services/*`; adapters in `src/services/adapters/*`; `AuthContext`/`OnboardingContext` for tenant/session scope.
- **Persistence**: backend PostgreSQL is the only business store. Frontend keeps `foundly_auth_session` and `foundly_auth_user` for session, plus cosmetic UI preferences (columns/theme/report currency). Business data must not use `localStorage`.
- **Backend capabilities verified**:
  - `activeBcvRate: ActiveRateType` exists in `schema.gql`.
  - `activePosShift(terminalId: ID!): PosShift` exists.
  - Partner bank accounts exist through `partner.bankAccounts`, `addPartnerBankAccount`, `removePartnerBankAccount`.
  - Accounting exposes accounts, journals, journal entries, invoices, payments, credit notes and report queries.
  - Inventory exposes templates, kardex, stock locations, quants, adjustments, landed costs, warehouses and categories.
  - Purchases and sales expose quote/order/reception queries and mutations.
- **Missing or unverified backend contracts**:
  - Company-level bank accounts (no `companyBankAccounts` query in `schema.gql`; only partner accounts).
  - Tenant feature flags and fiscal mode (no dedicated query/mutation found).
  - Some catalogs currently held as frontend constants (UoMs, contact suggestions, invoice contact options).
  - Company profile fields beyond onboarding (logo, corporate phone/email, commercial policies).
- **Testing**: no unit test runner installed. Gates are `npm run lint`, `npx tsc --noEmit`, `npm run build`, plus API/DB verification against local `forge-backend` and manual UI checks.

## Architecture decisions

- **ADR-001: Remove the storage layer instead of keeping mocks behind flags.** Delete `src/data/inventory/mockInventoryData.ts` usage from runtime, `inventoryStorage.ts` mock fallbacks and all `DEFAULT_*` business seeds. Rationale: a feature flag still lets the UI operate on non-DB data and hides contract drift. Rejected alternative: keep mocks for demos behind `NEXT_PUBLIC_USE_MOCKS`, because tenant data and CRUD correctness cannot be guaranteed.
- **ADR-002: Backend-only reads and mutations with explicit error states.** Services return typed backend results; views render `loading`, `empty` and `error`. Rationale: silent local fallbacks caused the current problem. Rejected alternative: keep local persistence as an offline cache, which requires a synchronization protocol that does not exist.
- **ADR-003: One BCV source through the existing `activeBcvRate` query.** Create/centralize a small BCV accessor using `GET_ACTIVE_BCV_RATE_QUERY` and use it in inventory, accounting and POS. Rationale: `activeBcvRate` is already exposed and consumed by sales. Rejected alternative: keep per-module hardcoded rates (`36.5`, `54.20`, POS mock), which guarantees divergence.
- **ADR-004: Settings come from `me`, `tenantOnboarding` and `tenantUsers`.** Replace `DEFAULT_PROFILE/COMPANY/USERS/BCV/FISCAL_RULES` with backend reads. Fields not exposed by the backend must be added to `contract.md` and requested in a backend ticket; the UI must not invent them. Rejected alternative: keep company data in `localStorage`, which is the current bug.
- **ADR-005: Bank accounts use partner bank accounts; company accounts are a blocking contract.** Reuse `partner.bankAccounts` and the add/remove mutations. Company accounts require a company partner identity or a new backend query; until the contract exists, the company-account UI is blocked/disabled. Rejected alternative: keep `INITIAL_BANK_ACCOUNTS`, which fabricates financial data.
- **ADR-006: Purchases, sales and POS use existing GraphQL operations; tenant flags are a contract dependency.** Quotes, orders, receptions, sales quotes and active POS shifts already have GraphQL operations. Feature flags and fiscal mode have no backend endpoint; they must be added to `contract.md` or derived from tenant settings. Rejected alternative: keep `forge_*` localStorage keys, which make transactions non-canonical.
- **ADR-007: Do not migrate legacy localStorage automatically.** Ignore old business keys at read time and optionally show a one-time notice. Rationale: silently importing local data into the DB risks duplicating or corrupting tenant records. Rejected alternative: auto-migrate on first load.
- **ADR-008: Execute in module phases.** Phase 1: inventory + accounting. Phase 2: settings/company + bank accounts + contacts/catalogs. Phase 3: purchases/sales/POS. Rationale: the ticket is broad; phases keep PRs reviewable and allow contract blockers to be resolved incrementally. Rejected alternative: one giant change across all modules.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Contract | `.brain/features/TICK-041/contract.md` | Complete producer/consumer, operation table, missing company-bank/feature-flag/fiscal-mode contracts, error codes and versioning. |
| Data | `src/data/inventory/mockInventoryData.ts`, `src/data/purchases/mockPurchasesData.ts`, `src/data/sales/mockSalesData.ts`, `src/data/pos/mockPosData.ts` | Remove runtime imports; delete or isolate datasets so no view can fall back to them. |
| Data | `src/services/inventory/inventoryStorage.ts` | Remove mock fallbacks, `DEFAULT_BCV_RATE` and local loaders; keep only pure helpers if strictly needed. |
| Domain/service | `src/services/inventoryService.ts`, `src/services/inventory/categoryWarehouseService.ts`, `src/services/inventory/operationOrdersService.ts`, `src/services/inventory/landedCostService.ts` | Read/write exclusively through GraphQL; remove `loadStored*`/`saveStored*` caches and throw typed errors. |
| Domain/service | `src/services/accountingService.ts` | Delete `DEFAULT_ACCOUNTS/JOURNALS/INVOICES/ENTRIES` and local fallbacks; getters/mutations use GraphQL only; chart seeding uses `SEED_DEFAULT_CHART_MUTATION`. |
| Domain/service | `src/services/settingsService.ts` | Replace `DEFAULT_PROFILE/COMPANY/USERS/BCV/FISCAL_RULES` with `me`, `tenantOnboarding`, `tenantUsers` and backend config; keep only cosmetic preferences local. |
| Domain/service | `src/services/bankAccountsService.ts` | Replace `INITIAL_BANK_ACCOUNTS`/`localStorage` with `partner.bankAccounts` and mutations; block company accounts until contract exists. |
| Domain/service | `src/services/purchasesService.ts`, `src/services/salesQuotesService.ts`, `src/services/posService.ts` | Remove mock initialization and `forge_*` persistence; use GraphQL queries/mutations and `activePosShift`/`activeBcvRate`. |
| Domain/service | New `src/services/bcvService.ts` (or existing `activeBcvRate` accessor) | Single BCV read path for inventory/accounting/POS/sales. |
| Client/UI | `src/app/(dashboard)/contacts/page.tsx` | Remove `tercero-demo`; render real list/selector or a not-found/empty state. |
| Client/UI | `src/views/inventory/components/ProductFormDrawer.tsx`, `src/views/inventory/InventoryDetailView.tsx` | Load categories/UoMs/warehouses/locations from backend; remove `DEFAULT_CATEGORIES`/`DEFAULT_UOMS`. |
| Client/UI | `src/views/accounting/credit-notes/CreditNoteFormView.tsx`, `.../RegisterCreditNoteModal.tsx`, `src/views/accounting/invoices/InvoiceFormView.tsx`, `src/views/accounting/journal-entries/JournalEntryFormView.tsx` | Replace `DEFAULT_CONTACTS`, `CONTACT_OPTIONS`, `DEFAULT_CONTACT_SUGGESTIONS` with backend contact queries. |
| Client/UI | `src/views/settings/SettingsMainView.tsx`, `src/views/settings/tabs/*`, `src/views/settings/components/UserCreateEditDrawer.tsx`, `src/views/profile/UserProfileView.tsx` | Consume backend settings/users/profile; show loading/empty/error; no local seeds. |
| Client/UI | `src/views/contacts/BankAccountsListView.tsx`, `src/views/contacts/BankAccountDetailView.tsx`, `src/views/contacts/components/BankAccountModal.tsx`, `src/views/settings/tabs/CompanySettingsTab.tsx` | Consume partner/company bank-account contract; no `INITIAL_BANK_ACCOUNTS`. |
| Client/UI | `src/views/purchases/*`, `src/views/sales/*`, `src/views/pos/*` | Consume GraphQL services; remove localStorage hydration/persistence; surface backend errors. |
| Client/UI | Affected list/detail views | Add consistent loading, empty and error states; remove silent defaults. |

## Requirement coverage

| Requirement group | Implementation |
| --- | --- |
| REQ-U-001..U-009 | Backend-only services, no business `localStorage`, typed errors, contract.md completion |
| REQ-E-001..E-011 | List/detail loads, CRUD mutations, settings/users, contacts, forms catalogs, POS state, chart seeding |
| REQ-S-001..S-005 | Loading/empty/error states, duplicate-submit guards, tenant-scoped queries |
| REQ-N-001..N-007 | Backend error propagation, missing-contract blocking, legacy local data ignored, refresh failure handling, BCV/permission errors |
| REQ-O-001..O-003 | Cosmetic preferences remain local, missing catalog selectors blocked, optional legacy cleanup notice |

## Cross-sidecar integration

This feature consumes `forge-backend` GraphQL contracts; it does not expose a new one. The authoritative integration document is `.brain/features/TICK-041/contract.md`.

Required contract work before/while implementing:

- Confirm and document `activeBcvRate` as the canonical BCV source.
- Confirm `partner.bankAccounts`/`addPartnerBankAccount`/`removePartnerBankAccount` usage; define how company accounts are represented.
- Define tenant feature flags/fiscal mode source (new query/mutation or tenant settings).
- Define catalog sources for categories, UoMs, contact suggestions and invoice contact options.
- Document error codes (`BAD_USER_INPUT`, `FORBIDDEN`, `UNAUTHENTICATED`, `NOT_FOUND`) and refresh semantics.

If an operation is missing, create a `forge-backend` ticket and add it as a dependency; do not implement a local fallback.

## Testing strategy

- **Static**: `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- **Service-level**: run pure helpers and adapters with Node's built-in runner via `tsx` where they do not require a browser.
- **Integration/API**: with `forge-backend` and a local DB fixture, verify:
  - empty tenant returns empty lists (no mocks);
  - create/edit/delete each module persists in DB and refetches;
  - backend errors display and do not write business data to `localStorage`;
  - BCV/POS shift/settings come from backend;
  - contacts route resolves real data.
- **Manual UI matrix**: inventory products, accounting chart/journals/entries/invoices/payments, settings/company/users, bank accounts, purchases, sales, POS, contacts; verify loading/empty/error states and reload behavior.
- **Regression**: confirm only `foundly_auth_*` and cosmetic UI keys remain in `localStorage`.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Missing backend endpoints (company accounts, feature flags, fiscal mode, catalogs) | Blocked UI or temptation to restore mocks | Complete `contract.md` first; create backend tickets; disable affected UI explicitly. |
| Large cross-module change | Review difficulty and regressions | Execute in phases (inventory/accounting → settings/contacts/bank → purchases/sales/POS) with independent verification. |
| Legacy localStorage data | Users see empty views or stale expectations | Ignore old business keys, show one-time notice, document that data is not migrated. |
| Silent fallback removal reveals missing error handling | Broken UX on network failures | Add loading/empty/error states and retry paths per view before removing fallbacks. |
| BCV source divergence | Incorrect totals across modules | Single `activeBcvRate` accessor and API verification. |
| Tenant leakage | Cross-tenant data exposure | Keep JWT-scoped queries; no client-supplied tenant IDs; verify with two tenants. |
| Existing views depend on mocks for layout | Visual regression | Seed real test data in local DB for manual verification; keep layout unchanged. |
