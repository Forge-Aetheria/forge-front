import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Módulo de Contactos E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('Carga el directorio de contactos con terceros semilla', async ({ page }) => {
    await page.goto('/contacts')
    await page.waitForLoadState('domcontentloaded')

    // Verificar que el contacto semilla esté visible
    await expect(page.getByText('Distribuidora Mayorista Test C.A.')).toBeVisible({ timeout: 15000 })
  })

  test('Muestra el botón para crear un nuevo contacto', async ({ page }) => {
    await page.goto('/contacts')
    await page.waitForLoadState('domcontentloaded')

    const createBtn = page.getByRole('button', { name: /nuevo/i }).or(page.getByRole('link', { name: /nuevo/i }))
    await expect(createBtn.first()).toBeVisible({ timeout: 10000 })
  })
})
