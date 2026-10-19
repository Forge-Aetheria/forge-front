# Especificación: Integración de Autenticación y Sesión de Usuario (GraphQL + Supabase Auth)

- **ID de Spec:** SPEC-006
- **Estado:** Propuesta (Esperando revisión y aprobación del usuario)
- **Fecha:** 2026-10-15
- **Alcance:** Módulo de autenticación frontend (`forge-front`), conexión con el servicio GraphQL de `forge-backend`, almacenamiento seguro de tokens, sesión multi-tenant y protección de rutas.
- **Objetivo:** Conectar la pantalla de Login existente ([`src/views/Login.tsx`](file:///Users/franciscomaneiro/Trabajo/forge-front/src/views/Login.tsx)) y el ciclo de vida de sesión con los endpoints reales de `forge-backend` (`signIn`, `signOut`, `refreshSession`, `me`), gestionando tokens JWT, información del tenant del usuario y control de acceso.

---

## 1. Requisitos Funcionales bajo Sintaxis EARS

### 1.1 Ubiquitous (Requisitos Universales)
- `The system shall communicate with the GraphQL backend endpoint configured in NEXT_PUBLIC_GRAPHQL_ENDPOINT (defaulting to http://localhost:4000/graphql).`
- `The system shall inject the Bearer <accessToken> header into all authenticated GraphQL requests.`
- `The system shall store the authentication session (accessToken, refreshToken, expiresAt) in browser storage / cookies.`
- `The system shall maintain user profile and tenant identity (userId, email, tenantId, tenantName, tenantSlug) accessible across the application.`

### 1.2 Event-driven (Por Evento)
- `WHEN the user submits the Login form with valid email and password, the system shall execute the signIn mutation, store the returned AuthSession, fetch the authenticated user profile via the me query, and redirect the user to /home.`
- `WHEN the user submits invalid credentials, the system shall display a localized error banner ("Correo electrónico o contraseña incorrectos") without revealing whether the email exists.`
- `WHEN the user clicks the "Cerrar sesión" action in the user menu, the system shall execute the signOut mutation, clear local auth tokens, and redirect to /login.`
- `WHEN the backend returns an UNAUTHENTICATED error code on an authenticated request and a refreshToken is available, the system shall execute the refreshSession mutation and retry the original request.`

### 1.3 State-driven (Por Estado)
- `WHILE the user is authenticated, the top header avatar shall display the user initials or email and the current tenant name.`
- `WHILE the user is not authenticated, the system route guards shall redirect attempts to access protected dashboard routes (/home, /inventory, /pos) to /login.`
- `WHILE in the /login view, if an active valid session already exists, the system shall automatically redirect the user to /home.`

### 1.4 Unwanted Behavior (Manejo de Errores y Excepciones)
- `IF the backend service is unreachable during sign-in, THEN the system shall display a clear network notification ("No fue posible conectar con el servidor de autenticación").`
- `IF the user account has not confirmed email (EMAIL_NOT_CONFIRMED), THEN the system shall display an alert prompting the user to verify their inbox.`
- `IF the refreshSession mutation fails or the refreshToken is expired, THEN the system shall clear all session data and redirect to /login with session expired feedback.`

---

## 2. Contrato de Datos GraphQL (Paridad con `forge-backend`)

### 2.1 Mutación `signIn`
```graphql
mutation SignIn($input: IniciarSesionInput!) {
  signIn(input: $input) {
    accessToken
    refreshToken
    tokenType
    expiresIn
    expiresAt
  }
}
```

### 2.2 Query `me`
```graphql
query Me {
  me {
    id
    email
    tenantId
    tenantName
    tenantSlug
  }
}
```

### 2.3 Mutación `refreshSession`
```graphql
mutation RefreshSession($input: RefrescarSesionInput!) {
  refreshSession(input: $input) {
    accessToken
    refreshToken
    tokenType
    expiresIn
    expiresAt
  }
}
```

### 2.4 Mutación `signOut`
```graphql
mutation SignOut($scope: SignOutScope) {
  signOut(scope: $scope)
}
```

---

## 3. Arquitectura & Componentes Afectados

```text
src/
├── graphql/
│   └── auth.gql.ts                     # Definiciones de queries y mutations GraphQL
├── types/
│   └── authTypes.ts                    # Tipos TypeScript para AuthSession, AuthenticatedUser, SignInInput
├── services/
│   └── authService.ts                  # Servicio de autenticación, login, logout, refresh, token persistence
├── contexts/
│   └── authContext.tsx                 # React Context para proveer estado de sesión, usuario activo y helpers
├── views/
│   └── Login.tsx                       # Formulario de inicio de sesión conectado al authService
└── components/
    └── layout/
        └── shared/
            └── UserDropdown.tsx        # Avatar, datos del usuario autenticado y trigger de signOut
```

---

## 4. Plan de Implementación Paso a Paso

1. **Paso 1: Tipos de Dominio de Auth (`src/types/authTypes.ts`)**
   - Declarar `AuthSession`, `AuthenticatedUser`, `SignInInput`, `AuthError`.
2. **Paso 2: Cliente GraphQL y Documentos de Auth (`src/graphql/auth.gql.ts`)**
   - Centralizar las operaciones `SIGN_IN_MUTATION`, `ME_QUERY`, `REFRESH_SESSION_MUTATION`, `SIGN_OUT_MUTATION`.
3. **Paso 3: Servicio de Autenticación (`src/services/authService.ts`)**
   - Métodos `signIn`, `signOut`, `getStoredSession`, `saveSession`, `clearSession`, `getCurrentUser`.
   - Inyección automática del token `Bearer` en las llamadas.
4. **Paso 4: AuthContext y Hook `useAuth` (`src/contexts/authContext.tsx`)**
   - Estado reactivo para `user`, `session`, `isLoading`, `isAuthenticated`.
   - Inicialización automática al cargar la app.
5. **Paso 5: Conexión de la Vista de Login (`src/views/Login.tsx`)**
   - Validación de formulario con feedback visual de error (Alert / Snackbar en caso de credenciales inválidas).
   - Botón con spinner de carga durante la autenticación.
   - Redirección fluida a `/home`.
6. **Paso 6: Conexión del Dropdown de Usuario (`UserDropdown.tsx`)**
   - Mostrar el email del usuario y el nombre de su empresa / tenant.
   - Conectar botón "Logout" con `authService.signOut()`.
7. **Paso 7: Verificación y Typecheck**
   - Ejecutar `npx tsc --noEmit` para validar tipado estricto al 100%.

---

## 5. Criterios de Aceptación Comprobables (DoD)

- [ ] `docs/specs/06-auth-integration.spec.md` redactado formalmente bajo sintaxis EARS.
- [ ] La mutación `signIn` envía `{ email, password }` al backend y procesa la respuesta exitosamente.
- [ ] Al iniciar sesión, los tokens y la entidad `me` se guardan localmente y el usuario navega a `/home`.
- [ ] Credenciales incorrectas muestran un mensaje de error claro y accesible sin romper la UI.
- [ ] El menú de usuario en el header refleja la identidad del usuario y permite cerrar sesión limpiamente.
- [ ] `npx tsc --noEmit` compila limpiamente sin errores.
