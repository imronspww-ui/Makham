'use client'
import Link from 'next/link'
import { ShoppingBag, ChevronRight, Trash2, Clock, ChefHat, Truck, CheckCircle } from 'lucide-react'
import { useOrderHistoryStore, type OrderHistoryItem } from '@/store/orderHistoryStore'
import { useOrder } from '@/lib/hooks/useOrder'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils/format'
import type { OrderStatus } from '@/types'

const statusStyle: Record<OrderStatus, { label: string; className: string; icon: React.ReactNode; step: number }> = {
  pending:    { label: 'รอดำเนินการ',  className: 'bg-yellow-50 text-yellow-600 border-yellow-200', icon: <Clock size={11} />,       step: 0 },
  cooking:    { label: 'กำลังทำอาหาร',className: 'bg-orange-50 text-orange-600 border-orange-200', icon: <ChefHat size={11} />,     step: 1 },
  delivering: { label: 'กำลังจัดส่ง', className: 'bg-blue-50 text-blue-600 border-blue-200',       icon: <Truck size={11} />,       step: 2 },
  completed:  { label: 'เสร็จสิ้น',   className: 'bg-green-50 text-green-600 border-green-200',    icon: <CheckCircle size={11} />, step: 3 },
  cancelled:  { label: 'ยกเลิกแล้ว',  className: 'bg-red-50 text-red-500 border-red-200',          icon: <Clock size={11} />,       step: -1 },
}

const activeStatuses: OrderStatus[] = ['pending', 'cooking', 'delivering']
const STEPS = 4

function OrderCard({ item }: { item: OrderHistoryItem }) {
  const { order } = useOrder(item.id)
  const status = order?.status
  const style = status ? statusStyle[status] : null
  const isActive = status ? activeStatuses.includes(status) : false

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

        {/* Mini progress bar */}
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
      <div className="flex items-center gap-1 flex-shrink-0">
        <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
      </div>
    </Link>
  )
}

export default function MyOrdersPage() {
  const { orders, clear } = useOrderHistoryStore()

  if (orders.length === 0) {
    return (
      <div className="min-h-[65vh] py-20 flex flex-col items-center gap-4 text-gray-400">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
          <ShoppingBag size={36} className="text-gray-200" />
        </div>
        <p className="text-base">ยังไม่มีประวัติออเดอร์</p>
        <p className="text-sm text-gray-300">ออเดอร์ที่สั่งจะแสดงที่นี่</p>
        <Link href="/"><Button variant="outline">เริ่มสั่งอาหาร</Button></Link>
      </div>
    )
  }

  const activeOrders = orders.filter((_, i) => i < orders.length) // all orders; status loaded dynamically

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">ออเดอร์ของฉัน</h1>
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
          ล้างประวัติ
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {activeOrders.map((item) => (
          <OrderCard key={item.id} item={item} />
        ))}
      </div>

      <Link href="/">
        <Button variant="outline" fullWidth>สั่งอาหารเพิ่ม</Button>
      </Link>
    </div>
  )
}

