# Technical Plan: FE-AUTH: Ciclo de Autenticación Pública, Registro y Recuperación de Credenciales

- **Ticket**: .agents/tickets/in-analysis/TICK-006-fe-onboarding-auth-lifecycle.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-006/spec.md`
- **Date**: 2026-11-10

## Summary

This feature implements the complete public authentication and account lifecycle in `forge-front`, providing self-service tenant registration (`/register`), email verification processing (`/verify-email`), and password recovery flows (`/forgot-password` and `/reset-password`). The technical strategy creates the public pages under Next.js `(blank-layout-pages)`, connects `authService.ts` to `forge-backend` GraphQL operations (`signUp`, `verifyEmail`, `resendVerificationEmail`, `requestPasswordReset`, `resetPassword`), validates password complexity and tenant slugs client-side, and handles token expiration gracefully with single-click resend actions.

## Technical context

- **Stack**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5.8, MUI v7 (`@mui/material`), Tailwind CSS v4.
- **Dependencies**: `@/libs/graphqlClient`, `@/services/authService`, `@/contexts/AuthContext`.
- **Persistence**: Supabase Auth and PostgreSQL multi-tenant database in `forge-backend`.
- **Testing & Quality Gates**:
  - `pnpm exec tsc --noEmit` (strict TypeScript validation).
  - `pnpm exec eslint <touched_files>` (governance linting).
  - `pnpm exec next build` (Next.js production bundle compilation).
- **Constraints**:
  - All public views must reside under `src/app/(blank-layout-pages)/` to avoid rendering the authenticated dashboard sidebar.
  - Password rules: 8–72 characters, at least 1 letter and 1 number.
  - Tenant slugs must be sanitized: lowercase, alphanumeric and hyphens (`^[a-z0-9]+(-[a-z0-9]+)*$`).
  - Zero dead code / no backup files (Rule R1).

## Architecture decisions

- **ADR-001: Blank Layout Convention for Public Authentication Flows**
  - **Decision:** Place `/register`, `/verify-email`, `/forgot-password`, and `/reset-password` under `src/app/(blank-layout-pages)/`.
  - **Rationale:** Ensures clean, distraction-free visual presentation consistent with `/login`, preventing authenticated shell elements from leaking into public flows.
  - **Rejected alternative:** Embedding registration inside the main dashboard layout behind conditional flags.

- **ADR-002: Token Hash Auto-Verification on Mount with Resend Fallback**
  - **Decision:** In `/verify-email`, parse the `token_hash` query parameter on mount, trigger `verifyEmail`, and immediately store the returned session; if the token is invalid or expired, render an informative alert with a single-click `resendVerificationEmail` button.
  - **Rationale:** Provides zero-friction activation for users coming from email links while making expiration easily recoverable.
  - **Rejected alternative:** Requiring the user to manually copy and paste token codes into input fields.

- **ADR-003: Client-Side Anti-Enumeration Feedback**
  - **Decision:** In `/forgot-password`, display a generic success message confirming that if the email is associated with an active account, recovery instructions were dispatched.
  - **Rationale:** Aligns with backend security invariant (FR-AUTH-014 / FR-AUTH-022) to prevent unauthorized user enumeration attacks.
  - **Rejected alternative:** Revealing whether an email exists in the database.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| **Contract / API** | `src/graphql/auth.gql.ts` | Add `SIGN_UP_MUTATION`, `VERIFY_EMAIL_MUTATION`, `RESEND_VERIFICATION_EMAIL_MUTATION`, `REQUEST_PASSWORD_RESET_MUTATION`, and `RESET_PASSWORD_MUTATION`. |
| **Domain / Service** | `src/services/authService.ts` | Implement `signUp`, `verifyEmail`, `resendVerificationEmail`, `requestPasswordReset`, and `resetPassword` methods. |
| **Client / Views** | `src/views/auth/` | Create `RegisterView.tsx`, `VerifyEmailView.tsx`, `ForgotPasswordView.tsx`, and `ResetPasswordView.tsx`. |
| **Routing** | `src/app/(blank-layout-pages)/` | Create route pages: `register/page.tsx`, `verify-email/page.tsx`, `forgot-password/page.tsx`, and `reset-password/page.tsx`. |

## Cross-sidecar integration

- **Producer**: `sidecars/forge-backend` exposes `signUp`, `verifyEmail`, `resendVerificationEmail`, `requestPasswordReset`, and `resetPassword` in `src/modules/auth/resolvers/auth.resolver.ts`.
- **Consumer**: `sidecars/forge-front` consumes these endpoints via `authService.ts`.
- **Contract status**: 100% aligned with BE-AUTH in `forge-backend`. No backend changes required.

## Testing strategy

- **Static Analysis**: Run `pnpm exec tsc --noEmit` and `pnpm exec eslint` over all created/modified files.
- **Production Build**: Verify full page compilation with `pnpm exec next build`.
- **Integration Flow**:
  1. Access `/register`, fill organization name, verify automatic slug generation, and submit.
  2. Access `/forgot-password`, submit email, and verify anti-enumeration alert.
  3. Access `/verify-email?token_hash=test_token`, verify token handling and resend button.
  4. Access `/reset-password?token_hash=test_token`, enter new password, and verify redirection to `/login`.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Slug collision on registration** | Mutation fails with unique constraint | Sanitize slug and display immediate suggestion to pick an alternative URL slug. |
| **Expired email token** | User cannot activate account | Display clear expiration alert with direct action to re-send confirmation email. |
| **Weak password entry** | Submission rejected by backend | Client-side validation enforces 8–72 characters, letters, and numbers before network call. |
