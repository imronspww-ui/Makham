import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า ADMIN_EMAIL / ADMIN_PASSWORD ใน .env.local' }, { status: 500 })
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', process.env.SESSION_SECRET ?? 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
