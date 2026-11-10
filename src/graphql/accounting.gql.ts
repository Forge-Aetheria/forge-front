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
      balanceUsd
      balanceVes
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
      balanceUsd
      balanceVes
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
  mutation UpdateAccount($id: ID!, $input: UpdateAccountInput!) {
    updateAccount(id: $id, input: $input) {
      id
      code
      name
      currencyScope
      requiresReconciliation
    }
  }
`

export const DEACTIVATE_ACCOUNT_MUTATION = `
  mutation DeactivateAccount($id: ID!) {
    deactivateAccount(id: $id) {
      id
      isActive
    }
  }
`

export const SEED_DEFAULT_CHART_MUTATION = `
  mutation SeedDefaultChartOfAccounts {
    seedDefaultChartOfAccounts {
      id
      code
      name
      type
      normalSide
      currencyScope
      isActive
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
      number
      journalId
      postingDate
      description
      state
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
      number
      journalId
      postingDate
      description
      state
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
      number
      state
      postingDate
      createdAt
    }
  }
`

export const POST_JOURNAL_ENTRY_MUTATION = `
  mutation PostJournalEntry($id: ID!, $idempotencyKey: String!) {
    postJournalEntry(id: $id, idempotencyKey: $idempotencyKey) {
      id
      number
      state
      postingDate
      updatedAt
    }
  }
`

export const CANCEL_JOURNAL_ENTRY_MUTATION = `
  mutation CancelJournalEntry($id: ID!, $reason: String!) {
    cancelJournalEntry(id: $id, reason: $reason) {
      id
      number
      state
    }
  }
`

export const REVERSE_JOURNAL_ENTRY_MUTATION = `
  mutation ReverseJournalEntry($input: ReverseJournalEntryInput!) {
    reverseJournalEntry(input: $input) {
      id
      number
      state
    }
  }
`
