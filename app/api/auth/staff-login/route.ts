import { NextRequest, NextResponse } from 'next/server'
import { verifyStaffPin, createStaffToken, setStaffCookie, clearSessionCookie } from '@/lib/auth'
import { getStaffPinHash } from '@/lib/services/settingsService'

// Rate limiting: max 10 attempts per IP per 15 min
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

    const { pin } = await request.json() as { pin?: string }
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN ต้องเป็นตัวเลข 4-6 หลัก' }, { status: 400 })
    }

    const storedHash = await getStaffPinHash()
    if (!storedHash) {
      return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า Staff PIN กรุณาติดต่อผู้ดูแลระบบ' }, { status: 403 })
    }

    const valid = await verifyStaffPin(pin, storedHash)
    if (!valid) {
      return NextResponse.json({ error: 'PIN ไม่ถูกต้อง' }, { status: 401 })
    }

    const token = await createStaffToken()
    const response = NextResponse.json({ success: true })
    setStaffCookie(response, token)
    clearSessionCookie(response)   // ล้าง admin session ถ้ามีค้างอยู่
    return response
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
