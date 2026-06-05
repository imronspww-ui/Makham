import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, hashStaffPin } from '@/lib/auth'
import { updateStaffPin } from '@/lib/services/staffService'

/** PUT — reset PIN for a staff account (admin only) */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { staffId } = await params
    const { pin } = await request.json() as { pin?: string }
    if (!pin || !/^\d{4,6}$/.test(pin))
      return NextResponse.json({ error: 'PIN ต้องเป็นตัวเลข 4-6 หลัก' }, { status: 400 })

    const pinHash = await hashStaffPin(pin)
    await updateStaffPin(staffId, pinHash)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'เปลี่ยน PIN ไม่สำเร็จ' }, { status: 500 })
  }
}
