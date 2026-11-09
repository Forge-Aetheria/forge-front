// Documentos GraphQL para el ciclo de autenticación y sesión

export const SIGN_IN_MUTATION = `
  mutation SignIn($input: IniciarSesionInput!) {
    signIn(input: $input) {
      accessToken
      refreshToken
      tokenType
      expiresIn
      expiresAt
    }
  }
`

export const ME_QUERY = `
  query Me {
    me {
      id
      email
      name
      phone
      avatarUrl
      role
      roles
      tenantId
      tenantName
      tenantSlug
      lastLoginAt
      createdAt
    }
  }
`

export const UPDATE_MY_PROFILE_MUTATION = `
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      profile {
        id
        email
        name
        phone
        avatarUrl
        role
        roles
        tenantId
        tenantName
        tenantSlug
        lastLoginAt
        createdAt
      }
    }
  }
`

export const CHANGE_MY_PASSWORD_MUTATION = `
  mutation ChangeMyPassword($input: ChangeMyPasswordInput!) {
    changeMyPassword(input: $input) {
      success
      message
    }
  }
`

export const REFRESH_SESSION_MUTATION = `
  mutation RefreshSession($input: RefrescarSesionInput!) {
    refreshSession(input: $input) {
      accessToken
      refreshToken
      tokenType
      expiresIn
      expiresAt
    }
  }
`

export const SIGN_OUT_MUTATION = `
  mutation SignOut($scope: SignOutScope) {
    signOut(scope: $scope)
  }
`
