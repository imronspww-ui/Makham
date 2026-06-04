'use client'
import { useState, useEffect } from 'react'
import { Search, Trash2, AlertTriangle, CheckCheck, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useOrders } from '@/lib/hooks/useOrders'
import { OrderDetailModal } from '@/components/admin/OrderDetailModal'
import { FirebaseBanner } from '@/components/admin/FirebaseBanner'
import { updateOrderStatus, updatePaymentStatus, deleteOrder, respondToCancelRequest } from '@/lib/services/orderService'
import { formatCurrency } from '@/lib/utils/format'
import type { Order, OrderStatus } from '@/types'

// ── helpers ──────────────────────────────────────────────────────────────────

function elapsed(createdAt: string) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (mins < 1)   return 'เพิ่งสั่ง'
  if (mins < 60)  return `${mins} นาที`
  const hrs = Math.floor(mins / 60)
  return `${hrs} ชม. ${mins % 60} น.`
}

function orderTypeLabel(t: string) {
  if (t === 'delivery') return { icon: '🚚', label: 'จัดส่ง' }
  if (t === 'dine-in')  return { icon: '🍽️', label: 'ที่ร้าน' }
  return { icon: '🛍️', label: 'รับเอง' }
}

function paymentLabel(method?: string, status?: string) {
  const paid = status === 'paid'
  if (method === 'promptpay') return { icon: paid ? '✅' : '⏳', label: 'พร้อมเพย์' }
  return { icon: paid ? '✅' : '⏳', label: 'เงินสด' }
}

// ── Kanban column config ──────────────────────────────────────────────────────

const COLUMNS: { status: OrderStatus; label: string; color: string; bg: string; border: string; next?: OrderStatus; nextLabel?: string; nextColor?: string }[] = [
  {
    status: 'pending',
    label: 'รอดำเนินการ',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    next: 'cooking',
    nextLabel: '👨‍🍳 เริ่มทำเลย',
    nextColor: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  {
    status: 'cooking',
    label: 'กำลังทำอาหาร',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    next: 'completed',
    nextLabel: '✅ เสร็จแล้ว',
    nextColor: 'bg-green-500 hover:bg-green-600 text-white',
  },
  {
    status: 'delivering',
    label: 'กำลังจัดส่ง',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    next: 'completed',
    nextLabel: '✅ ส่งแล้ว',
    nextColor: 'bg-green-500 hover:bg-green-600 text-white',
  },
  {
    status: 'completed',
    label: 'เสร็จสิ้น',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  {
    status: 'cancelled',
    label: 'ยกเลิก',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
]

// ── Elapsed ticker ────────────────────────────────────────────────────────────

function ElapsedBadge({ createdAt, urgent }: { createdAt: string; urgent?: boolean }) {
  const [text, setText] = useState(() => elapsed(createdAt))
  useEffect(() => {
    const id = setInterval(() => setText(elapsed(createdAt)), 30000)
    return () => clearInterval(id)
  }, [createdAt])
  return (
    <span className={[
      'flex items-center gap-1 text-[11px] font-semibold',
      urgent ? 'text-red-500' : 'text-gray-400',
    ].join(' ')}>
      <Clock size={11} />
      {text}
    </span>
  )
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({
  order, col, onDetail,
}: {
  order: Order
  col: typeof COLUMNS[number]
  onDetail: (o: Order) => void
}) {
  const [updating, setUpdating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const { icon: typeIcon, label: typeLabel } = orderTypeLabel(order.orderType)
  const { icon: payIcon, label: payLabel } = paymentLabel(order.payment.method, order.payment.status)
  const mins = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
  const urgent = col.status === 'pending' && mins >= 10

  async function advanceStatus() {
    if (!col.next) return
    setUpdating(true)
    try {
      await updateOrderStatus(order.id, col.next)
      if (col.next === 'completed' && order.payment.status !== 'paid') {
        await updatePaymentStatus(order.id, 'paid')
      }
      toast.success(`✅ ${col.nextLabel}`)
    } catch {
      toast.error('อัปเดตไม่สำเร็จ')
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteOrder(order.id)
      toast.success(`ลบออเดอร์ ${order.orderNumber} แล้ว`)
    } catch {
      toast.error('ลบไม่สำเร็จ')
      setDeleting(false)
      setConfirming(false)
    }
  }

  const visibleItems = expanded ? order.items : order.items.slice(0, 3)
  const hasMore = order.items.length > 3

  return (
    <div className={[
      'rounded-2xl border bg-white shadow-sm flex flex-col gap-0 overflow-hidden transition-all',
      urgent ? 'border-red-300 ring-2 ring-red-200' : 'border-gray-100 hover:border-orange-200 hover:shadow-md',
      order.cancelRequest && order.status !== 'cancelled' ? 'border-red-300 ring-1 ring-red-200' : '',
    ].join(' ')}>

      {/* Card header */}
      <div className={`flex items-start justify-between gap-2 px-3 pt-3 pb-2 ${urgent ? 'bg-red-50' : ''}`}>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-bold text-gray-700">{order.orderNumber.replace('ORD-', '')}</span>
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{typeIcon} {typeLabel}</span>
            {order.cancelRequest && order.status !== 'cancelled' && (
              <span className="text-[10px] font-bold text-red-600 bg-red-100 rounded-full px-1.5 py-0.5">🚨 ขอยกเลิก</span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800 truncate">{order.customer.name}</p>
          {order.customer.phone && order.customer.phone !== '-' && (
            <p className="text-[11px] text-gray-400">{order.customer.phone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <ElapsedBadge createdAt={order.createdAt} urgent={urgent} />
          {urgent && <span className="text-[10px] font-bold text-red-500 bg-red-100 rounded-full px-1.5 py-0.5">รอนาน!</span>}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-50 mx-3" />

      {/* Items */}
      <div className="px-3 py-2 flex flex-col gap-1">
        {visibleItems.map((item, i) => (
          <div key={i} className="flex justify-between items-baseline gap-2 text-xs">
            <span className="text-gray-700 truncate flex-1">{item.name}</span>
            <span className="text-gray-400 shrink-0">×{item.qty}</span>
            <span className="text-gray-600 font-semibold shrink-0 w-12 text-right">{formatCurrency(item.price * item.qty)}</span>
          </div>
        ))}
        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-700 mt-0.5"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'ย่อ' : `+${order.items.length - 3} รายการ`}
          </button>
        )}
        {order.note ? <p className="text-[11px] text-gray-400 mt-0.5">📝 {order.note}</p> : null}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-50 mx-3" />

      {/* Footer */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-extrabold text-orange-600">{formatCurrency(order.total)}</span>
          <span className="text-[11px] text-gray-400">{payIcon} {payLabel}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Detail */}
          <button
            onClick={() => onDetail(order)}
            className="text-[11px] text-gray-400 hover:text-orange-500 transition-colors underline underline-offset-2"
          >
            รายละเอียด
          </button>

          {/* Delete */}
          {!confirming ? (
            <button onClick={() => setConfirming(true)}
              className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
              <Trash2 size={13} />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={handleDelete} disabled={deleting}
                className="rounded-lg bg-red-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-600 disabled:opacity-50">
                {deleting ? '...' : 'ลบ'}
              </button>
              <button onClick={() => setConfirming(false)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50">
                ยกเลิก
              </button>
            </div>
          )}

          {/* Advance status */}
          {col.next && (
            <button
              onClick={advanceStatus}
              disabled={updating}
              className={[
                'rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50',
                col.nextColor ?? '',
              ].join(' ')}
            >
              {updating ? '...' : col.nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Cancel alert panel ────────────────────────────────────────────────────────

function CancelAlertPanel({ orders }: { orders: Order[] }) {
  const [processing, setProcessing] = useState<string | null>(null)
  const pending = orders.filter((o) => o.cancelRequest && o.status !== 'cancelled')
  if (pending.length === 0) return null

  async function handleRespond(orderId: string, approve: boolean) {
    setProcessing(orderId)
    try {
      await respondToCancelRequest(orderId, approve)
      toast.success(approve ? '✅ ยืนยันยกเลิกแล้ว' : '❌ ปฏิเสธคำขอแล้ว')
    } catch {
      toast.error('ดำเนินการไม่สำเร็จ')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="rounded-2xl border-2 border-red-300 bg-red-50 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500 text-white">
        <AlertTriangle size={18} className="shrink-0" />
        <span className="font-bold text-sm">คำขอยกเลิกออเดอร์</span>
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-600 text-xs font-extrabold">{pending.length}</span>
      </div>
      <div className="flex flex-col divide-y divide-red-100">
        {pending.map((order) => {
          const mins2 = Math.floor((Date.now() - new Date(order.cancelRequest!.requestedAt).getTime()) / 60000)
          return (
            <div key={order.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-sm font-bold text-gray-800">{order.orderNumber}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} />{mins2 < 1 ? 'เพิ่งส่ง' : `${mins2} นาทีที่แล้ว`}</span>
                </div>
                <p className="text-sm font-medium text-gray-700">{order.customer.name} · {order.customer.phone}</p>
                <div className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-white border border-red-200 px-3 py-2">
                  <span className="text-red-400 shrink-0 mt-0.5">💬</span>
                  <p className="text-sm text-red-800 font-medium">{order.cancelRequest!.reason}</p>
                </div>
                <p className="mt-1 text-xs text-gray-400">ยอด {formatCurrency(order.total)} · {order.items.length} รายการ</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleRespond(order.id, true)} disabled={processing === order.id}
                  className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
                  <CheckCheck size={15} />{processing === order.id ? '...' : 'อนุมัติยกเลิก'}
                </button>
                <button onClick={() => handleRespond(order.id, false)} disabled={processing === order.id}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50 transition-colors">
                  <XCircle size={15} />ปฏิเสธ
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ orders }: { orders: Order[] }) {
  const today = new Date().toDateString()
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today)
  const todayRevenue = todayOrders.filter((o) => o.payment.status === 'paid').reduce((s, o) => s + o.total, 0)
  const active = orders.filter((o) => o.status === 'pending' || o.status === 'cooking').length

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'ออเดอร์วันนี้', value: `${todayOrders.length} รายการ`, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
        { label: 'ยอดรวมวันนี้', value: formatCurrency(todayRevenue), color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
        { label: 'กำลังดำเนินการ', value: `${active} รายการ`, color: active > 0 ? 'text-amber-600' : 'text-gray-400', bg: active > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100' },
      ].map((item) => (
        <div key={item.label} className={`rounded-2xl border ${item.bg} px-4 py-3`}>
          <p className="text-xs text-gray-500">{item.label}</p>
          <p className={`text-lg font-extrabold ${item.color} mt-0.5`}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { orders, loading } = useOrders()
  const [selected, setSelected] = useState<Order | null>(null)
  const [search, setSearch] = useState('')
  const [completedExpanded, setCompletedExpanded] = useState(false)

  const COMPLETED_PREVIEW = 5

  const filteredOrders = orders.filter((o) =>
    !search ||
    o.orderNumber.includes(search) ||
    o.customer.name.includes(search) ||
    o.customer.phone.includes(search)
  )

  return (
    <div className="flex flex-col gap-5">
      <FirebaseBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">ออเดอร์</h1>
        <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-100 rounded-full px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          อัปเดตสดทันที
        </span>
      </div>

      {/* Summary */}
      {!loading && <SummaryBar orders={orders} />}

      {/* Cancel alerts */}
      <CancelAlertPanel orders={orders} />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาเลขออเดอร์, ชื่อ, หรือเบอร์โทร..."
          className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:border-orange-400 outline-none bg-white shadow-sm"
        />
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.status} className={`rounded-2xl border ${col.border} ${col.bg} p-3 flex flex-col gap-3`}>
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
              {[1, 2].map((i) => <div key={i} className="h-36 bg-white/70 rounded-2xl animate-pulse" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {COLUMNS.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.status)
            const isCompleted = col.status === 'completed'
            const shown = isCompleted && !completedExpanded ? colOrders.slice(0, COMPLETED_PREVIEW) : colOrders

            return (
              <div key={col.status} className={`rounded-2xl border ${col.border} ${col.bg} p-3 flex flex-col gap-2 min-h-[200px]`}>
                {/* Column header */}
                <div className="flex items-center justify-between pb-1">
                  <span className={`text-sm font-bold ${col.color}`}>{col.label}</span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${col.bg} border ${col.border} ${col.color}`}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards */}
                {shown.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8">
                    <p className="text-xs text-gray-300">ไม่มีออเดอร์</p>
                  </div>
                ) : (
                  shown.map((order) => (
                    <OrderCard key={order.id} order={order} col={col} onDetail={setSelected} />
                  ))
                )}

                {/* Show more / less for completed */}
                {isCompleted && colOrders.length > COMPLETED_PREVIEW && (
                  <button
                    onClick={() => setCompletedExpanded((v) => !v)}
                    className="text-xs text-gray-400 hover:text-green-600 transition-colors mt-1 text-center"
                  >
                    {completedExpanded
                      ? '▲ ย่อ'
                      : `▼ แสดงอีก ${colOrders.length - COMPLETED_PREVIEW} รายการ`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <OrderDetailModal order={selected} onClose={() => setSelected(null)} onUpdated={() => setSelected(null)} />
    </div>
  )
}
