'use client'
import { useMemo, useState } from 'react'
import {
  ClipboardList, TrendingUp, Clock, ChefHat, Truck,
  CalendarDays, BarChart2, Trophy, ShoppingBag, Bell, TrendingDown, Wallet,
  ChevronDown, ChevronUp, ChevronsUpDown, PackageSearch,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useOrders } from '@/lib/hooks/useOrders'
import { useSettings } from '@/lib/hooks/useSettings'
import { useAdminMenu } from '@/lib/hooks/useMenu'
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
type SortKey = 'qty' | 'revenue' | 'profit' | 'margin'
type SortDir = 'asc' | 'desc'

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
  const { settings } = useSettings()
  const { items: menuItems } = useAdminMenu()
  const [period, setPeriod] = useState<Period>('today')
  const [notifSent, setNotifSent] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('qty')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showAllItems, setShowAllItems] = useState(false)

  const stats = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)

    const weekStart = startOfDay(new Date(now))
    weekStart.setDate(weekStart.getDate() - 6)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const validOrders = orders.filter((o) =>
      o.status !== 'cancelled' && o.payment.status === 'paid'
    )

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

    // ── Gross profit (รายได้ - ต้นทุนวัตถุดิบ) ──
    // สร้าง map menuItemId → costPerUnit
    const cpuMap: Record<string, number> = {}
    menuItems.forEach((m) => {
      if (m.costPerPack && m.packSize && m.packSize > 0) {
        cpuMap[m.id] = m.costPerPack / m.packSize
      }
    })
    function calcCogs(orderList: typeof periodOrders) {
      return orderList.reduce((sum, o) =>
        sum + o.items.reduce((s, i) => s + (cpuMap[i.menuItemId] ?? 0) * i.qty, 0), 0)
    }

    // ── All menu items analytics (from period orders) ──
    const itemMap: Record<string, {
      name: string; qty: number; revenue: number
      costPerUnit: number; totalCost: number; totalProfit: number; margin: number
    }> = {}
    periodOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!itemMap[item.menuItemId]) {
          const cpu = cpuMap[item.menuItemId] ?? 0
          itemMap[item.menuItemId] = { name: item.name, qty: 0, revenue: 0, costPerUnit: cpu, totalCost: 0, totalProfit: 0, margin: 0 }
        }
        const entry = itemMap[item.menuItemId]
        entry.qty += item.qty
        entry.revenue += item.subtotal
        const cost = (cpuMap[item.menuItemId] ?? 0) * item.qty
        entry.totalCost += cost
        entry.totalProfit += item.subtotal - cost
      })
    })
    // คำนวณ margin หลังรวม
    Object.values(itemMap).forEach((e) => {
      e.margin = e.revenue > 0 ? (e.totalProfit / e.revenue) * 100 : 0
    })
    const allItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty)
    const topItems = allItems.slice(0, 5)

    // ── Status counts (all orders, not just valid) ──
    const pending = orders.filter((o) => o.status === 'pending').length
    const cooking = orders.filter((o) => o.status === 'cooking').length
    const delivering = orders.filter((o) => o.status === 'delivering').length

    const periodCogs   = calcCogs(periodOrders)
    const monthCogs    = calcCogs(monthOrders)
    const periodGross  = periodRevenue - periodCogs
    const monthGross   = monthRevenue  - monthCogs

    // ค่าใช้จ่ายร้านรายเดือน
    const monthStoreCost = (settings?.costs ?? []).reduce((s, c) => s + c.amount, 0)

    // กำไรสุทธิเดือนนี้ = gross - store cost
    const monthNet = monthGross - monthStoreCost

    // เงินสำรองและเงินเก็บส่วนตัว
    const reservePct     = settings?.reservePercent ?? 20
    const monthReserve   = monthNet > 0 ? monthNet * (reservePct / 100) : 0
    const monthPersonal  = monthNet > 0 ? monthNet - monthReserve : 0

    return {
      todayOrders: todayOrders.length,
      todayRevenue,
      weekOrders: weekOrders.length,
      weekRevenue,
      monthOrders: monthOrders.length,
      monthRevenue,
      periodOrders: periodOrders.length,
      periodRevenue,
      periodCogs,
      periodGross,
      monthCogs,
      monthGross,
      monthStoreCost,
      monthNet,
      dailyData,
      topItems,
      allItems,
      pending,
      cooking,
      delivering,
      reservePct,
      monthReserve,
      monthPersonal,
      hasCostData: Object.keys(cpuMap).length > 0,
    }
  }, [orders, period, menuItems, settings?.costs])

  // ── แจ้งเตือนสรุปยอดวันนี้ ────────────────────────────────────────────────
  async function sendDailySummary() {
    if (!('Notification' in window)) {
      toast.error('Browser นี้ไม่รองรับการแจ้งเตือน')
      return
    }
    let perm = Notification.permission
    if (perm === 'default') perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      toast.error('กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์ก่อน')
      return
    }

    const storeName = settings?.store.name ?? 'ร้าน'
    const avg       = stats.todayOrders > 0
      ? formatCurrency(stats.todayRevenue / stats.todayOrders)
      : '฿0'
    const topItem   = stats.topItems[0]

    const lines = [
      `💰 รายได้: ${formatCurrency(stats.todayRevenue)}`,
      `📋 ออเดอร์: ${stats.todayOrders} รายการ  •  เฉลี่ย ${avg}/ออเดอร์`,
      topItem ? `🏆 ขายดี: ${topItem.name} (${topItem.qty} ชิ้น)` : '',
    ].filter(Boolean).join('\n')

    // ส่งผ่าน Service Worker ถ้ามี (ให้แสดงแม้ปิด tab แล้ว)
    const swReg = 'serviceWorker' in navigator
      ? await navigator.serviceWorker.getRegistration()
      : undefined

    if (swReg) {
      await swReg.showNotification(`📊 สรุปยอดวันนี้ – ${storeName}`, {
        body: lines,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'daily-summary',
      })
    } else {
      new Notification(`📊 สรุปยอดวันนี้ – ${storeName}`, { body: lines })
    }

    setNotifSent(true)
    toast.success('ส่งแจ้งเตือนสรุปยอดแล้ว')
  }

  if (loading) return <Spinner text="กำลังโหลด..." />

  const periodLabel = period === 'today' ? 'วันนี้' : period === 'week' ? '7 วันที่ผ่านมา' : 'เดือนนี้'

  return (
    <div className="flex flex-col gap-6">
      <FirebaseBanner />
      <h1 className="text-2xl font-bold text-gray-800">ภาพรวมยอดขาย</h1>

      {/* ── สรุปยอดวันนี้ + ปุ่มแจ้งเตือน ── */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 p-4 shadow-md shadow-orange-100 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-semibold text-orange-100 uppercase tracking-wider">สรุปวันนี้</p>
          <p className="text-2xl font-extrabold text-white">{formatCurrency(stats.todayRevenue)}</p>
          <p className="text-sm text-orange-100">
            {stats.todayOrders} ออเดอร์
            {stats.todayOrders > 0 && (
              <span className="ml-2 opacity-80">
                · เฉลี่ย {formatCurrency(stats.todayRevenue / stats.todayOrders)}
              </span>
            )}
            {stats.topItems[0] && (
              <span className="ml-2 opacity-80">· 🏆 {stats.topItems[0].name}</span>
            )}
          </p>
        </div>
        <button
          onClick={sendDailySummary}
          className={[
            'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shrink-0',
            notifSent
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white text-orange-600 hover:bg-orange-50 shadow-sm',
          ].join(' ')}
        >
          <Bell size={15} className={notifSent ? 'animate-none' : ''} />
          {notifSent ? 'ส่งแล้ว' : 'แจ้งเตือน'}
        </button>
      </div>

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

      {/* ── Profit section ── */}
      {stats.hasCostData && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Wallet size={16} className="text-green-500" />
            <h2 className="font-semibold text-gray-700">กำไร</h2>
            <span className="text-xs text-gray-400 ml-1">เดือนนี้</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              {
                label:    'รายได้',
                value:    stats.monthRevenue,
                sub:      `${stats.monthOrders} ออเดอร์`,
                color:    'text-gray-800',
                icon:     <TrendingUp  size={14} className="text-green-500" />,
              },
              {
                label:    'ต้นทุนวัตถุดิบ',
                value:    stats.monthCogs,
                sub:      stats.monthRevenue > 0
                  ? `${((stats.monthCogs / stats.monthRevenue) * 100).toFixed(1)}% ของรายได้`
                  : '—',
                color:    'text-red-500',
                icon:     <TrendingDown size={14} className="text-red-400" />,
              },
              {
                label:    'กำไรขั้นต้น',
                value:    stats.monthGross,
                sub:      stats.monthRevenue > 0
                  ? `margin ${((stats.monthGross / stats.monthRevenue) * 100).toFixed(1)}%`
                  : '—',
                color:    stats.monthGross >= 0 ? 'text-green-600' : 'text-red-500',
                icon:     <Wallet size={14} className="text-blue-400" />,
              },
            ].map((c) => (
              <div key={c.label} className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-1">{c.icon}<p className="text-xs text-gray-400">{c.label}</p></div>
                <p className={`text-xl font-bold ${c.color}`}>{formatCurrency(c.value)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>
          {/* กำไรสุทธิ */}
          {stats.monthStoreCost > 0 && (
            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>กำไรขั้นต้น {formatCurrency(stats.monthGross)}</span>
                <span className="text-gray-300">−</span>
                <span>ค่าใช้จ่ายร้าน {formatCurrency(stats.monthStoreCost)}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">กำไรสุทธิเดือนนี้</p>
                <p className={`text-lg font-bold ${stats.monthNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatCurrency(stats.monthNet)}
                </p>
              </div>
            </div>
          )}
          {/* เงินสำรอง + เงินเก็บส่วนตัว */}
          {stats.monthStoreCost > 0 && stats.monthNet > 0 && (
            <div className="border-t border-gray-100 grid grid-cols-2 divide-x divide-gray-100">
              <div className="px-5 py-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-pink-500 shrink-0">
                  <TrendingDown size={14} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">เงินสำรองร้าน ({stats.reservePct}%)</p>
                  <p className="text-base font-bold text-pink-500">{formatCurrency(stats.monthReserve)}</p>
                </div>
              </div>
              <div className="px-5 py-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-50 text-yellow-500 shrink-0">
                  <Wallet size={14} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">เงินเก็บส่วนตัว</p>
                  <p className="text-base font-bold text-yellow-600">{formatCurrency(stats.monthPersonal)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* ── Item-level analytics table ── */}
      {stats.allItems.length > 0 && (() => {
        // sort
        const mul = sortDir === 'desc' ? 1 : -1
        const sorted = [...stats.allItems].sort((a, b) => {
          if (sortKey === 'qty')     return (b.qty          - a.qty)          * mul
          if (sortKey === 'revenue') return (b.revenue      - a.revenue)      * mul
          if (sortKey === 'profit')  return (b.totalProfit  - a.totalProfit)  * mul
          if (sortKey === 'margin')  return (b.margin       - a.margin)       * mul
          return 0
        })
        const displayed = showAllItems ? sorted : sorted.slice(0, 8)

        function handleSort(key: SortKey) {
          if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
          else { setSortKey(key); setSortDir('desc') }
        }
        function SortIcon({ k }: { k: SortKey }) {
          if (sortKey !== k) return <ChevronsUpDown size={12} className="text-gray-300" />
          return sortDir === 'desc'
            ? <ChevronDown size={12} className="text-orange-500" />
            : <ChevronUp size={12} className="text-orange-500" />
        }
        const hasCost = stats.allItems.some((i) => i.costPerUnit > 0)

        return (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <PackageSearch size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-700">รายละเอียดทุกเมนู{periodLabel}</h2>
              <span className="ml-auto text-xs text-gray-400">{stats.allItems.length} รายการ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left py-2.5 px-4 text-xs text-gray-400 font-medium w-6">#</th>
                    <th className="text-left py-2.5 px-2 text-xs text-gray-400 font-medium">เมนู</th>
                    <th className="py-2.5 px-2 text-xs font-medium">
                      <button onClick={() => handleSort('qty')} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 mx-auto">
                        ขายได้ <SortIcon k="qty" />
                      </button>
                    </th>
                    <th className="py-2.5 px-2 text-xs font-medium">
                      <button onClick={() => handleSort('revenue')} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 mx-auto">
                        รายได้รวม <SortIcon k="revenue" />
                      </button>
                    </th>
                    {hasCost && <>
                      <th className="py-2.5 px-2 text-xs text-gray-400 font-medium text-center">ต้นทุน/ชิ้น</th>
                      <th className="py-2.5 px-2 text-xs text-gray-400 font-medium text-center">ราคาขาย/ชิ้น</th>
                      <th className="py-2.5 px-2 text-xs text-gray-400 font-medium text-center">กำไร/ชิ้น</th>
                      <th className="py-2.5 px-2 text-xs font-medium">
                        <button onClick={() => handleSort('profit')} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 mx-auto">
                          กำไรรวม <SortIcon k="profit" />
                        </button>
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium">
                        <button onClick={() => handleSort('margin')} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 mx-auto">
                          Margin <SortIcon k="margin" />
                        </button>
                      </th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((item, i) => {
                    const pricePerUnit = item.qty > 0 ? item.revenue / item.qty : 0
                    const profitPerUnit = pricePerUnit - item.costPerUnit
                    const isProfit = item.totalProfit >= 0
                    return (
                      <tr key={item.name} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className={[
                            'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                            i === 0 ? 'bg-amber-400 text-white' :
                            i === 1 ? 'bg-gray-300 text-gray-700' :
                            i === 2 ? 'bg-orange-200 text-orange-700' : 'bg-gray-100 text-gray-400',
                          ].join(' ')}>{i + 1}</span>
                        </td>
                        <td className="py-2.5 px-2 font-medium text-gray-800">{item.name}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-semibold text-gray-800">{item.qty}</span>
                          <span className="text-gray-400 text-xs ml-0.5">ชิ้น</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-medium text-orange-600">
                          {formatCurrency(item.revenue)}
                        </td>
                        {hasCost && <>
                          <td className="py-2.5 px-2 text-center text-xs text-red-400">
                            {item.costPerUnit > 0 ? formatCurrency(item.costPerUnit) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2.5 px-2 text-center text-xs text-gray-600">
                            {item.qty > 0 ? formatCurrency(pricePerUnit) : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-center text-xs font-semibold">
                            {item.costPerUnit > 0 && item.qty > 0
                              ? <span className={profitPerUnit >= 0 ? 'text-green-600' : 'text-red-500'}>{formatCurrency(profitPerUnit)}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2.5 px-2 text-center font-semibold">
                            {item.costPerUnit > 0
                              ? <span className={isProfit ? 'text-green-600' : 'text-red-500'}>{formatCurrency(item.totalProfit)}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {item.costPerUnit > 0 && item.revenue > 0
                              ? (
                                <span className={[
                                  'inline-block text-xs font-bold px-1.5 py-0.5 rounded-full',
                                  item.margin >= 40 ? 'bg-green-50 text-green-600' :
                                  item.margin >= 20 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-500',
                                ].join(' ')}>
                                  {item.margin.toFixed(1)}%
                                </span>
                              )
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* show all toggle */}
            {stats.allItems.length > 8 && (
              <div className="border-t border-gray-100 px-5 py-3 flex justify-center">
                <button
                  onClick={() => setShowAllItems((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-700 font-medium transition-colors"
                >
                  {showAllItems
                    ? <><ChevronUp size={15} /> ย่อรายการ</>
                    : <><ChevronDown size={15} /> ดูทั้งหมด {stats.allItems.length} รายการ</>}
                </button>
              </div>
            )}
          </div>
        )
      })()}

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
