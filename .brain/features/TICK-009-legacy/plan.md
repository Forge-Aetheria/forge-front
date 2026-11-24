# Technical Plan: FE-INV-CATALOG: Integración de Creación Atómica de Plantillas y Variantes con GraphQL

- **Ticket**: legacy TICK-009-fe-inv-catalog-variants (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-009/spec.md`
- **Date**: 2026-11-09

## Summary

This feature transitions product template and variant creation from browser `localStorage` mock persistence to live transactional GraphQL mutations against `forge-backend`. The technical strategy connects the existing Next.js/MUI product form (`/inventory/products/new` and `InventoryDetailView.tsx`) with the atomic backend mutation `createProductTemplate`, serializing master template metadata, policies, and variant arrays into a single payload, handling server validation errors gracefully, and establishing real UUID propagation across the application.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient` (isomorphic fetch wrapper with Bearer token injection and timeout control).
- **Persistence**: Centralized PostgreSQL database managed by `forge-backend` through Prisma 7 multi-tenant extension.
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript validation).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - Multi-tenant isolation: `tenantId` is never sent in input payloads; it is resolved server-side from the JWT claims.
  - Decimal precision: All monetary prices, extra prices, costs, and dimensions must be formatted as 4-decimal strings (`String` scalar for `Decimal(12,4)`).
  - Repository hygiene (Rule R1): Zero dead code, no backup files (`*V2.tsx`, `*.bak`), clean imports.

## Architecture decisions

- **ADR-001: Atomic Single-Request Mutation vs Multi-Step Sequential Creation**
  - **Decision:** Utilize the single atomic GraphQL mutation `createProductTemplate(input: CreateProductTemplateInput!)` accepting `variants: [CreateTemplateVariantInput!]`.
  - **Rationale:** Ensures complete transactional integrity in the database. Prevents orphaned templates without variants and avoids partial failures where a template is created but variant creation fails.
  - **Rejected alternative:** Creating the template first via `createProductTemplate` and subsequently sending individual `createProductVariant` requests for each variant.

- **ADR-002: Adapter-Based Serialization Layer**
  - **Decision:** Centralize input normalization, enum mapping, and GraphQL response hydration in `src/services/adapters/inventoryAdapter.ts`.
  - **Rationale:** Shields the UI view layer (`InventoryDetailView.tsx`) from GraphQL schema details and scalar formatting requirements, adhering to Single Responsibility Principle.
  - **Rejected alternative:** Inlining GraphQL payload formatting and decimal string conversion directly inside the React component's `handleSaveChanges` callback.

- **ADR-003: Non-Destructive Error Propagation on Validation Failure**
  - **Decision:** When the backend rejects a creation request (e.g., duplicate SKU or invalid category), capture the `GraphQLClientError`, extract the human-readable error message, and surface it via an inline alert and toast, preserving all user-entered form state.
  - **Rationale:** Prevents user frustration by not clearing form fields or variants when a simple SKU collision occurs.
  - **Rejected alternative:** Catch-all fallback to `localStorage` or resetting form fields upon mutation failure.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/inventory.gql.ts` | Add `CREATE_PRODUCT_TEMPLATE_MUTATION`, `UPDATE_PRODUCT_TEMPLATE_MUTATION`, and `DELETE_PRODUCT_TEMPLATE_MUTATION` definitions matching backend inputs. |
| **Adapter** | `src/services/adapters/inventoryAdapter.ts` | Add `serializeCreateTemplateInput`, `serializeUpdateTemplateInput`, enum mappers (`mapProductTypeToBackend`, `mapVatAliquotToBackend`), and ensure decimal string conversion. |
| **Domain / Service** | `src/services/inventoryService.ts` | Update `createProductTemplate`, `updateProductTemplate`, and `deleteProductTemplate` to invoke `executeGraphQL` with the serialized payload; disable `localStorage` writes for live templates; maintain cache invalidation. |
| **Client / UI** | `src/views/inventory/InventoryDetailView.tsx` | Ensure `handleSaveChanges` handles real UUID redirection, prevents duplicate submission via `saving` state, and presents backend validation messages cleanly. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes `createProductTemplate`, `updateProductTemplate`, and `deleteProductTemplate` in `src/modules/inventory/resolvers/product-template.resolver.ts`.
- **Consumer**: `sidecars/forge-front` consumes these operations in `src/services/inventoryService.ts`.
- **Contract status**: Fully aligned with PR #39 (`feature/018-template-variants-transaction`) on `forge-backend`. No schema changes required on the backend.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all modified files.
- **Production Build**: Verify full page compilation using `pnpm exec next build`.
- **E2E Integration Verification**:
  1. Open `/inventory/products/new`.
  2. Input product name, base price, select category and product type.
  3. Define 2 variants with distinct SKUs, extra prices, and attributes.
  4. Submit form and verify successful response with UUID format (`/^[0-9a-f-]{36}$/`).
  5. Confirm redirection to `/inventory/products/[id]`.
  6. Attempt creating a second product with a duplicate SKU and verify that an inline error is displayed without clearing the form.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Duplicate master or variant SKU** | Form submission rejected by backend unique constraint | Extract GraphQL error message and show contextual error on the SKU field without resetting form state. |
| **Category ID mismatch (missing category)** | Foreign key validation error on `categoryId` | Ensure category selector always provides a valid UUID loaded from `GetCategories` query or fallback to default category. |
| **Decimal format rejection (`@IsDecimal4`)** | Backend rejects payload if numbers are passed or formatting exceeds 4 decimals | Use centralized `formatDecimalString(value)` helper ensuring non-negative string with `.toFixed(4)`. |
| **Network timeout on large variant sets** | Creation fails on slower networks | Set request timeout to 10,000ms in `executeGraphQL` and disable submit button while loading. |
