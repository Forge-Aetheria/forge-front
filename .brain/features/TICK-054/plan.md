# Technical Plan: FE-RBAC: Editar un usuario desde Ajustes reemplaza todo su set de roles con uno solo

- **Source Ticket**: .agents/tickets/backlog/TICK-054-forge-front-fe-rbac-editar-un-usuario-desde-ajustes-reemplaz.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-054/spec.md`
- **Date**: 2026-11-18

## Summary

The user-administration surface currently models authorization as one scalar role and rewrites the
complete role set on every save. The strategy is to make the role set a first-class frontend concept,
separate profile/status updates from role updates, and apply role changes through the provider's
additive `assignRoleToUser` / `revokeRoleFromUser` operations. The invite payload will be corrected to
the provider's `roleIds` field, the `roles[0]` fallback will be removed, and the UI will surface
partial failures instead of reporting success after a silent skip.

### Requirement coverage

| Requirement group | Plan elements |
| --- | --- |
| REQ-U-001, REQ-U-004, REQ-U-006 | `ErpRole[]` model, adapter mapping by exact IDs, provider names for custom roles (`src/types/settingsTypes.ts`, `src/services/adapters/iamAdapter.ts`) |
| REQ-U-002, REQ-U-007 | Stage-separated service operations and typed partial-failure errors (`src/services/settingsService.ts`) |
| REQ-U-003 | Additive assign/revoke documents and diff-based role writes (`src/graphql/iam.gql.ts`, `src/services/settingsService.ts`) |
| REQ-U-005 | Multi-role chips and role editor (`UsersManagementTab.tsx`, `UserCreateEditDrawer.tsx`) |
| REQ-E-001, REQ-E-004 | Profile/status saves skip role mutations; refresh after role changes |
| REQ-E-002, REQ-E-003 | Add/remove role through assign/revoke with exact IDs |
| REQ-E-005 | Drawer prefills all assigned role IDs |
| REQ-E-006 | Create sends `roleIds: [selectedRoleId]` with no fallback |
| REQ-E-007, REQ-N-004 | Last-administrator and self-degradation guard (`UsersManagementTab.tsx` + `src/utils/roleSet.ts`) |
| REQ-E-008 | Refresh warning with retry after a successful write |
| REQ-S-001 | In-flight disablement of submit and role controls |
| REQ-S-002 | Assignable-roles loading/error state blocks submission |
| REQ-S-003 | Explicit "no role" rendering, no inference |
| REQ-S-004 | Self-edit warning and confirmation |
| REQ-N-001 | Role-ID validation against `assignableRoles`, visible error, abort |
| REQ-N-002 | Partial-failure reporting and drawer stays open |
| REQ-N-003 | Zero-role destructive confirmation listing lost permissions |
| REQ-N-005 | Provider `FORBIDDEN`/`NOT_FOUND`/validation errors surfaced, server state kept |
| REQ-O-001 | Custom roles listed by name and managed by ID |
| REQ-O-002 | All role chips rendered; deterministic primary role for search/filter |
| REQ-O-003 | Role controls hidden/disabled without `iam:user:assign-roles` |

## Technical context

- **Stack**: Next.js 16.1.1 (App Router, Turbopack), React 19.2.3, TypeScript 5.9.3 with `strict`,
  MUI 7.3.6, Tailwind CSS 4.1.17, custom native GraphQL client in `src/libs/graphqlClient.ts`.
- **Dependencies**: no new packages. MUI `Autocomplete`, `Select`, `Chip`, `Avatar`, `Alert` and
  `CircularProgress` are already used or available. GraphQL documents are hand-written strings in
  `src/graphql/iam.gql.ts`; there is no codegen in this repository.
- **Persistence**: none in the frontend. All reads/writes go through `forge-backend` GraphQL for the
  current tenant from the JWT. Local React state (`SettingsMainView`, `UsersManagementTab`) is
  refreshed from `tenantUsers` after writes.
- **Testing**: `forge-front` has no `test` script and no Jest/Vitest dependency. Existing unit tests
  (`src/utils/rif.test.ts`, `src/utils/onboardingErrors.test.ts`) use `node:test` +
  `node:assert/strict`; `tsx` 4.20.6 is available for running them. Quality gates are
  `npx tsc --noEmit`, `npm run lint` and `npm run build`.
- **Constraints**:
  - The provider contract is fixed for this ticket: `assignRoleToUser(roleId: ID!, userId: ID!)`,
    `revokeRoleFromUser(roleId: ID!, userId: ID!)`, `inviteTenantUser(input)` with `roleIds`, and
    `setTenantUserRoles` as atomic replacement with an `idempotencyKey`.
  - `assignRoleToUser` and `revokeRoleFromUser` require `iam:user:assign-roles`; the session already
    exposes `hasPermission` through `AuthContext`.
  - `tenantUsers` is requested with `take: 100`; last-administrator detection is best-effort on the
    loaded directory.
  - The settings page is already restricted to `ADMIN`/`OWNER` sessions in
    `SettingsMainView.tsx:228-248`.
  - Email is immutable after invitation; the drawer keeps the email field disabled on edit.

## Architecture decisions

- **ADR-001**: Make the role set first-class in the frontend (`ErpUser.roles: ErpRole[]`) and derive a
  deterministic primary role only for display, search and legacy `SystemRole` coloring.
  *Rejected:* keep the scalar `rol` and add a hidden `roleIds` field, because it keeps two sources of
  truth and remains lossy for multi-role and custom-role users.
- **ADR-002**: Apply role changes with additive `assignRoleToUser` / `revokeRoleFromUser`, computing a
  diff from the persisted role IDs.
  *Rejected:* send the complete set through `setTenantUserRoles`, because it is a full replacement that
  can still destroy concurrent changes and requires an idempotency key for every save.
- **ADR-003**: Split user updates into explicit stages (profile → status → roles → refresh) and throw a
  typed partial error when a later stage fails.
  *Rejected:* keep one sequential `updateErpUser` that ignores role failures, because it reports
  success after a silent privilege change and cannot satisfy REQ-U-007/REQ-N-002.
- **ADR-004**: Correct the invite payload to `roleIds: [selectedRoleId]` and remove the `roles[0]`
  fallback.
  *Rejected:* keep `initialRoleId`, because it is not part of `InviteTenantUserInput` in
  `schema.gql` (`email`, `idempotencyKey`, `name`, `phone`, `roleIds`), so the current create mutation
  is rejected by the provider; and keep the fallback, because it grants an arbitrary privilege.
- **ADR-005**: Implement last-administrator and self-degradation guards in the UI as best-effort, while
  relying on the provider policy (and TICK-055) as the authority.
  *Rejected:* rely only on the backend, which gives no actionable UX, or only on the UI, which can be
  bypassed.
- **ADR-006**: Render custom roles with their provider `name` and `isSystem` flag; use an explicit
  `isAdministratorRole` matcher only for the protection guards.
  *Rejected:* extend the `SystemRole` union with every custom role name, which is unbounded and would
  re-couple writes to name heuristics.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Data | `src/types/settingsTypes.ts` | Add `ErpRole { id, name, description?, isSystem }`; replace write-oriented `rol`/`roleId` on user inputs with `roleIds: string[]`; keep a read-only `primaryRole`/display field if needed; update `CreateUserInput` to carry the selected initial role ID. |
| Data | `src/services/adapters/iamAdapter.ts` | Map every `gql.roles[]` entry to `ErpRole` preserving exact IDs; add `isAdministratorRole` and a deterministic primary-role selection; keep `mapGqlRoleToSystemRole` only for legacy colors, never for writes. |
| Domain or service | `src/services/settingsService.ts` | Add `assignUserRole`, `revokeUserRole`, `updateUserRoles` (diff current vs next IDs), `updateErpUserProfile`, `updateErpUserStatus` and an orchestrating `updateErpUser`. Validate role IDs against `assignableRoles`, abort on unknown IDs, and throw typed `ErpUserPartialUpdateError` / `ErpUserRefreshError` with the completed stages. Fix `createErpUser` to send `roleIds` and drop `roles[0]`. |
| Contract or API | `src/graphql/iam.gql.ts` | Add `ASSIGN_ROLE_TO_USER_MUTATION` and `REVOKE_ROLE_FROM_USER_MUTATION` with the exact provider arguments; keep `INVITE_TENANT_USER_MUTATION` and switch its variables to `roleIds`; retain `SET_TENANT_USER_ROLES_MUTATION` only if an explicit replacement path remains. |
| Client or UI | `src/views/settings/components/UserCreateEditDrawer.tsx` | Replace the single-select role with a multi-role editor for edit (assigned roles prefilled, add/remove by ID) and a single explicit initial role for create; show custom role names; validate against assignable roles; disable controls while saving/loading; render self-edit and zero-role warnings; surface partial errors. |
| Client or UI | `src/views/settings/tabs/UsersManagementTab.tsx` | Render all role chips, search across all roles, compute the last-administrator guard, and accept `currentUserId` + `canAssignRoles` to hide or disable role editing. |
| Client or UI | `src/views/settings/SettingsMainView.tsx` | Update handler contracts to pass `roleIds`; pass `currentUserId` and `hasPermission('iam:user:assign-roles')` from `AuthContext`; map partial and refresh errors to distinct toasts; keep the drawer open on failure. |
| Client or UI | `src/contexts/AuthContext.tsx` | No behavioral change; consume the existing `hasPermission` and `user.id` for the new props. |
| Tests | `src/utils/roleSet.test.ts` (new), `src/services/adapters/iamAdapter.test.ts` (new) | Cover role diff, administrator detection, custom-role mapping, primary-role selection and invalid-ID handling with `node:test` + `node:assert/strict`. |

## Cross-sidecar integration

This feature only consumes the existing `forge-backend` IAM contract; it exposes nothing to other
sidecars. `.brain/features/TICK-054/contract.md` does not exist because the ticket targets a single
sidecar.

| Operation | Permission | Use in this plan |
| --- | --- | --- |
| `tenantUsers` | `iam:user:read` | Read all assigned roles per user. |
| `updateTenantUser` | `iam:user:update` | Name and phone only. |
| `assignRoleToUser` | `iam:user:assign-roles` | Add one role. |
| `revokeRoleFromUser` | `iam:user:assign-roles` | Remove one role. |
| `inviteTenantUser` | IAM create permission | Create with `roleIds`. |
| `activateTenantUser` / `deactivateTenantUser` | `iam:user:change-status` | Status changes. |
| `setTenantUserRoles` | `iam:user:assign-roles` | Not used for normal edits; only an explicit replacement if product requires it. |

TICK-055 hardens the provider's destructive replacement semantics and audit; this plan must not depend
on that ticket and must keep working with the current contract.

## Testing strategy

- **Unit**: New pure helpers in `src/utils/roleSet.ts` (`diffRoleIds`, `isAdministratorRole`,
  `selectPrimaryRole`, `validateRoleIds`) and adapter mapping in
  `src/services/adapters/iamAdapter.ts`. Run with
  `npx tsx --test src/utils/roleSet.test.ts src/services/adapters/iamAdapter.test.ts`, following the
  existing `node:test` pattern. No new test runner or dependency.
- **Integration**: With `forge-backend` running and an `ADMIN` session, use a fixture user with two
  roles: save a phone-only edit, add a role, remove a role, assign a custom role, submit a stale role
  ID, and simulate a provider failure after the profile stage. Verify the mutation sequence at the
  network level: no `setTenantUserRoles` on profile-only saves; one assign/revoke per changed role.
- **Manual or E2E**: Open `/settings` → Users, verify multi-role chips, search by secondary role,
  self-edit warning, last-administrator block, zero-role confirmation, partial-failure toast and
  refresh warning. Confirm a custom role named "Auditor" renders as "Auditor", not "UNASSIGNED".
- **Quality gates**: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Concurrent role changes between read and write | Diff-based writes could remove a role added by another administrator | Re-read the target user immediately before computing the diff; assign/revoke are idempotent and only touch the changed IDs |
| Partial update reported as success | Administrators believe privileges were changed when they were not | Typed stage errors, distinct toasts, drawer stays open, no success message until all stages and refresh complete |
| Last-administrator detection is incomplete | UI may allow a self-degradation that the backend also allows today | Compute from the loaded directory and block obvious cases; treat TICK-055 as the authoritative guard and document the limitation |
| Custom role name misclassified as administrator | A non-admin custom role could be treated as protected admin | `isAdministratorRole` matches only the known owner/admin names (`ADMIN`, `ADMINISTRADOR`, `OWNER`, `admin`); all other roles are custom and unprotected |
| Invite payload mismatch persists | User creation keeps failing with an unknown-field error | Fix to `roleIds` in the same change and cover it with an adapter/service unit test |
| `take: 100` hides additional users/roles | Last-admin or duplicate-role detection may miss users outside the page | Documented limitation; backend policy remains authoritative; pagination is out of scope |
| No test runner script | New tests may not run in CI | Use the existing `node:test` + `tsx` pattern and list the explicit command in the PR; do not add a new runner in this ticket |
| Missing `iam:user:assign-roles` permission | Role controls fail or disappear silently | Use `hasPermission` to hide/disable role management and keep the read-only role list visible |
| Zero-role write is allowed by the provider today | A user could lose all access | Require explicit destructive confirmation with the lost-permission summary; backend hardening remains TICK-055 |
