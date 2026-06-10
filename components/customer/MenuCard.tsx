'use client'
import { useState, useMemo, useCallback, useRef } from 'react'
import { Plus, UtensilsCrossed, Flame, Star } from 'lucide-react'
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
  const cartItem    = items.find((i) => i.menuItemId === item.id)
  const cartQty     = cartItem?.qty ?? 0
  const unavailable = !item.isAvailable || item.isSoldOut
  const hasOptions  = (item.optionGroups ?? []).length > 0

  const triggerPop = useCallback(() => {
    setPopping(true)
    setTimeout(() => setPopping(false), 300)
  }, [])

  const startingPrice = useMemo(() => {
    if (item.price > 0 || !hasOptions) return null
    const minFromRequired = item.optionGroups.reduce((acc, group) => {
      if (!group.required) return acc
      const cheapest = Math.min(...group.choices.map((c) => c.extraPrice))
      return acc + cheapest
    }, 0)
    if (minFromRequired === 0) {
      const allPrices = item.optionGroups.flatMap((g) => g.choices.map((c) => c.extraPrice))
      return allPrices.length > 0 ? Math.min(...allPrices) : null
    }
    return minFromRequired
  }, [item.price, item.optionGroups, hasOptions])

  function handleClick() {
    if (unavailable) return
    if (hasOptions) { setShowOptions(true); return }
    triggerPop()
    if (btnRef.current) flyToCart(btnRef.current, item.imageUrl)
    addItem({ menuItemId: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl, selectedOptions: [], itemNote: '', optionGroups: item.optionGroups })
  }

  function handleModalAdd(selectedOptions: SelectedOption[], itemNote: string, qty: number) {
    triggerPop()
    if (btnRef.current) flyToCart(btnRef.current, item.imageUrl)
    for (let i = 0; i < qty; i++) {
      addItem({ menuItemId: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl, selectedOptions, itemNote, optionGroups: item.optionGroups })
    }
    setShowOptions(false)
  }

  const showImage = item.imageUrl && !imgError

  return (
    <>
      <div
        onClick={handleClick}
        className={[
          'menu-card group relative flex flex-col rounded-2xl bg-white overflow-hidden',
          'border shadow-sm transition-all duration-200',
          unavailable
            ? 'cursor-not-allowed border-stone-200 opacity-80'
            : 'cursor-pointer border-orange-200 hover:border-orange-400 hover:shadow-lg active:scale-[0.97]',
        ].join(' ')}
      >
        {/* Image — aspect 4:3 */}
        <div className="relative aspect-[4/3] w-full bg-stone-100 overflow-hidden">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className={[
                'h-full w-full object-cover transition-transform duration-300',
                unavailable ? 'grayscale opacity-50' : 'group-hover:scale-105',
              ].join(' ')}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-200">
              <UtensilsCrossed size={40} />
            </div>
          )}

          {/* Gradient overlay ด้านล่างภาพ */}
          {showImage && !unavailable && (
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
          )}

          {/* Status overlays */}
          {item.isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">สินค้าหมด</span>
            </div>
          )}
          {!item.isAvailable && !item.isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">ปิดขาย</span>
            </div>
          )}

          {/* Popular badge */}
          {item.isPopular && showPopularBadge && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-800/90 backdrop-blur-sm px-2 py-0.5 shadow-sm">
              <Flame size={9} className="text-amber-300" />
              <span className="text-[10px] font-bold text-white">ยอดนิยม</span>
            </div>
          )}

          {/* Cart qty badge — ติดมุมขวาบนภาพ */}
          {cartQty > 0 && (
            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-md ring-2 ring-white">
              {cartQty}
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col p-3 min-w-0">
          <h3 className="item-name font-semibold text-stone-800 line-clamp-2 text-[0.88rem] leading-snug">{item.name}</h3>

          {item.description && (
            <p className="item-desc mt-0.5 text-xs text-stone-400 line-clamp-1 leading-relaxed">{item.description}</p>
          )}

          {/* Tags row */}
          {(hasOptions || (item.avgRating != null && item.ratingCount != null && item.ratingCount > 0)) && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {hasOptions && (
                <span className="item-tag rounded-full bg-stone-100 text-[10px] font-medium text-stone-400 px-2 py-0.5">
                  มีตัวเลือก
                </span>
              )}
              {item.avgRating != null && item.ratingCount != null && item.ratingCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold">
                  <Star size={9} className="fill-amber-400 text-amber-400" />
                  {item.avgRating.toFixed(1)}
                  <span className="text-stone-400 font-normal">({item.ratingCount})</span>
                </span>
              )}
            </div>
          )}

          {/* Price + button */}
          <div className="mt-auto pt-2.5 flex items-center justify-between gap-1">
            <div>
              {startingPrice !== null && startingPrice > 0 ? (
                <div className="flex flex-col leading-none">
                  <span className="text-[9px] text-stone-400 font-medium">ตั้งแต่</span>
                  <span className="item-price font-bold text-orange-600 text-[0.95rem]">{formatCurrency(startingPrice)}</span>
                </div>
              ) : (
                <span className="item-price font-bold text-orange-600 text-[0.95rem]">{formatCurrency(item.price)}</span>
              )}
            </div>
            <button
              ref={btnRef}
              onClick={(e) => { e.stopPropagation(); handleClick() }}
              disabled={unavailable}
              aria-label={`เพิ่ม ${item.name}`}
              className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-white transition-all',
                unavailable
                  ? 'bg-stone-300 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-500 active:scale-90 shadow-sm',
                popping ? 'animate-btn-pop' : '',
              ].join(' ')}
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
