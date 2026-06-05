import { NextRequest, NextResponse } from 'next/server'
import { getMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/services/menuService'
import { requireAdmin } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ menuId: string }> }) {
  try {
    const { menuId } = await params
    const item = await getMenuItem(menuId)
    if (!item) return NextResponse.json({ error: 'ไม่พบเมนู' }, { status: 404 })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ menuId: string }> }) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { menuId } = await params
    const body = await request.json()
    await updateMenuItem(menuId, body)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'แก้ไขไม่สำเร็จ' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ menuId: string }> }) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { menuId } = await params
    await deleteMenuItem(menuId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'ลบไม่สำเร็จ' }, { status: 500 })
  }
}
