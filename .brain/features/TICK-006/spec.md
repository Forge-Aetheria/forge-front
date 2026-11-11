# EARS Specification: FE-AUTH: Ciclo de Autenticación Pública, Registro y Recuperación de Credenciales

- **Ticket**: legacy TICK-006-fe-onboarding-auth-lifecycle (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-10
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, authentication interfaces are currently restricted to a single `/login` page (`src/app/(blank-layout-pages)/login/page.tsx`). There are no self-service entry points for prospective tenant organizations to register accounts (`/register`), verify email ownership via magic links (`/verify-email`), or recover forgotten credentials (`/forgot-password` and `/reset-password`).

In `forge-backend`, the authentication domain (`src/modules/auth`) provides the complete GoTrue / Supabase Auth lifecycle operations:
- `signUp(input: RegistrarCuentaInput!)`: Atomically checks slug availability, provisions the Supabase user identity, runs the tenant bootstrapping transaction, and injects the `app_metadata.tenantId` claim.
- `verifyEmail(input: VerificarEmailInput!)`: Validates the `token_hash` and issues an active authenticated `AuthSession`.
- `resendVerificationEmail(input: SolicitudEmailInput!)`: Re-dispatches confirmation emails under anti-enumeration protection.
- `requestPasswordReset(input: SolicitudEmailInput!)`: Triggers password recovery links via email.
- `resetPassword(input: RestablecerPasswordInput!)`: Updates user credentials and invalidates previous sessions.

Connecting `forge-front` to these endpoints establishes the self-service SaaS entry architecture.

## EARS Requirements

### Ubiquitous

Requirements that always apply, without an activation condition.

- **REQ-U-001** The system SHALL declare `SIGN_UP_MUTATION`, `VERIFY_EMAIL_MUTATION`, `RESEND_VERIFICATION_EMAIL_MUTATION`, `REQUEST_PASSWORD_RESET_MUTATION`, and `RESET_PASSWORD_MUTATION` in `src/graphql/auth.gql.ts`.
- **REQ-U-002** The system SHALL enforce password policy on all registration and reset forms: length between 8 and 72 characters, containing at least one letter and at least one digit.
- **REQ-U-003** The system SHALL automatically generate a sanitized kebab-case `tenantSlug` from the entered company name, validating against `^[a-z0-9]+(-[a-z0-9]+)*$` while allowing manual adjustment.
- **REQ-U-004** The system SHALL host all public authentication views under the blank layout convention: `/register`, `/verify-email`, `/forgot-password`, and `/reset-password`.

### Event-driven (When)

- **REQ-E-001** WHEN a user submits the registration form on `/register`, the system SHALL invoke the `signUp` mutation and display the email verification confirmation view.
- **REQ-E-002** WHEN a user accesses `/verify-email` with a valid `token_hash` parameter, the system SHALL invoke `verifyEmail`, store the returned session via `authService.saveSession`, and navigate the user to `/home` (or `/onboarding`).
- **REQ-E-003** WHEN a user requests a password reset on `/forgot-password`, the system SHALL invoke `requestPasswordReset` and display a neutral confirmation alert adhering to anti-enumeration principles.
- **REQ-E-004** WHEN a user submits a new password on `/reset-password` with a valid `token_hash`, the system SHALL invoke `resetPassword` and redirect to `/login` with a success notification.
- **REQ-E-005** WHEN a user clicks "Reenviar correo de confirmación" on `/verify-email`, the system SHALL invoke `resendVerificationEmail` and display a confirmation toast.

### State-driven (While)

- **REQ-S-001** WHILE any authentication mutation is in transit, the system SHALL display a loading indicator in the submit button and disable form input fields.

### Unwanted (If / Then)

- **REQ-N-001** IF the verification token has expired or is invalid, THEN the system SHALL display an alert stating token expiration and provide a button to trigger `resendVerificationEmail`.
- **REQ-N-002** IF passwords do not match or fail complexity rules, THEN the system SHALL display inline helper errors and prevent network dispatch.
- **REQ-N-003** IF the backend rejects registration due to a duplicate tenant slug, THEN the system SHALL highlight the slug input with a suggestion to pick an alternative URL identifier.

### Optional (Where)

- **REQ-O-001** WHERE query parameters supply an email address (e.g. `?email=usuario@empresa.com`), the `/register` and `/forgot-password` views SHALL pre-fill the email input field.

## Acceptance criteria

- **AC-001** GIVEN valid registration details on `/register`, WHEN the form is submitted, THEN the system SHALL execute `signUp` and navigate to the verification pending view.
- **AC-002** GIVEN an incoming URL with a valid `token_hash` on `/verify-email`, WHEN the page loads, THEN the system SHALL verify the token, authenticate the session, and navigate to the dashboard.
- **AC-003** GIVEN an email on `/forgot-password`, WHEN submitting, THEN the system SHALL dispatch `requestPasswordReset` and display the anti-enumeration confirmation.
- **AC-004** GIVEN a password reset link with `token_hash` on `/reset-password`, WHEN entering matching passwords meeting complexity rules, THEN the system SHALL execute `resetPassword` and navigate to `/login`.

## Out of scope

- Post-login onboarding wizard (delegated to `TICK-014`).
- Third-party social logins (OAuth Google/GitHub).

## Assumptions

- Supabase Auth service is accessible via backend GraphQL.
- Users receive tokens via email redirect URLs.

## Open questions

- None.
