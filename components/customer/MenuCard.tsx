'use client'
import { useState, useMemo } from 'react'
import { Plus, UtensilsCrossed, Flame } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { ItemOptionsModal } from '@/components/customer/ItemOptionsModal'
import { formatCurrency } from '@/lib/utils/format'
import type { MenuItem, SelectedOption } from '@/types'

interface Props {
  item: MenuItem
  showPopularBadge?: boolean
}

export function MenuCard({ item, showPopularBadge = true }: Props) {
  const { addItem, items } = useCartStore()
  const [imgError,    setImgError]    = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const cartItem   = items.find((i) => i.menuItemId === item.id)
  const cartQty    = cartItem?.qty ?? 0
  const unavailable = !item.isAvailable || item.isSoldOut
  const hasOptions  = (item.optionGroups ?? []).length > 0

  // ── ราคาเริ่มต้น สำหรับ item ที่ base price = ฿0 ────────────────────────────
  // หาราคาต่ำสุดที่เป็นไปได้ (required group → cheapest choice)
  const startingPrice = useMemo(() => {
    if (item.price > 0 || !hasOptions) return null
    const minFromRequired = item.optionGroups.reduce((acc, group) => {
      if (!group.required) return acc
      const cheapest = Math.min(...group.choices.map((c) => c.extraPrice))
      return acc + cheapest
    }, 0)
    // ถ้าไม่มี required group ให้ใช้ราคาต่ำสุดจากทุก choice
    if (minFromRequired === 0) {
      const allPrices = item.optionGroups.flatMap((g) => g.choices.map((c) => c.extraPrice))
      return allPrices.length > 0 ? Math.min(...allPrices) : null
    }
    return minFromRequired
  }, [item.price, item.optionGroups, hasOptions])

  // ── เปิด modal เสมอสำหรับ item ที่มี options (ทั้ง click การ์ดและปุ่ม +) ───
  function handleClick() {
    if (unavailable) return
    if (hasOptions) {
      setShowOptions(true)
      return
    }
    addItem({
      menuItemId:      item.id,
      name:            item.name,
      price:           item.price,
      imageUrl:        item.imageUrl,
      selectedOptions: [],
      itemNote:        '',
      optionGroups:    item.optionGroups,
    })
  }

  function handleModalAdd(selectedOptions: SelectedOption[], itemNote: string, qty: number) {
    for (let i = 0; i < qty; i++) {
      addItem({
        menuItemId:   item.id,
        name:         item.name,
        price:        item.price,
        imageUrl:     item.imageUrl,
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
        onClick={handleClick}
        className={[
          'group relative flex flex-col rounded-2xl bg-white border border-stone-100 shadow-sm',
          'overflow-hidden transition-all duration-200',
          unavailable
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]',
        ].join(' ')}
      >
        {/* Image */}
        <div className="relative h-44 w-full bg-stone-100">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-200">
              <UtensilsCrossed size={48} />
            </div>
          )}

          {/* Status overlays */}
          {item.isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-red-500">สินค้าหมด</span>
            </div>
          )}
          {!item.isAvailable && !item.isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-stone-600">ปิดขาย</span>
            </div>
          )}

          {/* Cart qty badge */}
          {cartQty > 0 && (
            <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-md">
              {cartQty}
            </div>
          )}

          {/* Popular badge */}
          {item.isPopular && showPopularBadge && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-500/95 backdrop-blur-sm px-2.5 py-0.5 shadow-sm">
              <Flame size={10} className="text-white" />
              <span className="text-[10px] font-bold text-white">ยอดนิยม</span>
            </div>
          )}

          {/* Has options badge */}
          {hasOptions && (
            <div className="absolute bottom-2 left-2 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-medium text-stone-600 px-2 py-0.5 border border-stone-200">
              มีตัวเลือก
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col p-3">
          <h3 className="font-semibold text-stone-800 line-clamp-1 text-[0.9rem]">{item.name}</h3>
          {item.description && (
            <p className="mt-0.5 text-xs text-stone-500 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
          <div className="mt-auto pt-2 flex items-center justify-between">
            {/* Price — แสดง "ตั้งแต่ ฿X" ถ้า base = ฿0 */}
            <div>
              {startingPrice !== null && startingPrice > 0 ? (
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] text-stone-400">ตั้งแต่</span>
                  <span className="font-bold text-orange-500 text-base">{formatCurrency(startingPrice)}</span>
                </div>
              ) : (
                <span className="font-bold text-orange-500 text-base">{formatCurrency(item.price)}</span>
              )}
            </div>
            {/* + button — stopPropagation เพื่อไม่ให้ bubble ไป div onClick */}
            <button
              onClick={(e) => { e.stopPropagation(); handleClick() }}
              disabled={unavailable}
              aria-label={`เพิ่ม ${item.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-all hover:bg-orange-400 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
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
