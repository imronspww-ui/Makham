'use client'
import { useState } from 'react'
import { X, Plus, Check } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import type { MenuItem } from '@/types'

interface Props {
  suggestions: MenuItem[]
  onConfirm: () => void
  onClose: () => void
}

export function UpsellModal({ suggestions, onConfirm, onClose }: Props) {
  const { addItem } = useCartStore()
  const [added, setAdded] = useState<Set<string>>(new Set())

  function handleAdd(item: MenuItem) {
    if (added.has(item.id)) return
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      selectedOptions: [],
      itemNote: '',
      optionGroups: item.optionGroups,
    })
    setAdded((prev) => new Set(prev).add(item.id))
  }

  const addedCount = added.size

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-orange-600 px-5 pt-5 pb-4 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
          <p className="text-xs font-medium opacity-80 mb-0.5">ก่อนยืนยันออเดอร์</p>
          <h3 className="text-lg font-bold">เพิ่มอะไรอีกไหม? 🍢</h3>
          <p className="text-xs opacity-70 mt-0.5">ลูกค้าคนอื่นมักสั่งเพิ่มรายการเหล่านี้</p>
        </div>

        {/* Items */}
        <div className="flex flex-col divide-y divide-stone-100">
          {suggestions.map((item) => {
            const isAdded = added.has(item.id)
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-14 w-14 rounded-xl object-cover flex-shrink-0 border border-orange-100"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-stone-100 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 line-clamp-1">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-stone-400 line-clamp-1 mt-0.5">{item.description}</p>
                  )}
                  <p className="text-sm font-bold text-orange-600 mt-0.5">{formatCurrency(item.price)}</p>
                </div>
                <button
                  onClick={() => handleAdd(item)}
                  className={[
                    'flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200',
                    isAdded
                      ? 'bg-green-500 text-white scale-95'
                      : 'bg-orange-600 text-white hover:bg-orange-500 active:scale-90',
                  ].join(' ')}
                >
                  {isAdded ? <Check size={16} /> : <Plus size={18} />}
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 flex flex-col gap-2 border-t border-stone-100">
          <Button fullWidth size="lg" onClick={onConfirm}>
            ยืนยันสั่งอาหาร{addedCount > 0 ? ` (+${addedCount} รายการ)` : ''}
          </Button>
          <button
            onClick={onClose}
            className="text-sm text-stone-400 hover:text-stone-600 py-1 transition-colors"
          >
            ไม่ขอบคุณ ข้ามไปเลย
          </button>
        </div>
      </div>
    </div>
  )
}
