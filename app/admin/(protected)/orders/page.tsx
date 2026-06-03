'use client'
import { useState } from 'react'
import { Search, CheckCircle2, Trash2, AlertTriangle, CheckCheck, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useOrders } from '@/lib/hooks/useOrders'
import { OrderStatusBadge, statusConfig } from '@/components/admin/OrderStatusBadge'
import { OrderDetailModal } from '@/components/admin/OrderDetailModal'
import { OrderRowSkeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { FirebaseBanner } from '@/components/admin/FirebaseBanner'
import { updateOrderStatus, updatePaymentStatus, deleteOrder, respondToCancelRequest } from '@/lib/services/orderService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Order, OrderStatus } from '@/types'

const ALL_STATUSES: (OrderStatus | 'all' | 'cancel_request')[] = ['all', 'pending', 'cooking', 'delivering', 'completed', 'cancelled', 'cancel_request']
const ORDER_STATUSES: OrderStatus[] = ['pending', 'cooking', 'delivering', 'completed', 'cancelled']

// ── Cancel Alert Panel ───────────────────────────────────────────────────────
function CancelAlertPanel({ orders, onRespond }: { orders: Order[]; onRespond: (id: string, approve: boolean) => void }) {
  const [processing, setProcessing] = useState<string | null>(null)
  const pendingCancels = orders.filter(o => o.cancelRequest && o.status !== 'cancelled')
  if (pendingCancels.length === 0) return null

  async function handleRespond(orderId: string, approve: boolean) {
    setProcessing(orderId)
    try {
      await respondToCancelRequest(orderId, approve)
      toast.success(approve ? '✅ ยืนยันยกเลิกออเดอร์แล้ว' : '❌ ปฏิเสธคำขอยกเลิกแล้ว')
      onRespond(orderId, approve)
    } catch {
      toast.error('ดำเนินการไม่สำเร็จ')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="rounded-2xl border-2 border-red-300 bg-red-50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500 text-white">
        <AlertTriangle size={18} className="shrink-0" />
        <span className="font-bold text-sm">คำขอยกเลิกออเดอร์</span>
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-600 text-xs font-extrabold">
          {pendingCancels.length}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-red-100">
        {pendingCancels.map((order) => {
          const elapsed = Math.floor((Date.now() - new Date(order.cancelRequest!.requestedAt).getTime()) / 60000)
          const isProcessing = processing === order.id
          return (
            <div key={order.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-sm font-bold text-gray-800">{order.orderNumber}</span>
                  <OrderStatusBadge status={order.status} />
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={11} />
                    {elapsed < 1 ? 'เพิ่งส่ง' : `${elapsed} นาทีที่แล้ว`}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700 truncate">
                  {order.customer.name} · {order.customer.phone}
                </p>
                {/* Reason highlight */}
                <div className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-white border border-red-200 px-3 py-2">
                  <span className="text-red-400 shrink-0 mt-0.5">💬</span>
                  <p className="text-sm text-red-800 font-medium">{order.cancelRequest!.reason}</p>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  ยอด {formatCurrency(order.total)} · {order.items.length} รายการ ·{' '}
                  {order.orderType === 'pickup' ? '🛍️ รับเอง' : order.orderType === 'dine-in' ? '🍽️ ทานที่ร้าน' : '🚚 จัดส่ง'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleRespond(order.id, true)}
                  disabled={!!isProcessing}
                  className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <CheckCheck size={15} />
                  {isProcessing ? '...' : 'อนุมัติยกเลิก'}
                </button>
                <button
                  onClick={() => handleRespond(order.id, false)}
                  disabled={!!isProcessing}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <XCircle size={15} />
                  ปฏิเสธ
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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

// ── Delete button with inline confirm ───────────────────────────────────────
function DeleteOrderButton({ order }: { order: Order }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteOrder(order.id)
      toast.success(`ลบออเดอร์ ${order.orderNumber} แล้ว`)
    } catch {
      toast.error('ลบไม่สำเร็จ')
      setDeleting(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {deleting ? '...' : 'ลบ'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={deleting}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
      title="ลบออเดอร์นี้"
    >
      <Trash2 size={14} />
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { orders, loading } = useOrders()
  const [selected, setSelected] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all' | 'cancel_request'>('all')
  const [search, setSearch] = useState('')

  const cancelRequestCount = orders.filter(o => o.cancelRequest && o.status !== 'cancelled').length

  const filtered = orders.filter((o) => {
    if (statusFilter === 'cancel_request') return !!o.cancelRequest && o.status !== 'cancelled'
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

      {/* ── Cancel Alert Panel ── */}
      <CancelAlertPanel orders={orders} onRespond={() => {}} />

      <div className="flex gap-2 flex-wrap">
        {/* Cancel request filter — แสดงเฉพาะเมื่อมีคำขอ */}
        {cancelRequestCount > 0 && (
          <button
            onClick={() => setStatusFilter('cancel_request')}
            className={[
              'rounded-full px-3 py-1 text-xs font-bold transition-colors border flex items-center gap-1',
              statusFilter === 'cancel_request'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100 animate-pulse',
            ].join(' ')}
          >
            🚨 ขอยกเลิก
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-extrabold">
              {cancelRequestCount}
            </span>
          </button>
        )}
        {ALL_STATUSES.filter(s => s !== 'cancel_request').map((s) => (
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
            {s === 'all' ? 'ทั้งหมด' : statusConfig[s as OrderStatus].label}
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
                <tr key={order.id} className={[
                  'border-t border-gray-50 hover:bg-orange-50/30 transition-colors',
                  order.cancelRequest ? 'bg-red-50/40' : '',
                ].join(' ')}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">
                    <div className="flex flex-col gap-1">
                      {order.orderNumber}
                      {order.cancelRequest && order.status !== 'cancelled' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-100 rounded-full px-1.5 py-0.5 w-fit">
                          🚨 ขอยกเลิก
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.customer.name}</p>
                    <p className="text-xs text-gray-400">{order.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3">{order.orderType === 'pickup' ? '🛍️ รับเอง' : order.orderType === 'dine-in' ? '🍽️ ที่ร้าน' : '🚚 จัดส่ง'}</td>
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
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected(order)}
                        className="text-xs text-orange-500 hover:text-orange-700 font-medium whitespace-nowrap">ดูรายละเอียด</button>
                      <DeleteOrderButton order={order} />
                    </div>
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
