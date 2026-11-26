import { Page } from '@playwright/test'

export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')

  // Set mock session directly in localStorage
  await page.evaluate(() => {
    const session = {
      accessToken: 'mock-access-token-jwt-test',
      refreshToken: 'mock-refresh-token-jwt-test',
      expiresIn: 3600,
      tokenType: 'Bearer'
    }
    const user = {
      id: 'usr-admin-test',
      email: 'admin@forge.test',
      nombre: 'Admin Tester',
      rol: 'ADMIN',
      tenantId: 'ten-e2e-test',
      tenantName: 'Empresa Test E2E C.A.'
    }
    localStorage.setItem('foundly_auth_session', JSON.stringify(session))
    localStorage.setItem('foundly_auth_user', JSON.stringify(user))
    document.cookie = 'foundly_auth_token=mock-access-token-jwt-test; path=/;'
  })
}
