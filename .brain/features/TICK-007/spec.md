# EARS Specification: FE-IAM: Integración de Gestión de Roles, Permisos y Asignaciones con Backend GraphQL

- **Ticket**: legacy TICK-007-fe-iam-roles-permissions (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-10
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, user and role administration under `/settings` (`UsersManagementTab.tsx`, `UserCreateEditDrawer.tsx`, and `settingsService.ts`) currently simulates user directories, role assignment, and permissions in browser `localStorage`. The application relies on hardcoded role strings (`ADMIN`, `VENTAS`, `COMPRAS`, `ALMACEN`, `CAJERO_POS`), lacking connection to the tenant-scoped RBAC engine.

In `forge-backend`, the IAM core domain (`src/modules/iam`, PR #30 / BE-IAM-02) provides an enterprise Identity and Access Management surface:
- Dynamic, tenant-scoped roles (`Role`) with soft-delete support (`deletedAt = null`) and system role protection (`isSystem`).
- Global catalog of permissions (`Permission`) categorized by functional module.
- Atomic role-to-user assignment (`setTenantUserRoles`) and permission set replacement (`setRolePermissions`).
- Tenant user lifecycle (`tenantUsers`, `inviteTenantUser`, `updateTenantUser`, `activateTenantUser`, `deactivateTenantUser`).
- Integrity constraints: last administrator protection, anti-escalation, and cache invalidation.
- Session authorization: `myPermissions` returning active user capabilities.

Connecting `forge-front` to this API provides real multi-user tenant administration and dynamic role-based access control.

## EARS Requirements

### Ubiquitous

Requirements that always apply, without an activation condition.

- **REQ-U-001** The system SHALL declare all IAM GraphQL queries and mutations in `src/graphql/iam.gql.ts`:
  - Queries: `roles`, `assignableRoles`, `role(id)`, `permissions`, `myPermissions`, `tenantUsers`, `tenantUser(id)`.
  - Mutations: `createRole`, `updateRole`, `deleteRole`, `setRolePermissions`, `inviteTenantUser`, `updateTenantUser`, `setTenantUserRoles`, `activateTenantUser`, `deactivateTenantUser`.
- **REQ-U-002** The system SHALL map backend `UserStatus` enums (`ACTIVE`, `INACTIVE`, `INVITED`, `SUSPENDED`) to frontend status badges.
- **REQ-U-003** The system SHALL dynamically populate role selection drawers and badges from the backend `assignableRoles` query rather than using hardcoded static role enumerations.
- **REQ-U-004** The system SHALL query and store `myPermissions` (`string[]`) in the authentication context for fine-grained action and route gating.

### Event-driven (When)

- **REQ-E-001** WHEN an administrator navigates to the Users & Roles tab (`/settings`), the system SHALL query `tenantUsers`, `roles`, and `permissions` from the GraphQL API and display the live directory.
- **REQ-E-002** WHEN creating or inviting a new tenant user via `UserCreateEditDrawer`, the system SHALL execute `inviteTenantUser` sending the user's name, email, and initial role UUID.
- **REQ-E-003** WHEN updating an existing user's profile or assigned roles, the system SHALL execute `updateTenantUser` and `setTenantUserRoles` with an `idempotencyKey` UUIDv4.
- **REQ-E-004** WHEN an administrator creates or edits a custom role, the system SHALL execute `createRole` or `updateRole`, and configure permissions using `setRolePermissions`.
- **REQ-E-005** WHEN toggling a user's status, the system SHALL execute `activateTenantUser` or `deactivateTenantUser` and update the status indicator reactively.

### State-driven (While)

- **REQ-S-001** WHILE a role mutation or user status change is in transit, the system SHALL disable action buttons and display a progress indicator.
- **REQ-S-002** WHILE rendering administrative views, the system SHALL hide or disable privileged actions if the active user lacks required permissions according to `myPermissions`.

### Unwanted (If / Then)

- **REQ-N-001** IF an action would remove or deactivate the last active tenant administrator, THEN the system SHALL capture the backend error and display an explicit error alert preventing the lockout.
- **REQ-N-002** IF a user attempts self-escalation or assigns permissions exceeding their authority, THEN the system SHALL surface the server authorization rejection message.
- **REQ-N-003** IF a network timeout occurs during user role update, THEN the system SHALL notify the user and keep the drawer state intact for retry.

### Optional (Where)

- **REQ-O-001** WHERE a role has `isSystem: true`, the system SHALL disable deletion and renaming actions in the UI, preserving immutable system defaults.

## Acceptance criteria

- **AC-001** GIVEN the Users tab in `/settings`, WHEN the component loads, THEN the system SHALL query `tenantUsers` and `assignableRoles`, rendering users with their real backend roles and statuses.
- **AC-002** GIVEN the user creation drawer, WHEN submitting a new user invitation with email and assigned role UUID, THEN the system SHALL execute `inviteTenantUser` and show a success notification.
- **AC-003** GIVEN an active user, WHEN changing their assigned role and saving, THEN the system SHALL execute `setTenantUserRoles` with an `idempotencyKey` and update the role badge immediately.
- **AC-004** GIVEN the only active administrator in the tenant, WHEN attempting to demote or deactivate the user, THEN the system SHALL display the last-administrator protection error without modifying the account.

## Out of scope

- Superadmin cross-tenant platform administration (handled in backend backoffice).
- Direct modification of append-only audit event tables.

## Assumptions

- The backend has seeded the global permissions catalog.
- The authenticated user belongs to an active tenant.

## Open questions

- None.
