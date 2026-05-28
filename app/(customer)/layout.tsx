'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, Store, ClipboardList } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useOrderHistoryStore } from '@/store/orderHistoryStore'
import { CartDrawer } from '@/components/customer/CartDrawer'
import { useSettings } from '@/lib/hooks/useSettings'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const getTotalItems = useCartStore((s) => s.getTotalItems)
  const historyOrders = useOrderHistoryStore((s) => s.orders)
  const { settings } = useSettings()

  useEffect(() => { setMounted(true) }, [])

  const storeName = settings?.store.name ?? process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม'
  const logoUrl = settings?.store.logoUrl
  const bgImageUrl = settings?.store.bgImageUrl

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={bgImageUrl
        ? { backgroundImage: `url(${bgImageUrl})` }
        : { background: 'linear-gradient(165deg, #fef9f2 0%, #fff7ed 55%, #fef4e2 100%)' }
      }
    >
      {/* ── Dark classy header ── */}
      <header className="sticky top-0 z-30 border-b border-[#2d1e0a]" style={{ background: '#1c1209' }}>
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
            {/* My orders button */}
            {mounted && historyOrders.length > 0 && (
              <Link
                href="/my-orders"
                className="relative flex items-center gap-1.5 rounded-xl border border-stone-700 bg-stone-800/60 px-3 py-2 text-sm font-medium text-stone-300 hover:border-amber-600 hover:text-amber-300 transition-colors"
              >
                <ClipboardList size={15} />
                <span className="hidden sm:inline">ออเดอร์ของฉัน</span>
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  {historyOrders.length}
                </span>
              </Link>
            )}

            {/* Cart button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-400 active:scale-95 transition-all duration-150"
            >
              <ShoppingCart size={16} />
              ตะกร้า
              {mounted && getTotalItems() > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}
