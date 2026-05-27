import { NextRequest, NextResponse } from 'next/server'
import { getOrders, createOrder } from '@/lib/services/orderService'

export async function GET() {
  try {
    const orders = await getOrders()
    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: 'โหลดออเดอร์ไม่สำเร็จ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = await createOrder(body)
    return NextResponse.json({ id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'สร้างออเดอร์ไม่สำเร็จ' }, { status: 500 })
  }
}
