import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminPath = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/admin/login'

  if (isAdminPath && !isLoginPage) {
    const session = request.cookies.get('admin_session')
    if (!session?.value) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  if (isLoginPage) {
    const session = request.cookies.get('admin_session')
    if (session?.value) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
