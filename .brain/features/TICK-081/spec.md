# EARS Specification: FE-RBAC: gestión de roles por tenant y matriz de permisos agrupada por módulo

- **Ticket**: .agents/tickets/backlog/TICK-081-forge-front-fe-rbac-gestion-roles-por-tenant-matriz-permisos.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-26
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

`forge-backend` already exposes the full roles/permissions surface, but `forge-front` only consumes
the user↔role assignment paths. The roles CRUD and permission matrix are missing.

Verified evidence:

- Backend API: `sidecars/forge-backend/src/modules/iam/resolvers/roles.resolver.ts` exposes queries
  `roles`, `role`, `assignableRoles`, `permissions` and mutations `createRole`, `updateRole`,
  `deleteRole`, `setRolePermissions`. `RolesService` performs transactional full-set replacement,
  soft-delete, `isSystem` protection, `confirmReplace` and `expectedUpdatedAt` (TICK-055).
- Permissions are action-level: `Permission.action` (`module:entity:verb`) plus `Permission.module`
  (`prisma/schema.prisma`). A role is a set of actions through `RolePermission`.
- Catalog (`sidecars/forge-backend/src/shared/rbac/permission-catalog.ts`): IAM=16, CONTACTS=10,
  ACCOUNTING=32, INVENTORY=21, PURCHASES=15, POS=9 → **103 actions**. `Sales` and `CashRegister` have
  no permission catalog (entitlement-only).
- `sidecars/forge-backend/src/modules/iam/services/roles.service.ts` clamps `take` to `MAX_PER_PAGE =
  100`; the catalog (103) exceeds that, so the front must paginate.
- `forge-front` operations already exist in `src/graphql/iam.gql.ts` (`GET_ROLES_QUERY`,
  `GET_PERMISSIONS_QUERY`, `CREATE_ROLE_MUTATION`, `UPDATE_ROLE_MUTATION`, `DELETE_ROLE_MUTATION`,
  `SET_ROLE_PERMISSIONS_MUTATION`) but `src/services/settingsService.ts` does not use them.
- `src/views/settings/SettingsMainView.tsx` has four tabs (Company, BCV, Users, Fiscal); no Roles tab.
- `src/types/settingsTypes.ts` defines `ErpRole` without permissions and a hardcoded `SystemRole`;
  `src/utils/roleSet.ts` / `src/services/adapters/iamAdapter.ts` map roles by name for display.
- `src/contexts/AuthContext.tsx` exposes `permissions`, `activeModules`, `hasPermission` and
  `hasModule`.

Product decision: **Option A** — there is no `RoleModule` model. Assigning a module to a role means
selecting that module's permission actions (grouped by `Permission.module`). No backend, schema or
GraphQL contract change is required.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The system SHALL provide a tenant-scoped Roles management surface in Settings that
  lists, creates, edits and deletes roles by consuming the existing IAM GraphQL operations, and SHALL
  never send `tenantId` in any request.
- **REQ-U-002** The system SHALL model "module assignment" (Option A) as the set of selected permission
  actions grouped by `Permission.module`, and SHALL NOT introduce a role↔module entity or backend
  change.
- **REQ-U-003** The system SHALL extend the role types so a role carries its permissions
  (`ErpPermission { id, action, module, description }`) and SHALL use provider `role.id` for every
  write, never role names.
- **REQ-U-004** The system SHALL expose the typed service methods `getRoles()`, `getPermissions()`,
  `createRole(input)`, `updateRole(input)`, `deleteRole(id)` and
  `setRolePermissions({ id, permissionIds, confirmReplace?, expectedUpdatedAt? })` in
  `src/services/settingsService.ts`, reusing the operations in `src/graphql/iam.gql.ts`.
- **REQ-U-005** The system SHALL paginate the `roles` and `permissions` queries with `take`/`skip`
  blocks of at most 100 items until all results are fetched, so the full catalog (103 actions today)
  is loaded.
- **REQ-U-006** The system SHALL gate the Roles surface by IAM permissions through
  `AuthContext.hasPermission`: viewing requires `iam:role:read`; create/update/delete/set-permissions
  require `iam:role:create`, `iam:role:update`, `iam:role:delete` and `iam:role:set-permissions`
  respectively; loading the catalog requires `iam:permission:read`.
- **REQ-U-007** The system SHALL implement this feature without modifying `forge-backend`, its
  `schema.prisma` or the GraphQL contract.
- **REQ-U-008** The system SHALL present each permission with a human-readable action label derived
  from the final segment of `Permission.action` (e.g. `read` → “Leer”, `repair` → “Reparar”) plus its
  description, and SHALL NOT render the raw action code (e.g. `iam:integrity:read`).

### Event-driven (When)

- **REQ-E-001** WHEN an authorized user opens the Roles tab, the system SHALL load the tenant roles and
  the paginated permission catalog and render the role list without requiring a page reload.
- **REQ-E-002** WHEN the user chooses to create a role, the system SHALL open a **full-view editor**
  (not a modal/drawer) inside Settings; on submit it SHALL call `createRole`, apply the selected
  permissions, refresh the role list, and return to it.
- **REQ-E-003** WHEN the user chooses to edit a role, the system SHALL open the same full-view editor;
  on submit it SHALL call `updateRole` (and `setRolePermissions`) and return to the refreshed list.
- **REQ-E-004** WHEN the user saves the permission matrix, the system SHALL send the complete
  `permissionIds` set to `setRolePermissions` together with `expectedUpdatedAt` from the role's
  `updatedAt`, and `confirmReplace: true` when the new set removes previously assigned permissions.
- **REQ-E-005** WHEN the user toggles a module group or an individual permission, the system SHALL
  recompute the selected `permissionIds` for that module, keeping module select-all consistent with
  its actions.
- **REQ-E-006** WHEN the user confirms deletion of a non-system role, the system SHALL call
  `deleteRole` and remove it from the list.
- **REQ-E-007** WHEN a roles or permissions mutation succeeds, the system SHALL refresh the role list
  and, if the changed role is assigned to the current user, refresh `AuthContext` permissions
  (`myPermissions`).

### State-driven (While)

- **REQ-S-001** WHILE a role has `isSystem = true`, the system SHALL disable deleting it and editing its
  name, while still allowing editable fields and its permission matrix as permitted by the backend.
- **REQ-S-002** WHILE the current user lacks a given action permission, the system SHALL hide or disable
  the corresponding control and SHALL NOT issue the blocked request.
- **REQ-S-003** WHILE the permission catalog or the role detail is loading, the system SHALL show a
  loading state and disable saving, so no partial permission set can be submitted.

### Unwanted (If / Then)

- **REQ-N-001** IF `setRolePermissions` returns `BAD_USER_INPUT` (for example a required
  `confirmReplace`, a missing permission, or a downgrade that strips administrative actions), THEN the
  system SHALL surface the backend message and keep the current matrix without silent data loss.
- **REQ-N-002** IF `createRole`/`updateRole` returns `BAD_USER_INPUT` for a duplicate name, THEN the
  system SHALL show an inline validation error and preserve the form values.
- **REQ-N-003** IF the user lacks `iam:role:read`, THEN the system SHALL NOT render or navigate to the
  Roles tab and SHALL NOT issue role queries.
- **REQ-N-004** IF the permission catalog fails to load or loads partially, THEN the system SHALL block
  saving and show an error, never submitting an incomplete `permissionIds` set.
- **REQ-N-005** IF a role mutation fails with a stale `expectedUpdatedAt`, THEN the system SHALL show a
  conflict message and reload the role from the server without overwriting the server state.
- **REQ-N-006** IF `deleteRole` is rejected by the backend (`FORBIDDEN`, e.g. last administrative role),
  THEN the system SHALL keep the role and display the reason.
- **REQ-N-007** IF a request is denied with `FORBIDDEN` because the user lacks an IAM permission, THEN
  the system SHALL show a permission error and not retry automatically.

### Optional (Where)

- **REQ-O-001** WHERE `tenantLicense.activeModules` is available, the system SHALL show each module's
  entitlement status as informational in the matrix without blocking permission selection or saving.
- **REQ-O-002** WHERE a feature module has no catalog permissions (`SALES`, `CASH_REGISTER`), the system
  SHALL omit it from the actionable matrix (or show it as a non-selectable note) and document the gap.
- **REQ-O-003** WHERE the tenant has more than 100 roles, the system SHALL paginate the role list while
  keeping the current selection stable.

## Acceptance criteria

- **AC-001** (REQ-U-001, REQ-U-003, REQ-E-001, REQ-E-002) GIVEN an authorized user in Settings, WHEN
  they open the Roles tab and create a role with a name, THEN it appears in the list and its detail
  opens with zero selected permissions.
- **AC-002** (REQ-U-002, REQ-E-005) GIVEN a role detail, WHEN the user toggles a module select-all,
  THEN every action of that module is selected/deselected and the resulting `permissionIds` reflect it.
- **AC-003** (REQ-E-004, REQ-N-001) GIVEN a role with permissions, WHEN the user saves a reduced set,
  THEN the UI asks for confirmation and sends `confirmReplace: true`; when the set does not shrink it
  saves without the prompt.
- **AC-004** (REQ-S-001, REQ-N-006) GIVEN a system role, WHEN the user opens it, THEN delete and name
  edit are disabled and the backend immutability is never violated.
- **AC-005** (REQ-U-005, REQ-N-004) GIVEN a catalog of 103 actions, WHEN the catalog loads, THEN all
  103 are available in the matrix (pagination), otherwise saving is blocked.
- **AC-006** (REQ-U-006, REQ-N-003) GIVEN a user without `iam:role:read`, THEN the Roles tab is not
  available and no role query is issued; action controls follow their own permissions.
- **AC-007** (REQ-E-007) GIVEN the current user's role was edited, WHEN the save succeeds, THEN their
  `AuthContext` permissions are refreshed without a full page reload.
- **AC-008** (REQ-U-003) GIVEN a custom role, WHEN it is assigned to a user, THEN the existing user↔role
  assignment uses its `role.id` and continues to work regardless of its name.
- **AC-009** (REQ-U-008) GIVEN the permission matrix, THEN each row shows a short human label
  (Leer/Reparar/Crear/…) and its description, and never the raw `module:entity:verb` code.
- **AC-010** (REQ-E-002, REQ-E-003) GIVEN the roles list, WHEN the user creates or edits a role, THEN a
  full-view editor replaces the list (with a “Volver” action), not a modal/drawer.

## Out of scope

- Backend changes, migrations, a `RoleModule` model or GraphQL contract changes.
- A permission catalog for `Sales` and `CashRegister` (separate ticket if granularity is required).
- Permission-based navigation gating (menu filtering by `hasPermission`).
- Rewriting the existing user↔role assignment flow beyond using `role.id`.
- Platform-admin (cross-tenant) role management.

## Assumptions

- The managing user is typically the tenant owner, who holds `iam:role:*` and `iam:permission:read` by
  seed; other users depend on their assigned permissions.
- `PERMISSION_CATALOG` is the single source for action/module pairs; no runtime mutation beyond the
  seed.
- `roles` and `permissions` are tenant-scoped/protected by guards, so the front never passes `tenantId`.
- `Role.updatedAt` is exposed on the backend GraphQL `Role` type
  (`src/@generated/role/role.model.ts`); `GET_ROLES_QUERY` will be extended to select it for
  `expectedUpdatedAt`.
- `executeGraphQL` already injects the bearer token; no new transport is required.

## Open questions

- Should viewing the permission catalog require `iam:permission:read` in addition to `iam:role:read`,
  or should the matrix reuse the role read permission with a documented exception?
- Should system-role permission matrices be editable by the owner, or displayed read-only to avoid
  degrading the administrative baseline?
