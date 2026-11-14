# EARS Specification: FE-ONBOARDING: Asistente Guiado de Configuración Inicial del Tenant (Post-Auth Wizard)

- **Ticket**: .agents/tickets/backlog/TICK-014-forge-front-fe-onboarding-asistente-guiado-de-configuracion.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-14
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

`forge-front` has no onboarding flow yet (`grep -ri onboarding src` returns no results). After registration and identity verification (TICK-006), an authenticated tenant user can reach the dashboard without any fiscal identity, base currency or default VAT aliquot, which leaves the ERP in an incomplete state.

`forge-backend` already exposes the canonical integration surface:

- Query `tenantOnboarding: TenantOnboardingState!` in `sidecars/forge-backend/src/modules/iam/resolvers/tenant-settings.resolver.ts`, guarded by `iam:settings:manage`.
- Query `myTenantOnboardingStatus: TenantOnboardingStatus!` in the same resolver, readable by any authenticated tenant user and exposing only `tenantId`, `onboardingCompleted` and `onboardingCompletedAt` (added for TICK-014 to avoid blocking non-admin users).
- Mutation `completeTenantOnboarding(input: CompleteTenantOnboardingInput!)` in the same resolver at line 71, guarded by `iam:settings:manage`.
- Input fields in `sidecars/forge-backend/src/modules/iam/inputs.ts` ("Tenant onboarding (TICK-017)"): `legalName`, `tradeName`, `docType` (`V|E|J|G|C`), `docNumber`, `checkDigit`, `fiscalAddress`, `baseCurrency` (`USD|VES`) and optional `defaultVatAliquot` (`GENERAL_16|REDUCED_8|EXEMPT_0`).
- Persistence in `sidecars/forge-backend/src/modules/iam/services/tenant-profile.service.ts:84`: fiscal identity on `Tenant`, remaining values on `TenantSettings` (`baseCurrency`, `defaultVatAliquot`, `onboardingCompleted`, `onboardingCompletedAt`).
- Approved read contract in `sidecars/forge-backend/.spec/iam/contracts/graphql.md` and `sidecars/forge-backend/.brain/features/TICK-015/contract.md`.
- `TenantSettings.baseCurrency` is the only base-currency source (TICK-026).

Frontend constraints verified in code:

- The GraphQL transport is `executeGraphQL` in `src/libs/graphqlClient.ts`, which injects the access token from `foundly_auth_session` and surfaces `extensions.code` through `GraphQLClientError`.
- IAM operations live in `src/graphql/iam.gql.ts`; no onboarding operations exist there yet.
- `src/components/auth/AuthGuard.tsx` only checks authentication and redirects to `/login`; it does not evaluate tenant onboarding.
- The dashboard layout is `src/app/(dashboard)/layout.tsx`; blank pages such as login use `src/app/(blank-layout-pages)/layout.tsx`.
- `settingsService.getCompanySettings/saveCompanySettings` read and write `localStorage` (`src/services/settingsService.ts:421-429`); there is no backend `companySettings` contract, so it must not be the persistence path for onboarding.

This specification defines the frontend wizard, its integration with the backend contract, and the access guard.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The system SHALL provide an authenticated route `/onboarding` that hosts a multi-step MUI Stepper with a visible progress indicator.
- **REQ-U-002** The system SHALL obtain the completion state through `myTenantOnboardingStatus`, the full fiscal state through `tenantOnboarding`, and persist through `completeTenantOnboarding`; no fiscal data SHALL be stored locally.
- **REQ-U-003** The system SHALL NOT persist fiscal or onboarding data in `localStorage`, `settingsService.saveCompanySettings` or any `companySettings` abstraction.
- **REQ-U-004** The system SHALL model `docType` as `V|E|J|G|C`, `baseCurrency` as `USD|VES`, and `defaultVatAliquot` as optional `GENERAL_16|REDUCED_8|EXEMPT_0`.
- **REQ-U-005** The system SHALL treat `onboardingCompletedAt`, `baseCurrency`, `defaultVatAliquot`, `legalName`, `tradeName`, `docType`, `docNumber`, `checkDigit` and `fiscalAddress` as nullable values from the query.
- **REQ-U-006** The system SHALL validate Step 1 inputs against the backend constraints: `legalName` required and at most 255 characters, `tradeName` optional and at most 255 characters, `docNumber` required and at most 20 characters, `checkDigit` at most 1 character and required for `J|G|C`, and `fiscalAddress` required and at most 500 characters.
- **REQ-U-007** The system SHALL present a final confirmation step that summarizes the values to be submitted and provides a "Comenzar a usar el ERP" action.

### Event-driven (When)

- **REQ-E-001** WHEN an authenticated user loads any dashboard route, the system SHALL query `tenantOnboarding` before granting access to dashboard content.
- **REQ-E-002** WHEN `tenantOnboarding` returns `onboardingCompleted === false`, the system SHALL redirect the user to `/onboarding`.
- **REQ-E-003** WHEN `tenantOnboarding` returns `onboardingCompleted === true` and the user requests `/onboarding`, the system SHALL redirect the user to `/home`.
- **REQ-E-004** WHEN an authenticated user opens `/onboarding`, the system SHALL prefetch `tenantOnboarding` and prefill every value already persisted by the backend; a reload before completion resets the form because there is no draft persistence (product decision 2026-11-14).
- **REQ-E-005** WHEN the user submits Step 1 with a valid `docType`, normalized `docNumber` and valid `checkDigit` according to the canonical rule, the system SHALL advance to Step 2.
- **REQ-E-006** WHEN the user confirms Step 3, the system SHALL call `completeTenantOnboarding` with the collected input and no client-supplied `tenantId`.
- **REQ-E-007** WHEN `completeTenantOnboarding` returns `onboardingCompleted === true`, the system SHALL refresh the onboarding state and navigate to `/home`.
- **REQ-E-008** WHEN the mutation succeeds, the system SHALL refetch `tenantOnboarding` or consume the returned payload because the mutation response omits `fiscalAddress`, `defaultVatAliquot` and `onboardingCompletedAt`.

### State-driven (While)

- **REQ-S-001** WHILE the onboarding state is loading, the system SHALL show a loading indicator and SHALL NOT render dashboard content.
- **REQ-S-002** WHILE `onboardingCompleted` is `false`, the system SHALL keep every dashboard route restricted and allow access only to `/onboarding` and unauthenticated routes.
- **REQ-S-003** WHILE the `completeTenantOnboarding` mutation is in flight, the system SHALL disable the confirmation action and prevent duplicate submissions.
- **REQ-S-004** WHILE the user moves between wizard steps, the system SHALL preserve the values already entered.

### Unwanted (If / Then)

- **REQ-N-001** IF the Step 1 document is invalid, THEN the system SHALL block advancement and display the error on the field indicated by `extensions.field`, defaulting to `docNumber` or `checkDigit` when the field is absent.
- **REQ-N-002** IF the mutation returns `UNAUTHENTICATED`, THEN the system SHALL clear the local session, redirect to `/login` and SHALL NOT persist any onboarding data.
- **REQ-N-003** IF the mutation or query returns `FORBIDDEN`, THEN the system SHALL fail closed, keep the dashboard restricted, show an actionable permission error, and SHALL NOT enter a redirect loop.
- **REQ-N-004** IF the mutation fails with a network or timeout error, THEN the system SHALL retain the entered values, keep the user on Step 3 and allow a retry.
- **REQ-N-005** IF the user leaves the wizard without completing it, THEN the system SHALL keep the dashboard restriction in force on the next navigation.
- **REQ-N-006** IF the onboarding query fails for a reason other than `UNAUTHENTICATED` or `FORBIDDEN`, THEN the system SHALL fail closed, show a retry state and SHALL NOT grant dashboard access.
- **REQ-N-007** IF `completeTenantOnboarding` does not return `onboardingCompleted === true`, THEN the system SHALL NOT navigate to `/home` and SHALL show an error state.

### Optional (Where)

- **REQ-O-001** WHERE `defaultVatAliquot` is left empty, the system SHALL omit it from the mutation input or send `null`, and SHALL display it as "sin alícuota por defecto".
- **REQ-O-002** WHERE the user selects `docType` `V` or `E`, the system SHALL allow an empty `checkDigit` and SHALL validate it only when provided.
- **REQ-O-003** WHERE persisted onboarding values exist, the system SHALL resume the wizard from the first step containing missing required data while retaining all prefilled values. Partial/draft persistence across reloads is out of scope for this ticket.

## Acceptance criteria

- **AC-001** GIVEN an authenticated tenant with `onboardingCompleted === false`, WHEN the user opens `/home`, THEN the user is redirected to `/onboarding` and no dashboard content is rendered.
- **AC-002** GIVEN an authenticated tenant with `onboardingCompleted === true`, WHEN the user opens `/onboarding`, THEN the user is redirected to `/home`.
- **AC-003** GIVEN the user is on Step 1, WHEN the user enters `docType` `J` with an invalid modulo 11 check digit, THEN the wizard blocks advancement and shows the error on `checkDigit`.
- **AC-004** GIVEN the user is on Step 1 with valid fiscal data, WHEN the user advances, THEN Step 2 is displayed and the entered values remain available when returning to Step 1.
- **AC-005** GIVEN the user is on Step 2 with `baseCurrency` `USD` and no `defaultVatAliquot`, WHEN the user advances and confirms, THEN the mutation is sent without a VAT default and with the currency.
- **AC-006** GIVEN the user confirms Step 3, WHEN the mutation returns `onboardingCompleted: true`, THEN the app refetches the onboarding state and navigates to `/home`.
- **AC-007** GIVEN the backend responds `FORBIDDEN`, WHEN the wizard or guard processes the error, THEN the dashboard remains blocked, an actionable error is shown and no redirect loop occurs.
- **AC-008** GIVEN the backend responds `UNAUTHENTICATED`, WHEN the wizard or guard processes the error, THEN the local session is cleared and the user is sent to `/login`.
- **AC-009** GIVEN the backend already has persisted onboarding values, WHEN `/onboarding` loads, THEN those values are prefilled. A reload before the final submission is expected to reset the form (no draft persistence).
- **AC-010** GIVEN the user completes the wizard, WHEN the user later opens `/onboarding` again, THEN the app redirects to `/home`.

## Out of scope

- Main warehouse and business-activity type: they are not part of `CompleteTenantOnboardingInput` or `Tenant`/`TenantSettings`; they require a separate `forge-backend` ticket.
- Backend changes to the onboarding query, mutation, schema, validations or permissions.
- Registration, sign-in, email verification and password recovery flows (TICK-006).
- Editing fiscal or company settings after onboarding is completed.
- Migrating or deleting existing `localStorage` company settings beyond removing them as the onboarding source of truth.
- Partial/draft persistence of the wizard across reloads before final submission; deferred to a future product decision (2026-11-14).

## Assumptions

- `forge-backend` is deployed with TICK-017 (mutation), TICK-015 (query) and TICK-026 (single base-currency source) available.
- The tenant owner role includes `iam:settings:manage`, so the canonical owner can read the full onboarding state and complete it; every authenticated tenant user can read `myTenantOnboardingStatus`.
- `executeGraphQL` continues to surface `extensions.code` and the backend-specific `extensions.field` through `GraphQLClientError`.
- MUI Stepper components are provided by the installed `@mui/material` dependency.
- The frontend can add GraphQL operations in `src/graphql/iam.gql.ts` and route pages under `src/app/`.
- The canonical RIF rule is `normalizePartnerIdentity`/`computeRifCheckDigit` in `sidecars/forge-backend/src/shared/utils.ts:150`; the frontend may mirror or delegate it.

## Open questions

- Should `defaultVatAliquot` become mandatory in the UI even though the backend accepts it as optional?
- Should non-owner roles without `iam:settings:manage` be blocked from the wizard entirely, or shown a read-only state while an owner completes it?
- Is a follow-up backend ticket required for main warehouse and business-activity type, or are those requirements dropped from the product scope?
