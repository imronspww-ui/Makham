'use client'
import { useState, useMemo, useCallback, useRef } from 'react'
import { Plus, UtensilsCrossed, Flame } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { ItemOptionsModal } from '@/components/customer/ItemOptionsModal'
import { formatCurrency } from '@/lib/utils/format'
import { flyToCart } from '@/lib/utils/flyToCart'
import type { MenuItem, SelectedOption } from '@/types'

interface Props {
  item: MenuItem
  showPopularBadge?: boolean
}

export function MenuCard({ item, showPopularBadge = true }: Props) {
  const { addItem, items } = useCartStore()
  const [imgError,    setImgError]    = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const [popping, setPopping] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const cartItem   = items.find((i) => i.menuItemId === item.id)
  const cartQty    = cartItem?.qty ?? 0
  const unavailable = !item.isAvailable || item.isSoldOut
  const hasOptions  = (item.optionGroups ?? []).length > 0

  const triggerPop = useCallback(() => {
    setPopping(true)
    setTimeout(() => setPopping(false), 300)
  }, [])

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

  function handleClick() {
    if (unavailable) return
    if (hasOptions) {
      setShowOptions(true)
      return
    }
    triggerPop()
    if (btnRef.current) flyToCart(btnRef.current, item.imageUrl)
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
    triggerPop()
    if (btnRef.current) flyToCart(btnRef.current, item.imageUrl)
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
          'menu-card group relative flex flex-col rounded-2xl bg-white border border-orange-200 shadow-sm',
          'overflow-hidden transition-all duration-200',
          unavailable
            ? 'cursor-not-allowed opacity-60 grayscale'
            : 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]',
        ].join(' ')}
      >
        {/* Image — เต็มความกว้างทุก breakpoint */}
        <div className="relative h-56 sm:h-72 w-full bg-stone-100 dark:bg-stone-900">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover transition-all duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-200">
              <UtensilsCrossed size={48} />
            </div>
          )}

          {/* Status overlays */}
          {item.isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-sm font-semibold text-red-500 shadow">สินค้าหมด</span>
            </div>
          )}
          {!item.isAvailable && !item.isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-sm font-semibold text-stone-600 shadow">ปิดขาย</span>
            </div>
          )}

          {/* Popular badge */}
          {item.isPopular && showPopularBadge && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-800/95 backdrop-blur-sm px-2.5 py-0.5 shadow-sm">
              <Flame size={10} className="text-white" />
              <span className="text-[10px] font-bold text-white">ยอดนิยม</span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="item-name font-semibold text-stone-800 line-clamp-2 text-[0.9rem] leading-snug">{item.name}</h3>
            {/* Cart qty badge */}
            {cartQty > 0 && (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-md">
                {cartQty}
              </div>
            )}
          </div>

          {item.description && (
            <p className="item-desc mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">{item.description}</p>
          )}

          {hasOptions && (
            <span className="item-tag mt-1.5 self-start rounded-full bg-stone-100 text-[10px] font-medium text-stone-500 px-2 py-0.5">
              มีตัวเลือก
            </span>
          )}

          <div className="mt-auto pt-2 flex items-center justify-between">
            <div>
              {startingPrice !== null && startingPrice > 0 ? (
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] text-stone-400">ตั้งแต่</span>
                  <span className="item-price font-bold text-orange-600 text-base">{formatCurrency(startingPrice)}</span>
                </div>
              ) : (
                <span className="item-price font-bold text-orange-600 text-base">{formatCurrency(item.price)}</span>
              )}
            </div>
            <button
              ref={btnRef}
              onClick={(e) => { e.stopPropagation(); handleClick() }}
              disabled={unavailable}
              aria-label={`เพิ่ม ${item.name}`}
              className={['flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-white shadow-sm transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50', popping ? 'animate-btn-pop' : ''].join(' ')}
            >
              <Plus size={18} />
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
