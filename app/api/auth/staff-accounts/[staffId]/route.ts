import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { updateStaffAccount, deleteStaffAccount } from '@/lib/services/staffService'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { staffId } = await params
    const body = await request.json() as { name?: string; isActive?: boolean; sortOrder?: number }
    await updateStaffAccount(staffId, body)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'แก้ไขไม่สำเร็จ' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { staffId } = await params
    await deleteStaffAccount(staffId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'ลบไม่สำเร็จ' }, { status: 500 })
  }
}
