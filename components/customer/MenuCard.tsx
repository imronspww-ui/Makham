'use client'
import { useState } from 'react'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { ItemOptionsModal } from '@/components/customer/ItemOptionsModal'
import { formatCurrency } from '@/lib/utils/format'
import type { MenuItem, SelectedOption } from '@/types'

interface Props {
  item: MenuItem
}

export function MenuCard({ item }: Props) {
  const { addItem, items, getItemEffectivePrice } = useCartStore()
  const [imgError, setImgError] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const cartItem = items.find((i) => i.menuItemId === item.id)
  const cartQty = cartItem?.qty ?? 0
  const unavailable = !item.isAvailable || item.isSoldOut
  const hasOptions = (item.optionGroups ?? []).length > 0

  function handleAdd() {
    if (unavailable) return
    if (hasOptions && !cartItem) {
      // First time adding item with options → show selection modal
      setShowOptions(true)
      return
    }
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      selectedOptions: [],
      itemNote: '',
      optionGroups: item.optionGroups,
    })
  }

  function handleModalAdd(selectedOptions: SelectedOption[], itemNote: string, qty: number) {
    for (let i = 0; i < qty; i++) {
      addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        selectedOptions,
        itemNote,
        optionGroups: item.optionGroups,
      })
    }
    setShowOptions(false)
  }

  const showImage = item.imageUrl && !imgError

  return (
    <>
      <div
        className={[
          'group relative flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm',
          'overflow-hidden transition-shadow hover:shadow-md',
          unavailable ? 'opacity-60' : '',
        ].join(' ')}
      >
        <div className="relative h-44 w-full bg-gray-100">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-200">
              <UtensilsCrossed size={48} />
            </div>
          )}
          {item.isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-red-500">สินค้าหมด</span>
            </div>
          )}
          {!item.isAvailable && !item.isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-600">ปิดขาย</span>
            </div>
          )}
          {cartQty > 0 && (
            <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow">
              {cartQty}
            </div>
          )}
          {hasOptions && (
            <div className="absolute bottom-2 left-2 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-medium text-gray-600 px-2 py-0.5 border border-gray-200">
              มีตัวเลือก
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h3 className="font-semibold text-gray-800 line-clamp-1">{item.name}</h3>
          {item.description && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{item.description}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <div>
              <span className="font-bold text-orange-500">{formatCurrency(item.price)}</span>
              {cartItem && cartItem.selectedOptions.length > 0 && (
                <span className="ml-1 text-xs text-gray-400">
                  (+{formatCurrency(getItemEffectivePrice(cartItem) - item.price)})
                </span>
              )}
            </div>
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

      {showOptions && (
        <ItemOptionsModal
          item={item}
          onClose={() => setShowOptions(false)}
          onAdd={handleModalAdd}
        />
      )}
    </>
  )
}
