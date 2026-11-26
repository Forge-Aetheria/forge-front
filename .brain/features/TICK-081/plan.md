# Technical Plan: FE-RBAC: gestión de roles por tenant y matriz de permisos agrupada por módulo

- **Ticket**: .agents/tickets/backlog/TICK-081-forge-front-fe-rbac-gestion-roles-por-tenant-matriz-permisos.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-081/spec.md`
- **Date**: 2026-11-26

## Summary

Add a tenant-scoped roles management surface to Settings and a permission matrix grouped by module.
The feature consumes the **already existing** backend IAM API (`roles`, `permissions`, `createRole`,
`updateRole`, `deleteRole`, `setRolePermissions`); no backend, schema or GraphQL contract change is
required.

Strategy (Option A — module assignment = selected actions of that module):

1. Extend the front GraphQL documents to read `Role.updatedAt` and to send `confirmReplace` /
   `expectedUpdatedAt` on `setRolePermissions`.
2. Add pure helpers to group the catalog by `Permission.module`, toggle a module, and detect set
   reductions; unit-test them with the built-in Node test runner.
3. Add typed service methods in `settingsService` with **pagination** for `roles` and `permissions`
   (the backend clamps `take` to 100 and the catalog has 103 actions today).
4. Add a “Roles” tab (list + **full-view editor** + permission matrix) gated by role-management
   permissions, wired into `SettingsMainView`.
5. Refresh `AuthContext` permissions when the edited role affects the current user.
6. Use human-readable permission labels (last action segment + description), never the raw
   `module:entity:verb` code.

## Technical context

- **Stack**: Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3, MUI 7.3.6, Tailwind 4.
- **Dependencies**: `executeGraphQL` from `src/libs/graphqlClient.ts` (native fetch, bearer token
  injection, `GraphQLClientError` with `code`). No new runtime dependency.
- **Persistence**: none in the front; state comes from `forge-backend`. Multi-tenancy comes from the
  JWT; the front never sends `tenantId`.
- **Testing**: no Jest/Vitest. Pure helpers use `node:test` + `node:assert/strict` executed with
  `node --import tsx --test "src/**/*.test.ts"` (tsx is a devDependency; existing `*.test.ts` follow
  this pattern). No React Testing Library, so UI is verified manually + `tsc`/`eslint`.
- **Constraints**:
  - `RolesService.clampTake` caps `take` at 100 → pagination is mandatory for the 103-action catalog.
  - `setRolePermissions` is a **full-set replacement**; shrinking an admin set requires
    `confirmReplace: true` and supports `expectedUpdatedAt` (TICK-055).
  - `Role.updatedAt` exists on the GraphQL `Role` type (`schema.gql`) but is not currently selected.
  - `Sales` and `CashRegister` have no permission catalog; the matrix must omit/annotate them.

## Requirement coverage

| Requirement | Where it is satisfied |
|---|---|
| REQ-U-001 | `RolesManagementTab` + service methods; `tenantId` never sent |
| REQ-U-002 | `src/utils/rolePermissions.ts` grouping by `Permission.module` (no RoleModule) |
| REQ-U-003 | `ErpRole`/`ErpPermission` in `types/settingsTypes.ts`; writes use `role.id` |
| REQ-U-004 | `settingsService.getRoles/getPermissions/createRole/updateRole/deleteRole/setRolePermissions` |
| REQ-U-005 | `fetchAllPages` helper (take/skip ≤ 100) used by roles/permissions |
| REQ-U-006 | `SettingsMainView` gating via `hasPermission(...)` |
| REQ-U-007 | No backend/schema/contract changes |
| REQ-U-008 | `formatPermissionLabel` in `rolePermissions.ts`; `PermissionMatrix` renders label + description |
| REQ-E-001 | `SettingsMainView` loads roles/catalog on tab open |
| REQ-E-002 | Full-view `RoleEditorView` → `createRole` + `setRolePermissions` → refresh + back to list |
| REQ-E-003 | Full-view `RoleEditorView` → `updateRole` + `setRolePermissions` → refresh + back to list |
| REQ-E-004 | Save matrix → `setRolePermissions` with full set + `expectedUpdatedAt`/`confirmReplace` |
| REQ-E-005 | Module select-all/individual toggles recompute `permissionIds` |
| REQ-E-006 | Delete action → `deleteRole` → refresh |
| REQ-E-007 | Post-mutation refresh; `AuthContext.refreshUser()` when role affects current user |
| REQ-S-001 | `isSystem` disables delete/name; backend enforced |
| REQ-S-002 | Controls hidden/disabled by `hasPermission` |
| REQ-S-003 | Loading state disables save |
| REQ-N-001 | Catch `BAD_USER_INPUT`, keep matrix, surface message |
| REQ-N-002 | Inline duplicate-name error from backend |
| REQ-N-003 | Tab hidden without `iam:role:read` |
| REQ-N-004 | Catalog load failure/partial → block save |
| REQ-N-005 | Stale `expectedUpdatedAt` → conflict message + reload |
| REQ-N-006 | `deleteRole` `FORBIDDEN` → keep role + reason |
| REQ-N-007 | `FORBIDDEN` surfaced as permission error, no retry |
| REQ-O-001 | `activeModules`/`hasModule` entitlement badge (informational) |
| REQ-O-002 | Modules without catalog omitted/annotated |
| REQ-O-003 | `fetchAllPages` paginates roles list too |

## Architecture decisions

- **ADR-001 — Option A (permissions grouped by module), no `RoleModule`.** A role's “modules” are
  derived from the modules of its selected actions. Rejected: a backend `RoleModule` table and
  migrations, which add schema, contract and guard complexity for no functional gain given
  action-level permissions already exist.
- **ADR-002 — Full-set save with `confirmReplace` + `expectedUpdatedAt`.** The only backend mutation is
  replace-all. Rejected: per-permission incremental toggles, which do not exist and would race.
- **ADR-003 — Paginated `fetchAllPages` helper.** Rejected: a single `take: 100` call (would silently
  drop 3 of 103 permissions) or raising the backend cap (backend change out of scope).
- **ADR-004 — Pure helpers + `node:test`.** Grouping/selection/reduction logic lives in
  `src/utils/rolePermissions.ts` and is tested with the existing built-in runner. Rejected: adding
  Jest/Vitest + RTL (new toolchain, not present in the repo) for this ticket.
- **ADR-005 — `role.id` is the write identity.** Extend `ErpRole` with `permissions`/`updatedAt`; keep
  `SystemRole` name mapping only for legacy display. Rejected: continuing name-based logic, which
  breaks for custom tenant roles.
- **ADR-006 — In-context full view, no drawer/modal, no routing changes.** Creating/editing a role
  replaces the roles list with a full-view editor (`RoleEditorView`) and a “Volver” action. Rejected:
  a right-side drawer/modal (the previous approach) and adding new routes (data-loading duplication).
  Tab visibility follows the role-management permissions held by the user (or owner/admin), so any
  custom role granted `iam:role:*` sees the surface.
- **ADR-007 — Human-readable permission labels.** The matrix shows the last action segment translated
  (`read` → “Leer”, `repair` → “Reparar”, …) plus the catalog description, never the raw
  `module:entity:verb`. Rejected: rendering `Permission.action` directly, which leaks internal codes.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Contract/API | `src/graphql/iam.gql.ts` | Extend `GET_ROLES_QUERY` with `updatedAt`; extend `SET_ROLE_PERMISSIONS_MUTATION` with `$confirmReplace: Boolean`, `$expectedUpdatedAt: DateTime` and return `updatedAt` + `permissions { permission { id action module } }` |
| Types | `src/types/settingsTypes.ts` | Add `ErpPermission`, `PermissionModuleGroup`; extend `ErpRole` with `permissions: ErpPermission[]` and `updatedAt?: string` |
| Adapter | `src/services/adapters/roleAdapter.ts` (new) | Map GraphQL `GqlRole` (with nested permissions) to `ErpRole`; map `Permission` to `ErpPermission` |
| Domain helpers | `src/utils/rolePermissions.ts` (new) | `groupPermissionsByModule`, `moduleSelectionState`, `toggleModuleSelection`, `computePermissionIds`, `isReduction`, `formatPermissionLabel` |
| Service | `src/services/settingsService.ts` | `fetchAllPages`, `getRoles`, `getPermissions`, `createRole`, `updateRole`, `deleteRole`, `setRolePermissions` |
| UI (list) | `src/views/settings/tabs/RolesManagementTab.tsx` (new) | Role list, create/edit/delete actions, permission-gated controls; swaps to the full-view editor |
| UI (form/matrix) | `src/views/settings/components/RoleEditorView.tsx`, `PermissionMatrix.tsx` (new) | Full-view role editor + module-grouped matrix with human labels and descriptions |
| UI (wiring) | `src/views/settings/SettingsMainView.tsx` | Add 5th tab, load roles/catalog, gating, handlers, toast; refresh AuthContext on self-role change |
| Context | `src/contexts/AuthContext.tsx` | Reuse `refreshUser()` after mutations affecting the current user (no API change) |

## Cross-sidecar integration

Produces/consumes a contract with `forge-backend` but **no new contract file** is required: the ticket
is `target_domain: forge-front` and the consumed operations already exist. The producer is
`sidecars/forge-backend`:

- Queries: `roles`, `role`, `assignableRoles`, `permissions` (`roles.resolver.ts`).
- Mutations: `createRole`, `updateRole` (`CrearRoleInput`/`ActualizarRoleInput`), `deleteRole`,
  `setRolePermissions` (`id`, `permissionIds`, `confirmReplace`, `expectedUpdatedAt`).
- Guards: `iam:role:read|create|update|delete|set-permissions`, `iam:permission:read`.
- Scalar `DateTime` is used for `expectedUpdatedAt` (verified in `schema.gql`).

Rollout order is irrelevant to correctness (front-only), but the backend must be the version that
already includes `updatedAt` on `Role` and the TICK-055 guardrails (it is on `main`).

## Testing strategy

- **Unit (pure helpers)** — `src/utils/rolePermissions.test.ts` (new), run with
  `node --import tsx --test "src/utils/*.test.ts"`:
  - grouping by module, select-all/toggle consistency, `computePermissionIds`, reduction detection.
  - pagination helper with an injected page-fetch function (covers >100 items).
- **Service (logic)** — test `fetchAllPages` and payload building with a fake fetch function; assert
  `setRolePermissions` sends the full set, `confirmReplace` only on reduction, and `expectedUpdatedAt`.
- **Type/Lint** — `npx tsc --noEmit` and `npm run lint`.
- **Manual / E2E (no RTL available)** — as owner: create a role, select a module's actions, save,
  reopen and confirm persistence; reduce the set and confirm the `confirmReplace` prompt; verify a
  system role cannot be deleted/renamed; verify a user without `iam:role:read` cannot see the tab; load
  a catalog with 103 actions and confirm all are present (pagination).

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Catalog > 100 truncated by `take` cap | Roles missing permissions silently | `fetchAllPages` with `take=100` pages; unit test with >100 fixtures; `AC-005` |
| No component test harness | UI regressions undetected by CI | Keep logic in pure helpers + service tests; manual QA checklist for UI |
| Full-set replacement loses permissions | Unintended privilege/regression | Always send the complete set; `expectedUpdatedAt` + `confirmReplace`; reload after save |
| Stale version conflict | Overwriting concurrent edits | Send `Role.updatedAt`; on error, reload and show conflict |
| System role mutation | Breaking the tenant baseline | Disable delete/name in UI; rely on backend `isSystem` guard |
| Hardcoded role names used elsewhere | Custom roles mis-displayed/mis-written | Writes use `role.id`; only `SystemRole` display mapping remains (legacy) |
| Entitlement vs permission confusion | Admin expects module toggle to grant access | Show entitlement badge as informational; matrix edits permissions only |
| Cache staleness after mutation | UI shows old permissions | Refetch roles after each mutation; `AuthContext.refreshUser()` for self |
