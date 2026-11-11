# Tasks: FE-IAM: Integración de Gestión de Roles, Permisos y Asignaciones con Backend GraphQL

- **Ticket**: legacy TICK-007-fe-iam-roles-permissions (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-007/plan.md`
- **Date**: 2026-11-10

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/iam.gql.ts` Create IAM GraphQL document declaring queries (`GET_TENANT_USERS_QUERY`, `GET_TENANT_USER_QUERY`, `GET_ASSIGNABLE_ROLES_QUERY`, `GET_ROLES_QUERY`, `GET_PERMISSIONS_QUERY`, `GET_MY_PERMISSIONS_QUERY`) and mutations (`INVITE_TENANT_USER_MUTATION`, `UPDATE_TENANT_USER_MUTATION`, `SET_TENANT_USER_ROLES_MUTATION`, `ACTIVATE_TENANT_USER_MUTATION`, `DEACTIVATE_TENANT_USER_MUTATION`, `CREATE_ROLE_MUTATION`, `UPDATE_ROLE_MUTATION`, `DELETE_ROLE_MUTATION`, `SET_ROLE_PERMISSIONS_MUTATION`). (REQ-U-001, REQ-O-001)
- [x] T002 `src/services/adapters/iamAdapter.ts` Create IAM adapter implementing user entity transformation (`mapGqlUserToErpUser`), status normalization (`mapUserStatusToFrontend`), dynamic role discovery mapping, and UUIDv4 idempotency key generator. (REQ-U-002, REQ-U-003)
- [x] T003 `src/services/settingsService.ts` Refactor `getErpUsers`, `getAssignableRoles`, `createErpUser`, `updateErpUser`, and `toggleUserStatus` to invoke live GraphQL operations and handle last-admin protection errors. (REQ-E-001, REQ-E-002, REQ-E-003, REQ-E-005, REQ-N-001, REQ-N-002)
- [x] T004 [P] `src/contexts/AuthContext.tsx` Integrate `myPermissions` query during session initialization and expose permissions list in the authentication context for view and action gating. (REQ-U-004, REQ-S-002)
- [x] T005 `src/views/settings/tabs/UsersManagementTab.tsx` Update users management tab and drawer to load dynamic tenant roles, handle submission loading states, display server error alerts non-destructively, and reflect status changes. (REQ-E-004, REQ-S-001, REQ-N-001, REQ-N-003)
- [x] T006 `forge-front` Run quality gates: TypeScript strict compilation (`tsc --noEmit`), ESLint validation, and Next.js production build (`next build`). (AC-001, AC-002, AC-003, AC-004)

## Dependencies

- T002 depends on T001.
- T003 depends on T001, T002.
- T004 depends on T001.
- T005 depends on T002, T003, T004.
- T006 depends on T005.

## Final verification

- [x] Run repository tests and static analysis (`tsc --noEmit`, `eslint`, `next build`).
- [x] Verify spec acceptance criteria (AC-001 to AC-004).
- [x] Confirm there is no scope drift.
