/**
 * E2E Mock Layer Verification Runner
 * Validates that MSW intercepts GraphQL requests, processes mutations,
 * updates in-memory state reactively, and returns exact GraphQL schema responses.
 */

import { server } from '../src/mocks/server'
import { resetTestStore } from '../src/mocks/store/testStore'

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'

async function executeMockGraphQL<T>(query: string, variables: Record<string, unknown> = {}): Promise<{ data?: T; errors?: any[] }> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })
  return res.json()
}

async function runMockE2ETest() {
  console.log('\n🚀 [E2E-MOCK-TEST] Iniciando verificación del motor de mocks MSW...')
  server.listen({ onUnhandledRequest: 'error' })
  resetTestStore()

  let passed = 0
  let failed = 0

  function assert(condition: boolean, stepName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${stepName}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL] ${stepName} ${detail ? `- ${detail}` : ''}`)
      failed++
    }
  }

  try {
    // 1. Auth Flow
    const signInRes = await executeMockGraphQL<{ signIn: { accessToken: string; user: { email: string } } }>(`
      mutation SignIn($input: IniciarSesionInput!) {
        signIn(input: $input) {
          accessToken
          user { email tenantName }
        }
      }
    `, { input: { email: 'admin@forge.test', password: 'password123' } })

    assert(Boolean(signInRes.data?.signIn?.accessToken), '1. Auth: Mutación SignIn retorna access token válido')

    const meRes = await executeMockGraphQL<{ me: { id: string; email: string } }>(`
      query Me {
        me { id email rol tenantId }
      }
    `)
    assert(meRes.data?.me?.email === 'admin@forge.test', '2. Auth: Query Me devuelve perfil del usuario activo')

    // 2. Auth Error Scenario
    const invalidAuthRes = await executeMockGraphQL(`
      mutation SignIn($input: IniciarSesionInput!) {
        signIn(input: $input) { accessToken }
      }
    `, { input: { email: 'invalid@forge.test', password: 'wrong-password' } })
    assert(Boolean(invalidAuthRes.errors?.length), '3. Auth Error: Credenciales inválidas retornan error envelope GraphQL')

    // 3. Inventory: Consultar Catálogo Inicial
    const initialTemplatesRes = await executeMockGraphQL<{ templates: Array<{ id: string; name: string }> }>(`
      query GetTemplates {
        templates { id name uomCode basePrice }
      }
    `)
    const initialCount = initialTemplatesRes.data?.templates?.length || 0
    assert(initialCount > 0, '4. Inventario: Query GetTemplates devuelve productos base')

    // 4. Inventory: Crear Producto
    const createProdRes = await executeMockGraphQL<{ createProductTemplate: { id: string; name: string } }>(`
      mutation CreateProductTemplate($input: CreateProductTemplateInput!) {
        createProductTemplate(input: $input) {
          id
          name
          uomCode
          basePrice
        }
      }
    `, {
      input: {
        name: 'Harina de Maíz 1kg',
        basePrice: '1.50',
        uomCode: 'UNI',
        productType: 'storable',
        variants: [{ sku: 'HAR-001', standardCost: '0.90' }]
      }
    })
    const newProdId = createProdRes.data?.createProductTemplate?.id
    assert(Boolean(newProdId), '5. Inventario: Mutación CreateProductTemplate retorna entidad con ID asignado')

    // 5. Inventory: Reactividad en Memoria (GetTemplates debe contener el nuevo producto)
    const afterTemplatesRes = await executeMockGraphQL<{ templates: Array<{ id: string; name: string }> }>(`
      query GetTemplates {
        templates { id name }
      }
    `)
    const foundCreated = afterTemplatesRes.data?.templates?.some(p => p.id === newProdId)
    assert(Boolean(foundCreated), '6. Inventario: Query GetTemplates refleja el nuevo producto en memoria reactiva')

    // 6. Contactos: Crear Tercero
    const createPartnerRes = await executeMockGraphQL<{ createPartner: { id: string; legalName: string } }>(`
      mutation CreatePartner($input: CreatePartnerInput!) {
        createPartner(input: $input) {
          id
          legalName
          docNumber
          isSupplier
        }
      }
    `, {
      input: {
        legalName: 'Molinos Nacionales C.A.',
        tradeName: 'Monaca',
        docType: 'J',
        docNumber: '30123456',
        checkDigit: '7',
        isSupplier: true,
        isCustomer: false
      }
    })
    const newPartnerId = createPartnerRes.data?.createPartner?.id
    assert(Boolean(newPartnerId), '7. Contactos: Mutación CreatePartner registra nuevo proveedor')

    // 7. Contactos: Listar y verificar reactividad
    const partnersRes = await executeMockGraphQL<{ partners: Array<{ id: string; legalName: string }> }>(`
      query GetPartners {
        partners { id legalName }
      }
    `)
    const partnerFound = partnersRes.data?.partners?.some(p => p.id === newPartnerId)
    assert(Boolean(partnerFound), '8. Contactos: Query GetPartners incluye el nuevo proveedor')

    // 8. Compras: Crear Cotización y Aprobar
    const createPurchaseRes = await executeMockGraphQL<{ createPurchaseQuote: { id: string; code: string } }>(`
      mutation CreatePurchaseQuote($input: CreatePurchaseQuoteInput!) {
        createPurchaseQuote(input: $input) {
          id
          code
          status
        }
      }
    `, {
      input: {
        supplierId: newPartnerId,
        subtotal: '100.00',
        totalUsd: '116.00',
        lines: []
      }
    })
    const purchaseQuoteId = createPurchaseRes.data?.createPurchaseQuote?.id
    assert(Boolean(purchaseQuoteId), '9. Compras: Mutación CreatePurchaseQuote crea cotización')

    const approvePurchaseRes = await executeMockGraphQL<{ approvePurchaseQuote: { status: string } }>(`
      mutation ApprovePurchaseQuote($id: ID!) {
        approvePurchaseQuote(id: $id) { status }
      }
    `, { id: purchaseQuoteId })
    assert(approvePurchaseRes.data?.approvePurchaseQuote?.status === 'APPROVED', '10. Compras: Mutación ApprovePurchaseQuote aprueba cotización')

    // 9. Ventas: Crear Cotización
    const createSalesRes = await executeMockGraphQL<{ createSalesQuote: { id: string; status: string } }>(`
      mutation CreateSalesQuote($input: CreateSalesQuoteInput!) {
        createSalesQuote(input: $input) {
          id
          number
          status
        }
      }
    `, {
      input: {
        customerId: 'part-02',
        subtotal: '55.00',
        total: '55.00'
      }
    })
    assert(Boolean(createSalesRes.data?.createSalesQuote?.id), '11. Ventas: Mutación CreateSalesQuote registra cotización de venta')

    // 10. Contabilidad: Plan de Cuentas y Balances
    const accountsRes = await executeMockGraphQL<{ accounts: Array<{ id: string; code: string; name: string }> }>(`
      query GetAccounts {
        accounts { id code name type }
      }
    `)
    assert(Boolean(accountsRes.data?.accounts?.length), '12. Contabilidad: Query GetAccounts retorna plan de cuentas')

    const balanceRes = await executeMockGraphQL<{ balanceSheet: { currency: string } }>(`
      query GetBalanceSheet {
        balanceSheet { currency assets { totalUsd } }
      }
    `)
    assert(balanceRes.data?.balanceSheet?.currency === 'USD', '13. Contabilidad: Query GetBalanceSheet entrega reporte financiero')

  } catch (err: any) {
    console.error('❌ Error no controlado en la prueba:', err)
    failed++
  } finally {
    server.close()
  }

  console.log(`\n========================================`)
  console.log(`Resumen de Verificación E2E Mocks:`)
  console.log(`✅ Pasadas: ${passed}`)
  console.log(`❌ Fallidas: ${failed}`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runMockE2ETest()
