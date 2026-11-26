import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Módulo de Comercio (Ventas y Compras) E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('Carga el listado de cotizaciones de venta', async ({ page }) => {
    await page.goto('/sales/quotes')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/sales\/quotes/, { timeout: 15000 })
  })

  test('Carga el listado de cotizaciones de compras', async ({ page }) => {
    await page.goto('/purchases/quotes')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/purchases\/quotes/, { timeout: 15000 })
  })
})
