'use client'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils/format'
import type { MenuItem } from '@/types'

interface Props {
  item: MenuItem
}

export function MenuCard({ item }: Props) {
  const { addItem, items } = useCartStore()
  const cartQty = items.find((i) => i.menuItemId === item.id)?.qty ?? 0
  const unavailable = !item.isAvailable || item.isSoldOut

  function handleAdd() {
    if (unavailable) return
    addItem({ menuItemId: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl })
  }

  return (
    <div
      className={[
        'group relative flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm',
        'overflow-hidden transition-shadow hover:shadow-md',
        unavailable ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="relative h-44 w-full bg-gray-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🍽️</div>
        )}
        {item.isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-red-500">
              สินค้าหมด
            </span>
          </div>
        )}
        {!item.isAvailable && !item.isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-600">
              ปิดขาย
            </span>
          </div>
        )}
        {cartQty > 0 && (
          <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow">
            {cartQty}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-semibold text-gray-800 line-clamp-1">{item.name}</h3>
        {item.description && (
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{item.description}</p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold text-orange-500">{formatCurrency(item.price)}</span>
          <button
            onClick={handleAdd}
            disabled={unavailable}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
