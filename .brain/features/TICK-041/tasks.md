# Tasks: FE-DATA-CLEANUP: Eliminar mocks y persistencia localStorage en vistas; operar CRUD real contra la DB

- **Ticket**: .agents/tickets/backlog/TICK-041-forge-front-fe-data-cleanup-mocks-localstorage-crud-real.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-041/plan.md`
- **Date**: 2026-11-14

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `.brain/features/TICK-041/contract.md` Complete the cross-sidecar contract: producer/consumer, available operations, missing company-bank/feature-flag/fiscal-mode/catalog operations, error codes and versioning. Covers REQ-U-009, REQ-N-002.
- [x] T002 [P] `src/services/bcvService.ts` Add a single BCV accessor backed by `GET_ACTIVE_BCV_RATE_QUERY`; expose a typed result and no hardcoded fallback. Covers REQ-U-003, REQ-N-005.
- [x] T003 [P] `src/utils/legacyStorage.ts` Add helpers to detect and ignore legacy business `localStorage` keys while preserving `foundly_auth_*` and cosmetic preferences. Covers REQ-N-003, REQ-O-003.
- [ ] T004 `src/services/inventory/inventoryStorage.ts` Remove mock imports, `DEFAULT_BCV_RATE`, local business loaders and mock fallbacks; keep only non-business helpers if needed. Covers REQ-U-002, REQ-U-007, REQ-N-005.
- [ ] T005 `src/services/inventoryService.ts` Remove local template/movement caches and `saveStored*` fallbacks; propagate GraphQL errors. Covers REQ-U-003, REQ-U-004, REQ-N-001.
- [ ] T006 `src/services/inventory/categoryWarehouseService.ts` Replace `loadStoredCategories`/`saveStored*` and local warehouse fallbacks with GraphQL reads/mutations. Covers REQ-U-003, REQ-U-004, REQ-E-008.
- [ ] T007 `src/services/inventory/operationOrdersService.ts` Remove local operation-order, template and movement persistence; use GraphQL only. Covers REQ-U-003, REQ-U-004, REQ-E-002.
- [ ] T008 `src/services/inventory/landedCostService.ts` Remove local landed-cost persistence and local template/order fallbacks; use GraphQL only. Covers REQ-U-003, REQ-U-004, REQ-E-002.
- [ ] T009 `src/views/inventory/components/ProductFormDrawer.tsx` Replace `DEFAULT_CATEGORIES`/`DEFAULT_UOMS` with backend catalogs and add loading/error states for selectors. Covers REQ-U-007, REQ-E-008, REQ-S-001.
- [ ] T010 `src/views/inventory/InventoryDetailView.tsx` Replace `DEFAULT_CATEGORIES`/`DEFAULT_UOMS` with backend catalogs and add loading/error states. Covers REQ-U-007, REQ-E-008, REQ-S-001.
- [ ] T011 `src/views/inventory/InventoryCatalogView.tsx` Render loading/empty/error states from backend data and remove any mock fallback. Covers REQ-U-005, REQ-E-001, REQ-S-001, REQ-S-002.
- [ ] T012 `src/views/inventory/InventoryKardexView.tsx` Render loading/empty/error states from GraphQL and remove local fallback expectations. Covers REQ-U-005, REQ-E-001, REQ-S-002.
- [ ] T013 `src/views/inventory/InventoryAdjustmentsView.tsx` Render loading/empty/error states and refresh adjustments from the backend after mutations. Covers REQ-U-005, REQ-E-002, REQ-S-003.
- [ ] T014 `src/views/inventory/WarehouseOperationsListView.tsx` Render loading/empty/error states and remove mock/local operation data assumptions. Covers REQ-U-005, REQ-E-001, REQ-S-004.
- [ ] T015 `src/views/inventory/InventoryWarehousesView.tsx` and `src/views/inventory/InventoryLocationsView.tsx` Render backend warehouses/locations with loading/empty/error and remove local fallbacks. Covers REQ-U-005, REQ-E-008, REQ-S-002.
- [ ] T016 `src/views/inventory/LandedCostsListView.tsx` and `src/views/inventory/LandedCostDetailView.tsx` Render backend landed costs with loading/empty/error and refresh after mutations. Covers REQ-U-005, REQ-E-002, REQ-S-002.
- [ ] T017 `src/services/accountingService.ts` Delete `DEFAULT_ACCOUNTS/JOURNALS/INVOICES/ENTRIES`, local getters and fallback persistence; use GraphQL only and keep chart seeding via `SEED_DEFAULT_CHART_MUTATION`. Covers REQ-U-001, REQ-U-003, REQ-U-004, REQ-E-010, REQ-N-001.
- [ ] T018 `src/views/accounting/chart-of-accounts/ChartOfAccountsView.tsx`, `AccountFormView.tsx` and `AccountCreateEditDrawer.tsx` Load accounts from backend, offer backend chart seeding, and add loading/empty/error states. Covers REQ-E-001, REQ-E-010, REQ-U-005.
- [ ] T019 `src/views/accounting/journal-entries/JournalEntriesListView.tsx`, `JournalEntryFormView.tsx` and `JournalEntryFormModal.tsx` Load journals/entries/accounts from backend, remove `DEFAULT_CONTACT_SUGGESTIONS`, and add loading/empty/error states. Covers REQ-E-001, REQ-E-002, REQ-E-008, REQ-U-005.
- [ ] T020 `src/views/accounting/invoices/InvoicesListView.tsx`, `InvoiceFormView.tsx` and `InvoiceDetailModal.tsx` Load invoices/contacts/accounts from backend, remove `CONTACT_OPTIONS`, and surface mutation errors. Covers REQ-E-001, REQ-E-002, REQ-E-008, REQ-N-001.
- [ ] T021 `src/views/accounting/payments/PaymentsListView.tsx`, `PaymentFormView.tsx`, `SinglePaymentDrawer.tsx` and `DirectExpenseModal.tsx` Load payments/invoices/accounts from backend and remove local fallbacks. Covers REQ-E-001, REQ-E-002, REQ-S-003.
- [ ] T022 `src/views/accounting/credit-notes/CreditNotesListView.tsx`, `CreditNoteFormView.tsx` and `components/RegisterCreditNoteModal.tsx` Remove `DEFAULT_CONTACTS`, load contacts/invoices from backend and surface mutation errors. Covers REQ-E-001, REQ-E-008, REQ-N-001.
- [ ] T023 `src/services/settingsService.ts` Replace `DEFAULT_PROFILE/COMPANY/USERS/BCV/FISCAL_RULES` and business `localStorage` reads/writes with `me`, `tenantOnboarding`, `tenantUsers` and backend configuration; keep only cosmetic preferences local. Covers REQ-U-002, REQ-U-003, REQ-E-006, REQ-U-008.
- [ ] T024 `src/views/settings/SettingsMainView.tsx` and `tabs/CompanySettingsTab.tsx` Load company/profile data from backend, add loading/empty/error states and remove local company seeds. Covers REQ-E-006, REQ-U-005, REQ-N-001.
- [ ] T025 `src/views/settings/tabs/BcvSettingsTab.tsx` and `tabs/FiscalRulesTab.tsx` Load BCV/fiscal configuration from backend and block unsupported operations with an explicit dependency message. Covers REQ-E-006, REQ-N-002, REQ-N-005.
- [ ] T026 `src/views/settings/tabs/UsersManagementTab.tsx` and `components/UserCreateEditDrawer.tsx` Load/manage tenant users exclusively through IAM GraphQL operations and add loading/empty/error states. Covers REQ-E-006, REQ-U-004, REQ-U-005.
- [ ] T027 `src/views/profile/UserProfileView.tsx` Load profile from `me` and persist updates through the existing profile mutations; remove `DEFAULT_PROFILE`. Covers REQ-U-003, REQ-E-006, REQ-N-001.
- [ ] T028 `src/services/bankAccountsService.ts` Remove `INITIAL_BANK_ACCOUNTS`/`localStorage`; use `partner.bankAccounts` and add/remove mutations; block company accounts until the contract exists. Covers REQ-U-007, REQ-N-002, REQ-E-008.
- [ ] T029 `src/views/contacts/BankAccountsListView.tsx`, `BankAccountDetailView.tsx` and `components/BankAccountModal.tsx` Load/save bank accounts through the contacts contract, add loading/empty/error states and remove local seeds. Covers REQ-E-001, REQ-E-002, REQ-N-002.
- [x] T030 `src/app/(dashboard)/contacts/page.tsx` and `src/views/contacts/EntityContactsTab.tsx` Remove `tercero-demo`; render a real contact list/selector or a not-found state. Covers REQ-E-007, REQ-N-005.
- [ ] T031 `src/services/purchasesService.ts` Remove `initialMockPurchaseQuotes`, `mockSuppliersLookup`, `mockPurchaseProductsLookup`, BCV mocks and `forge_purchases_*` persistence; use GraphQL only. Covers REQ-U-001, REQ-U-007, REQ-E-001, REQ-N-001.
- [ ] T032 `src/views/purchases/quotes/PurchasesListView.tsx`, `PurchaseMasterDetailForm.tsx`, `PurchaseDetailView.tsx` and `PurchaseEditWrapper.tsx` Load suppliers/products/quotes/BCV from backend and add loading/empty/error states. Covers REQ-E-001, REQ-E-008, REQ-U-005.
- [ ] T033 `src/services/salesQuotesService.ts` Remove `initialMock*`, local quote persistence, local feature flags and silent BCV fallback; use GraphQL and the shared BCV accessor. Covers REQ-U-001, REQ-U-007, REQ-N-005.
- [ ] T034 `src/views/sales/quotes/QuotesListView.tsx`, `QuoteMasterDetailForm.tsx`, `QuoteDetailView.tsx` and `QuoteEditWrapper.tsx` Load clients/products/rates from backend and add loading/empty/error states. Covers REQ-E-001, REQ-E-008, REQ-U-005.
- [ ] T035 `src/services/posService.ts` Remove `mockCurrentShift`, `defaultBCVRate` and `forge_pos_*` persistence; use backend shift/BCV/fiscal state. Covers REQ-E-009, REQ-N-005, REQ-U-007.
- [ ] T036 `src/views/pos/terminal/POSTerminalView.tsx`, `src/views/pos/shifts/POSShiftManagement.tsx` and `src/views/pos/terminal/POSPaymentModal.tsx` Load shift/BCV/fiscal state from backend and surface errors without local fallback. Covers REQ-E-009, REQ-N-001, REQ-N-005.

## Dependencies

- T002, T003 depend on T001.
- T004 depends on T001 and T002.
- T005, T006 depend on T004.
- T007, T008 depend on T004 and T005.
- T009, T010 depend on T006.
- T011, T012, T013, T014, T015, T016 depend on T005, T006, T007 and T008 as applicable.
- T017 depends on T001 and T002.
- T018, T019, T020, T021 and T022 depend on T017.
- T023 depends on T001.
- T024, T025, T026 and T027 depend on T023.
- T028 depends on T001.
- T029 depends on T028.
- T030 depends on T001.
- T031 depends on T002, T005 and T006.
- T032 depends on T031.
- T033 depends on T002, T005 and T006.
- T034 depends on T033.
- T035 depends on T002 and T031.
- T036 depends on T035.

## Final verification

- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Verify AC-001 and AC-002: empty tenant lists show empty states and CRUD writes persist in the DB.
- [ ] Verify AC-003 and AC-004: edits reload from backend and API errors do not write business data locally.
- [ ] Verify AC-005: legacy business `localStorage` keys are ignored after reload.
- [ ] Verify AC-006 and AC-007: `/contacts` and settings use real backend data, never `tercero-demo` or `DEFAULT_*`.
- [ ] Verify AC-008: POS shift, BCV and fiscal mode come from backend/tenant state.
- [ ] Verify AC-009: missing backend operations are blocked and documented in `contract.md`.
- [ ] Verify AC-010: cosmetic UI preferences persist while business data is refetched.
- [ ] Confirm no business data remains in `localStorage`; only `foundly_auth_*` and cosmetic keys remain.
- [ ] Confirm no runtime import of `src/data/**/mock*` remains in affected services/views.
