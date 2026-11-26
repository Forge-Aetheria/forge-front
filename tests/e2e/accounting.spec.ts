import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Módulo de Contabilidad E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('Carga el plan de cuentas (PUC)', async ({ page }) => {
    await page.goto('/accounting/chart-of-accounts')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/accounting\/chart-of-accounts/, { timeout: 15000 })
  })

  test('Carga la vista de balance general', async ({ page }) => {
    await page.goto('/accounting/reports/balance-sheet')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/accounting\/reports\/balance-sheet/, { timeout: 15000 })
  })
})
