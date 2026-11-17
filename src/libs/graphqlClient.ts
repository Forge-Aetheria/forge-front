// Cliente GraphQL nativo y ligero para forge-front

const configuredEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT

if (!configuredEndpoint && process.env.NODE_ENV === 'production') {
  throw new Error(
    'NEXT_PUBLIC_GRAPHQL_ENDPOINT es obligatorio en producción; configura el endpoint de forge-backend',
  )
}

const GRAPHQL_ENDPOINT = configuredEndpoint || 'http://localhost:4000/graphql'

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: {
      code?: string
      [key: string]: unknown
    }
  }>
}

export interface RequestOptions {
  token?: string | null
  tenantId?: string | null
  elevationToken?: string | null
  timeoutMs?: number
}

export class GraphQLClientError extends Error {
  code?: string
  extensions?: Record<string, unknown>

  constructor(message: string, code?: string, extensions?: Record<string, unknown>) {
    super(message)
    this.name = 'GraphQLClientError'
    this.code = code
    this.extensions = extensions
  }
}

export const executeGraphQL = async <T, V = Record<string, unknown>>(
  query: string,
  variables?: V,
  options?: RequestOptions
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  // Token Injection
  const token = options?.token !== undefined ? options.token : getStoredAccessToken()

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Tenant ID Injection if available
  if (options?.tenantId) {
    headers['x-tenant-id'] = options.tenantId
  }

  // Platform admin elevation (TICK-051)
  if (options?.elevationToken) {
    headers['x-platform-elevation'] = options.elevationToken
  }

  const timeoutMs = options?.timeoutMs ?? 7000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal: controller.signal
    })

    if (!res.ok) {
      throw new GraphQLClientError(
        `Error HTTP en servidor: ${res.status} ${res.statusText}`,
        `HTTP_${res.status}`
      )
    }

    const json: GraphQLResponse<T> = await res.json()

    if (json.errors && json.errors.length > 0) {
      const firstError = json.errors[0]
      const code = firstError.extensions?.code as string | undefined

      throw new GraphQLClientError(firstError.message, code, firstError.extensions)
    }

    if (!json.data) {
      throw new GraphQLClientError('Respuesta GraphQL vacía sin datos ni errores')
    }

    return json.data
  } catch (err: unknown) {
    if (err instanceof GraphQLClientError) {
      throw err
    }

    if (err instanceof Error && err.name === 'AbortError') {
      throw new GraphQLClientError(
        `La petición excedió el tiempo límite de espera (${timeoutMs / 1000}s). El servidor tardó demasiado en responder.`,
        'TIMEOUT_ERROR'
      )
    }

    const message = err instanceof Error ? err.message : 'Error desconocido al comunicar con el backend'

    throw new GraphQLClientError(`No fue posible conectar con el servidor: ${message}`, 'NETWORK_ERROR')
  } finally {
    clearTimeout(timer)
  }
}

const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem('foundly_auth_session')

    if (!raw) return null

    const session = JSON.parse(raw)

    return session?.accessToken || null
  } catch {
    return null
  }
}
