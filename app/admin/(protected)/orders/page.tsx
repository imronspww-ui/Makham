'use client'
import { useState } from 'react'
import { Search, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useOrders } from '@/lib/hooks/useOrders'
import { OrderStatusBadge, statusConfig } from '@/components/admin/OrderStatusBadge'
import { OrderDetailModal } from '@/components/admin/OrderDetailModal'
import { OrderRowSkeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { FirebaseBanner } from '@/components/admin/FirebaseBanner'
import { updateOrderStatus, updatePaymentStatus } from '@/lib/services/orderService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Order, OrderStatus } from '@/types'

const ALL_STATUSES: (OrderStatus | 'all')[] = ['all', 'pending', 'cooking', 'delivering', 'completed', 'cancelled']
const ORDER_STATUSES: OrderStatus[] = ['pending', 'cooking', 'delivering', 'completed', 'cancelled']

// ── Quick status dropdown ────────────────────────────────────────────────────
function QuickStatusSelect({ order }: { order: Order }) {
  const [updating, setUpdating] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as OrderStatus
    if (newStatus === order.status) return
    setUpdating(true)
    try {
      await updateOrderStatus(order.id, newStatus)
      toast.success(`อัปเดตเป็น "${statusConfig[newStatus].label}" สำเร็จ`)
    } catch {
      toast.error('อัปเดตสถานะไม่สำเร็จ')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <select
      value={order.status}
      onChange={handleChange}
      disabled={updating}
      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-orange-400 outline-none bg-white disabled:opacity-50 cursor-pointer hover:border-orange-300 transition-colors"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>{statusConfig[s].label}</option>
      ))}
    </select>
  )
}

// ── Quick pay button ─────────────────────────────────────────────────────────
function QuickPayButton({ order }: { order: Order }) {
  const [updating, setUpdating] = useState(false)

  if (order.payment.status === 'paid') {
    return <Badge color="green">✅ ชำระแล้ว</Badge>
  }

  async function handlePay() {
    setUpdating(true)
    try {
      await updatePaymentStatus(order.id, 'paid')
      toast.success('✅ บันทึกการชำระเงินแล้ว')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge color="gray">⏳ รอชำระ</Badge>
      {order.payment.slipUrl && (
        <a
          href={order.payment.slipUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-500 hover:text-blue-700 underline"
        >
          🧾 ดูสลิป
        </a>
      )}
      <button
        onClick={handlePay}
        disabled={updating}
        className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-40 transition-colors"
      >
        <CheckCircle2 size={12} />
        {updating ? 'กำลังบันทึก...' : 'ยืนยันชำระ'}
      </button>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { orders, loading } = useOrders()
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
        <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-100 rounded-full px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          อัปเดตสดทันที
        </span>
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
                    <QuickPayButton order={order} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <OrderStatusBadge status={order.status} />
                      <QuickStatusSelect order={order} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(order)}
                      className="text-xs text-orange-500 hover:text-orange-700 font-medium whitespace-nowrap">ดูรายละเอียด</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrderDetailModal order={selected} onClose={() => setSelected(null)} onUpdated={() => setSelected(null)} />
    </div>
  )
}
