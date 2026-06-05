import { NextRequest, NextResponse } from 'next/server'
import { verifyStaffPin, createStaffToken, setStaffCookie, clearSessionCookie } from '@/lib/auth'
import { getStaffAccount } from '@/lib/services/staffService'

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

    const { accountId, pin } = await request.json() as { accountId?: string; pin?: string }

    if (!accountId) return NextResponse.json({ error: 'กรุณาเลือกชื่อพนักงาน' }, { status: 400 })
    if (!pin || !/^\d{4,6}$/.test(pin))
      return NextResponse.json({ error: 'PIN ต้องเป็นตัวเลข 4-6 หลัก' }, { status: 400 })

    const account = await getStaffAccount(accountId)
    if (!account || !account.isActive)
      return NextResponse.json({ error: 'ไม่พบบัญชีพนักงาน' }, { status: 404 })

    const valid = await verifyStaffPin(pin, account.pinHash)
    if (!valid) return NextResponse.json({ error: 'PIN ไม่ถูกต้อง' }, { status: 401 })

    const token = await createStaffToken(account.id)
    const response = NextResponse.json({ success: true, name: account.name })
    setStaffCookie(response, token, account.name)
    clearSessionCookie(response)   // ล้าง admin session ถ้ามีค้างอยู่
    return response
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
