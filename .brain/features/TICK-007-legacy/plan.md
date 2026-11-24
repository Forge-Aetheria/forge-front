# Technical Plan: FE-IAM: Integración de Gestión de Roles, Permisos y Asignaciones con Backend GraphQL

- **Ticket**: legacy TICK-007-fe-iam-roles-permissions (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-007/spec.md`
- **Date**: 2026-11-10

## Summary

This feature transitions tenant user administration, role assignment, and permission management from browser `localStorage` mock simulation to live GraphQL operations against `forge-backend` (`src/modules/iam` / BE-IAM-02). The technical strategy connects `UsersManagementTab.tsx`, `UserCreateEditDrawer.tsx`, and `settingsService.ts` with backend operations (`tenantUsers`, `assignableRoles`, `inviteTenantUser`, `updateTenantUser`, `setTenantUserRoles`, `activateTenantUser`, `deactivateTenantUser`, and `myPermissions`), establishes dynamic role discovery, guarantees assignment integrity with UUIDv4 idempotency keys, and protects against administrative lockout by surfacing last-admin validation errors non-destructively.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient`, `crypto.randomUUID` for UUIDv4 idempotency generation, `@/graphql/auth.gql`.
- **Persistence**: Centralized PostgreSQL database managed by `forge-backend` through Prisma 7 (User, Role, Permission, UserRole, TenantSettings).
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript validation).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - Multi-tenant isolation: `tenantId` is never accepted from inputs; it is resolved server-side from JWT claims.
  - Role assignment is atomic: `setTenantUserRoles` replaces the complete role set in a single database transaction and invalidates user permissions cache.
  - Last administrator protection: Mutations rejecting demotion or deactivation of the last active admin must be surfaced to the UI without crashing.
  - Zero dead code / no backup files (Rule R1).

## Architecture decisions

- **ADR-001: Dedicated IAM Adapter Layer (`iamAdapter.ts`)**
  - **Decision:** Create `src/services/adapters/iamAdapter.ts` to transform backend `User` models (with nested `user.roles[].role`) into the frontend `ErpUser` interface and map dynamic roles cleanly.
  - **Rationale:** Decouples UI table rendering from raw database relational structures and centralizes status normalization.
  - **Rejected alternative:** Exposing raw GraphQL types directly across UI drawer components.

- **ADR-002: Dynamic Role Discovery via `assignableRoles`**
  - **Decision:** Populate role selectors and badge color resolvers dynamically from the `assignableRoles` query, providing a fallback map for standard system roles (`ADMIN`, `VENTAS`, `COMPRAS`, `ALMACEN`, `CAJERO_POS`).
  - **Rationale:** Enables custom tenant roles and permissions without requiring frontend code deployments or modifying TypeScript enums.
  - **Rejected alternative:** Maintaining a static hardcoded array of 5 fixed system roles.

- **ADR-003: Non-Destructive Last-Administrator Error Surfacing**
  - **Decision:** When the backend rejects a role change or user deactivation with a last-admin protection error, catch the exception in `settingsService.ts` and display a specific warning alert in `UserCreateEditDrawer.tsx` without wiping form fields.
  - **Rationale:** Prevents tenant lockout while giving the administrator immediate, actionable guidance.
  - **Rejected alternative:** Silently ignoring the rejection or resetting the user list.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/iam.gql.ts` | Create file declaring `GET_TENANT_USERS_QUERY`, `GET_ASSIGNABLE_ROLES_QUERY`, `GET_PERMISSIONS_QUERY`, `GET_MY_PERMISSIONS_QUERY`, `INVITE_TENANT_USER_MUTATION`, `UPDATE_TENANT_USER_MUTATION`, `SET_TENANT_USER_ROLES_MUTATION`, `ACTIVATE_TENANT_USER_MUTATION`, and `DEACTIVATE_TENANT_USER_MUTATION`. |
| **Adapter** | `src/services/adapters/iamAdapter.ts` | Create adapter implementing `mapGqlUserToErpUser`, `mapGqlRoleToSystemRole`, and input payload serializers. |
| **Domain / Service** | `src/services/settingsService.ts` | Refactor `getErpUsers`, `createErpUser`, `updateErpUser`, and `toggleUserStatus` to invoke live GraphQL operations, and add `getAssignableRoles`. |
| **Client / UI** | `src/views/settings/tabs/UsersManagementTab.tsx` & `UserCreateEditDrawer.tsx` | Connect role selectors to dynamic backend roles, manage loading indicators, and handle server error alerts. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes the IAM API in `src/modules/iam/resolvers/` (`tenant-user.resolver.ts`, `roles.resolver.ts`, `user-role.resolver.ts`).
- **Consumer**: `sidecars/forge-front` consumes these endpoints via `settingsService.ts` and `iamAdapter.ts`.
- **Contract status**: 100% aligned with BE-IAM-02 in `forge-backend`. No backend changes required.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all modified files.
- **Production Build**: Verify full page compilation with `pnpm exec next build`.
- **Integration Flow**:
  1. Open `/settings` on the Users & Roles tab and verify that live tenant users load.
  2. Open `UserCreateEditDrawer` and confirm that roles are populated dynamically from `assignableRoles`.
  3. Invite a new user with an assigned role and verify successful mutation response.
  4. Modify a user's role and verify immediate badge update.
  5. Attempt to demote the sole active administrator and verify last-admin error message.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Last administrator lockout** | Tenant loses administrative access | Backend rejects with error; frontend surfaces explicit alert preventing the change. |
| **Duplicate email invitation** | Unique constraint error | Backend returns anti-enumeration or existing user notice; frontend reports clear feedback. |
| **Cross-tenant assignment attempt** | Unauthorized role assignment | Server filters role by tenant ID in transaction; frontend only displays current tenant's roles. |
