import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Módulo de Inventario E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('Carga el catálogo de productos y muestra artículos base', async ({ page }) => {
    await page.goto('/inventory/products')
    await page.waitForLoadState('domcontentloaded')

    // Verificar encabezado
    await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible({ timeout: 15000 })

    // Verificar que el producto semilla aparezca en la vista
    await expect(page.getByText('Café Molido Premium 500g')).toBeVisible({ timeout: 10000 })
  })

  test('Navega al formulario de creación de nuevo producto', async ({ page }) => {
    await page.goto('/inventory/products')
    await page.waitForLoadState('domcontentloaded')

    // Click en botón "Nuevo"
    const nuevoBtn = page.getByRole('link', { name: 'Nuevo' })
    await expect(nuevoBtn).toBeVisible()
    await nuevoBtn.click()

    await expect(page).toHaveURL(/\/inventory\/products\/create/, { timeout: 15000 })
  })
})
