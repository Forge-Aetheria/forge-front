# EARS Specification: FE-ACC-INVOICES: Integración de Facturación CxC/CxP, Notas de Crédito y Pagos con GraphQL

- **Ticket**: .agents/tickets/in-analysis/TICK-019-fe-acc-invoices-credit-notes-payments.md
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-10
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, the invoicing, payments, and credit notes interfaces under `/accounting` (`/accounting/invoices`, `/accounting/credit-notes`, and `/accounting/payments`) currently simulate financial documents in browser `localStorage`. Invoices do not post double-entry ledger entries in PostgreSQL, payments do not reconcile against outstanding balances, and no currency exchange differences (FX) or IGTF retentions are recorded.

In `forge-backend`, the accounting domain (`src/modules/accounting`, BE-ACC-01 Phases 2 and 3) provides transactional invoicing and treasury operations:
- Customer invoices (`createCustomerInvoice`, `postCustomerInvoice`, `cancelCustomerInvoice`) generating automatic revenue, accounts receivable (AR), and VAT entries.
- Supplier bills (`createSupplierInvoice`, `postSupplierInvoice`, `cancelSupplierInvoice`) generating expense/asset, accounts payable (AP), and fiscal credit entries.
- Credit notes (`postCreditNote`, `cancelCreditNote`) reducing invoice pending balances and generating mirror reversal lines.
- Treasury payments (`registerPayment`, `cancelPayment`) with multi-invoice allocation, automatic FX gain/loss realization, and IGTF posting.

Connecting `forge-front` to these operations provides true end-to-end commercial-to-accounting integration.

## EARS Requirements

### Ubiquitous

Requirements that always apply, without an activation condition.

- **REQ-U-001** The system SHALL declare all invoicing, treasury, and credit note operations in `src/graphql/accounting.gql.ts`:
  - Queries: `accountingInvoices`, `accountingInvoice(id)`, `customerReceivables(asOf)`, `payments`, `payment(id)`, `creditNotes`, `creditNote(id)`.
  - Mutations: `createCustomerInvoice`, `postCustomerInvoice`, `cancelCustomerInvoice`, `createSupplierInvoice`, `postSupplierInvoice`, `cancelSupplierInvoice`, `registerPayment`, `cancelPayment`, `postCreditNote`, `cancelCreditNote`.
- **REQ-U-002** The system SHALL format all numeric prices, taxes, discounts, exchange rates, and payment allocations as 4-decimal strings (`String` scalar for `Decimal(12,4)` backend compatibility).
- **REQ-U-003** The system SHALL generate a unique UUIDv4 `idempotencyKey` for every invoice creation, invoice posting, payment registration, and credit note posting.
- **REQ-U-004** The system SHALL link customers and suppliers exclusively to valid `Partner` UUIDs (`TICK-008`).

### Event-driven (When)

- **REQ-E-001** WHEN the user views `/accounting/invoices`, the system SHALL query `accountingInvoices` and render live customer and supplier documents.
- **REQ-E-002** WHEN the user submits a customer invoice, the system SHALL execute `createCustomerInvoice` and `postCustomerInvoice`, generating the corresponding double-entry ledger record.
- **REQ-E-003** WHEN the user registers a supplier invoice, the system SHALL execute `createSupplierInvoice` and `postSupplierInvoice`, establishing the accounts payable liability.
- **REQ-E-004** WHEN the user submits a payment or collection on `/accounting/payments`, the system SHALL execute `registerPayment` with invoice allocations, reflecting balance deduction and journal posting.
- **REQ-E-005** WHEN the user registers a credit note on `/accounting/credit-notes`, the system SHALL execute `postCreditNote` linking the target invoice and updating its pending balance.

### State-driven (While)

- **REQ-S-001** WHILE an invoice or payment mutation is processing, the system SHALL disable action buttons and show a loading indicator.
- **REQ-S-002** WHILE an invoice is in `PAID` or `CANCELED` status, the system SHALL disable payment allocation and invoice editing.

### Unwanted (If / Then)

- **REQ-N-001** IF a payment allocation amount exceeds the remaining unpaid balance of an invoice, THEN the system SHALL block submission and highlight the excess amount.
- **REQ-N-002** IF the backend rejects posting due to a closed fiscal period, THEN the system SHALL display the actionable error alert.
- **REQ-N-003** IF a network timeout occurs during payment registration, THEN the system SHALL enable retrying with the same `idempotencyKey` without duplicating ledger entries.

### Optional (Where)

- **REQ-O-001** WHERE an invoice originates from an approved sales order (`TICK-011`) or purchase reception (`TICK-012`), the system SHALL prefill items, partner UUID, and agreed unit costs.

## Acceptance criteria

- **AC-001** GIVEN a customer invoice with 1 item line, WHEN the user posts the invoice, THEN the system SHALL execute `postCustomerInvoice` and display status `POSTED` with linked journal entry.
- **AC-002** GIVEN a posted customer invoice with $100 pending, WHEN a payment of $100 is registered, THEN the system SHALL execute `registerPayment` and update invoice status to `PAID`.
- **AC-003** GIVEN a posted invoice, WHEN a credit note is submitted, THEN the system SHALL execute `postCreditNote` and reduce the pending invoice balance.
- **AC-004** GIVEN an allocation exceeding the pending balance, WHEN submitting payment, THEN the system SHALL block submission client-side.

## Out of scope

- Direct bank API integrations or webhook reconciliation.
- Automated tax authority (SENIAT) web portal scraping.

## Assumptions

- Chart of accounts and journals exist in the active tenant (`TICK-018`).
- Third-party partners exist in `Partner` (`TICK-008`).

## Open questions

- None.
