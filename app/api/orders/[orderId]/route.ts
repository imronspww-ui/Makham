import { NextRequest, NextResponse } from 'next/server'
import { getOrder, updateOrderStatus } from '@/lib/services/orderService'
import { requireStaffOrAdmin } from '@/lib/auth'
import type { OrderStatus } from '@/types'

const VALID_STATUSES: OrderStatus[] = ['pending', 'cooking', 'delivering', 'completed', 'cancelled']

// GET /api/orders/[orderId] — public (customer tracks own order)
export async function GET(_: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const order = await getOrder(orderId)
    if (!order) return NextResponse.json({ error: 'ไม่พบออเดอร์' }, { status: 404 })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// PATCH /api/orders/[orderId] — admin or staff
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const authError = await requireStaffOrAdmin(request)
  if (authError) return authError

  try {
    const { orderId } = await params
    const { status } = await request.json() as { status: OrderStatus }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 })
    }

    await updateOrderStatus(orderId, status)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'อัปเดตไม่สำเร็จ' }, { status: 500 })
  }
}
