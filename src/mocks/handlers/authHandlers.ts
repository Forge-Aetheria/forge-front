import { HttpResponse } from 'msw'
import { gql } from '../graphql'
import { testStore } from '../store/testStore'

export const authHandlers = [
  gql.mutation('SignIn', ({ variables }) => {
    const { input } = variables as { input: { email?: string; password?: string } }

    if (input.email === 'invalid@forge.test' || input.password === 'wrong-password') {
      return HttpResponse.json({
        errors: [{ message: 'Credenciales inválidas', extensions: { code: 'UNAUTHENTICATED' } }]
      })
    }

    return HttpResponse.json({
      data: {
        signIn: {
          accessToken: 'mock-access-token-jwt-test',
          refreshToken: 'mock-refresh-token-jwt-test',
          expiresIn: 3600,
          tokenType: 'Bearer',
          user: {
            id: testStore.currentUser.id,
            email: input.email || testStore.currentUser.email,
            nombre: testStore.currentUser.nombre,
            rol: testStore.currentUser.rol,
            tenantId: testStore.currentUser.tenantId,
            tenantName: testStore.currentUser.tenantName
          }
        }
      }
    })
  }),

  gql.query('Me', () => {
    return HttpResponse.json({
      data: {
        me: {
          id: testStore.currentUser.id,
          email: testStore.currentUser.email,
          nombre: testStore.currentUser.nombre,
          telefono: testStore.currentUser.telefono,
          avatarUrl: testStore.currentUser.avatarUrl,
          rol: testStore.currentUser.rol,
          tenantId: testStore.currentUser.tenantId,
          tenantName: testStore.currentUser.tenantName,
          status: 'ACTIVO',
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      }
    })
  }),

  gql.mutation('UpdateMyProfile', ({ variables }) => {
    const { input } = variables as { input: any }
    if (input.nombre) testStore.currentUser.nombre = input.nombre
    if (input.telefono) testStore.currentUser.telefono = input.telefono

    return HttpResponse.json({
      data: {
        updateMyProfile: {
          profile: {
            ...testStore.currentUser,
            status: 'ACTIVO'
          }
        }
      }
    })
  }),

  gql.mutation('RefreshSession', () => {
    return HttpResponse.json({
      data: {
        refreshSession: {
          accessToken: 'mock-refreshed-access-token-jwt',
          refreshToken: 'mock-refreshed-refresh-token-jwt',
          expiresIn: 3600,
          tokenType: 'Bearer'
        }
      }
    })
  }),

  gql.mutation('SignOut', () => {
    return HttpResponse.json({
      data: {
        signOut: true
      }
    })
  }),

  gql.query('GetTenantOnboardingStatus', () => {
    return HttpResponse.json({
      data: {
        myTenantOnboardingStatus: {
          isCompleted: true,
          completedAt: '2026-01-01T00:00:00.000Z'
        }
      }
    })
  }),

  gql.query('GetTenantOnboarding', () => {
    return HttpResponse.json({
      data: {
        tenantOnboarding: {
          isCompleted: true,
          currentStep: 'COMPLETED',
          fiscalData: {
            rif: 'J-12345678-0',
            legalName: testStore.currentUser.tenantName,
            commercialName: testStore.currentUser.tenantName
          }
        }
      }
    })
  })
]
