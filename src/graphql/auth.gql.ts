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

export const SIGN_UP_MUTATION = `
  mutation SignUp($input: RegistrarCuentaInput!) {
    signUp(input: $input) {
      tenantId
      userId
      requiresEmailVerification
      isExistingAccount
    }
  }
`

export const VERIFY_EMAIL_MUTATION = `
  mutation VerifyEmail($input: VerificarEmailInput!) {
    verifyEmail(input: $input) {
      accessToken
      refreshToken
      tokenType
      expiresIn
      expiresAt
    }
  }
`

export const RESEND_VERIFICATION_EMAIL_MUTATION = `
  mutation ResendVerificationEmail($input: SolicitudEmailInput!) {
    resendVerificationEmail(input: $input)
  }
`

export const REQUEST_PASSWORD_RESET_MUTATION = `
  mutation RequestPasswordReset($input: SolicitudEmailInput!) {
    requestPasswordReset(input: $input)
  }
`

export const RESET_PASSWORD_MUTATION = `
  mutation ResetPassword($input: RestablecerPasswordInput!) {
    resetPassword(input: $input)
  }
`

