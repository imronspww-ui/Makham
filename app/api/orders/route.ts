import { NextRequest, NextResponse } from 'next/server'
import { getOrders, createOrder } from '@/lib/services/orderService'
import { requireStaffOrAdmin } from '@/lib/auth'
import { getSettings } from '@/lib/services/settingsService'
import { calculateDeliveryFee } from '@/lib/utils/delivery'

// GET /api/orders — admin or staff
export async function GET(request: NextRequest) {
  const authError = await requireStaffOrAdmin(request)
  if (authError) return authError

  try {
    const orders = await getOrders()
    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: 'โหลดออเดอร์ไม่สำเร็จ' }, { status: 500 })
  }
}

// POST /api/orders — public (customer checkout); validation in validateOrder()
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateOrderBody(body)
    if (validation) return NextResponse.json({ error: validation }, { status: 400 })

    const o = body as Record<string, unknown>
    const settings = await getSettings()

    // ── Recalculate subtotal from items (don't trust client math) ──────────
    const items = o.items as Array<Record<string, unknown>>
    const serverSubtotal = items.reduce((sum, it) => {
      const itemSubtotal = (it.price as number) * (it.qty as number)
      return sum + itemSubtotal
    }, 0)

    // ── Enforce minOrderAmount ─────────────────────────────────────────────
    const minOrder = settings.delivery?.minOrderAmount ?? 0
    if (o.orderType === 'delivery' && minOrder > 0 && serverSubtotal < minOrder) {
      return NextResponse.json(
        { error: `ยอดสั่งขั้นต่ำสำหรับจัดส่งคือ ${minOrder} บาท` },
        { status: 400 },
      )
    }

    // ── Recalculate deliveryFee (don't trust client) ───────────────────────
    let serverDeliveryFee = 0
    if (o.orderType === 'delivery' && settings.delivery) {
      const delivery = o.delivery as Record<string, unknown>
      const { fee, isOutOfRange } = calculateDeliveryFee(
        delivery.distanceKm as number,
        settings.delivery,
      )
      if (isOutOfRange) {
        return NextResponse.json({ error: 'ที่อยู่จัดส่งอยู่นอกพื้นที่ให้บริการ' }, { status: 400 })
      }
      serverDeliveryFee = fee
    }

    // ── Recalculate pointsEarned (don't trust client) ──────────────────────
    const serverTotal = serverSubtotal + serverDeliveryFee
    let serverPointsEarned: number | undefined
    if (settings.loyalty?.enabled && (o.pointsEarned as number | undefined)) {
      serverPointsEarned = Math.floor(serverTotal / 100) * (settings.loyalty.pointsPer100Baht ?? 5)
    }

    // Override client-supplied financial fields with server-calculated values
    const sanitized = {
      ...o,
      subtotal:    serverSubtotal,
      deliveryFee: serverDeliveryFee,
      total:       serverTotal,
      pointsEarned: serverPointsEarned,
    } as Parameters<typeof createOrder>[0]

    const id = await createOrder(sanitized)
    return NextResponse.json({ id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'สร้างออเดอร์ไม่สำเร็จ' }, { status: 500 })
  }
}

function validateOrderBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'ข้อมูลไม่ถูกต้อง'
  const o = body as Record<string, unknown>

  if (!o.orderType || !['pickup', 'delivery', 'dine-in'].includes(o.orderType as string))
    return 'orderType ไม่ถูกต้อง'

  if (!o.customer || typeof o.customer !== 'object') return 'ข้อมูลลูกค้าไม่ครบ'
  const c = o.customer as Record<string, unknown>
  if (!c.name || typeof c.name !== 'string' || c.name.trim().length === 0) return 'ชื่อลูกค้าไม่ถูกต้อง'
  if (!c.phone || typeof c.phone !== 'string' || !/^\d{9,10}$/.test(c.phone.replace(/\D/g, '')))
    return 'เบอร์โทรไม่ถูกต้อง'

  if (!Array.isArray(o.items) || o.items.length === 0) return 'ไม่มีรายการสินค้า'

  for (const item of o.items as unknown[]) {
    if (!item || typeof item !== 'object') return 'รายการสินค้าไม่ถูกต้อง'
    const it = item as Record<string, unknown>
    if (!it.menuItemId || typeof it.menuItemId !== 'string') return 'menuItemId ไม่ถูกต้อง'
    if (typeof it.qty !== 'number' || it.qty < 1 || !Number.isInteger(it.qty)) return 'จำนวนสินค้าไม่ถูกต้อง'
    if (typeof it.price !== 'number' || it.price < 0) return 'ราคาสินค้าไม่ถูกต้อง'
    if (typeof it.subtotal !== 'number' || it.subtotal < 0) return 'subtotal ไม่ถูกต้อง'
  }

  if (!o.payment || typeof o.payment !== 'object') return 'ข้อมูลการชำระเงินไม่ครบ'
  const p = o.payment as Record<string, unknown>
  if (!['promptpay', 'cash'].includes(p.method as string)) return 'วิธีชำระเงินไม่ถูกต้อง'

  if (typeof o.subtotal !== 'number' || o.subtotal < 0) return 'subtotal ไม่ถูกต้อง'
  if (typeof o.total !== 'number' || o.total < 0) return 'total ไม่ถูกต้อง'
  if (typeof o.deliveryFee !== 'number' || o.deliveryFee < 0) return 'deliveryFee ไม่ถูกต้อง'

  // Delivery order must have coordinates
  if (o.orderType === 'delivery') {
    if (!o.delivery || typeof o.delivery !== 'object') return 'ข้อมูลที่อยู่จัดส่งไม่ครบ'
    const d = o.delivery as Record<string, unknown>
    if (typeof d.lat !== 'number' || typeof d.lng !== 'number') return 'พิกัดไม่ถูกต้อง'
    if (typeof d.distanceKm !== 'number' || d.distanceKm <= 0) return 'ระยะทางไม่ถูกต้อง'
  }

  // Points: non-negative integers only
  if (o.pointsEarned !== undefined && (typeof o.pointsEarned !== 'number' || o.pointsEarned < 0))
    return 'pointsEarned ไม่ถูกต้อง'
  if (o.pointsUsed !== undefined && (typeof o.pointsUsed !== 'number' || o.pointsUsed < 0))
    return 'pointsUsed ไม่ถูกต้อง'

  return null
}
