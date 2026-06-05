import { NextRequest, NextResponse } from 'next/server'
import { getCategories, createCategory } from '@/lib/services/categoryService'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const cats = await getCategories()
    return NextResponse.json(cats)
  } catch {
    return NextResponse.json({ error: 'โหลดหมวดหมู่ไม่สำเร็จ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const id = await createCategory(body)
    return NextResponse.json({ id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'เพิ่มหมวดหมู่ไม่สำเร็จ' }, { status: 500 })
  }
}
