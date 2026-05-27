'use client'
import { useMemo } from 'react'
import { ClipboardList, TrendingUp, Clock, ChefHat, Truck } from 'lucide-react'
import { useOrders } from '@/lib/hooks/useOrders'
import { formatCurrency } from '@/lib/utils/format'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { Spinner } from '@/components/ui/Spinner'
import { FirebaseBanner } from '@/components/admin/FirebaseBanner'

export default function DashboardPage() {
  const { orders, loading } = useOrders()

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today)
    const revenue = todayOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
    const pending = orders.filter((o) => o.status === 'pending').length
    const cooking = orders.filter((o) => o.status === 'cooking').length
    const delivering = orders.filter((o) => o.status === 'delivering').length
    return { todayOrders: todayOrders.length, revenue, pending, cooking, delivering }
  }, [orders])

  if (loading) return <Spinner text="กำลังโหลด..." />

  const cards = [
    { label: 'ออเดอร์วันนี้', value: stats.todayOrders, icon: ClipboardList, color: 'text-blue-500 bg-blue-50' },
    { label: 'รายได้วันนี้', value: formatCurrency(stats.revenue), icon: TrendingUp, color: 'text-green-500 bg-green-50' },
    { label: 'รอดำเนินการ', value: stats.pending, icon: Clock, color: 'text-yellow-500 bg-yellow-50' },
    { label: 'กำลังทำอาหาร', value: stats.cooking, icon: ChefHat, color: 'text-orange-500 bg-orange-50' },
    { label: 'กำลังจัดส่ง', value: stats.delivering, icon: Truck, color: 'text-purple-500 bg-purple-50' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <FirebaseBanner />
      <h1 className="text-2xl font-bold text-gray-800">ภาพรวม</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <div className={`inline-flex rounded-xl p-2.5 ${card.color} mb-3`}>
              <card.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">ออเดอร์ล่าสุด</h2>
        {orders.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">ยังไม่มีออเดอร์</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['ออเดอร์', 'ลูกค้า', 'ประเภท', 'ยอด', 'สถานะ'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">{order.orderNumber}</td>
                    <td className="py-3 px-3">{order.customer.name}</td>
                    <td className="py-3 px-3">{order.orderType === 'pickup' ? '🛍️' : '🚚'}</td>
                    <td className="py-3 px-3 font-medium">{formatCurrency(order.total)}</td>
                    <td className="py-3 px-3"><OrderStatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
