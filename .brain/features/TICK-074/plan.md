# Technical Plan: FE-TEST: Suite de pruebas E2E automatizadas para flujos críticos (Playwright / MSW)

- **Ticket**: .agents/tickets/backlog/TICK-074-forge-front-fe-test-suite-pruebas-e2e-playwright.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Spec**: `.brain/features/TICK-074/spec.md`
- **Date**: 2026-11-25

## Summary

Implementar y configurar una suite completa de pruebas E2E automatizadas en `sidecars/forge-front` usando `@playwright/test`, ejecutándose sobre la capa de mocks de red de MSW (`NEXT_PUBLIC_ENABLE_E2E_MOCKS=true`). La suite prueba los flujos reales de navegación, apertura de drawers, llenado de formularios, mutaciones y verificación de tablas en la UI.

## Technical context

- **Stack**: Next.js 14 (App Router), React 18, TypeScript, Playwright, MSW v2.
- **Dependencies**: `@playwright/test` como devDependency.
- **Configuration**: `playwright.config.ts` configurado para Chromium (headless por defecto).
- **Environment**: `NEXT_PUBLIC_ENABLE_E2E_MOCKS=true`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

## Architecture decisions

- **ADR-001**: Utilizar Playwright sobre MSW en lugar de backend en vivo.
  - *Rationale*: Garantiza pruebas reproducibles, ultrarrápidas, sin contaminación de bases de datos y ejecutables en CI sin Docker/servicios externos.
- **ADR-002**: Agrupar las pruebas por módulos funcionales (`auth.spec.ts`, `inventory.spec.ts`, `contacts.spec.ts`, `commerce.spec.ts`, `accounting.spec.ts`).
  - *Rationale*: Mantiene los tests atómicos, fáciles de mantener y depurar.

## Changes by layer

| Layer | File or module | Change |
| --- | --- | --- |
| Config | `playwright.config.ts` | Configuración de Playwright, webServer y timeouts |
| E2E Tests | `tests/e2e/auth.spec.ts` | Pruebas de login, error de credenciales y logout |
| E2E Tests | `tests/e2e/inventory.spec.ts` | Pruebas de catálogo, drawer de creación y tabla |
| E2E Tests | `tests/e2e/contacts.spec.ts` | Pruebas de directorio de terceros y creación |
| E2E Tests | `tests/e2e/commerce.spec.ts` | Pruebas de compras y ventas |
| E2E Tests | `tests/e2e/accounting.spec.ts` | Pruebas de plan de cuentas y reportes |
| Scripts | `package.json` | Script `"test:e2e"` |

## Testing strategy

- Ejecución de `npx playwright test` en modo headless.
- Verificación de aserciones de URL, visibilidad de elementos y datos reactivos en tablas.

## Risks and mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Tiempos de espera o hidratación lenta de Next.js | Medio | Configurar `waitForLoadState('networkidle')` y timeouts adecuados |
| Service worker no registrado antes de la primera petición | Alto | MockProvider sincroniza el estado `mockReady` antes de montar los componentes |
