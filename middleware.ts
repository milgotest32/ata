import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROL_YETKILER: Record<string, string[]> = {
  admin: [],
  operasyon: ['/', '/siparisler', '/musteriler', '/satis', '/abonelikler', '/odemeler', '/muhasebe', '/harita', '/calisma', '/raporlar'],
  destek: ['/', '/konusmalar', '/canli-destek', '/calisma'],
}

export function middleware(request: NextRequest) {
  const auth = request.cookies.get('milgo-auth') || request.cookies.get('milgo-admin-auth')
  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'

  if (!auth && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (auth && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Rol kontrolü
  if (auth) {
    try {
      const user = JSON.parse(auth.value)
      const rol = user.rol || 'destek'

      if (rol !== 'admin') {
        const izinliSayfalar = ROL_YETKILER[rol] || ROL_YETKILER.destek
        const izinli = izinliSayfalar.some(s => s === '/' ? pathname === '/' : pathname.startsWith(s))
        if (!izinli) {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    } catch {}
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|tv).*)'],
}
