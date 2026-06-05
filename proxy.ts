import { NextRequest, NextResponse } from 'next/server'
import { isValidSessionToken, isValidStaffToken } from '@/lib/auth'

// หน้าที่ staff (พนักงาน) เข้าได้ เพิ่มเติมจาก admin
const STAFF_ALLOWED_PATHS = ['/admin/pos', '/admin/orders']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminArea = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/admin/login'
  const isStaffLoginPage = pathname === '/admin/staff-login'

  // หน้า login ทั้งสองไม่ต้องการ session
  if (!isAdminArea || isLoginPage || isStaffLoginPage) return NextResponse.next()

  const adminToken = request.cookies.get('admin_session')?.value
  const isAdmin = adminToken ? await isValidSessionToken(adminToken) : false

  // admin เข้าได้ทุกหน้า + redirect ออกจาก login
  if (isAdmin) {
    if (isLoginPage || isStaffLoginPage) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.next()
  }

  const staffToken = request.cookies.get('staff_session')?.value
  const isStaff = staffToken ? await isValidStaffToken(staffToken) : false

  if (isStaff) {
    // staff เข้าได้เฉพาะ path ที่อนุญาต
    const allowed = STAFF_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (!allowed) {
      // ส่ง staff ไปที่หน้า orders ถ้าพยายามเข้าหน้าอื่น
      return NextResponse.redirect(new URL('/admin/orders', request.url))
    }
    return NextResponse.next()
  }

  // ไม่มี session เลย → redirect ไป login page ที่เหมาะสม
  // ถ้าพยายามเข้า pos/orders → ส่งไป staff-login
  const isStaffPage = STAFF_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (isStaffPage) {
    return NextResponse.redirect(new URL('/admin/staff-login', request.url))
  }
  return NextResponse.redirect(new URL('/admin/login', request.url))
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
