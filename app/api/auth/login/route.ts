import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, setSessionCookie, clearStaffCookie } from '@/lib/auth'

// Simple in-memory rate limiter: max 10 attempts per IP per 15 min
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'ลองใหม่ได้ใน 15 นาที' }, { status: 429 })
    }

    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'ยังไม่ได้ตั้งค่า ADMIN_EMAIL / ADMIN_PASSWORD ใน .env.local' },
        { status: 500 },
      )
    }

    const { email, password } = await request.json()

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
    }

    const token = await createSessionToken()
    const response = NextResponse.json({ success: true })
    setSessionCookie(response, token)
    clearStaffCookie(response)   // ล้าง staff session ถ้ามีค้างอยู่
    return response
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
