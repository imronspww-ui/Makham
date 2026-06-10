'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, ChevronRight, Trash2, Clock, ChefHat, Truck, CheckCircle, RotateCcw, Phone, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useOrderHistoryStore, type OrderHistoryItem } from '@/store/orderHistoryStore'
import { useOrder } from '@/lib/hooks/useOrder'
import { useCartStore } from '@/store/cartStore'
import { getOrdersByPhone } from '@/lib/services/orderService'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils/format'
import type { Order, OrderStatus } from '@/types'

const statusStyle: Record<OrderStatus, { label: string; className: string; icon: React.ReactNode; step: number }> = {
  pending:    { label: 'รอดำเนินการ',  className: 'bg-yellow-50 text-yellow-600 border-yellow-200', icon: <Clock size={11} />,       step: 0 },
  cooking:    { label: 'กำลังทำอาหาร',className: 'bg-orange-50 text-orange-600 border-orange-200', icon: <ChefHat size={11} />,     step: 1 },
  delivering: { label: 'กำลังจัดส่ง', className: 'bg-blue-50 text-blue-600 border-blue-200',       icon: <Truck size={11} />,       step: 2 },
  completed:  { label: 'เสร็จสิ้น',   className: 'bg-green-50 text-green-600 border-green-200',    icon: <CheckCircle size={11} />, step: 3 },
  cancelled:  { label: 'ยกเลิกแล้ว',  className: 'bg-red-50 text-red-500 border-red-200',          icon: <Clock size={11} />,       step: -1 },
}

const activeStatuses: OrderStatus[] = ['pending', 'cooking', 'delivering']
const STEPS = 4

// ── OrderCard from local history (uses real-time hook) ────────────────────────

function OrderCard({ item }: { item: OrderHistoryItem }) {
  const { order } = useOrder(item.id)
  const { addItem, clearCart } = useCartStore()
  const router = useRouter()
  const status = order?.status
  const style = status ? statusStyle[status] : null
  const isActive = status ? activeStatuses.includes(status) : false

  function handleReorder(e: React.MouseEvent) {
    e.preventDefault()
    if (!order?.items?.length) return
    clearCart()
    for (const oi of order.items) {
      if (oi.isRedeemed) continue
      addItem({
        menuItemId:      oi.menuItemId,
        name:            oi.name,
        price:           oi.price,
        imageUrl:        oi.imageUrl ?? '',
        selectedOptions: oi.selectedOptions ?? [],
        itemNote:        oi.itemNote ?? '',
        optionGroups:    [],
      })
    }
    toast.success(`เพิ่ม ${order.items.filter(i => !i.isRedeemed).length} รายการลงตะกร้าแล้ว`)
    router.push('/cart')
  }

  return (
    <Link
      href={`/order/${item.id}`}
      className="flex items-center gap-4 rounded-2xl bg-white border border-gray-100 shadow-sm p-4 hover:border-orange-200 hover:shadow-md transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-mono text-sm font-bold text-gray-800">{item.orderNumber}</span>
          {style && (
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${style.className}`}>
              {style.icon}{style.label}
            </span>
          )}
          {isActive && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              สด
            </span>
          )}
        </div>

        {status && status !== 'cancelled' && (
          <div className="flex gap-1 mt-1.5 mb-1">
            {Array.from({ length: STEPS }).map((_, i) => (
              <div key={i} className={[
                'h-1 flex-1 rounded-full transition-all duration-500',
                i <= (style?.step ?? -1) ? 'bg-orange-500' : 'bg-gray-100',
              ].join(' ')} />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
        {order && (
          <p className="text-xs text-gray-500 mt-0.5">
            {order.items.length} รายการ • {order.orderType === 'pickup' ? '🛍️ รับเอง' : order.orderType === 'dine-in' ? '🍽️ ทานที่ร้าน' : '🚚 จัดส่ง'}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {status === 'completed' && (order?.items?.length ?? 0) > 0 && (
          <button
            onClick={handleReorder}
            className="flex items-center gap-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold px-2.5 py-1.5 hover:bg-orange-100 transition-colors shrink-0"
          >
            <RotateCcw size={11} />
            สั่งซ้ำ
          </button>
        )}
        <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
      </div>
    </Link>
  )
}

// ── OrderCardStatic — for phone-lookup results (no real-time hook needed) ─────

function OrderCardStatic({ order, addToHistory }: { order: Order; addToHistory: (id: string, orderNumber: string) => void }) {
  const { addItem, clearCart } = useCartStore()
  const router = useRouter()
  const style = statusStyle[order.status] ?? null
  const isActive = activeStatuses.includes(order.status)

  function handleReorder(e: React.MouseEvent) {
    e.preventDefault()
    clearCart()
    for (const oi of order.items) {
      if (oi.isRedeemed) continue
      addItem({
        menuItemId:      oi.menuItemId,
        name:            oi.name,
        price:           oi.price,
        imageUrl:        oi.imageUrl ?? '',
        selectedOptions: oi.selectedOptions ?? [],
        itemNote:        oi.itemNote ?? '',
        optionGroups:    [],
      })
    }
    toast.success(`เพิ่ม ${order.items.filter(i => !i.isRedeemed).length} รายการลงตะกร้าแล้ว`)
    router.push('/cart')
  }

  return (
    <Link
      href={`/order/${order.id}`}
      onClick={() => addToHistory(order.id, order.orderNumber)}
      className="flex items-center gap-4 rounded-2xl bg-white border border-gray-100 shadow-sm p-4 hover:border-orange-200 hover:shadow-md transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-mono text-sm font-bold text-gray-800">{order.orderNumber}</span>
          {style && (
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${style.className}`}>
              {style.icon}{style.label}
            </span>
          )}
          {isActive && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              สด
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {order.items.length} รายการ • {order.orderType === 'pickup' ? '🛍️ รับเอง' : order.orderType === 'dine-in' ? '🍽️ ทานที่ร้าน' : '🚚 จัดส่ง'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {order.status === 'completed' && order.items.length > 0 && (
          <button
            onClick={handleReorder}
            className="flex items-center gap-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold px-2.5 py-1.5 hover:bg-orange-100 transition-colors shrink-0"
          >
            <RotateCcw size={11} />
            สั่งซ้ำ
          </button>
        )}
        <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
      </div>
    </Link>
  )
}

// ── Phone lookup section ──────────────────────────────────────────────────────

function PhoneLookup({ onFound }: { onFound: (orders: Order[]) => void }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    const p = phone.replace(/\D/g, '')
    if (p.length < 9) { toast.error('กรอกเบอร์อย่างน้อย 9 หลัก'); return }
    setLoading(true)
    setSearched(false)
    try {
      const orders = await getOrdersByPhone(p)
      onFound(orders)
      setSearched(true)
      if (orders.length === 0) toast('ไม่พบออเดอร์จากเบอร์นี้', { icon: '🔍' })
      else toast.success(`พบ ${orders.length} ออเดอร์`)
    } catch {
      toast.error('ค้นหาไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Phone size={14} className="text-orange-400" />
        <span className="font-medium">ค้นหาออเดอร์จากเบอร์โทร</span>
        <span className="text-xs text-gray-400">(สำหรับอุปกรณ์ใหม่)</span>
      </div>
      <div className="flex gap-2">
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="0812345678"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <button
          onClick={handleSearch}
          disabled={loading || phone.length < 9}
          className="flex items-center gap-1.5 rounded-xl bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-500 disabled:opacity-40 transition-colors"
        >
          {loading ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Search size={14} />}
          ค้นหา
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyOrdersPage() {
  const { orders, clear, addOrder } = useOrderHistoryStore()
  const [phoneOrders, setPhoneOrders] = useState<Order[]>([])

  // merge: phone results that are not already in local history
  const localIds = new Set(orders.map((o) => o.id))
  const extraOrders = phoneOrders.filter((o) => !localIds.has(o.id))

  function handleAddToHistory(id: string, orderNumber: string) {
    addOrder({ id, orderNumber, createdAt: new Date().toISOString() })
  }

  if (orders.length === 0 && extraOrders.length === 0) {
    return (
      <div className="max-w-lg mx-auto flex flex-col gap-5">
        <div className="min-h-[50vh] py-16 flex flex-col items-center gap-4 text-gray-400">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
            <ShoppingBag size={36} className="text-gray-200" />
          </div>
          <p className="text-base">ยังไม่มีประวัติออเดอร์</p>
          <p className="text-sm text-gray-300">ออเดอร์ที่สั่งจะแสดงที่นี่</p>
          <Link href="/"><Button variant="outline">เริ่มสั่งอาหาร</Button></Link>
        </div>
        <PhoneLookup onFound={setPhoneOrders} />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">ออเดอร์ของฉัน</h1>
        <button
          onClick={() => { clear(); setPhoneOrders([]) }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
          ล้างประวัติ
        </button>
      </div>

      {/* local history */}
      {orders.length > 0 && (
        <div className="flex flex-col gap-3">
          {orders.map((item) => (
            <OrderCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* phone lookup results not in local history */}
      {extraOrders.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-400 font-medium">ผลการค้นหาจากเบอร์โทร</p>
          {extraOrders.map((order) => (
            <OrderCardStatic key={order.id} order={order} addToHistory={handleAddToHistory} />
          ))}
        </div>
      )}

      {/* phone lookup */}
      <PhoneLookup onFound={setPhoneOrders} />

      <Link href="/">
        <Button variant="outline" fullWidth>สั่งอาหารเพิ่ม</Button>
      </Link>
    </div>
  )
}
