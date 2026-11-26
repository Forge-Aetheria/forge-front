import { HttpResponse } from 'msw'
import { gql } from '../graphql'
import { testStore, MockSalesQuote, MockPurchaseQuote } from '../store/testStore'

export const commerceHandlers = [
  // --- VENTAS ---
  gql.query('GetSalesQuotes', () => {
    return HttpResponse.json({
      data: {
        salesQuotes: testStore.salesQuotes.map(q => ({
          id: q.id,
          number: q.number,
          status: q.state,
          customerId: q.partnerId,
          customer: testStore.partners.find(p => p.id === q.partnerId) || null,
          locationId: 'loc-general',
          orderDiscount: '0.00',
          discountTotal: '0.00',
          subtotal: q.subtotalUsd.toString(),
          total: q.totalUsd.toString(),
          notes: '',
          validUntil: new Date().toISOString(),
          approvedOrderId: null,
          approvedOrder: null,
          createdBy: 'admin',
          createdAt: q.createdAt,
          updatedAt: q.createdAt,
          lines: q.items || []
        }))
      }
    })
  }),

  gql.mutation('CreateSalesQuote', ({ variables }) => {
    const { input } = variables as { input: any }
    const quoteNumber = testStore.salesQuotes.length + 1
    const newQuote: MockSalesQuote = {
      id: `sq-${Date.now()}`,
      number: quoteNumber,
      code: `COT-${String(quoteNumber).padStart(4, '0')}`,
      partnerId: input.customerId,
      state: 'DRAFT',
      subtotalUsd: parseFloat(input.subtotal || '0'),
      totalUsd: parseFloat(input.total || input.subtotal || '0'),
      totalVes: parseFloat(input.total || '0') * 54.5,
      bcvRate: 54.5,
      items: input.lines || [],
      createdAt: new Date().toISOString()
    }
    testStore.salesQuotes.unshift(newQuote)

    return HttpResponse.json({
      data: {
        createSalesQuote: {
          id: newQuote.id,
          number: newQuote.number,
          status: newQuote.state,
          subtotal: newQuote.subtotalUsd.toString(),
          discountTotal: '0.00',
          total: newQuote.totalUsd.toString(),
          notes: input.notes || '',
          validUntil: input.validUntil || new Date().toISOString(),
          createdAt: newQuote.createdAt
        }
      }
    })
  }),

  gql.mutation('ApproveSalesQuote', ({ variables }) => {
    const { id } = variables as { id: string }
    const quote = testStore.salesQuotes.find(q => q.id === id)
    if (quote) quote.state = 'APPROVED'
    return HttpResponse.json({
      data: {
        approveSalesQuote: {
          id,
          number: quote ? quote.number : 1,
          status: 'APPROVED'
        }
      }
    })
  }),

  gql.query('GetActiveBcvRate', () => {
    return HttpResponse.json({
      data: {
        activeBcvRate: {
          rate: testStore.tenantSettings.bcv_rate || '54.50',
          fetchedAt: new Date().toISOString()
        }
      }
    })
  }),

  // --- COMPRAS ---
  gql.query('GetPurchaseQuotes', () => {
    return HttpResponse.json({
      data: {
        purchaseQuotes: testStore.purchaseQuotes.map(q => ({
          id: q.id,
          code: q.code || `OC-${q.number}`,
          status: q.state,
          supplierId: q.supplierId,
          supplierReference: 'REF-001',
          paymentCondition: 'INMEDIATO',
          creditDays: 0,
          baseCurrency: 'USD',
          exchangeRate: q.bcvRate.toString(),
          validUntil: new Date().toISOString(),
          estimatedDelivery: new Date().toISOString(),
          appliesVat: true,
          appliesIgtf: false,
          notes: '',
          subtotal: q.subtotalUsd.toString(),
          vatCredit: (q.subtotalUsd * 0.16).toString(),
          igtfAmount: '0.00',
          totalUsd: q.totalUsd.toString(),
          lines: q.items || [],
          createdAt: q.createdAt,
          updatedAt: q.createdAt
        }))
      }
    })
  }),

  gql.mutation('CreatePurchaseQuote', ({ variables }) => {
    const { input } = variables as { input: any }
    const number = testStore.purchaseQuotes.length + 1
    const subtotal = parseFloat(input.subtotal || '0')
    const total = parseFloat(input.totalUsd || subtotal.toString())

    const newQuote: MockPurchaseQuote = {
      id: `pq-${Date.now()}`,
      number,
      code: `COM-${String(number).padStart(4, '0')}`,
      supplierId: input.supplierId,
      state: 'DRAFT',
      subtotalUsd: subtotal,
      totalUsd: total,
      totalVes: total * 54.5,
      bcvRate: 54.5,
      items: input.lines || [],
      createdAt: new Date().toISOString()
    }
    testStore.purchaseQuotes.unshift(newQuote)

    return HttpResponse.json({
      data: {
        createPurchaseQuote: {
          id: newQuote.id,
          code: newQuote.code,
          status: newQuote.state,
          supplierId: newQuote.supplierId,
          subtotal: newQuote.subtotalUsd.toString(),
          totalUsd: newQuote.totalUsd.toString(),
          createdAt: newQuote.createdAt,
          updatedAt: newQuote.createdAt,
          lines: []
        }
      }
    })
  }),

  gql.mutation('ApprovePurchaseQuote', ({ variables }) => {
    const { id } = variables as { id: string }
    const quote = testStore.purchaseQuotes.find(q => q.id === id)
    if (quote) quote.state = 'APPROVED'
    return HttpResponse.json({
      data: {
        approvePurchaseQuote: {
          id,
          status: 'APPROVED'
        }
      }
    })
  }),

  gql.mutation('ConvertQuoteToPurchaseOrder', ({ variables }) => {
    const { quoteId } = variables as { quoteId: string }
    const orderId = `po-${Date.now()}`
    return HttpResponse.json({
      data: {
        convertQuoteToPurchaseOrder: {
          id: orderId,
          code: `OC-${Date.now().toString().slice(-4)}`,
          state: 'CONFIRMED'
        }
      }
    })
  }),

  // --- POS ---
  gql.query('GetPosTerminals', () => {
    return HttpResponse.json({
      data: {
        posTerminals: [
          {
            id: 'pos-term-01',
            name: 'Caja Principal 01',
            code: 'CAJA-01',
            isActive: true,
            status: 'OPEN'
          }
        ]
      }
    })
  }),

  gql.query('GetActivePosShift', () => {
    const active = testStore.posShifts.find(s => s.status === 'OPEN')
    return HttpResponse.json({
      data: {
        activePosShift: active || null
      }
    })
  }),

  gql.mutation('OpenPosShift', ({ variables }) => {
    const { input } = variables as { input: any }
    const newShift = {
      id: `shift-${Date.now()}`,
      terminalId: input.terminalId || 'pos-term-01',
      openedAt: new Date().toISOString(),
      closedAt: null,
      openingCashUsd: input.openingCashUsd || '50.00',
      status: 'OPEN'
    }
    testStore.posShifts.push(newShift)
    return HttpResponse.json({
      data: { openPosShift: newShift }
    })
  }),

  gql.mutation('ClosePosShift', ({ variables }) => {
    const { shiftId } = variables as { shiftId: string }
    const shift = testStore.posShifts.find(s => s.id === shiftId)
    if (shift) {
      shift.status = 'CLOSED'
      shift.closedAt = new Date().toISOString()
    }
    return HttpResponse.json({
      data: {
        closePosShift: shift || { id: shiftId, status: 'CLOSED' }
      }
    })
  }),

  gql.query('GetTenantSetting', ({ variables }) => {
    const { key } = variables as { key: string }
    return HttpResponse.json({
      data: {
        tenantSetting: testStore.tenantSettings[key] || ''
      }
    })
  }),

  gql.mutation('SetTenantSetting', ({ variables }) => {
    const { key, value } = variables as { key: string; value: string }
    testStore.tenantSettings[key] = value
    return HttpResponse.json({
      data: {
        setTenantSetting: true
      }
    })
  })
]
