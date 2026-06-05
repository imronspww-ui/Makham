import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, hashStaffPin } from '@/lib/auth'
import { updateStaffPinHash, getStaffPinHash } from '@/lib/services/settingsService'

/** GET — ตรวจว่ามี PIN ตั้งไว้แล้วไหม (admin only) */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const hash = await getStaffPinHash()
  return NextResponse.json({ isSet: !!hash })
}

/** PUT — ตั้ง/เปลี่ยน staff PIN (admin only) */
export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { pin } = await request.json() as { pin?: string }
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN ต้องเป็นตัวเลข 4-6 หลัก' }, { status: 400 })
    }

    const hash = await hashStaffPin(pin)
    await updateStaffPinHash(hash)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'บันทึกไม่สำเร็จ' }, { status: 500 })
  }
}

/** DELETE — ลบ staff PIN (ปิด staff login) */
export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    await updateStaffPinHash('')
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'ลบไม่สำเร็จ' }, { status: 500 })
  }
}
