# Technical Plan: FE-ONBOARDING: Asistente Guiado de Configuración Inicial del Tenant (Post-Auth Wizard)

- **Ticket**: .agents/tickets/backlog/TICK-014-forge-front-fe-onboarding-asistente-guiado-de-configuracion.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-014/spec.md`
- **Date**: 2026-11-14

## Summary

Implement a post-authentication, tenant-level onboarding wizard in `forge-front` that consumes the `forge-backend` contract: `myTenantOnboardingStatus` for the global completion gate, `tenantOnboarding` for the full fiscal state, and `completeTenantOnboarding` for persistence. The wizard has three steps (fiscal identity, fiscal preferences, confirmation), a MUI Stepper, RIF normalization aligned with the backend modulo-11 rule, and a global onboarding gate that blocks dashboard routes until `onboardingCompleted === true`. All state is server-backed; no fiscal data is written to `localStorage`.

The strategy is to centralize onboarding state in a dedicated service + React context, render the wizard under the blank layout at `/onboarding`, and compose the existing `AuthGuard` with a new `OnboardingGuard` inside the dashboard layout. Every `REQ-*` maps to one of these layers.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router, Turbopack), React 19.2.3, TypeScript 5.9.3, MUI 7.3.6 (`@mui/material`, `@mui/lab`), Zod 4.6.7.
- **Dependencies**: `executeGraphQL`/`GraphQLClientError` in `src/libs/graphqlClient.ts`; MUI Stepper and `src/components/stepper-dot`; existing zod schemas in `src/views/*/schemas/`; `AuthContext` in `src/contexts/AuthContext.tsx`.
- **Persistence**: no frontend database. Session/token in `localStorage` (`foundly_auth_session`). Onboarding data persists only in `forge-backend` (`Tenant` + `TenantSettings`). `settingsService` localStorage company settings are explicitly not the onboarding source of truth.
- **Testing**: no unit test runner is installed (no Jest/Vitest/Testing Library). Verification uses `npm run lint`, `npx tsc --noEmit`/`npm run build`, Node's built-in runner through the existing `tsx` dependency for pure utilities (`npx tsx --test ...`), and manual E2E against `forge-backend`.
- **Constraints**: onboarding data is persisted only on final submission; a reload before completion is expected to lose form data (product decision 2026-11-14). Tenant identity comes from the JWT, never from client input; `tenantOnboarding` and `completeTenantOnboarding` require `iam:settings:manage`; `docType` onboarding values are `V|E|J|G|C` (`P` is rejected); `baseCurrency` is `USD|VES`; `defaultVatAliquot` is optional among `GENERAL_16|REDUCED_8|EXEMPT_0`.
- **Existing patterns**: routes live in `src/app/`; page shells delegate to `src/views/`; client components start with `'use client'`; GraphQL operations are string constants per domain in `src/graphql/*.gql.ts`; services wrap `executeGraphQL`.

## Architecture decisions

- **ADR-001: Centralize onboarding state in `OnboardingContext`.** A new client provider fetches `tenantOnboarding` once per authenticated session and exposes `state`, `isLoading`, `error`, `refresh` and `complete`. Rationale: the dashboard gate, the `/onboarding` page and the post-mutation refresh all need the same state; a single provider avoids duplicate requests and inconsistent redirects. Rejected alternative: fetching the query independently in each page/guard, which produces races and multiple round-trips.
- **ADR-002: Compose `OnboardingGuard` inside the dashboard layout instead of Next middleware.** `src/app/(dashboard)/layout.tsx` already wraps content in `AuthGuard`; an `OnboardingGuard` will consume the context and redirect to `/onboarding` when incomplete. Rationale: middleware cannot execute the authenticated GraphQL query with tenant context and would need a second source of truth. Rejected alternative: cookie-based middleware gating, which cannot know `onboardingCompleted`.
- **ADR-003: Server is the authority; frontend mirrors the canonical RIF rule.** Implement `src/utils/rif.ts` with `computeRifCheckDigit` and `normalizeRif` matching `sidecars/forge-backend/src/shared/utils.ts:150`, but always submit `docNumber` as the numeric body plus a separate `checkDigit` and map backend `extensions.field` errors. Rationale: immediate UX feedback without allowing the frontend to accept values the backend rejects. Rejected alternative: regex-only validation (does not validate modulo 11) or server-only validation (poor feedback and extra round-trips).
- **ADR-004: Use Zod schema + controlled React state, not a new form library.** Follow the existing `RegisterView` pattern and reuse the installed `zod`. Rationale: no new dependency; schema keeps Step 1/2 rules in one place and is reusable by tests. Rejected alternative: adding a form-state dependency, which the constitution requires justifying and this feature does not need.
- **ADR-005: Place the wizard under the blank layout at `/onboarding`.** Add `src/app/(blank-layout-pages)/onboarding/page.tsx` and `src/views/onboarding/OnboardingWizardView.tsx`; the view performs the authenticated gate and the `onboardingCompleted === true` redirect. Rationale: the dashboard chrome must not render before onboarding is complete. Rejected alternative: nesting `/onboarding` in the dashboard layout, which would render navigation/header for an incomplete tenant and complicate guard ordering.
- **ADR-006: Do not touch `settingsService` company settings in this ticket.** Onboarding writes exclusively through `completeTenantOnboarding`; `settingsService` remains a legacy localStorage surface. Rationale: the backend has no `companySettings` contract and changing it is out of scope. Rejected alternative: reusing `settingsService.updateCompanySettings`, which would silently persist to the wrong store.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Contract or API | `src/graphql/iam.gql.ts` | Add `GET_MY_TENANT_ONBOARDING_STATUS_QUERY`, `GET_TENANT_ONBOARDING_QUERY` (all `TenantOnboardingState` fields) and `COMPLETE_TENANT_ONBOARDING_MUTATION` (`CompleteTenantOnboardingInput!`, payload fields). |
| Data / domain types | `src/types/onboardingTypes.ts` (new) | Define `DocType`, `BaseCurrency`, `VatAliquot`, `TenantOnboardingState`, `CompleteTenantOnboardingInput`, `TenantOnboardingPayload` and wizard form state; nullable fields as per `REQ-U-005`. |
| Domain or service | `src/services/onboardingService.ts` (new) | `getStatus()`, `getState()` and `complete(input)` using `executeGraphQL`; strip `tenantId` from input; translate `GraphQLClientError` (`UNAUTHENTICATED`, `FORBIDDEN`, `BAD_USER_INPUT`, `VALIDATION_ERROR`, `NETWORK_ERROR`, `TIMEOUT_ERROR`) into a typed result including `field`. |
| Domain or service | `src/contexts/OnboardingContext.tsx` (new) | Provider with `myTenantOnboardingStatus` state, loading/error, `refresh()`, `complete()`; only fetch when `isAuthenticated`; no localStorage persistence. The wizard loads `tenantOnboarding` only for its own prefill. |
| Client or UI | `src/components/Providers.tsx` | Mount `OnboardingProvider` inside `AuthProvider` so dashboard and blank layouts share state. |
| Client or UI | `src/components/auth/OnboardingGuard.tsx` (new) | Client gate: show loader while resolving, redirect `/onboarding` when incomplete, fail closed on query errors, delegate `UNAUTHENTICATED` to `AuthGuard`/logout, render children only when completed. |
| Client or UI | `src/app/(dashboard)/layout.tsx` | Wrap dashboard content with `OnboardingGuard` inside `AuthGuard`. |
| Client or UI | `src/app/(blank-layout-pages)/onboarding/page.tsx` (new) | Page shell with metadata delegating to the wizard view. |
| Client or UI | `src/views/onboarding/OnboardingWizardView.tsx` (new) | Auth gate, query prefetch/prefill, MUI Stepper, step state, final submit, post-success `refresh()` + `router.replace('/home')`, redirect to `/home` when already completed. |
| Client or UI | `src/views/onboarding/schemas/onboardingSchema.ts` (new) | Zod schemas for Step 1 (`REQ-U-006`) and Step 2 (`REQ-U-004`), plus cross-field RIF check for `J|G|C` (`REQ-O-002`). |
| Client or UI | `src/views/onboarding/components/StepFiscalIdentity.tsx` (new) | Step 1 fields, RIF type/number/check digit, field errors from zod and `extensions.field`. |
| Client or UI | `src/views/onboarding/components/StepFiscalPreferences.tsx` (new) | Step 2 currency and optional VAT aliquot, empty option labeled "sin alícuota por defecto" (`REQ-O-001`). |
| Client or UI | `src/views/onboarding/components/StepConfirmation.tsx` (new) | Step 3 summary and "Comenzar a usar el ERP" action with in-flight disabled state (`REQ-U-007`, `REQ-S-003`). |
| Client or UI | `src/views/onboarding/components/OnboardingStepper.tsx` (new, optional) | MUI Stepper wrapper using `src/@core/styles/stepper.ts` and `src/components/stepper-dot`. |
| Client or UI | `src/utils/rif.ts` (new) | `computeRifCheckDigit`, `normalizeRif` and `isCheckDigitRequired` mirroring backend behavior. |

No changes to `src/libs/graphqlClient.ts` are required: it already returns `extensions` in `GraphQLClientError`. No changes to `src/services/settingsService.ts` are planned.

## Requirement coverage

| Requirement | Implementation |
| --- | --- |
| REQ-U-001, REQ-U-007 | `/onboarding` page + `OnboardingWizardView` + `OnboardingStepper` + `StepConfirmation` |
| REQ-U-002, REQ-U-003 | `onboardingService` + `OnboardingContext`; no `settingsService`/localStorage writes |
| REQ-U-004, REQ-U-005 | `onboardingTypes.ts`, `onboardingSchema.ts`, GraphQL operation strings |
| REQ-U-006 | `onboardingSchema.ts` + `StepFiscalIdentity` |
| REQ-E-001, REQ-E-002 | `OnboardingGuard` in `src/app/(dashboard)/layout.tsx` |
| REQ-E-003, REQ-E-004 | `OnboardingWizardView` initial redirect and prefill from `OnboardingContext` |
| REQ-E-005 | `StepFiscalIdentity` validation + `rif.ts` |
| REQ-E-006, REQ-E-007, REQ-E-008 | `OnboardingContext.complete()` + `onboardingService` + post-submit `refresh()`/`router.replace('/home')` |
| REQ-S-001, REQ-S-002 | `OnboardingGuard` loader and fail-closed rendering |
| REQ-S-003 | Local `isSubmitting` state disables the confirmation button |
| REQ-S-004 | Single form state object lifted to `OnboardingWizardView` |
| REQ-N-001 | Zod errors + `GraphQLClientError.extensions.field` mapping in `StepFiscalIdentity` |
| REQ-N-002 | `onboardingService` error mapping + `authService.clearSession()`/redirect `/login` |
| REQ-N-003 | `OnboardingGuard` and wizard `FORBIDDEN` state; no automatic redirect loop |
| REQ-N-004 | Service `NETWORK_ERROR`/`TIMEOUT_ERROR` result keeps Step 3 mounted |
| REQ-N-005 | Server-backed gate; leaving `/onboarding` does not mark completion locally |
| REQ-N-006 | `OnboardingGuard` retry state on generic query failure |
| REQ-N-007 | `complete()` validates `onboardingCompleted === true` before navigation |
| REQ-O-001, REQ-O-002, REQ-O-003 | Optional VAT option, RIF conditional check digit, prefill/resume logic |

## Cross-sidecar integration

This feature **consumes** a `forge-backend` contract; it does not expose one. No local `contract.md` was generated (`contract: false` in `.brain/active.json`), so the authoritative references are:

- `sidecars/forge-backend/.spec/iam/contracts/graphql.md` (`myTenantOnboardingStatus`, `tenantOnboarding`, `completeTenantOnboarding`, error codes).
- `sidecars/forge-backend/.brain/features/TICK-015/contract.md` (v1.1.0, approved; addendum adds the minimal status query for TICK-014).

Integration requirements: send only `CompleteTenantOnboardingInput` fields, never `tenantId`; rely on JWT tenant context; handle `FORBIDDEN` because the query/mutation require `iam:settings:manage`; and treat the mutation payload as partial (`fiscalAddress`, `defaultVatAliquot` and `onboardingCompletedAt` require the query). Any contract change after implementation must be re-validated against these files.

## Testing strategy

- **Unit**: `src/utils/rif.ts` tested with Node's built-in runner via the existing `tsx` dependency (`npx tsx --test src/utils/rif.test.ts`), covering valid/invalid `J|G|C` check digits, `V|E` optional digits, separator stripping and 8-digit padding. Zod schemas can be exercised the same way. No new test dependency is introduced.
- **Static**: `npm run lint` and `npx tsc --noEmit`; `npm run build` as the final gate.
- **Integration**: run `forge-backend` locally and validate the three-step flow end to end against a tenant fixture with `onboardingCompleted === false`: prefill, invalid RIF rejection, successful completion, `/home` access, and second visit to `/onboarding` redirecting to `/home`.
- **Manual E2E matrix**: AC-001 to AC-010, plus `FORBIDDEN` with a non-owner role, `UNAUTHENTICATED` with an expired token, backend down (network error), reload mid-wizard (prefill), and optional VAT left empty.
- **Regression**: confirm `/login`, `/register` and `/verify-email` remain reachable without the onboarding gate, and dashboard navigation is not blocked after completion.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Frontend RIF rule diverges from backend modulo 11 | Users blocked or invalid RIF accepted | Mirror `computeRifCheckDigit`/`normalizePartnerIdentity`, unit-test it, and always surface backend `extensions.field` errors as the final authority. |
| Redirect loop between `/onboarding` and `/home` | Unusable app | Resolve state once in `OnboardingContext`; navigate with `router.replace`; never redirect from the wizard before `onboardingCompleted === true`; preserve a terminal `FORBIDDEN` state instead of retrying/redirecting. |
| `tenantOnboarding` returns `FORBIDDEN` for non-owner roles | Owner-only onboarding blocks other users silently | Show an actionable permission message, keep fail-closed behavior, and record the owner-only decision in the ticket (open question). |
| Query/mutation network failures | User loses entered data or is granted access incorrectly | Keep wizard state in memory on Step 3, allow retry, never mark completion locally, and fail closed in the guard. |
| Mutation payload is partial | UI shows stale or missing `fiscalAddress`/`defaultVatAliquot` | Refetch `tenantOnboarding` after success (`REQ-E-008`) before relying on the state. |
| Reusing `settingsService` by mistake | Fiscal data persisted only in `localStorage` and lost across devices | Service boundary limited to `onboardingService`; code review must reject `saveCompanySettings` usage in onboarding. |
| Backend contract drift after TICK-015/TICK-017/TICK-026 | Runtime GraphQL errors | Pin operations to the documented contract, add a manual contract check in the E2E matrix, and update this plan/spec if the backend changes. |
| MUI Stepper accessibility/regression | Poor UX | Reuse the existing `StepperWrapper` styles and `StepperCustomDot`; verify keyboard navigation and mobile layout manually. |
