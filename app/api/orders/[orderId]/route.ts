import { NextRequest, NextResponse } from 'next/server'
import { getOrder, updateOrderStatus } from '@/lib/services/orderService'
import type { OrderStatus } from '@/types'

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const { status } = await request.json() as { status: OrderStatus }
    await updateOrderStatus(orderId, status)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'อัปเดตไม่สำเร็จ' }, { status: 500 })
  }
}
