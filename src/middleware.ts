import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/reset-password',
  '/api'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir archivos estáticos, imágenes, favicons y assets internos de Next
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Verificar si hay token de sesión en cookies
  const accessToken = request.cookies.get('foundly_access_token')?.value
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))

  // 1. Si no está autenticado y trata de acceder a una ruta protegida -> Redirigir a /login
  if (!accessToken && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)

    // Preservar la URL de retorno si no es la raíz
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirectTo', pathname)
    }

    return NextResponse.redirect(loginUrl)
  }

  // 2. Si ya está autenticado y visita /login -> Redirigir a /home
  if (accessToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // 3. Si visita la raíz '/', redirigir según estado de autenticación
  if (pathname === '/') {
    if (accessToken) {
      return NextResponse.redirect(new URL('/home', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto:
     * - api (si se usan endpoints internos)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
}
