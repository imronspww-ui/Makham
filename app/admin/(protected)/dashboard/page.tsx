'use client'
import { useMemo, useState } from 'react'
import {
  ClipboardList, TrendingUp, Clock, ChefHat, Truck,
  CalendarDays, BarChart2, Trophy, ShoppingBag,
} from 'lucide-react'
import { useOrders } from '@/lib/hooks/useOrders'
import { formatCurrency } from '@/lib/utils/format'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { Spinner } from '@/components/ui/Spinner'
import { FirebaseBanner } from '@/components/admin/FirebaseBanner'

// ─── helpers ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function dayLabel(d: Date) {
  const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}

// ─── types ───────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month'

// ─── mini bar chart ───────────────────────────────────────────────────────────

function BarChart({ data }: { data: { label: string; value: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100
        const isToday = i === data.length - 1
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* tooltip */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
              <div className="bg-gray-800 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                {formatCurrency(d.value)}
                {d.count > 0 && <span className="text-gray-300 ml-1">({d.count} ออเดอร์)</span>}
              </div>
              <div className="w-1.5 h-1.5 bg-gray-800 rotate-45 -mt-0.5" />
            </div>
            {/* bar */}
            <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
              <div
                className={[
                  'w-full rounded-t-md transition-all duration-500',
                  isToday ? 'bg-orange-500' : 'bg-orange-200',
                  d.value === 0 ? 'min-h-[2px] opacity-30' : '',
                ].join(' ')}
                style={{ height: `${Math.max(pct, d.value > 0 ? 6 : 2)}%` }}
              />
            </div>
            {/* label */}
            <span className={`text-[10px] text-center leading-tight ${isToday ? 'font-bold text-orange-600' : 'text-gray-400'}`}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { orders, loading } = useOrders()
  const [period, setPeriod] = useState<Period>('today')

  const stats = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)

    const weekStart = startOfDay(new Date(now))
    weekStart.setDate(weekStart.getDate() - 6)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const validOrders = orders.filter((o) => o.status !== 'cancelled')

    // ── Period orders ──
    const inPeriod = (date: Date) => {
      if (period === 'today') return date >= todayStart
      if (period === 'week') return date >= weekStart
      return date >= monthStart
    }

    const periodOrders = validOrders.filter((o) => inPeriod(new Date(o.createdAt)))
    const periodRevenue = periodOrders.reduce((s, o) => s + o.total, 0)

    // ── Today stats ──
    const todayOrders = validOrders.filter((o) => new Date(o.createdAt) >= todayStart)
    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0)

    // ── Week stats ──
    const weekOrders = validOrders.filter((o) => new Date(o.createdAt) >= weekStart)
    const weekRevenue = weekOrders.reduce((s, o) => s + o.total, 0)

    // ── Month stats ──
    const monthOrders = validOrders.filter((o) => new Date(o.createdAt) >= monthStart)
    const monthRevenue = monthOrders.reduce((s, o) => s + o.total, 0)

    // ── 7-day chart ──
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      return startOfDay(d)
    })
    const dailyData = last7.map((dayStart) => {
      const dayEnd = new Date(dayStart.getTime() + 86_400_000)
      const dayOrders = validOrders.filter((o) => {
        const t = new Date(o.createdAt)
        return t >= dayStart && t < dayEnd
      })
      return {
        label: dayLabel(dayStart),
        value: dayOrders.reduce((s, o) => s + o.total, 0),
        count: dayOrders.length,
      }
    })

    // ── Top menu items (from period orders) ──
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    periodOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!itemMap[item.menuItemId]) {
          itemMap[item.menuItemId] = { name: item.name, qty: 0, revenue: 0 }
        }
        itemMap[item.menuItemId].qty += item.qty
        itemMap[item.menuItemId].revenue += item.subtotal
      })
    })
    const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

    // ── Status counts (all orders, not just valid) ──
    const pending = orders.filter((o) => o.status === 'pending').length
    const cooking = orders.filter((o) => o.status === 'cooking').length
    const delivering = orders.filter((o) => o.status === 'delivering').length

    return {
      todayOrders: todayOrders.length,
      todayRevenue,
      weekOrders: weekOrders.length,
      weekRevenue,
      monthOrders: monthOrders.length,
      monthRevenue,
      periodOrders: periodOrders.length,
      periodRevenue,
      dailyData,
      topItems,
      pending,
      cooking,
      delivering,
    }
  }, [orders, period])

  if (loading) return <Spinner text="กำลังโหลด..." />

  const periodLabel = period === 'today' ? 'วันนี้' : period === 'week' ? '7 วันที่ผ่านมา' : 'เดือนนี้'

  return (
    <div className="flex flex-col gap-6">
      <FirebaseBanner />
      <h1 className="text-2xl font-bold text-gray-800">ภาพรวมยอดขาย</h1>

      {/* ── Period tabs ── */}
      <div className="flex gap-2">
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={[
              'rounded-xl px-4 py-2 text-sm font-medium transition-all',
              period === p
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300',
            ].join(' ')}
          >
            {p === 'today' ? 'วันนี้' : p === 'week' ? '7 วัน' : 'เดือนนี้'}
          </button>
        ))}
      </div>

      {/* ── Revenue + order count (period) ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-green-500">
              <TrendingUp size={17} />
            </div>
            <span className="text-sm text-gray-500">รายได้{periodLabel}</span>
          </div>
          <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(stats.periodRevenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{stats.periodOrders} ออเดอร์ที่ไม่ถูกยกเลิก</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
              <ClipboardList size={17} />
            </div>
            <span className="text-sm text-gray-500">ออเดอร์{periodLabel}</span>
          </div>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.periodOrders}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            เฉลี่ย {stats.periodOrders > 0 ? formatCurrency(stats.periodRevenue / stats.periodOrders) : '฿0'} / ออเดอร์
          </p>
        </div>
      </div>

      {/* ── Quick summary row ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'วันนี้', orders: stats.todayOrders, revenue: stats.todayRevenue, icon: CalendarDays, color: 'text-purple-500 bg-purple-50' },
          { label: '7 วัน',  orders: stats.weekOrders,  revenue: stats.weekRevenue,  icon: BarChart2,   color: 'text-blue-500 bg-blue-50'   },
          { label: 'เดือนนี้', orders: stats.monthOrders, revenue: stats.monthRevenue, icon: ShoppingBag, color: 'text-green-500 bg-green-50' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <div className={`inline-flex rounded-lg p-2 ${c.color} mb-2`}><c.icon size={15} /></div>
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-base font-bold text-gray-800">{formatCurrency(c.revenue)}</p>
            <p className="text-xs text-gray-400">{c.orders} ออเดอร์</p>
          </div>
        ))}
      </div>

      {/* ── Status in progress ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'รอดำเนินการ', value: stats.pending,    icon: Clock,    color: 'text-yellow-600 bg-yellow-50' },
          { label: 'กำลังทำ',    value: stats.cooking,    icon: ChefHat,  color: 'text-orange-500 bg-orange-50' },
          { label: 'กำลังส่ง',   value: stats.delivering, icon: Truck,    color: 'text-purple-500 bg-purple-50' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.color} shrink-0`}>
              <c.icon size={18} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{c.value}</p>
              <p className="text-xs text-gray-500 leading-tight">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 7-day revenue chart ── */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={16} className="text-orange-500" />
          <h2 className="font-semibold text-gray-700">รายได้ 7 วันที่ผ่านมา</h2>
        </div>
        <BarChart data={stats.dailyData} />
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-orange-500" />วันนี้
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-orange-200" />วันก่อน
          </span>
        </div>
      </div>

      {/* ── Top menu items ── */}
      {stats.topItems.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-amber-500" />
            <h2 className="font-semibold text-gray-700">เมนูขายดี{periodLabel}</h2>
          </div>
          <div className="flex flex-col gap-2">
            {stats.topItems.map((item, i) => {
              const maxQty = stats.topItems[0]?.qty ?? 1
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className={[
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0',
                    i === 0 ? 'bg-amber-400 text-white' :
                    i === 1 ? 'bg-gray-300 text-gray-700' :
                    i === 2 ? 'bg-orange-200 text-orange-700' :
                               'bg-gray-100 text-gray-500',
                  ].join(' ')}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-xs text-gray-500">{item.qty} ชิ้น</span>
                        <span className="text-xs font-medium text-orange-600">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                    {/* bar */}
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-400 transition-all duration-500"
                        style={{ width: `${(item.qty / maxQty) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recent orders ── */}
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
                {orders.slice(0, 8).map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-600">{order.orderNumber}</td>
                    <td className="py-2.5 px-3 text-gray-800">{order.customer.name}</td>
                    <td className="py-2.5 px-3">{order.orderType === 'pickup' ? '🛍️' : '🚚'}</td>
                    <td className="py-2.5 px-3 font-semibold text-orange-600">{formatCurrency(order.total)}</td>
                    <td className="py-2.5 px-3"><OrderStatusBadge status={order.status} /></td>
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
