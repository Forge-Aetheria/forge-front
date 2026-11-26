import { test, expect } from '@playwright/test'

test.describe('Autenticación y Sesión E2E', () => {
  test('Flujo de Login con credenciales válidas redirige a dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // Llenar formulario
    await page.getByPlaceholder('tu-email@empresa.com').fill('admin@forge.test')
    await page.getByPlaceholder('············').fill('password123')

    // Submit
    await page.locator('button[type="submit"]').click()

    // Debe navegar fuera de login (hacia /home o /dashboard)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  })

  test('Login con credenciales incorrectas muestra alerta de error', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    await page.getByPlaceholder('tu-email@empresa.com').fill('invalid@forge.test')
    await page.getByPlaceholder('············').fill('wrong-password')

    await page.locator('button[type="submit"]').click()

    // Debe mostrar la alerta de error
    const alert = page.locator('.MuiAlert-message')
    await expect(alert).toBeVisible({ timeout: 10000 })
    await expect(alert).toContainText('Credenciales inválidas')
  })
})
