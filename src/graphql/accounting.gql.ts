// Documentos GraphQL para el módulo Contable (BE-ACC-01 / Fase 1)

export const GET_ACCOUNTS_QUERY = `
  query GetAccounts($where: AccountWhereInput, $orderBy: [AccountOrderByWithRelationInput!], $take: Int, $skip: Int) {
    accounts(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      code
      name
      type
      normalSide
      currencyScope
      requiresReconciliation
      isActive
      parentId
      createdAt
      updatedAt
    }
  }
`

export const GET_ACCOUNT_QUERY = `
  query GetAccount($id: ID!) {
    account(id: $id) {
      id
      code
      name
      type
      normalSide
      currencyScope
      requiresReconciliation
      isActive
      parentId
      createdAt
      updatedAt
    }
  }
`

export const CREATE_ACCOUNT_MUTATION = `
  mutation CreateAccount($input: AccountInput!) {
    createAccount(input: $input) {
      id
      code
      name
      type
      normalSide
      currencyScope
      requiresReconciliation
      isActive
    }
  }
`

export const UPDATE_ACCOUNT_MUTATION = `
  mutation UpdateAccount($input: UpdateAccountInput!) {
    updateAccount(input: $input) {
      id
      code
      name
      currencyScope
      requiresReconciliation
    }
  }
`

export const DEACTIVATE_ACCOUNT_MUTATION = `
  mutation DeactivateAccount($accountId: ID!) {
    deactivateAccount(accountId: $accountId) {
      id
      isActive
    }
  }
`

export const SEED_DEFAULT_CHART_MUTATION = `
  mutation SeedDefaultChartOfAccounts {
    seedDefaultChartOfAccounts {
      accountsCreated
      journalsCreated
      alreadySeeded
    }
  }
`

export const GET_JOURNALS_QUERY = `
  query GetJournals($where: JournalWhereInput, $take: Int, $skip: Int) {
    journals(where: $where, take: $take, skip: $skip) {
      id
      code
      name
      type
      defaultAccountId
      currency
      color
      isActive
      createdAt
      updatedAt
    }
  }
`

export const CREATE_JOURNAL_MUTATION = `
  mutation CreateJournal($input: JournalInput!) {
    createJournal(input: $input) {
      id
      code
      name
      type
      defaultAccountId
      currency
      color
      isActive
    }
  }
`

export const GET_JOURNAL_ENTRIES_QUERY = `
  query GetJournalEntries($where: JournalEntryWhereInput, $orderBy: [JournalEntryOrderByWithRelationInput!], $take: Int, $skip: Int) {
    journalEntries(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      entryNumber
      journalId
      postingDate
      description
      status
      source
      sourceReference
      exchangeRate
      lines {
        id
        accountId
        debitUsd
        creditUsd
        debitVes
        creditVes
        label
        account {
          id
          code
          name
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_JOURNAL_ENTRY_QUERY = `
  query GetJournalEntry($id: ID!) {
    journalEntry(id: $id) {
      id
      entryNumber
      journalId
      postingDate
      description
      status
      source
      sourceReference
      exchangeRate
      lines {
        id
        accountId
        debitUsd
        creditUsd
        debitVes
        creditVes
        label
        account {
          id
          code
          name
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const CREATE_JOURNAL_ENTRY_MUTATION = `
  mutation CreateJournalEntry($input: JournalEntryInput!) {
    createJournalEntry(input: $input) {
      id
      entryNumber
      status
      postingDate
      createdAt
    }
  }
`

export const POST_JOURNAL_ENTRY_MUTATION = `
  mutation PostJournalEntry($entryId: ID!, $idempotencyKey: String!) {
    postJournalEntry(entryId: $entryId, idempotencyKey: $idempotencyKey) {
      id
      entryNumber
      status
      postingDate
      updatedAt
    }
  }
`

export const CANCEL_JOURNAL_ENTRY_MUTATION = `
  mutation CancelJournalEntry($input: CancelJournalEntryInput!) {
    cancelJournalEntry(input: $input) {
      id
      entryNumber
      status
    }
  }
`

export const REVERSE_JOURNAL_ENTRY_MUTATION = `
  mutation ReverseJournalEntry($input: ReverseJournalEntryInput!) {
    reverseJournalEntry(input: $input) {
      originalEntryId
      reversalEntryId
      affectedAccountIds
    }
  }
`

export const GET_INVOICES_QUERY = `
  query GetInvoices($where: AccountingInvoiceWhereInput, $orderBy: [AccountingInvoiceOrderByWithRelationInput!], $take: Int, $skip: Int) {
    accountingInvoices(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      number
      invoiceType
      status
      customerId
      supplierId
      issueDate
      dueDate
      exchangeRate
      subtotal
      vatTotal
      total
      pendingBalance
      entryId
      customer {
        id
        legalName
        tradeName
        docType
        docNumber
        checkDigit
      }
      supplier {
        id
        legalName
        tradeName
        docType
        docNumber
        checkDigit
      }
      lines {
        id
        description
        quantity
        unitPrice
        vatRate
        subtotal
        vatAmount
        total
        accountId
      }
      allocations {
        id
        invoiceId
        appliedUsd
        appliedVes
        payment {
          id
          number
          createdAt
          amount
          currency
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_INVOICE_QUERY = `
  query GetInvoice($id: ID!) {
    accountingInvoice(id: $id) {
      id
      number
      invoiceType
      status
      customerId
      supplierId
      issueDate
      dueDate
      exchangeRate
      subtotal
      vatTotal
      total
      pendingBalance
      entryId
      customer {
        id
        legalName
        tradeName
        docType
        docNumber
        checkDigit
        fiscalAddress
      }
      supplier {
        id
        legalName
        tradeName
        docType
        docNumber
        checkDigit
        fiscalAddress
      }
      lines {
        id
        description
        quantity
        unitPrice
        vatRate
        subtotal
        vatAmount
        total
        accountId
      }
      allocations {
        id
        invoiceId
        appliedUsd
        appliedVes
        payment {
          id
          number
          createdAt
          amount
          currency
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const CREATE_CUSTOMER_INVOICE_MUTATION = `
  mutation CreateCustomerInvoice($input: CustomerInvoiceInput!) {
    createCustomerInvoice(input: $input) {
      id
      number
      status
      total
      createdAt
    }
  }
`

export const POST_CUSTOMER_INVOICE_MUTATION = `
  mutation PostCustomerInvoice($invoiceId: ID!) {
    postCustomerInvoice(invoiceId: $invoiceId) {
      id
      number
      status
      updatedAt
    }
  }
`

export const CREATE_SUPPLIER_INVOICE_MUTATION = `
  mutation CreateSupplierInvoice($input: SupplierInvoiceInput!) {
    createSupplierInvoice(input: $input) {
      id
      number
      status
      total
      createdAt
    }
  }
`

export const POST_SUPPLIER_INVOICE_MUTATION = `
  mutation PostSupplierInvoice($invoiceId: ID!) {
    postSupplierInvoice(invoiceId: $invoiceId) {
      id
      number
      status
      updatedAt
    }
  }
`

export const CANCEL_CUSTOMER_INVOICE_MUTATION = `
  mutation CancelCustomerInvoice($input: CancelInvoiceInput!) {
    cancelCustomerInvoice(input: $input) {
      id
      status
    }
  }
`

export const CANCEL_SUPPLIER_INVOICE_MUTATION = `
  mutation CancelSupplierInvoice($input: CancelInvoiceInput!) {
    cancelSupplierInvoice(input: $input) {
      id
      status
    }
  }
`

export const GET_PAYMENTS_QUERY = `
  query GetPayments($where: PaymentWhereInput, $orderBy: [PaymentOrderByWithRelationInput!], $take: Int, $skip: Int) {
    payments(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      number
      amount
      currency
      exchangeRate
      reference
      contactId
      journalId
      allocations {
        id
        invoiceId
        appliedUsd
        appliedVes
        invoice {
          id
          number
          invoiceType
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const REGISTER_PAYMENT_MUTATION = `
  mutation RegisterPayment($input: RegisterPaymentInput!) {
    registerPayment(input: $input) {
      id
      number
      amount
      createdAt
    }
  }
`

export const CANCEL_PAYMENT_MUTATION = `
  mutation CancelPayment($input: CancelPaymentInput!) {
    cancelPayment(input: $input) {
      id
    }
  }
`

export const GET_CREDIT_NOTES_QUERY = `
  query GetCreditNotes($where: CreditNoteWhereInput, $orderBy: [CreditNoteOrderByWithRelationInput!], $take: Int, $skip: Int) {
    creditNotes(where: $where, orderBy: $orderBy, take: $take, skip: $skip) {
      id
      number
      status
      invoiceId
      subtotal
      vatTotal
      total
      issueDate
      reason
      invoice {
        id
        number
      }
      createdAt
      updatedAt
    }
  }
`

export const POST_CREDIT_NOTE_MUTATION = `
  mutation PostCreditNote($input: CreditNoteInput!) {
    postCreditNote(input: $input) {
      id
      number
      status
      total
      createdAt
    }
  }
`

export const CANCEL_CREDIT_NOTE_MUTATION = `
  mutation CancelCreditNote($input: CancelCreditNoteInput!) {
    cancelCreditNote(input: $input) {
      id
      status
    }
  }
`

export const GET_BALANCE_SHEET_QUERY = `
  query GetBalanceSheet($asOf: DateTime!, $includeDrafts: Boolean, $ratePolicy: RatePolicy, $closingRate: String) {
    balanceSheet(asOf: $asOf, includeDrafts: $includeDrafts, ratePolicy: $ratePolicy, closingRate: $closingRate) {
      meta {
        generatedAt
        dateTo
        ratePolicy
        closingRate
        balanced
      }
      sections {
        id
        label
        level
        amounts {
          usd { amount }
          ves { amount }
        }
        subsections {
          id
          label
          level
          amounts {
            usd { amount }
            ves { amount }
          }
          accounts {
            accountId
            accountType
            normalSide
            code
            name
            amounts {
              usd { amount }
              ves { amount }
            }
          }
        }
      }
      equation {
        assets { usd { amount } ves { amount } }
        liabilities { usd { amount } ves { amount } }
        equity { usd { amount } ves { amount } }
        currentResult { usd { amount } ves { amount } }
        retainedEarnings { usd { amount } ves { amount } }
        balanced
        differenceUsd
        differenceVes
      }
    }
  }
`

export const GET_PROFIT_AND_LOSS_QUERY = `
  query GetProfitAndLoss($dateFrom: DateTime!, $dateTo: DateTime!, $includeDrafts: Boolean, $ratePolicy: RatePolicy, $closingRate: String) {
    profitAndLoss(dateFrom: $dateFrom, dateTo: $dateTo, includeDrafts: $includeDrafts, ratePolicy: $ratePolicy, closingRate: $closingRate) {
      meta {
        generatedAt
        dateFrom
        dateTo
        ratePolicy
      }
      lines {
        id
        accountId
        code
        name
        section
        level
        amounts {
          usd { amount }
          ves { amount }
        }
      }
      totals {
        revenue { usd { amount } ves { amount } }
        costOfGoods { usd { amount } ves { amount } }
        grossProfit { usd { amount } ves { amount } }
        operatingExpenses { usd { amount } ves { amount } }
        operatingResult { usd { amount } ves { amount } }
        netResult { usd { amount } ves { amount } }
      }
    }
  }
`

export const GET_TRIAL_BALANCE_QUERY = `
  query GetTrialBalance($asOf: DateTime!, $includeDrafts: Boolean, $ratePolicy: RatePolicy, $closingRate: String) {
    trialBalance(asOf: $asOf, includeDrafts: $includeDrafts, ratePolicy: $ratePolicy, closingRate: $closingRate) {
      meta {
        generatedAt
        dateTo
      }
      accounts {
        accountId
        accountType
        normalSide
        code
        name
        opening { usd { amount } ves { amount } }
        debit { usd { amount } ves { amount } }
        credit { usd { amount } ves { amount } }
        closing { usd { amount } ves { amount } }
      }
      totals {
        debit { usd { amount } ves { amount } }
        credit { usd { amount } ves { amount } }
        balanced
        differenceUsd
        differenceVes
      }
    }
  }
`

export const GET_GENERAL_LEDGER_QUERY = `
  query GetGeneralLedger($dateFrom: DateTime!, $dateTo: DateTime!, $accountId: String, $includeDrafts: Boolean, $page: Int, $pageSize: Int) {
    generalLedger(dateFrom: $dateFrom, dateTo: $dateTo, accountId: $accountId, includeDrafts: $includeDrafts, page: $page, pageSize: $pageSize) {
      meta {
        dateFrom
        dateTo
      }
      items {
        entryId
        entryNumber
        postingDate
        status
        journalCode
        accountCode
        accountName
        description
        contactName
        debit { usd { amount } ves { amount } }
        credit { usd { amount } ves { amount } }
        runningBalance { usd { amount } ves { amount } }
      }
      totals {
        debit { usd { amount } ves { amount } }
        credit { usd { amount } ves { amount } }
      }
      pagination {
        totalItems
        page
        pageSize
        totalPages
      }
    }
  }
`

export const UPSERT_EXCHANGE_RATE_MUTATION = `
  mutation UpsertExchangeRate($input: ExchangeRateInput!) {
    upsertExchangeRate(input: $input) {
      id
      rate
      source
      effectiveDate
      updatedAt
    }
  }
`

export const GET_ACCOUNTING_DASHBOARD_QUERY = `
  query GetAccountingDashboard($asOf: DateTime!, $dateFrom: DateTime!, $dateTo: DateTime!) {
    accountingDashboard(asOf: $asOf, dateFrom: $dateFrom, dateTo: $dateTo) {
      journals {
        id
        code
        name
        type
        currency
        balance { usd { amount } ves { amount } }
      }
      kpis {
        accountsPayable { usd { amount } ves { amount } }
        accountsReceivable { usd { amount } ves { amount } }
        liquidity { usd { amount } ves { amount } }
        netResult { usd { amount } ves { amount } }
        netResultPeriod { dateFrom dateTo }
      }
      meta {
        generatedAt
        dateFrom
        dateTo
        balanced
        ratePolicy
        includeDrafts
        warnings
      }
    }
  }
`
