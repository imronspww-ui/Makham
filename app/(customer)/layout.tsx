'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Store, ClipboardList, UtensilsCrossed, Home, Sun, Moon } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useOrderHistoryStore } from '@/store/orderHistoryStore'
import { CartDrawer } from '@/components/customer/CartDrawer'
import { CustomerOrderTracker } from '@/components/customer/CustomerOrderTracker'
import { TableNumberTracker } from '@/components/customer/TableNumberTracker'
import { useSettings } from '@/lib/hooks/useSettings'
import { useStoreHours } from '@/lib/hooks/useStoreHours'
import { formatCurrency } from '@/lib/utils/format'
import { ThemeProvider, useTheme } from '@/components/customer/ThemeProvider'
import { ActiveOrderBanner } from '@/components/customer/ActiveOrderBanner'
import type { Settings } from '@/types'

/** หาเวลาเปิดถัดไปจาก schedule */
function getNextOpenTime(settings: Settings | null): string | null {
  const hours = settings?.openingHours
  if (!hours?.enabled || !hours.schedule) return null

  const now = new Date()
  for (let offset = 1; offset <= 7; offset++) {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    const day = String(d.getDay())
    const sched = hours.schedule[day]
    if (sched && !sched.isOff) {
      const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์']
      return offset === 1
        ? `พรุ่งนี้ ${sched.open} น.`
        : `วัน${dayNames[d.getDay()]} ${sched.open} น.`
    }
  }
  return null
}

/** หาเวลาปิดของวันนี้ */
function getTodayCloseTime(settings: Settings | null): string | null {
  const hours = settings?.openingHours
  if (!hours?.enabled || !hours.schedule) return null
  const day = String(new Date().getDay())
  const sched = hours.schedule[day]
  return sched && !sched.isOff ? sched.close : null
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><CustomerLayoutInner>{children}</CustomerLayoutInner></ThemeProvider>
}

function CustomerLayoutInner({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme()
  const [cartOpen, setCartOpen] = useState(false)
  const [mounted,  setMounted]  = useState(false)
  // selector คืน primitive → Zustand เปรียบด้วย Object.is ได้แม่นยำ ไม่พลาด re-render
  const rawTotalItems  = useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0))
  const rawTotalPrice  = useCartStore((s) => s.items.reduce((sum, i) => {
    const extra = (i.selectedOptions ?? []).reduce((a, o) => a + o.extraPrice, 0)
    return sum + (i.price + extra) * i.qty
  }, 0))
  const historyOrders  = useOrderHistoryStore((s) => s.orders)
  const { settings }   = useSettings()
  const { isOpen }     = useStoreHours(settings)
  const pathname       = usePathname()

  useEffect(() => { setMounted(true) }, [])

  const storeName   = settings?.store.name ?? process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม'
  const logoUrl     = settings?.store.logoUrl
  const bgImageUrl  = settings?.store.bgImageUrl
  const tableNumber = mounted ? (sessionStorage.getItem('tableNumber') ?? '') : ''

  const closeTime    = getTodayCloseTime(settings)
  const nextOpenTime = getNextOpenTime(settings)
  const totalItems   = mounted ? rawTotalItems : 0
  const totalPrice   = mounted ? rawTotalPrice : 0

  // Bottom nav ซ่อนใน checkout เพื่อไม่รกหน้าจอตอนกำลังสั่ง
  const hideBottomNav = pathname === '/checkout'
  const settingsLoaded = settings !== null

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-cover bg-center bg-fixed transition-colors duration-300 relative"
      style={bgImageUrl
        ? { backgroundImage: `url(${bgImageUrl})` }
        : { background: theme === 'dark' ? '#0f0a05' : '#fff8f0' }
      }
    >
      {/* Dark overlay เมื่อมี background image + dark mode */}
      {bgImageUrl && theme === 'dark' && (
        <div className="absolute inset-0 bg-black/70 z-0 pointer-events-none" />
      )}
      {/* อ่าน ?table=X จาก URL — ต้อง Suspense เพราะใช้ useSearchParams */}
      <Suspense fallback={null}>
        <TableNumberTracker />
      </Suspense>

      {/* ── Open/Closed banner — รอ settings โหลดก่อนแสดง เพื่อป้องกัน layout shift ── */}
      {settingsLoaded && (isOpen ? (
        closeTime && (
          <div className="bg-emerald-600 text-white text-center py-1.5 px-4 text-xs font-medium z-40 relative flex items-center justify-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-200 animate-pulse" />
            เปิดรับออเดอร์แล้ว · ถึง {closeTime} น.
          </div>
        )
      ) : (
        <div className="bg-red-600 text-white text-center py-1.5 px-4 text-xs font-medium z-40 relative flex items-center justify-center gap-1.5">
          🚫 ร้านปิดให้บริการชั่วคราว
          {nextOpenTime && <span className="opacity-80">· เปิดอีกครั้ง {nextOpenTime}</span>}
        </div>
      ))}

      {/* ── Dark classy header ── */}
      <header className="sticky top-0 z-30 border-b border-[#2d1e0a] relative" style={{ background: '#1c1209' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={storeName}
                className="h-9 w-9 rounded-xl object-cover border border-amber-700/40 shadow-sm" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 shadow-sm group-hover:bg-amber-400 transition-colors">
                <Store size={17} className="text-white" />
              </div>
            )}
            <span className="font-bold tracking-wide text-amber-50 group-hover:text-amber-200 transition-colors">
              {storeName}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              aria-label="เปลี่ยนธีม"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-700 bg-stone-800/60 text-stone-300 hover:border-amber-600 hover:text-amber-300 transition-colors"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Table badge */}
            {tableNumber && (
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-700/40 bg-amber-900/40 px-3 py-2 text-sm font-semibold text-amber-200">
                <UtensilsCrossed size={14} />
                โต๊ะ {tableNumber}
              </div>
            )}
            {/* My orders — ซ่อนบนมือถือเพราะมี bottom nav แล้ว */}
            {mounted && historyOrders.length > 0 && (
              <Link
                href="/my-orders"
                className="relative hidden sm:flex items-center gap-1.5 rounded-xl border border-stone-700 bg-stone-800/60 px-3 py-2 text-sm font-medium text-stone-300 hover:border-amber-600 hover:text-amber-300 transition-colors"
              >
                <ClipboardList size={15} />
                <span>ออเดอร์ของฉัน</span>
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  {historyOrders.length}
                </span>
              </Link>
            )}

            {/* Cart button — ซ่อนบนมือถือเพราะมี live cart bar แล้ว */}
            <button
              data-cart-target-desktop
              onClick={() => setCartOpen(true)}
              className="relative hidden sm:flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 active:scale-95 transition-all duration-150"
            >
              <ShoppingCart size={16} />
              ตะกร้า
              {totalItems > 0 && (
                <span key={totalItems} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow animate-badge-bounce">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Background order tracking via Service Worker */}
      <CustomerOrderTracker />

      {/* ── Active order banner ── */}
      <ActiveOrderBanner />

      {/* padding-bottom: nav (~60px) + cart bar (~60px) when visible, nav only otherwise */}
      <main className={['relative z-10 mx-auto max-w-5xl px-4 py-6', !hideBottomNav ? (mounted && totalItems > 0 ? 'pb-36' : 'pb-20') : ''].join(' ')}>
        {children}
      </main>

      {/* ── #2 Live Cart Bar — แสดงเฉพาะมือถือ เมื่อมีสินค้าในตะกร้า ── */}
      {mounted && totalItems > 0 && !hideBottomNav && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 sm:hidden">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between rounded-2xl px-5 py-3.5 text-white shadow-xl active:scale-[0.98] transition-all duration-150"
            style={{ background: theme === 'dark' ? '#d97706' : '#ea580c', boxShadow: `0 8px 24px ${theme === 'dark' ? '#d9770640' : '#ea580c40'}` }}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <ShoppingCart size={20} />
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-orange-500">
                  {totalItems}
                </span>
              </div>
              <span className="font-semibold text-sm">{totalItems} รายการ</span>
            </div>
            <span className="font-bold text-base">{formatCurrency(totalPrice)}</span>
          </button>
        </div>
      )}

      {/* ── #1 Bottom Navigation Bar — มือถือเท่านั้น ── */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden backdrop-blur-md transition-colors duration-300" style={{ background: theme === 'dark' ? '#150e06' : '#fef3c7', borderTop: `1px solid ${theme === 'dark' ? '#3d2a10' : '#fed7aa'}` }}>
          <div className="flex items-center justify-around px-2 py-1">
            <Link
              href="/"
              className={['flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors', pathname === '/' ? 'text-orange-500 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600'].join(' ')}
            >
              <Home size={22} />
              <span className="text-[10px] font-medium">เมนู</span>
            </Link>

            <button
              data-cart-target
              onClick={() => setCartOpen(true)}
              className={['relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors', totalItems > 0 ? 'text-orange-500 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600'].join(' ')}
            >
              <ShoppingCart size={22} />
              {totalItems > 0 && (
                <span key={`nav-${totalItems}`} className="absolute right-2 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-badge-bounce">
                  {totalItems}
                </span>
              )}
              <span className="text-[10px] font-medium">ตะกร้า</span>
            </button>

            <Link
              href="/my-orders"
              className={['relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors', pathname === '/my-orders' ? 'text-orange-500 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600'].join(' ')}
            >
              <ClipboardList size={22} />
              {mounted && historyOrders.length > 0 && (
                <span className="absolute right-2 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
                  {historyOrders.length}
                </span>
              )}
              <span className="text-[10px] font-medium">ออเดอร์</span>
            </Link>

          </div>
        </nav>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}
