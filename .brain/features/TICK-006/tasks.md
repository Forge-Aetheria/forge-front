# Tasks: FE-AUTH: Ciclo de Autenticación Pública, Registro y Recuperación de Credenciales

- **Ticket**: .agents/tickets/in-analysis/TICK-006-fe-onboarding-auth-lifecycle.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-006/plan.md`
- **Date**: 2026-11-10

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `src/graphql/auth.gql.ts` Declare GraphQL write mutations `SIGN_UP_MUTATION`, `VERIFY_EMAIL_MUTATION`, `RESEND_VERIFICATION_EMAIL_MUTATION`, `REQUEST_PASSWORD_RESET_MUTATION`, and `RESET_PASSWORD_MUTATION`. (REQ-U-001)
- [x] T002 `src/services/authService.ts` Implement `signUp`, `verifyEmail`, `resendVerificationEmail`, `requestPasswordReset`, and `resetPassword` methods with password complexity and slug sanitization. (REQ-U-002, REQ-U-003, REQ-E-001, REQ-E-002, REQ-E-003, REQ-E-004, REQ-E-005)
- [x] T003 `src/views/auth/RegisterView.tsx` Implement public authentication views for registration, email verification, password request, and reset with loading states and non-destructive alerts. (REQ-U-004, REQ-S-001, REQ-N-001, REQ-N-002, REQ-N-003, REQ-O-001)
- [x] T004 `src/app/(blank-layout-pages)/register/page.tsx` Create route pages for registration, email verification, and password recovery under the blank layout directory. (REQ-U-004)
- [x] T005 `forge-front` Run quality gates: TypeScript strict compilation (`tsc --noEmit`), ESLint validation, and Next.js production build (`next build`). (AC-001, AC-002, AC-003, AC-004)

## Dependencies

- T002 depends on T001.
- T003 depends on T001, T002.
- T004 depends on T003.
- T005 depends on T004.

## Final verification

- [x] Run repository tests and static analysis (`tsc --noEmit`, `eslint`, `next build`).
- [x] Verify spec acceptance criteria (AC-001 to AC-004).
- [x] Confirm there is no scope drift.
