import { NextRequest, NextResponse } from 'next/server'
import { updateCategory, deleteCategory } from '@/lib/services/categoryService'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const { categoryId } = await params
    const body = await request.json()
    await updateCategory(categoryId, body)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'แก้ไขหมวดหมู่ไม่สำเร็จ' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const { categoryId } = await params
    await deleteCategory(categoryId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'ลบหมวดหมู่ไม่สำเร็จ' }, { status: 500 })
  }
}
