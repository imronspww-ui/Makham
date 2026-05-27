'use client'
import { useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { useOrders } from '@/lib/hooks/useOrders'
import { OrderStatusBadge, statusConfig } from '@/components/admin/OrderStatusBadge'
import { OrderDetailModal } from '@/components/admin/OrderDetailModal'
import { OrderRowSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FirebaseBanner } from '@/components/admin/FirebaseBanner'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Order, OrderStatus } from '@/types'

const ALL_STATUSES: (OrderStatus | 'all')[] = ['all', 'pending', 'cooking', 'delivering', 'completed', 'cancelled']

export default function OrdersPage() {
  const { orders, loading, reload } = useOrders()
  const [selected, setSelected] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    const matchSearch = !search || o.orderNumber.includes(search) || o.customer.name.includes(search) || o.customer.phone.includes(search)
    return matchStatus && matchSearch
  })

  return (
    <div className="flex flex-col gap-5">
      <FirebaseBanner />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">ออเดอร์ทั้งหมด</h1>
        <Button variant="outline" size="sm" onClick={reload}>
          <RefreshCw size={14} />
          รีเฟรช
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
              statusFilter === s
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300',
            ].join(' ')}
          >
            {s === 'all' ? 'ทั้งหมด' : statusConfig[s].label}
            <span className="ml-1 opacity-70">
              {s === 'all' ? orders.length : orders.filter((o) => o.status === s).length}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาด้วยเลขออเดอร์, ชื่อ, หรือเบอร์โทร"
          className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2 text-sm focus:border-orange-400 outline-none bg-white"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <tbody>{Array.from({ length: 6 }).map((_, i) => <OrderRowSkeleton key={i} />)}</tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400">ไม่พบออเดอร์</div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['เลขออเดอร์', 'ลูกค้า', 'ประเภท', 'ยอด', 'การชำระ', 'สถานะ', 'เวลา', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.customer.name}</p>
                    <p className="text-xs text-gray-400">{order.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3">{order.orderType === 'pickup' ? '🛍️ รับหน้าร้าน' : '🚚 จัดส่ง'}</td>
                  <td className="px-4 py-3 font-semibold text-orange-600">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3">
                    <Badge color={order.payment.status === 'paid' ? 'green' : 'gray'}>
                      {order.payment.status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(order)}
                      className="text-xs text-orange-500 hover:text-orange-700 font-medium">ดูรายละเอียด</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrderDetailModal order={selected} onClose={() => setSelected(null)} onUpdated={reload} />
    </div>
  )
}
