# Tasks: FE-RBAC: Editar un usuario desde Ajustes reemplaza todo su set de roles con uno solo

- **Source Ticket**: .agents/tickets/backlog/TICK-054-forge-front-fe-rbac-editar-un-usuario-desde-ajustes-reemplaz.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-054/plan.md`
- **Date**: 2026-11-18

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block without file conflicts.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.
- Write tasks in English; product-facing copy in the code remains Spanish, consistent with the existing UI.

## Tasks

- [x] T001 [P] `src/types/settingsTypes.ts` Add `ErpRole { id, name, description?, isSystem }`; add `roles: ErpRole[]` and a derived `primaryRole`/display field to `ErpUser`; replace the scalar write fields with `roleIds: string[]` on `UpdateUserInput` and an explicit initial role ID on `CreateUserInput`. (REQ-U-001, REQ-U-004, REQ-E-006)
- [x] T002 [P] `src/graphql/iam.gql.ts` Add `ASSIGN_ROLE_TO_USER_MUTATION` and `REVOKE_ROLE_FROM_USER_MUTATION` using the exact provider arguments (`userId: ID!`, `roleId: ID!`); keep `INVITE_TENANT_USER_MUTATION`; keep `SET_TENANT_USER_ROLES_MUTATION` only for an explicit replacement path. (REQ-U-003, REQ-E-002, REQ-E-003)
- [x] T003 `src/utils/roleSet.ts` Create pure helpers: `diffRoleIds(current, next)`, `validateRoleIds(ids, assignable)`, `isAdministratorRole(role)`, `selectPrimaryRole(roles)` and `summarizeRemovedRoles(roles)`, with exact-ID semantics and deterministic ordering. (REQ-U-004, REQ-U-006, REQ-E-007, REQ-N-001, REQ-N-003, REQ-N-004, REQ-O-002)
- [x] T004 [P] `src/utils/roleSet.test.ts` Add `node:test` + `node:assert/strict` coverage for the role diff, invalid-ID rejection, administrator detection, primary-role ordering and removed-role summary. (REQ-U-004, REQ-E-007, REQ-N-001, REQ-N-003, REQ-N-004, REQ-O-002)
- [x] T005 `src/services/adapters/iamAdapter.ts` Map every `gql.roles[]` entry to `ErpRole` preserving exact IDs and provider names; compute the deterministic primary role; keep `mapGqlRoleToSystemRole` for legacy colors only, never for writes. (REQ-U-001, REQ-U-006, REQ-O-001, REQ-O-002)
- [x] T006 [P] `src/services/adapters/iamAdapter.test.ts` Add `node:test` coverage for multi-role mapping, custom roles (`Auditor` is not `UNASSIGNED`), primary-role selection and preservation of role IDs. (REQ-U-001, REQ-U-006, REQ-O-001, REQ-O-002)
- [x] T007 `src/services/settingsService.ts` Fix `createErpUser` to send `roleIds: [selectedRoleId]` and remove the `roles[0]` fallback; add `assignUserRole`, `revokeUserRole` and `updateUserRoles` using the new GraphQL documents, validating every ID against `assignableRoles` and aborting on unknown IDs with a visible error. (REQ-U-003, REQ-U-004, REQ-E-002, REQ-E-003, REQ-E-006, REQ-N-001, REQ-N-005)
- [x] T008 `src/services/settingsService.ts` Split the update path into `updateErpUserProfile`, `updateErpUserStatus` and the orchestrating `updateErpUser`; profile/status-only saves must not send role mutations; throw typed `ErpUserPartialUpdateError` and `ErpUserRefreshError` carrying completed stages; refetch the affected user after role changes. (REQ-U-002, REQ-U-007, REQ-E-001, REQ-E-004, REQ-E-008, REQ-N-002, REQ-N-005)
- [x] T009 `src/views/settings/components/UserCreateEditDrawer.tsx` Replace the single-select role with a multi-role editor for edit (all assigned roles prefilled by ID, add/remove); keep a single explicit initial role for create; render custom roles by name; validate against assignable roles; show loading/error state instead of an empty selector; render an explicit "no role" state. (REQ-U-005, REQ-U-006, REQ-E-005, REQ-E-006, REQ-S-002, REQ-S-003, REQ-N-001, REQ-O-001)
- [x] T010 `src/views/settings/components/UserCreateEditDrawer.tsx` Add guard and feedback states: disable submit/role controls while saving, self-edit warning with confirmation, zero-role destructive confirmation listing lost roles, and rendering of partial-update/refresh errors without closing the drawer. (REQ-S-001, REQ-S-004, REQ-E-008, REQ-N-002, REQ-N-003)
- [x] T011 `src/views/settings/tabs/UsersManagementTab.tsx` Render every role chip per user and search across all role names; accept `currentUserId` and `canAssignRoles`; compute the last-administrator/self-degradation guard from the loaded directory; send `roleIds` through `onUpdateUser`; hide or disable role editing without `iam:user:assign-roles` while keeping the read-only list. (REQ-U-005, REQ-E-007, REQ-N-004, REQ-O-002, REQ-O-003)
- [x] T012 `src/views/settings/SettingsMainView.tsx` Update the create/update handler contracts to `roleIds`; pass `currentUserId` and `hasPermission('iam:user:assign-roles')` from `AuthContext`; map partial-update and refresh errors to distinct toasts; keep the drawer open on failure; refresh the user list after successful writes. (REQ-U-002, REQ-U-007, REQ-E-001, REQ-E-004, REQ-E-008, REQ-N-002, REQ-O-003)

## Dependencies

- T001 and T002 are independent and can run in parallel.
- T003 depends on T001.
- T004 depends on T003 and can run in parallel with T006.
- T005 depends on T001 and T003.
- T006 depends on T005 and can run in parallel with T004.
- T007 depends on T001, T002, T003 and T005.
- T008 depends on T007.
- T009 depends on T001, T003 and T005.
- T010 depends on T009.
- T011 depends on T001, T003, T005 and T010.
- T012 depends on T008 and T011.
- Final verification depends on all tasks.

## Final verification

- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build` (Next.js type-checks the modified components and services).
- [ ] Run `npx tsx --test src/utils/roleSet.test.ts src/services/adapters/iamAdapter.test.ts`.
- [ ] Verify AC-001: editing only name/phone calls `updateTenantUser` and no role mutation; both roles remain.
- [ ] Verify AC-002: adding a role calls `assignRoleToUser` once with the exact role ID and keeps existing roles.
- [ ] Verify AC-003: removing a role calls `revokeRoleFromUser` once with the exact role ID and keeps the others.
- [ ] Verify AC-004: a custom role `Auditor` renders by name and persists its exact ID.
- [ ] Verify AC-005: the edit drawer prefills all assigned roles by ID with no substring inference.
- [ ] Verify AC-006: the last administrator cannot remove their own administrator role; no mutation is sent.
- [ ] Verify AC-007: an invalid/stale role ID shows a validation error and performs no silent change or fallback.
- [ ] Verify AC-008: a profile success followed by a role failure reports a partial failure and keeps the drawer open with the previous role set.
- [ ] Confirm `createErpUser` sends `roleIds` (not `initialRoleId`) and the `roles[0]` fallback is gone.
- [ ] Confirm no backend, `schema.gql` or contract changes, no new dependencies, and no `localStorage` writes of RBAC data.
- [ ] Confirm no scope drift: role CRUD, invitation semantics, password flows and POS are untouched.
