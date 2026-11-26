# Tasks: FE-RBAC: gestión de roles por tenant y matriz de permisos agrupada por módulo

- **Ticket**: .agents/tickets/backlog/TICK-081-forge-front-fe-rbac-gestion-roles-por-tenant-matriz-permisos.md
- **Repository**: forge-front
- **Spec**: `.brain/features/TICK-081/spec.md`
- **Plan**: `.brain/features/TICK-081/plan.md`
- **Date**: 2026-11-26

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block (no file conflicts).
- `[x]` is set only when implemented and verified.
- Paths are relative to `sidecars/forge-front`.
- `REQ-*`/`AC-*` references stay on the task line so `brain analyze` can trace them.

## Tasks

### Block A — Contract and types

- [x] T001 `src/graphql/iam.gql.ts` extend `GET_ROLES_QUERY` to select `updatedAt` and nested `permissions { permission { id action module description } }`; extend `SET_ROLE_PERMISSIONS_MUTATION` with `$confirmReplace: Boolean`, `$expectedUpdatedAt: DateTime` and return `updatedAt`. (REQ-U-003, REQ-E-004)
- [x] T002 [P] `src/types/settingsTypes.ts` add `ErpPermission { id, action, module, description }` and `PermissionModuleGroup { module, permissions }`; extend `ErpRole` with `permissions: ErpPermission[]` and `updatedAt?: string`. (REQ-U-003)
- [x] T003 [P] `src/services/adapters/roleAdapter.ts` (new) map GraphQL `GqlRole` (with nested permissions) → `ErpRole` and GraphQL `Permission` → `ErpPermission`, preserving `role.id` and `updatedAt`. (REQ-U-003, AC-008)

### Block B — Pure helpers and tests

- [x] T004 [P] `src/utils/rolePermissions.ts` (new) implement `groupPermissionsByModule`, `moduleSelectionState`, `toggleModuleSelection`, `computePermissionIds`, `isReduction` and `formatPermissionLabel` (last action segment → human label). (REQ-U-002, REQ-U-008, REQ-E-004, REQ-E-005)
- [x] T005 [P] `src/utils/pagination.ts` (new) implement `fetchAllPages(fetchPage, pageSize = 100)` that paginates with `take`/`skip` until exhausted. (REQ-U-005, REQ-O-003)
- [x] T006 [P] `src/utils/rolePermissions.test.ts` (new, `node:test`) cover grouping by module, select-all/individual consistency, `computePermissionIds`, reduction detection and `formatPermissionLabel`. (REQ-U-002, REQ-U-008, REQ-E-005)
- [x] T007 [P] `src/utils/pagination.test.ts` (new, `node:test`) cover >100 items across multiple pages, empty result and `take` cap. (REQ-U-005, REQ-O-003)

### Block C — Service

- [x] T008 `src/services/settingsService.ts` add `getRoles()` and `getPermissions()` using `fetchAllPages` + `roleAdapter`, returning all roles (with permissions/updatedAt) and the full catalog; on catalog failure/partial load, throw so the UI blocks saving. (REQ-U-004, REQ-U-005, REQ-N-004, REQ-O-003)
- [x] T009 `src/services/settingsService.ts` add `createRole(input)`, `updateRole(input)` and `deleteRole(id)` using the existing IAM mutations and returns mapped `ErpRole`. (REQ-U-004, REQ-E-002, REQ-E-003, REQ-E-006)
- [x] T010 `src/services/settingsService.ts` add `setRolePermissions({ id, permissionIds, confirmReplace?, expectedUpdatedAt? })` sending the complete set, setting `confirmReplace` only when `isReduction`, and propagating `updatedAt`. (REQ-E-004, REQ-N-001, REQ-N-005)

### Block D — UI

- [x] T011 [P] `src/views/settings/components/PermissionMatrix.tsx` (new) render module groups with per-action checkboxes (human label via `formatPermissionLabel` + description, never the raw action code) and module select-all, entitlement badge (`hasModule`) and a loading/disabled state that blocks save. (REQ-U-002, REQ-U-008, REQ-E-005, REQ-S-003, REQ-O-001, REQ-O-002)
- [x] T012 `src/views/settings/components/RoleEditorView.tsx` (new) **full-view** create/edit editor (replaces the list, with a “Volver” action) embedding the matrix; disable name for `isSystem`, ask confirmation and send `confirmReplace` on reductions, surface backend errors inline. Replaces the previous drawer/modal approach. (REQ-E-002, REQ-E-003, REQ-E-004, REQ-S-001, REQ-N-001, REQ-N-002, REQ-N-005)
- [x] T013 `src/views/settings/tabs/RolesManagementTab.tsx` (new) list tenant roles (name, description, `isSystem`, permission/module counts), actions create/edit/delete with confirmations, permission-gated controls, loading state and error toasts. (REQ-U-001, REQ-U-006, REQ-E-001, REQ-E-006, REQ-S-002, REQ-N-003, REQ-N-006, REQ-N-007)
- [x] T014 `src/views/settings/SettingsMainView.tsx` add the “Roles” tab (5th), gated by `iam:role:read`; load roles/catalog, wire create/edit/delete/save handlers with toast, and call `AuthContext.refreshUser()` when the edited role affects the current user. (REQ-U-001, REQ-U-006, REQ-E-001, REQ-E-007, REQ-N-003)
- [x] T015 [P] `src/services/adapters/iamAdapter.ts` and `src/utils/roleSet.ts` keep name mapping only for display; confirm writes use `role.id` so custom role names never break user-role assignment. (REQ-U-003, REQ-N-003, AC-008)

### Block E — Final verification

- [x] T016 Run `node --import tsx --test "src/utils/*.test.ts"` and confirm unit tests pass. (REQ-U-002, REQ-U-005, REQ-E-005)
- [x] T017 Run `npx tsc --noEmit` and `npm run lint`. (Implementation gate)
- [x] T018 Manual QA of AC-001…AC-010 (create/edit/delete, full-view editor, human permission labels, module matrix, `confirmReplace`, 103-action pagination, `isSystem`, permission gating, self-refresh, custom-role assignment). (AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010)
- [x] T019 Run `brain analyze TICK-081` and confirm no drift across `.brain/features/TICK-081/spec.md`, `.brain/features/TICK-081/plan.md`, `.brain/features/TICK-081/tasks.md` and the code, with no backend/schema changes. (REQ-U-007, Analyze gate)

## Dependencies

- T003 depends on T001 (query shape) and T002 (types).
- T004 and T005 are independent (pure helpers).
- T006 depends on T004; T007 depends on T005.
- T008 depends on T005, T003 and T001.
- T009 and T010 depend on T002 and T003; T010 also on T004 (`isReduction`).
- T011 depends on T002 and T004.
- T012 depends on T009, T010 and T011.
- T013 depends on T008, T009, T012.
- T014 depends on T013.
- T015 is independent (verification of existing adapters).
- T016 and T017 depend on T001–T015; T018 depends on T014; T019 depends on all previous tasks.

## Final verification

- [ ] Unit tests pass (`node --import tsx --test "src/utils/*.test.ts"`).
- [ ] `npx tsc --noEmit` and `npm run lint` are clean.
- [ ] Spec acceptance criteria AC-001…AC-008 verified.
- [ ] No drift with `spec.md` and `plan.md` (`brain analyze TICK-081`).
