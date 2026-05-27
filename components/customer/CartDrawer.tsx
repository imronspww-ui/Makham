'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { X, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'

interface Props {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: Props) {
  const { items, updateQty, removeItem, getTotalPrice, getTotalItems } = useCartStore()

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        className={[
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-orange-500" />
            <h2 className="text-lg font-semibold">ตะกร้า ({getTotalItems()})</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <ShoppingCart size={48} strokeWidth={1.5} />
              <p>ยังไม่มีสินค้าในตะกร้า</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 line-clamp-1">{item.name}</p>
                    <p className="text-orange-500 text-sm font-semibold">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.menuItemId, item.qty - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.menuItemId, item.qty + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(item.menuItemId)}
                      className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-red-400 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>รวม</span>
              <span className="text-orange-500">{formatCurrency(getTotalPrice())}</span>
            </div>
            <Link href="/checkout" onClick={onClose}>
              <Button fullWidth size="lg">สั่งอาหาร</Button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
