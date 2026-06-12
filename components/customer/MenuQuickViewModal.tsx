'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Star, Plus, Minus, UtensilsCrossed, Flame } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { getMenuReviews } from '@/lib/services/reviewService'
import { formatCurrency } from '@/lib/utils/format'
import { flyToCart } from '@/lib/utils/flyToCart'
import type { MenuItem, SelectedOption, Review } from '@/types'

interface Props {
  item: MenuItem
  ordersToday?: number
  onClose: () => void
}

export function MenuQuickViewModal({ item, ordersToday, onClose }: Props) {
  const { addItem } = useCartStore()
  const [qty, setQty] = useState(1)
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const auto: Record<string, string[]> = {}
    for (const g of item.optionGroups ?? []) {
      if (!g.multiSelect && g.required) {
        const first = g.choices.find((c) => !c.isSoldOut)
        if (first) auto[g.id] = [first.id]
      }
    }
    return auto
  })
  const [note, setNote] = useState('')
  const [reviews, setReviews] = useState<Review[]>([])
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const [popping, setPopping] = useState(false)

  useEffect(() => {
    getMenuReviews(item.id).then(setReviews).catch(() => {})
  }, [item.id])

  function toggleChoice(groupId: string, choiceId: string, multi: boolean) {
    setSelections((prev) => {
      const cur = prev[groupId] ?? []
      if (multi) {
        return { ...prev, [groupId]: cur.includes(choiceId) ? cur.filter(i => i !== choiceId) : [...cur, choiceId] }
      }
      return { ...prev, [groupId]: cur[0] === choiceId ? [] : [choiceId] }
    })
    setErrors((e) => ({ ...e, [groupId]: false }))
  }

  function extraPrice() {
    return Object.entries(selections).flatMap(([gid, cids]) => {
      const group = item.optionGroups?.find(g => g.id === gid)
      return cids.map(cid => group?.choices.find(c => c.id === cid)?.extraPrice ?? 0)
    }).reduce((s, v) => s + v, 0)
  }

  const unitPrice = item.price + extraPrice()
  const total = unitPrice * qty

  function handleAdd() {
    const newErrors: Record<string, boolean> = {}
    let ok = true
    for (const g of item.optionGroups ?? []) {
      if (g.required && !(selections[g.id]?.length > 0)) { newErrors[g.id] = true; ok = false }
    }
    if (!ok) { setErrors(newErrors); return }

    const selectedOptions: SelectedOption[] = Object.entries(selections).flatMap(([gid, cids]) => {
      const g = item.optionGroups?.find(g => g.id === gid)
      if (!g) return []
      return cids.map(cid => {
        const c = g.choices.find(c => c.id === cid)!
        return { groupId: gid, groupName: g.name, choiceId: cid, choiceName: c.name, extraPrice: c.extraPrice }
      })
    })

    setPopping(true)
    setTimeout(() => setPopping(false), 300)
    if (addBtnRef.current) flyToCart(addBtnRef.current, item.imageUrl)

    for (let i = 0; i < qty; i++) {
      addItem({ menuItemId: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl, selectedOptions, itemNote: note, optionGroups: item.optionGroups })
    }
    onClose()
  }

  const unavailable = !item.isAvailable || item.isSoldOut

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-sheet-up sm:animate-none max-h-[92vh] flex flex-col">
        {/* Image */}
        <div className="relative aspect-video w-full bg-stone-100 shrink-0">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-200"><UtensilsCrossed size={48} /></div>
          )}
          {item.isPopular && (
            <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-800/90 backdrop-blur-sm px-2.5 py-1">
              <Flame size={10} className="text-amber-300" /><span className="text-[11px] font-bold text-white">ยอดนิยม</span>
            </div>
          )}
          {ordersToday != null && ordersToday > 0 && (
            <div className="absolute top-3 right-3 rounded-full bg-orange-500/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-white">
              🔥 {ordersToday} คนสั่งวันนี้
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Name + rating */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 leading-tight">{item.name}</h2>
            {item.description && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-bold text-orange-600">{formatCurrency(item.price)}</span>
              {item.avgRating != null && item.ratingCount != null && item.ratingCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-amber-500 font-semibold">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  {item.avgRating.toFixed(1)}
                  <span className="text-gray-400 font-normal text-xs">({item.ratingCount} รีวิว)</span>
                </span>
              )}
            </div>
          </div>

          {/* Options */}
          {(item.optionGroups ?? []).map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-gray-700">{group.name}</p>
                {group.required && <span className="text-[10px] bg-red-50 text-red-500 border border-red-200 rounded-full px-2 py-0.5">จำเป็น</span>}
              </div>
              {errors[group.id] && <p className="text-xs text-red-500 mb-1.5">กรุณาเลือกตัวเลือกนี้</p>}
              <div className="flex flex-wrap gap-2">
                {group.choices.map((c) => {
                  const sel = (selections[group.id] ?? []).includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={c.isSoldOut}
                      onClick={() => toggleChoice(group.id, c.id, group.multiSelect)}
                      className={[
                        'rounded-xl border px-3 py-1.5 text-sm transition-all',
                        c.isSoldOut ? 'opacity-40 cursor-not-allowed border-gray-200 text-gray-400' :
                        sel ? 'border-orange-500 bg-orange-50 text-orange-600 font-semibold' :
                              'border-gray-200 text-gray-600 hover:border-orange-300',
                      ].join(' ')}
                    >
                      {c.name}{c.extraPrice > 0 && <span className="ml-1 text-xs text-orange-500">+{formatCurrency(c.extraPrice)}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Note */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1.5">หมายเหตุ <span className="text-gray-400 font-normal">(ไม่บังคับ)</span></p>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เช่น ไม่เผ็ด, ไม่ใส่ผัก"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">รีวิวจากลูกค้า</p>
              <div className="flex flex-col gap-3">
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500 text-sm font-bold">
                      {r.orderNumber.slice(-2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {Array.from({length: 5}).map((_, i) => (
                          <Star key={i} size={11} className={i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                        <span className="text-[11px] text-gray-400 ml-1">{r.createdAt.slice(0,10)}</span>
                      </div>
                      {r.comment && <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{r.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — qty + add */}
        {!unavailable && (
          <div className="shrink-0 border-t border-gray-100 px-5 py-4 flex items-center gap-3 bg-white">
            {/* Qty */}
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-bold text-gray-800">{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-500 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
                <Plus size={14} />
              </button>
            </div>

            {/* Add button */}
            <button
              ref={addBtnRef}
              onClick={handleAdd}
              className={['flex-1 flex items-center justify-between rounded-2xl bg-orange-600 hover:bg-orange-500 text-white px-4 py-3 font-semibold transition-all', popping ? 'animate-btn-pop' : ''].join(' ')}
            >
              <span className="text-sm">เพิ่มลงตะกร้า</span>
              <span className="text-sm font-bold">{formatCurrency(total)}</span>
            </button>
          </div>
        )}

        {unavailable && (
          <div className="shrink-0 border-t border-gray-100 px-5 py-4 text-center text-sm text-gray-400 bg-white">
            {item.isSoldOut ? 'สินค้าหมด' : 'ไม่เปิดขาย'}
          </div>
        )}
      </div>
    </div>
  )
}
