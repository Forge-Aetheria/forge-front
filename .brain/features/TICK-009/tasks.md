# Tasks: FE-INV-CATALOG: Integración de Creación Atómica de Plantillas y Variantes con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-009-fe-inv-catalog-variants.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-009/plan.md`
- **Date**: 2026-11-09

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/inventory.gql.ts` Declare GraphQL write mutations `CREATE_PRODUCT_TEMPLATE_MUTATION`, `UPDATE_PRODUCT_TEMPLATE_MUTATION`, and `DELETE_PRODUCT_TEMPLATE_MUTATION` with typed variables and return fields. (REQ-U-001)
- [x] T002 `src/services/adapters/inventoryAdapter.ts` Implement decimal formatting utility (`toFixed(4)`), enum normalizers, and payload serializers (`serializeCreateTemplateInput`, `serializeUpdateTemplateInput`). (REQ-U-002, REQ-U-003, REQ-O-001, REQ-O-002)
- [x] T003 `src/services/inventoryService.ts` Refactor `createProductTemplate` to invoke `CREATE_PRODUCT_TEMPLATE_MUTATION` with the atomic variants payload, map response UUIDs, and disable local `localStorage` mocking for live creations. (REQ-U-004, REQ-E-001, REQ-E-002, REQ-S-002, REQ-N-001, REQ-N-002, REQ-N-003)
- [x] T004 `src/services/inventoryService.ts` Refactor `updateProductTemplate` and `deleteProductTemplate` to invoke `UPDATE_PRODUCT_TEMPLATE_MUTATION` and `DELETE_PRODUCT_TEMPLATE_MUTATION` via GraphQL. (REQ-E-003, REQ-E-004)
- [x] T005 `src/views/inventory/InventoryDetailView.tsx` Connect form submission with the refactored service, manage `saving` button state, propagate server validation errors without losing form inputs, and ensure redirect with backend UUID. (REQ-S-001, REQ-N-001, REQ-N-002, REQ-N-003)
- [x] T006 `forge-front` Run quality gates: TypeScript strict compilation (`tsc --noEmit`), ESLint validation, and Next.js production build (`next build`). (AC-001, AC-002, AC-003, AC-004)

## Dependencies

- T002 depends on T001.
- T003 depends on T001, T002.
- T004 depends on T001, T002.
- T005 depends on T003, T004.
- T006 depends on T005.

## Final verification

- [x] Run repository tests and static analysis (`tsc --noEmit`, `eslint`, `next build`).
- [x] Verify spec acceptance criteria (AC-001 to AC-004).
- [x] Confirm there is no scope drift.
