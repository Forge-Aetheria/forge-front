import { HttpResponse } from 'msw'
import { gql } from '../graphql'
import { testStore, MockAccount } from '../store/testStore'

export const accountingHandlers = [
  gql.query('GetAccounts', () => {
    return HttpResponse.json({
      data: {
        accounts: testStore.accounts.map(a => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          normalSide: 'DEBIT',
          currencyScope: 'ANY',
          requiresReconciliation: false,
          isActive: a.isActive,
          parentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
      }
    })
  }),

  gql.query('GetAccount', ({ variables }) => {
    const { id } = variables as { id: string }
    const account = testStore.accounts.find(a => a.id === id)
    if (!account) return HttpResponse.json({ data: { account: null } })
    return HttpResponse.json({
      data: {
        account: {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          normalSide: 'DEBIT',
          currencyScope: 'ANY',
          requiresReconciliation: false,
          isActive: account.isActive,
          parentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    })
  }),

  gql.mutation('CreateAccount', ({ variables }) => {
    const { input } = variables as { input: any }
    const newAccount: MockAccount = {
      id: `acc-${Date.now()}`,
      code: input.code,
      name: input.name,
      type: input.type || 'ASSET_CURRENT',
      currency: input.currencyScope || 'USD',
      balanceUsd: 0,
      balanceVes: 0,
      isActive: true
    }
    testStore.accounts.push(newAccount)

    return HttpResponse.json({
      data: {
        createAccount: {
          id: newAccount.id,
          code: newAccount.code,
          name: newAccount.name,
          type: newAccount.type,
          normalSide: 'DEBIT',
          currencyScope: 'ANY',
          requiresReconciliation: false,
          isActive: true
        }
      }
    })
  }),

  gql.query('GetJournals', () => {
    return HttpResponse.json({
      data: {
        journals: [
          { id: 'j-01', code: 'VENTAS', name: 'Diario de Ventas', type: 'SALES', isActive: true },
          { id: 'j-02', code: 'COMPRAS', name: 'Diario de Compras', type: 'PURCHASE', isActive: true },
          { id: 'j-03', code: 'BANCO', name: 'Diario de Banco Principal', type: 'BANK', isActive: true }
        ]
      }
    })
  }),

  gql.query('GetJournalEntries', () => {
    return HttpResponse.json({
      data: {
        journalEntries: testStore.journalEntries.map(e => ({
          id: e.id,
          number: e.number || 1,
          journalId: e.journalId || 'j-01',
          date: e.date || new Date().toISOString(),
          state: e.state || 'POSTED',
          reference: e.reference || 'REF-AUTO',
          totalDebit: e.totalDebit || '100.00',
          totalCredit: e.totalCredit || '100.00',
          lines: []
        }))
      }
    })
  }),

  gql.query('GetBalanceSheet', () => {
    return HttpResponse.json({
      data: {
        balanceSheet: {
          asOf: new Date().toISOString(),
          currency: 'USD',
          assets: { totalUsd: '25000.00', totalVes: '1362500.00', rows: [] },
          liabilities: { totalUsd: '10000.00', totalVes: '545000.00', rows: [] },
          equity: { totalUsd: '15000.00', totalVes: '817500.00', rows: [] }
        }
      }
    })
  }),

  gql.query('GetProfitAndLoss', () => {
    return HttpResponse.json({
      data: {
        profitLoss: {
          from: new Date().toISOString(),
          to: new Date().toISOString(),
          revenue: { totalUsd: '18000.00', totalVes: '981000.00', rows: [] },
          costs: { totalUsd: '9500.00', totalVes: '517750.00', rows: [] },
          netIncome: { totalUsd: '8500.00', totalVes: '463250.00' }
        }
      }
    })
  }),

  gql.query('GetAccountingDashboard', () => {
    return HttpResponse.json({
      data: {
        accountingDashboard: {
          kpis: {
            cashOnHandUsd: '5000.00',
            accountsReceivableUsd: '1200.00',
            accountsPayableUsd: '800.00',
            netMarginPercent: '35.5'
          }
        }
      }
    })
  })
]
