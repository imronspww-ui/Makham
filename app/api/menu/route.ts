import { NextRequest, NextResponse } from 'next/server'
import { getMenuItems, createMenuItem } from '@/lib/services/menuService'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const items = await getMenuItems()
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'โหลดเมนูไม่สำเร็จ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const id = await createMenuItem(body)
    return NextResponse.json({ id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'เพิ่มเมนูไม่สำเร็จ' }, { status: 500 })
  }
}
