import { test, expect } from '@playwright/test'

test.describe('Flujo de Negocio Completo Punta a Punta (E2E Runner)', () => {
  test('Recorrido integral del usuario por todo el sistema', async ({ page }) => {
    // 1. Acceso a Login
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // 2. Iniciar sesión con formulario visual
    await page.getByPlaceholder('tu-email@empresa.com').fill('admin@forge.test')
    await page.getByPlaceholder('············').fill('password123')
    await page.locator('button[type="submit"]').click()

    // 3. Confirmar acceso al sistema
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })

    // 4. Módulo de Inventario
    await page.goto('/inventory/products')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('Café Molido Premium 500g')).toBeVisible({ timeout: 15000 })

    // 5. Módulo de Contactos
    await page.goto('/contacts')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('Distribuidora Mayorista Test C.A.')).toBeVisible({ timeout: 15000 })

    // 6. Módulo de Ventas
    await page.goto('/sales/quotes')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/sales\/quotes/, { timeout: 15000 })

    // 7. Módulo de Contabilidad
    await page.goto('/accounting/chart-of-accounts')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/accounting\/chart-of-accounts/, { timeout: 15000 })
  })
})
