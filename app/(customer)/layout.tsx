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
        : { background: 'linear-gradient(160deg, #fef6e4 0%, #f0faf4 40%, #fdf2e9 100%)' }
      }
    >
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={storeName}
                className="h-8 w-8 rounded-xl object-cover border border-gray-100" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white">
                <Store size={16} />
              </div>
            )}
            <span className="font-bold text-gray-800">{storeName}</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* My orders button */}
            {mounted && historyOrders.length > 0 && (
              <Link
                href="/my-orders"
                className="relative flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:border-orange-300 hover:text-orange-600 transition-colors"
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
              className="relative flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
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
