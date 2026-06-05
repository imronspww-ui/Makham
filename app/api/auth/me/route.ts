import { NextRequest, NextResponse } from 'next/server'
import { getSessionInfo, extractStaffId } from '@/lib/auth'
import { getStaffAccount } from '@/lib/services/staffService'

export async function GET(request: NextRequest) {
  const info = await getSessionInfo(request)

  if (info.role === 'staff' && info.staffId) {
    // ดึงชื่อจาก Firestore เพื่อยืนยันว่ายังเป็น active account
    const account = await getStaffAccount(info.staffId).catch(() => null)
    if (!account || !account.isActive) {
      return NextResponse.json({ role: null })
    }
    return NextResponse.json({ role: 'staff', staffId: account.id, staffName: account.name })
  }

  return NextResponse.json({ role: info.role ?? null })
}
