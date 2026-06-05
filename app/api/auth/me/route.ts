import { NextRequest, NextResponse } from 'next/server'
import { getSessionRole } from '@/lib/auth'

/** คืน role ปัจจุบัน — ใช้โดย client เพื่อแสดง UI ตาม role */
export async function GET(request: NextRequest) {
  const role = await getSessionRole(request)
  return NextResponse.json({ role })
}
