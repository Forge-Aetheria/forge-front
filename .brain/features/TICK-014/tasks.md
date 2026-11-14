# Tasks: FE-ONBOARDING: Asistente Guiado de Configuración Inicial del Tenant (Post-Auth Wizard)

- **Ticket**: .agents/tickets/backlog/TICK-014-forge-front-fe-onboarding-asistente-guiado-de-configuracion.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-014/plan.md`
- **Date**: 2026-11-14

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 [P] `src/types/onboardingTypes.ts` Create domain types for `DocType`, `BaseCurrency`, `VatAliquot`, `TenantOnboardingState`, `CompleteTenantOnboardingInput`, `TenantOnboardingPayload` and wizard form state, with nullable fields as defined in the contract. Covers REQ-U-004, REQ-U-005.
- [x] T002 [P] `src/graphql/iam.gql.ts` Add `GET_TENANT_ONBOARDING_QUERY` with all `TenantOnboardingState` fields and `COMPLETE_TENANT_ONBOARDING_MUTATION` with `CompleteTenantOnboardingInput!` and the payload fields. Covers REQ-U-002, REQ-E-001, REQ-E-006, REQ-E-008.
- [x] T003 [P] `src/utils/rif.ts` Implement `computeRifCheckDigit`, `normalizeRif` and `isCheckDigitRequired`, mirroring `sidecars/forge-backend/src/shared/utils.ts:150` (body padded to 8 digits, separate check digit, `J|G|C` required, `V|E` optional). Covers REQ-E-005, REQ-N-001, REQ-O-002.
- [x] T004 [P] `src/utils/rif.test.ts` Add Node `node:test` cases for valid/invalid `J|G|C` digits, `V|E` optional digits, separator stripping and 8-digit padding; run with tsx against `src/utils/rif.test.ts`. Covers REQ-E-005, REQ-N-001, REQ-O-002.
- [x] T005 [P] `src/views/onboarding/schemas/onboardingSchema.ts` Add Zod schemas for Step 1 and Step 2, including max lengths and the cross-field RIF check using `src/utils/rif.ts`. Covers REQ-U-004, REQ-U-006, REQ-O-002.
- [x] T006 `src/services/onboardingService.ts` Implement `getState()` and `complete(input)` via `executeGraphQL`; send only `CompleteTenantOnboardingInput` fields (never `tenantId`); map `GraphQLClientError` codes and `extensions.field` into a typed result. Covers REQ-U-002, REQ-U-003, REQ-E-006, REQ-N-001, REQ-N-002, REQ-N-004, REQ-N-007, REQ-O-001.
- [x] T007 `src/contexts/OnboardingContext.tsx` Implement the provider with `state`, `isLoading`, `error`, `refresh()` and `complete()`; fetch only when authenticated, expose retry and terminal `FORBIDDEN` states, and never persist to `localStorage`. Covers REQ-U-002, REQ-U-003, REQ-E-001, REQ-E-003, REQ-E-007, REQ-E-008, REQ-N-002, REQ-N-003, REQ-N-006, REQ-N-007.
- [x] T008 [P] `src/components/Providers.tsx` Mount `OnboardingProvider` inside `AuthProvider` so dashboard and blank layouts share onboarding state. Covers REQ-E-001, REQ-S-001.
- [x] T009 [P] `src/components/auth/OnboardingGuard.tsx` Add the client gate: loader while resolving, redirect to `/onboarding` when incomplete, fail closed with retry on generic query errors, handle `FORBIDDEN` without loops, and render children only when completed. Covers REQ-E-001, REQ-E-002, REQ-S-001, REQ-S-002, REQ-N-003, REQ-N-006.
- [x] T010 `src/app/(dashboard)/layout.tsx` Wrap dashboard content with `OnboardingGuard` inside the existing `AuthGuard`. Covers REQ-E-001, REQ-E-002, REQ-S-002, REQ-N-005.
- [x] T011 [P] `src/views/onboarding/components/OnboardingStepper.tsx` Add the MUI Stepper wrapper using `src/@core/styles/stepper.ts` and `src/components/stepper-dot`, with visible progress. Covers REQ-U-001.
- [x] T012 [P] `src/views/onboarding/components/StepFiscalIdentity.tsx` Add Step 1 fields (`legalName`, `tradeName`, `docType`, `docNumber`, `checkDigit`, `fiscalAddress`), wire Zod validation and map `extensions.field` errors to inputs. Covers REQ-U-006, REQ-E-004, REQ-E-005, REQ-N-001, REQ-O-002.
- [x] T013 [P] `src/views/onboarding/components/StepFiscalPreferences.tsx` Add Step 2 currency selector (`USD|VES`) and optional VAT aliquots (`GENERAL_16|REDUCED_8|EXEMPT_0`) with the "sin alícuota por defecto" empty option. Covers REQ-U-004, REQ-O-001.
- [x] T014 [P] `src/views/onboarding/components/StepConfirmation.tsx` Add the Step 3 summary and the "Comenzar a usar el ERP" action with an in-flight disabled state. Covers REQ-U-007, REQ-S-003.
- [x] T015 `src/views/onboarding/OnboardingWizardView.tsx` Integrate the Stepper, the three steps, shared form state, prefill/resume, auth/completion redirects, final `complete()` call, post-success `refresh()` and `router.replace('/home')`; preserve Step 3 on network errors. Covers REQ-U-001, REQ-U-002, REQ-U-003, REQ-U-007, REQ-E-003, REQ-E-004, REQ-E-005, REQ-E-006, REQ-E-007, REQ-E-008, REQ-S-003, REQ-S-004, REQ-N-004, REQ-N-005, REQ-N-007, REQ-O-003.
- [x] T016 `src/app/(blank-layout-pages)/onboarding/page.tsx` Add the `/onboarding` route shell with metadata delegating to `OnboardingWizardView`, keeping it outside the dashboard layout. Covers REQ-U-001, REQ-E-003.

## Dependencies

- T006 depends on T001 and T002.
- T004 depends on T003.
- T005 depends on T003.
- T007 depends on T006.
- T008 depends on T007.
- T009 depends on T007.
- T010 depends on T009.
- T012 depends on T005.
- T013 depends on T005.
- T014 depends on T001.
- T015 depends on T007, T011, T012, T013 and T014.
- T016 depends on T015.

## Final verification

- [x] Run the RIF and error-mapping unit suites with `npx tsx --test` against `src/utils/rif.test.ts` and `src/utils/onboardingErrors.test.ts`.
- [x] Run `npm run lint`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run build`.
- [x] Verify AC-001 and AC-002 (dashboard gate and `/onboarding` completion redirect) against `forge-backend`.
- [x] Verify AC-003, AC-004 and AC-005 (RIF validation, step persistence, optional VAT) in the wizard.
- [x] Verify AC-006 (mutation success, state refresh and `/home` navigation).
- [x] Verify AC-007 and AC-008 (`FORBIDDEN` and `UNAUTHENTICATED` handling without redirect loops).
- [x] Verify AC-010 (post-completion redirect). AC-009 is limited to already-persisted values; draft persistence is deferred by product decision.
- [x] Confirm no fiscal data is written via `settingsService` or `localStorage` and no `tenantId` is sent in the mutation input.
- [x] Verify a non-owner user can read `myTenantOnboardingStatus` and reaches `/home` after onboarding, and that `/pos` is gated while onboarding is incomplete.
