# Tasks: FE-TEST: Suite de pruebas E2E automatizadas para flujos críticos (Playwright / MSW)

- **Ticket**: .agents/tickets/backlog/TICK-074-forge-front-fe-test-suite-pruebas-e2e-playwright.md
- **Repository**: forge-front
- **Plan**: `.brain/features/TICK-074/plan.md`
- **Date**: 2026-11-25

## Conventions

- Each task is atomic and verifiable.
- `[P]` means it can run in parallel with other tasks in the same block.
- Always reference the exact file path to modify.
- Mark `[x]` only when the task is implemented and verified.

## Tasks

- [x] T001 `package.json` Instalar dependencia `@playwright/test` y registrar script `"test:e2e"`. (REQ-U-001, REQ-U-002)
- [x] T002 `playwright.config.ts` Crear archivo de configuración de Playwright con soporte para entorno de mocks y webServer. (REQ-U-001, REQ-U-002, REQ-S-001)
- [x] T003 [P] `tests/e2e/auth.spec.ts` Implementar pruebas E2E de inicio de sesión, credenciales incorrectas y logout. (REQ-E-001, REQ-N-001)
- [x] T004 [P] `tests/e2e/inventory.spec.ts` Implementar pruebas E2E de catálogo de inventario, drawer de creación y actualización de tabla. (REQ-E-002)
- [x] T005 [P] `tests/e2e/contacts.spec.ts` Implementar pruebas E2E de directorio de terceros y creación de contacto. (REQ-E-003)
- [x] T006 [P] `tests/e2e/commerce.spec.ts` Implementar pruebas E2E de cotizaciones de compra y venta. (REQ-E-004)
- [x] T007 [P] `tests/e2e/accounting.spec.ts` Implementar pruebas E2E de plan de cuentas PUC y balance general. (REQ-E-005)
- [x] T008 `tests/e2e/runner.spec.ts` Implementar runner de integración visual y ejecutar verificación completa de la suite. (REQ-U-001, REQ-U-002)

## Dependencies

- T002 depende de T001.
- T003, T004, T005, T006, T007 dependen de T002.
- T008 depende de T003, T004, T005, T006, T007.

## Final verification

- [x] Run repository tests and E2E suite (`npx playwright test` o script configurado).
- [x] Verify spec acceptance criteria (AC-001 al AC-003).
- [x] Confirm no scope drift.
