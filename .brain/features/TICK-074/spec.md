# EARS Specification: FE-TEST: Suite de pruebas E2E automatizadas para flujos críticos (Playwright / MSW)

- **Ticket**: .agents/tickets/backlog/TICK-074-forge-front-fe-test-suite-pruebas-e2e-playwright.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-25
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Approved

## Context

Tras implementar la infraestructura de mocks con MSW (TICK-073), el cliente web puede simular el 100% de los contratos GraphQL y persistir mutaciones en memoria. Se requiere una suite de pruebas End-to-End con Playwright que automatice la navegación real por la interfaz de usuario en el navegador (páginas, formularios, drawers, tablas, modales y validaciones) sin requerir backend ni base de datos externa.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The system SHALL configure Playwright to run tests against the Next.js application with `NEXT_PUBLIC_ENABLE_E2E_MOCKS=true`.
- **REQ-U-002** Test execution SHALL NOT require live PostgreSQL, Supabase or backend instances.

### Event-driven (When)

- **REQ-E-001** WHEN executing `auth.spec.ts`, the system SHALL verify successful login, dashboard redirection, invalid credential error handling, and session logout.
- **REQ-E-002** WHEN executing `inventory.spec.ts`, the system SHALL verify catalog rendering, open the product creation drawer, submit new product data, and verify its appearance in the catalog table.
- **REQ-E-003** WHEN executing `contacts.spec.ts`, the system SHALL verify the third-party directory, partner creation, and reactive table listing.
- **REQ-E-004** WHEN executing `commerce.spec.ts`, the system SHALL verify sales and purchases quotes creation and approval status transitions.
- **REQ-E-005** WHEN executing `accounting.spec.ts`, the system SHALL verify the chart of accounts (PUC) listing and financial reports navigation.

### State-driven (While)

- **REQ-S-001** WHILE Playwright tests are running, MSW SHALL intercept all GraphQL traffic and serve data from the in-memory test store.

### Unwanted (If / Then)

- **REQ-N-001** IF an invalid form input or credentials are submitted, THEN the system SHALL display the expected visual error message or toast without crashing.

## Acceptance criteria

- **AC-001** GIVEN the frontend running with E2E mocks, WHEN Playwright executes the test suite, THEN all critical user flows (auth, inventory, contacts, commerce, accounting) pass without communicating with external services.
- **AC-002** GIVEN an authenticated session, WHEN a user creates a new product in the drawer, THEN the product is added to the in-memory store and listed in the UI table.
- **AC-003** GIVEN invalid login credentials, WHEN submitted in the login view, THEN an error message is visible to the user.

## Out of scope

- End-to-end tests for mobile `foundly-pos` (covered separately).
- Testing real production backend databases during this suite.

## Assumptions

- MSW service worker (`public/mockServiceWorker.js`) and MockProvider handle all GraphQL requests.

## Open questions

- None.
