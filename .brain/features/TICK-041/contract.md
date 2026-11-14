# Integration Contract: FE-DATA-CLEANUP: Eliminar mocks y persistencia localStorage en vistas; operar CRUD real contra la DB

- **Ticket**: .agents/tickets/backlog/TICK-041-forge-front-fe-data-cleanup-mocks-localstorage-crud-real.md
- **Base repository**: forge-front
- **Domain**: shared
- **Date**: 2026-11-14
- **Status**: Draft

## Cross-sidecar scope

- **Producer**: `forge-backend` (GraphQL API, tenant-scoped by JWT).
- **Consumers**: `forge-front` (accounting, inventory, purchases, sales, POS, settings, contacts and bank-account views).

## Data or API contract

### Available operations (verified in `schema.gql` and frontend operations)

| Operation | Type | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `me` | GraphQL query | none | `AuthenticatedUser` | Session/profile source; tenant from JWT. |
| `tenantUsers` | GraphQL query | IAM listing args | tenant users | Replaces `DEFAULT_USERS`. |
| `tenantOnboarding` | GraphQL query | none | `TenantOnboardingState!` | Fiscal identity and base currency; requires `iam:settings:manage`. |
| `myTenantOnboardingStatus` | GraphQL query | none | `TenantOnboardingStatus!` | Completion status readable by any authenticated tenant user. |
| `tenantSetting(key)` | GraphQL query | `key: String!` | `String!` | Generic tenant key/value settings; use for feature flags, fiscal mode and company profile preferences. |
| `setTenantSetting(input)` | GraphQL mutation | `SetTenantSettingInput!` | `TenantSetting!` | Idempotent tenant-scoped setting upsert. |
| `activeBcvRate` | GraphQL query | none | `ActiveRateType` | Canonical BCV source for inventory/accounting/POS. |
| `activePosShift(terminalId)` | GraphQL query | `terminalId: ID!` | `PosShift` | POS active shift; replaces `mockCurrentShift`. |
| `accounts` | GraphQL query | generated args | `[Account!]!` | Replaces `DEFAULT_ACCOUNTS`. |
| `journals` | GraphQL query | generated args | `[Journal!]!` | Replaces `DEFAULT_JOURNALS`. |
| `journalEntries` | GraphQL query | generated args | `[JournalEntry!]!` | Replaces `DEFAULT_ENTRIES`. |
| `invoices` | GraphQL query | generated args | `[Invoice!]!` | Replaces `DEFAULT_INVOICES`. |
| `payments` | GraphQL query | generated args | `[Payment!]!` | Replaces local payments. |
| `creditNotes` | GraphQL query | generated args | `[CreditNote!]!` | Replaces local credit notes. |
| `templates` / `template` | GraphQL query | generated args / `id` | inventory templates | Replaces `mockProductTemplates`. |
| `kardex` | GraphQL query | `variantId`, pagination | kardex page | Replaces local movements. |
| `categories` | GraphQL query | `take` | category nodes | Replaces `mockProductCategories`/`DEFAULT_CATEGORIES`. |
| `warehouses` | GraphQL query | generated args | warehouses | Replaces `mockWarehouses`. |
| `stockLocations` | GraphQL query | `take` | stock locations | Replaces local locations. |
| `landedCosts` | GraphQL query | generated args | landed costs | Replaces `mockLandedCosts`. |
| `purchaseQuotes` / `purchaseOrders` / `purchaseReceptions` | GraphQL queries | generated args | purchase documents | Replaces mock purchases. |
| `salesQuotes` | GraphQL query | generated args | sales quotes | Replaces mock sales. |
| `partner` / `partners` | GraphQL query | args | contacts with `bankAccounts` | Replaces `DEFAULT_CONTACTS` and contact suggestions. |
| `categories` / `category` / `categoryTree` | GraphQL query | args | `ProductCategory` with `revenueAccount`, `expenseAccount`, `inventoryAccount`, `landedCostAccount` | Replaces `DEFAULT_CATEGORIES` and local accounting mappings. |
| `banks` | GraphQL query | `where`, `take`, `skip` | bank catalog | Bank selector. |
| `addPartnerBankAccount` / `removePartnerBankAccount` | GraphQL mutations | `PartnerBankAccountInput!` / `ID!` | account | Partner bank accounts. |
| `createAccount` / `updateAccount` / `deactivateAccount` | GraphQL mutations | accounting inputs | account | Accounting CRUD. |
| `createJournal` / `createJournalEntry` / `postJournalEntry` / `cancelJournalEntry` | GraphQL mutations | accounting inputs | journal/entry | Accounting CRUD. |
| `createCustomerInvoice` / `createSupplierInvoice` / `post...Invoice` / `cancel...Invoice` | GraphQL mutations | invoice inputs | invoice | Invoice CRUD. |
| `registerPayment` / `cancelPayment` | GraphQL mutations | payment inputs | payment | Payments. |
| `postCreditNote` / `cancelCreditNote` | GraphQL mutations | credit-note inputs | credit note | Credit notes. |
| `createProductTemplate` / `updateProductTemplate` / `deleteProductTemplate` | GraphQL mutations | inventory inputs | template | Inventory CRUD. |
| `createWarehouse` / `updateWarehouse` / `createStockLocation` / `updateStockLocation` | GraphQL mutations | inventory inputs | warehouse/location | Warehouse CRUD. |
| `createInventoryAdjustment` / `applyInventoryAdjustment` | GraphQL mutations | adjustment inputs | adjustment | Adjustments. |
| `createLandedCost` / `updateLandedCost` / `validateLandedCost` / `cancelLandedCost` | GraphQL mutations | landed-cost inputs | landed cost | Landed costs. |
| `createPurchaseQuote` / `registerPurchaseQuote` / `approvePurchaseQuote` / `convertPurchaseQuoteToOrder` / `cancelPurchaseQuote` | GraphQL mutations | purchase inputs | purchase quote/order | Purchases. |
| `createPurchaseReception` | GraphQL mutation | reception input | reception | Purchases. |
| `createSalesQuote` / `updateSalesQuote` / `approveSalesQuote` / `cancelSalesQuote` | GraphQL mutations | sales inputs | sales quote | Sales. |

### Missing or unverified operations (blocking dependencies)

| Capability | Status | Required decision |
| --- | --- | --- |
| Company-level bank accounts | **Missing**: `schema.gql` exposes only `partner.bankAccounts`; no company bank-account query. | Tracked in **TICK-042** (company bank accounts). Until then, company-account UI is blocked; partner accounts remain available. |
| UoM catalog | **Missing**: `ProductTemplate.uomCode` is free text; no UoM model/query. | Tracked in **TICK-042** (UoM catalog). Until then, use a controlled frontend list only if product approves it. |
| Tenant feature flags | **Available via `tenantSetting` / `setTenantSetting`** (generic key/value). | Use documented setting keys; no backend change required. |
| POS fiscal mode | **Available via `tenantSetting` / `setTenantSetting`**. | Use a documented key and tenant-scoped query; no backend change required. |
| Company profile beyond onboarding (logo, corporate phone/email, commercial policies) | **Available via `tenantSetting` / `setTenantSetting`**. | Use documented keys; no backend change required. |
| Contact suggestions / invoice contact options | **Available via `partners` / `partner`**. | Use the contacts queries; no backend change required. |
| Category accounting mappings | **Available**: `ProductCategory` exposes `revenueAccount`, `expenseAccount`, `inventoryAccount`, `landedCostAccount`. | Consume them; no backend change required. |

## Errors and validations

- **ERR-001 `UNAUTHENTICATED`**: missing/expired JWT; redirect to `/login`, do not use local business data.
- **ERR-002 `FORBIDDEN`**: missing permission or tenant mismatch; show forbidden state and keep data hidden.
- **ERR-003 `BAD_USER_INPUT` / `VALIDATION_ERROR`**: show field error from `extensions.field`; do not persist locally.
- **ERR-004 `NOT_FOUND`**: record not in the current tenant; show not-found/empty state.
- **ERR-005 `NETWORK_ERROR` / `TIMEOUT_ERROR`**: show retry state; never fall back to mock or `localStorage` business data.
- **ERR-006 Missing contract**: if an operation above is not implemented (currently company bank accounts and UoM catalog, tracked in TICK-042), disable the dependent UI and reference the backend ticket; do not invent data.

## Compatibility and versioning

- **Version**: 1.0.0 (frontend data-layer cleanup).
- **Change strategy**: frontend-only removal of mocks/`localStorage`; backend operations are consumed as-is.
- **Backward compatibility**: visible behavior changes when the DB is empty (empty states instead of mocks). Legacy business `localStorage` keys are ignored, not migrated.

## Integration sequence

1. **Producer**: confirm the available operations and deliver the missing ones (company bank accounts, feature flags/fiscal mode, catalogs/profile fields) or approve blocking those UI areas.
2. **Consumer**: remove mocks/local persistence per module and consume the operations in this contract with typed errors.
3. **Joint verification**: empty-DB empty states, CRUD persistence, tenant isolation, backend error handling and no business data in `localStorage`.
