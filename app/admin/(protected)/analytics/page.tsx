'use client'
import { useMemo } from 'react'
import { TrendingUp, Eye, ShoppingBag, Star, BarChart2, Users } from 'lucide-react'
import { useOrders } from '@/lib/hooks/useOrders'
import { useAdminMenu } from '@/lib/hooks/useMenu'
import { useMenuStats } from '@/lib/hooks/useMenuStats'
import { formatCurrency } from '@/lib/utils/format'
import { Spinner } from '@/components/ui/Spinner'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function dayLabel(d: Date) {
  const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}

export default function AnalyticsPage() {
  const { orders, loading } = useOrders()
  const { items: menuItems } = useAdminMenu()
  const menuStats = useMenuStats()

  const now = new Date()
  const todayStart = startOfDay(now).getTime()
  const weekStart  = startOfDay(new Date(now.getTime() - 6 * 86400000)).getTime()

  const completedOrders = useMemo(
    () => orders.filter(o => o.status !== 'cancelled'),
    [orders]
  )

  // ── Revenue & order counts ────────────────────────────────────────────────
  const todayOrders   = completedOrders.filter(o => new Date(o.createdAt).getTime() >= todayStart)
  const weekOrders    = completedOrders.filter(o => new Date(o.createdAt).getTime() >= weekStart)
  const todayRevenue  = todayOrders.reduce((s, o) => s + o.total, 0)
  const weekRevenue   = weekOrders.reduce((s, o) => s + o.total, 0)

  // ── Daily bar chart (7 days) ──────────────────────────────────────────────
  const dailyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400000)
      const ds = startOfDay(d).getTime()
      const de = ds + 86400000
      const dayOrders = completedOrders.filter(o => {
        const t = new Date(o.createdAt).getTime()
        return t >= ds && t < de
      })
      return { label: dayLabel(d), value: dayOrders.reduce((s, o) => s + o.total, 0), count: dayOrders.length }
    })
  }, [completedOrders])

  const maxRevenue = Math.max(...dailyData.map(d => d.value), 1)

  // ── Top menu items by orders (7 days) ────────────────────────────────────
  const topMenus = useMemo(() => {
    const counts: Record<string, { qty: number; revenue: number; name: string; imageUrl: string }> = {}
    for (const order of weekOrders) {
      for (const item of order.items) {
        if (!counts[item.menuItemId]) {
          counts[item.menuItemId] = { qty: 0, revenue: 0, name: item.name, imageUrl: item.imageUrl ?? '' }
        }
        counts[item.menuItemId].qty     += item.qty
        counts[item.menuItemId].revenue += item.subtotal
      }
    }
    return Object.entries(counts)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
  }, [weekOrders])

  // ── Menu clicks (from menuStats) ──────────────────────────────────────────
  const topClicks = useMemo(() => {
    return Object.entries(menuStats)
      .map(([id, s]) => {
        const menuItem = menuItems.find(m => m.id === id)
        return { id, name: menuItem?.name ?? id, clicks: s.clicksTotal ?? 0, ordersToday: s.ordersToday ?? 0 }
      })
      .filter(s => s.clicks > 0)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)
  }, [menuStats, menuItems])

  // ── Reviews summary ───────────────────────────────────────────────────────
  const ratedItems = useMemo(
    () => menuItems.filter(m => (m.ratingCount ?? 0) > 0).sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)).slice(0, 5),
    [menuItems]
  )

  if (loading) return <Spinner text="กำลังโหลด..." />

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-800">วิเคราะห์ร้าน</h1>
        <p className="text-sm text-gray-500 mt-0.5">ภาพรวมยอดขาย, เมนูยอดนิยม และพฤติกรรมลูกค้า</p>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'รายได้วันนี้',   value: formatCurrency(todayRevenue),  sub: `${todayOrders.length} ออเดอร์`,  icon: <TrendingUp size={18} />, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'รายได้ 7 วัน',   value: formatCurrency(weekRevenue),   sub: `${weekOrders.length} ออเดอร์`,   icon: <BarChart2 size={18} />,  color: 'text-blue-500',   bg: 'bg-blue-50'   },
          { label: 'คลิกเมนูรวม',   value: Object.values(menuStats).reduce((s, v) => s + (v.clicksTotal ?? 0), 0).toLocaleString(), sub: 'ทุกเมนูรวมกัน', icon: <Eye size={18} />, color: 'text-violet-500', bg: 'bg-violet-50' },
          { label: 'เมนูมีรีวิว',    value: menuItems.filter(m => (m.ratingCount ?? 0) > 0).length.toString(), sub: `จาก ${menuItems.length} เมนู`, icon: <Star size={18} />, color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.bg} ${kpi.color} mb-3`}>
              {kpi.icon}
            </div>
            <p className="text-xl font-bold text-gray-800">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
            <p className="text-[11px] text-gray-300 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Daily revenue bar chart ───────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">รายได้ 7 วันย้อนหลัง</h2>
        <div className="flex items-end gap-2 h-32">
          {dailyData.map((d, i) => {
            const pct = (d.value / maxRevenue) * 100
            const isToday = i === dailyData.length - 1
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                  <div className="bg-gray-800 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                    {formatCurrency(d.value)}<span className="text-gray-300 ml-1">({d.count})</span>
                  </div>
                  <div className="w-1.5 h-1.5 bg-gray-800 rotate-45 -mt-0.5" />
                </div>
                <div className="w-full flex flex-col justify-end" style={{ height: '90px' }}>
                  <div
                    className={['w-full rounded-t-lg transition-all duration-500', isToday ? 'bg-orange-500' : 'bg-orange-200'].join(' ')}
                    style={{ height: `${Math.max(pct, 3)}%` }}
                  />
                </div>
                <span className={['text-[10px] font-medium', isToday ? 'text-orange-500' : 'text-gray-400'].join(' ')}>{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* ── Top menus by orders (7 days) ─────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag size={16} className="text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-700">เมนูขายดี 7 วัน</h2>
          </div>
          {topMenus.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topMenus.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className={['text-sm font-bold w-5 text-center shrink-0', i < 3 ? 'text-orange-500' : 'text-gray-300'].join(' ')}>
                    {i + 1}
                  </span>
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt={m.name} className="h-9 w-9 rounded-lg object-cover shrink-0 border border-gray-100" />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.qty} ชิ้น · {formatCurrency(m.revenue)}</p>
                  </div>
                  <div className="shrink-0">
                    <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full"
                        style={{ width: `${(m.qty / topMenus[0].qty) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Menu clicks ───────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Eye size={16} className="text-violet-500" />
            <h2 className="text-sm font-semibold text-gray-700">เมนูที่ลูกค้าดูมากสุด</h2>
          </div>
          {topClicks.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">ยังไม่มีข้อมูล (จะเริ่มเก็บเมื่อลูกค้ากดดูเมนู)</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topClicks.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className={['text-sm font-bold w-5 text-center shrink-0', i < 3 ? 'text-violet-500' : 'text-gray-300'].join(' ')}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.clicks.toLocaleString()} คลิก · วันนี้ {m.ordersToday} ออเดอร์</p>
                  </div>
                  <div className="shrink-0">
                    <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-violet-400 rounded-full"
                        style={{ width: `${(m.clicks / topClicks[0].clicks) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Top rated menus ───────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm sm:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700">เมนูคะแนนสูงสุด</h2>
          </div>
          {ratedItems.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">ยังไม่มีรีวิว</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ratedItems.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt={m.name} className="h-12 w-12 rounded-xl object-cover shrink-0 border border-gray-100" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({length: 5}).map((_, i) => (
                        <Star key={i} size={11} className={i < Math.round(m.avgRating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                      <span className="text-xs text-amber-500 font-semibold ml-1">{m.avgRating?.toFixed(1)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{m.ratingCount} รีวิว</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
