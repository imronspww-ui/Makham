'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChefHat, Truck, Clock, ChevronRight, CheckCircle } from 'lucide-react'
import { useOrderHistoryStore } from '@/store/orderHistoryStore'
import { subscribeToOrder } from '@/lib/services/orderService'
import type { Order, OrderStatus } from '@/types'

const ACTIVE: OrderStatus[] = ['pending', 'cooking', 'delivering']

const statusConfig: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string; pulse: boolean }> = {
  pending:    { label: 'รอร้านรับออเดอร์',   icon: <Clock size={15} />,     color: 'bg-yellow-500', pulse: true },
  cooking:    { label: 'กำลังทำอาหาร...',   icon: <ChefHat size={15} />,   color: 'bg-orange-600', pulse: true },
  delivering: { label: 'กำลังจัดส่ง!',       icon: <Truck size={15} />,     color: 'bg-blue-500',   pulse: true },
  completed:  { label: 'เสร็จสิ้นแล้ว',      icon: <CheckCircle size={15}/>, color: 'bg-green-500',  pulse: false },
  cancelled:  { label: 'ยกเลิกแล้ว',         icon: <Clock size={15} />,     color: 'bg-red-500',    pulse: false },
}

interface LiveOrder { id: string; orderNumber: string; status: OrderStatus }

export function ActiveOrderBanner() {
  const { orders } = useOrderHistoryStore()
  const [liveOrder, setLiveOrder] = useState<LiveOrder | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || orders.length === 0) return

    // Subscribe to the most recent order
    const latest = orders[0]
    const unsub = subscribeToOrder(latest.id, (data: Order | null) => {
      if (!data) return
      if (ACTIVE.includes(data.status)) {
        setLiveOrder({ id: data.id, orderNumber: data.orderNumber, status: data.status })
      } else {
        setLiveOrder(null)
      }
    })
    return unsub
  }, [mounted, orders])

  if (!mounted || !liveOrder) return null

  const cfg = statusConfig[liveOrder.status]

  return (
    <Link href={`/order/${liveOrder.id}`}>
      <div className={`relative z-10 mx-4 mt-3 rounded-2xl ${cfg.color} text-white shadow-lg overflow-hidden`}>
        {/* Pulse BG */}
        {cfg.pulse && (
          <div className={`absolute inset-0 ${cfg.color} opacity-40 animate-pulse`} />
        )}
        <div className="relative flex items-center gap-3 px-4 py-3">
          <div className="flex-shrink-0">{cfg.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium opacity-80">ออเดอร์ #{liveOrder.orderNumber}</p>
            <p className="font-bold text-sm">{cfg.label}</p>
          </div>
          <div className="flex items-center gap-1 text-white/80 flex-shrink-0">
            <span className="text-xs">ติดตาม</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  )
}
