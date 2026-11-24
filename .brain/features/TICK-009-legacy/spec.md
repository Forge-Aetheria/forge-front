# EARS Specification: FE-INV-CATALOG: Integración de Creación Atómica de Plantillas y Variantes con GraphQL

- **Ticket**: legacy TICK-009-fe-inv-catalog-variants (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-09
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, the product creation and editing interfaces (`/inventory/products/new` and `/inventory/products/[id]`) persist product templates and variants locally using `localStorage` (`inventoryStorage` via `src/services/inventoryService.ts`). This client-side implementation synthesizes temporary IDs (`cat-*`, `prod-*`, `var-*`) and simulates initial stock balances in the browser.

In `forge-backend`, the inventory module exposes a transactional GraphQL mutation `createProductTemplate(input: CreateProductTemplateInput!)` (completed in PR #39), which creates a product template and its complete set of variants (`variants: [CreateTemplateVariantInput!]`), attribute links, and prices atomically in a single database transaction. While `src/graphql/inventory.gql.ts` currently provides read queries (`GET_TEMPLATES_QUERY`, `GET_TEMPLATE_BY_ID_QUERY`), write mutations are missing.

Connecting this interface to the backend GraphQL API is required so that products and variants obtain real UUIDs and persist centrally across all tenant users.

## EARS Requirements

### Ubiquitous

Requirements that always apply, without an activation condition.

- **REQ-U-001** The system SHALL declare `CREATE_PRODUCT_TEMPLATE_MUTATION`, `UPDATE_PRODUCT_TEMPLATE_MUTATION`, and `DELETE_PRODUCT_TEMPLATE_MUTATION` in `src/graphql/inventory.gql.ts` conforming strictly to the `forge-backend` GraphQL schema.
- **REQ-U-002** The system SHALL format all numeric monetary amounts, costs, margins, weights, and volumes (`basePrice`, `priceExtra`, `standardCost`, `targetMargin`, `weight`, `volume`) as 4-decimal strings (`String` scalar for `Decimal` backend compatibility).
- **REQ-U-003** The system SHALL normalize and map frontend enums to backend GraphQL enums:
  - `productType`: `'storable'` → `STORABLE`, `'service'` → `SERVICE`, `'consumable'` → `CONSUMABLE`.
  - `vatAliquot`: `'GENERAL_16'` → `GENERAL_16`, `'REDUCED_8'` → `REDUCED_8`, `'LUXURY_31'` → `LUXURY_31`, `'EXEMPT_0'` → `EXEMPT_0`.
  - `deliveryPolicy`: `'ORDERED'` → `ORDERED`, `'DELIVERED'` → `DELIVERED`, `'DEFAULT'` → `DEFAULT`.
  - `invoicingPolicy`: `'ORDERED_QUANTITIES'` → `ORDERED_QUANTITIES`, `'DELIVERED_QUANTITIES'` → `DELIVERED_QUANTITIES`.
  - `purchaseControlPolicy`: `'ORDERED_QUANTITIES'` → `ORDERED_QUANTITIES`, `'RECEIVED_QUANTITIES'` → `RECEIVED_QUANTITIES`.
- **REQ-U-004** The system SHALL use exclusively the server-generated UUIDs returned by the GraphQL API and cease generating client-side `prod-*` and `var-*` identifiers for persisted records.

### Event-driven (When)

- **REQ-E-001** WHEN the user submits the product creation form (`/inventory/products/new`), the system SHALL invoke the `createProductTemplate` mutation with the complete input payload, sending all defined variants atomically in the same network request.
- **REQ-E-002** WHEN the `createProductTemplate` mutation completes successfully, the system SHALL invalidate the local template cache, display a success toast, and navigate the user to `/inventory/products/[id]` using the returned product UUID.
- **REQ-E-003** WHEN the user saves changes on `/inventory/products/[id]`, the system SHALL send the `updateProductTemplate` mutation with the modified fields.
- **REQ-E-004** WHEN the user deletes a template without associated transactions or active stock moves, the system SHALL execute `deleteProductTemplate` and remove the item from the catalog view.

### State-driven (While)

- **REQ-S-001** WHILE a GraphQL mutation is in transit, the system SHALL set the submission button to a loading state (`saving = true`) and disable input controls to prevent duplicate submissions.
- **REQ-S-002** WHILE rendering product templates in `/inventory/products`, the system SHALL display the live status, SKU, and categories returned from the backend queries.

### Unwanted (If / Then)

- **REQ-N-001** IF the backend rejects the mutation due to a duplicate master SKU or variant SKU, THEN the system SHALL capture the GraphQL error and display a specific, user-friendly error message on the form without resetting entered form fields.
- **REQ-N-002** IF the backend returns an authorization or validation error (e.g. invalid category UUID), THEN the system SHALL display the server error message in an alert banner.
- **REQ-N-003** IF the network connection fails or the request times out, THEN the system SHALL notify the user with a retry alert and keep the form state intact.

### Optional (Where)

- **REQ-O-001** WHERE a product is of type `SERVICE` and `isLandedCost` is checked, the system SHALL transmit the `defaultSplitMethod` (`EQUAL`, `BY_QUANTITY`, `BY_COST`, `BY_WEIGHT`, `BY_VOLUME`) in the creation payload.
- **REQ-O-002** WHERE the user does not specify extra variant attributes, the system SHALL create a single default variant carrying the master SKU and base price.

## Acceptance criteria

- **AC-001** GIVEN a filled product form with master SKU `TEST-SKU-01` and 2 variants, WHEN the user clicks "Guardar", THEN the system SHALL execute `createProductTemplate` sending both variants in `input.variants` and return a real UUID.
- **AC-002** GIVEN a successful creation response, WHEN redirecting to `/inventory/products/[id]`, THEN the URL and view state SHALL contain the backend UUID instead of a local `prod-*` string.
- **AC-003** GIVEN an already existing SKU in the backend, WHEN submitting the form, THEN the system SHALL show an inline alert indicating that the SKU is duplicated and SHALL NOT lose form inputs.
- **AC-004** GIVEN all monetary and cost values entered in the form, WHEN the payload is serialized for GraphQL, THEN all decimal numbers SHALL be converted to string values with up to 4 decimal places.

## Out of scope

- Warehouse stock moves and physical Kardex initialization (governed by `TICK-010`).
- Direct attachment of image binary files (handled via avatar / file upload adapter).
- Barcode thermal label printing.

## Assumptions

- Product categories exist in `ProductCategory` and can be selected by valid UUID.
- The user is authenticated with a valid JWT containing `tenantId`.

## Open questions

- None.
