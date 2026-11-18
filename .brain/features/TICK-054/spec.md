# EARS Specification: FE-RBAC: Editar un usuario desde Ajustes reemplaza todo su set de roles con uno solo

- **Source Ticket**: .agents/tickets/backlog/TICK-054-forge-front-fe-rbac-editar-un-usuario-desde-ajustes-reemplaz.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-18
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

The user administration surface in `forge-front` models a user's authorization as a single scalar
role, while the provider stores a set of role assignments per user. The edit flow therefore replaces
the complete set with one role whenever an administrator saves any change.

Verified current behavior:

- `src/services/settingsService.ts:429-451` (`updateErpUser`) always calls `updateTenantUser` and then
  conditionally calls `SET_TENANT_USER_ROLES_MUTATION` with `roleIds: [role.id]`, where `role` is
  resolved from the single form value. Any role not matched by the name heuristic is silently skipped
  (`:437-439`).
- `src/services/settingsService.ts:401-405` (`createErpUser`) falls back to `roles[0]` when the selected
  role is not matched, assigning an arbitrary role on creation.
- `src/utils`-level role normalization is heuristic: `normalizeRole` in
  `src/services/settingsService.ts:74-84` maps names by substring (`ADMIN`, `VENT`, `COMPR`, `ALMAC`,
  `CAJ`/`POS`), and `mapGqlRoleToSystemRole` in `src/services/adapters/iamAdapter.ts:56-68` maps only a
  fixed list, returning `UNASSIGNED` for custom roles.
- `src/services/adapters/iamAdapter.ts:70-90` (`mapGqlUserToErpUser`) collapses `gql.roles` to the first
  role only and stores it as `rol`, `roleId` and `roleName` on `ErpUser`
  (`src/types/settingsTypes.ts:89-101`).
- `src/views/settings/components/UserCreateEditDrawer.tsx:34-40,52,221-237` exposes a single-select
  "Rol en el ERP" field; `:61-76` maps assignable roles to `SystemRole` values using
  `name.toUpperCase().replace(/\s+/g, '_')` cast to `SystemRole`.
- `src/views/settings/components/UserCreateEditDrawer.tsx:102-140` submits one `rol` value, which
  `UsersManagementTab` (`src/views/settings/tabs/UsersManagementTab.tsx:88-108`) forwards to
  `onUpdateUser`.
- `src/views/settings/tabs/UsersManagementTab.tsx:193-237` renders a single role chip per user and has
  no control to add or remove individual roles.
- `src/views/settings/SettingsMainView.tsx:172-198` performs the update and reports success even when
  the role portion was skipped, because the role failure path does not exist.

Provider capabilities already available to the client (no contract change required):

- `tenantUsers` returns each user with `roles { id roleId role { id name description isSystem } }`
  (queried by `GET_TENANT_USERS_QUERY` in `src/graphql/iam.gql.ts:3-26`).
- `assignRoleToUser(userId, roleId)` is an idempotent additive mutation and `revokeRoleFromUser(userId,
  roleId)` removes one assignment, both guarded by `iam:user:assign-roles`
  (`sidecars/forge-backend/src/modules/iam/resolvers/user-role.resolver.ts:27-59`).
- `setTenantUserRoles` is an atomic full replacement
  (`sidecars/forge-backend/src/modules/iam/services/user-role.service.ts:179-184`) and must not be used
  for non-role edits or for partial form state.

Result: editing a user's name, phone or status can silently reduce an owner/admin to a single role,
removing permissions such as `iam:user:read`. The problem is amplified for multi-role users and custom
roles, which the current single-role model cannot represent.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The frontend SHALL represent each user's authorization as a set of zero or more role
  assignments, using the exact role identifiers returned by `tenantUsers.roles[].role.id` and
  `assignableRoles[].id`.
- **REQ-U-002** The frontend SHALL keep profile/status updates and role changes as independent
  operations: saving `name`, `phone` or `status` SHALL NOT send any role mutation.
- **REQ-U-003** The frontend SHALL perform role changes with the additive mutations
  `assignRoleToUser` and `revokeRoleFromUser`, or, when a full replacement is explicitly required,
  SHALL send the complete persisted role set through `setTenantUserRoles` rather than a set inferred
  from a single form field.
- **REQ-U-004** The frontend SHALL use role IDs as the only write key for role assignments; role names
  SHALL NOT be used to infer, match or persist role changes.
- **REQ-U-005** The frontend SHALL display every role assigned to a user in the administration surface
  and SHALL let an authorized administrator add or remove individual roles.
- **REQ-U-006** The frontend SHALL derive display labels for known roles from the role data returned by
  the provider and SHALL display custom roles with their real `name`, without collapsing them to
  `UNASSIGNED`.
- **REQ-U-007** The frontend SHALL preserve the existing separation between the profile update result
  and the status result, and SHALL report a partial failure when one of several sequential operations
  fails.

### Event-driven (When)

- **REQ-E-001** WHEN an administrator saves changes that do not modify the role set, the frontend SHALL
  call only `updateTenantUser` and, when the status changed, the corresponding activate/deactivate
  mutation.
- **REQ-E-002** WHEN an administrator adds a role to a user, the frontend SHALL call
  `assignRoleToUser` with the target `userId` and the exact selected `roleId`, and SHALL keep every
  previously assigned role.
- **REQ-E-003** WHEN an administrator removes a role from a user, the frontend SHALL call
  `revokeRoleFromUser` with the target `userId` and the exact selected `roleId`, and SHALL keep every
  other assigned role.
- **REQ-E-004** WHEN the role set of a user changes, the frontend SHALL refresh the affected user (from
  the mutation payload or a `tenantUsers` refetch) and SHALL render the resulting role set.
- **REQ-E-005** WHEN an administrator opens the edit drawer for an existing user, the frontend SHALL
  prefill every assigned role with its exact ID and SHALL distinguish assigned roles from assignable
  roles that are not assigned.
- **REQ-E-006** WHEN an administrator creates a user, the frontend SHALL send the explicitly selected
  role ID as the initial role and SHALL NOT substitute it with `roles[0]`.
- **REQ-E-007** WHEN an administrator attempts to remove the last administrator role from the last
  active administrator, including the current session user, the frontend SHALL block the action and
  SHALL show an actionable error before any mutation is sent.
- **REQ-E-008** WHEN a role mutation succeeds but the subsequent refresh fails, the frontend SHALL
  report the successful write together with a visible refresh error, and SHALL offer a retry.

### State-driven (While)

- **REQ-S-001** WHILE a user save is in progress, the frontend SHALL disable the submit control and the
  role controls for that user to prevent duplicate role writes.
- **REQ-S-002** WHILE the assignable roles are loading or unavailable, the frontend SHALL prevent role
  submission and SHALL show a loading or error state instead of an empty role selector.
- **REQ-S-003** WHILE a user has no role assignments, the frontend SHALL render an explicit
  "no role" state and SHALL NOT infer a role from the user's name, email or position.
- **REQ-S-004** WHILE the current session user is the target of the edit, the frontend SHALL display a
  self-edit warning and SHALL require explicit confirmation before removing any of their own roles.

### Unwanted (If / Then)

- **REQ-N-001** IF a selected role is not present in the tenant's assignable roles, THEN the frontend
  SHALL show a visible validation error and SHALL abort the save, without silently omitting the role
  change and without selecting a fallback role.
- **REQ-N-002** IF a profile update succeeds but a subsequent role or status operation fails, THEN the
  frontend SHALL report the partial failure, keep the drawer open, and SHALL NOT report that the user
  was fully updated.
- **REQ-N-003** IF an edit would leave a user with zero roles, THEN the frontend SHALL require an
  explicit destructive confirmation and SHALL display which permissions the user will lose.
- **REQ-N-004** IF the current session user is the only administrator and the edit would remove their
  administrator role, THEN the frontend SHALL reject the operation and SHALL keep the previous role
  set.
- **REQ-N-005** IF the provider rejects a role mutation with `FORBIDDEN`, `NOT_FOUND` or a validation
  error, THEN the frontend SHALL surface the provider error and SHALL leave the displayed role set
  unchanged.

### Optional (Where)

- **REQ-O-001** WHERE the tenant defines custom roles, the frontend SHALL list them by name and SHALL
  manage them through their IDs exactly like system roles.
- **REQ-O-002** WHERE a user has more than one role, the frontend SHALL render all role chips in the
  user table and SHALL expose a deterministic primary role for filtering and search.
- **REQ-O-003** WHERE the session user lacks `iam:user:assign-roles`, the frontend SHALL hide or
  disable the role management controls while keeping the read-only role list visible.

## Acceptance criteria

- **AC-001** GIVEN a user with roles `ADMIN` and `VENTAS`, WHEN an administrator changes only the
  user's phone and saves, THEN `updateTenantUser` is called, no role mutation is sent, and both roles
  remain assigned.
- **AC-002** GIVEN a user with role `VENTAS`, WHEN an administrator adds `ALMACEN` and saves, THEN
  `assignRoleToUser` is called once with the `ALMACEN` role ID and the user ends with both roles.
- **AC-003** GIVEN a user with roles `ADMIN` and `VENTAS`, WHEN an administrator removes `VENTAS`,
  THEN `revokeRoleFromUser` is called with the `VENTAS` role ID and the `ADMIN` role remains.
- **AC-004** GIVEN a tenant with a custom role `Auditor`, WHEN an administrator assigns it to a user,
  THEN the UI displays "Auditor" and persists its exact role ID; the role is not mapped to `UNASSIGNED`.
- **AC-005** GIVEN the edit drawer for a multi-role user, WHEN it opens, THEN all assigned roles are
  preselected with their exact IDs and no role is inferred from a name substring.
- **AC-006** GIVEN the current session user is the last administrator, WHEN they attempt to remove
  their administrator role, THEN the action is blocked with a visible error and no mutation is sent.
- **AC-007** GIVEN an invalid or stale role ID, WHEN the administrator saves, THEN the UI shows a
  validation error and does not perform any silent role change or fallback assignment.
- **AC-008** GIVEN a profile update that succeeds and a role mutation that fails, WHEN the save
  finishes, THEN the UI reports a partial failure and the drawer remains open with the previous role
  set displayed.

## Out of scope

- Hardening the provider's destructive replacement semantics, optimistic concurrency and audit source
  (tracked by TICK-055).
- Role creation, editing or deletion, and the role-permission editor.
- Changes to invitation, password reset, activation or deletion flows.
- Changes to the provider GraphQL contract: this specification consumes the existing
  `assignRoleToUser`, `revokeRoleFromUser`, `setTenantUserRoles`, `updateTenantUser`,
  `activateTenantUser` and `deactivateTenantUser` operations.
- The POS client and any non-administrative consumer of the IAM contract.
- Migration of legacy users whose stored assignments are already inconsistent.

## Assumptions

- The backend operations `assignRoleToUser` and `revokeRoleFromUser` are available to the frontend and
  require `iam:user:assign-roles`; verified in
  `sidecars/forge-backend/src/modules/iam/resolvers/user-role.resolver.ts`.
- `tenantUsers` returns the complete assigned role set for each user; verified by
  `GET_TENANT_USERS_QUERY` in `src/graphql/iam.gql.ts`.
- The settings user-administration surface is restricted to `ADMIN`/`OWNER` sessions, as enforced by
  `SettingsMainView.tsx:228-248`.
- The user list requested by `getErpUsers` is limited to `take: 100` (`settingsService.ts:391-398`);
  "last administrator" detection operates on the loaded directory and is complemented by the provider
  policy.
- `contract.md` does not exist for this feature because the ticket targets a single sidecar.

## Open questions

- Should removing the last role from a non-administrator user be blocked or allowed with explicit
  confirmation? REQ-N-003 currently requires confirmation; product may prefer a hard block.
- Should role changes be saved immediately when a chip is added or removed, or only when the drawer is
  submitted? This specification allows either as long as REQ-U-002 and the acceptance criteria hold.
- Should the owner/admin role be rendered as read-only for non-owner administrators, or editable with a
  confirmation? REQ-E-007 blocks only the last-administrator case.
