'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Pencil } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { OrderTypeSelector } from '@/components/customer/OrderTypeSelector'
import { ItemOptionsModal } from '@/components/customer/ItemOptionsModal'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import type { CartItem, MenuItem, SelectedOption } from '@/types'

/** Build a minimal MenuItem-shaped object from a CartItem so ItemOptionsModal can render */
function toMenuItem(cartItem: CartItem): MenuItem {
  return {
    id: cartItem.menuItemId,
    name: cartItem.name,
    description: '',
    price: cartItem.price,
    categoryId: '',
    imageUrl: cartItem.imageUrl ?? '',
    isAvailable: true,
    isSoldOut: false,
    optionGroups: cartItem.optionGroups ?? [],
    createdAt: '',
    updatedAt: '',
  }
}

/** Convert SelectedOption[] → Record<groupId, choiceId[]> for modal pre-fill */
function toSelectionMap(selected: SelectedOption[]): Record<string, string[]> {
  return selected.reduce<Record<string, string[]>>((acc, opt) => ({
    ...acc,
    [opt.groupId]: [...(acc[opt.groupId] ?? []), opt.choiceId],
  }), {})
}

export default function CartPage() {
  const { items, updateQty, removeItem, getTotalPrice, getTotalItems, getItemEffectivePrice, updateItemOptions } = useCartStore()
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-gray-400">
        <ShoppingCart size={60} strokeWidth={1.5} />
        <p className="text-lg">ตะกร้าว่างเปล่า</p>
        <Link href="/"><Button variant="outline">เลือกเมนู</Button></Link>
      </div>
    )
  }

  function handleEditSave(selectedOptions: SelectedOption[], itemNote: string) {
    if (!editingItem) return
    updateItemOptions(editingItem.menuItemId, selectedOptions, itemNote)
    setEditingItem(null)
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">ตะกร้าสินค้า ({getTotalItems()} รายการ)</h1>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-600 mb-3">ประเภทการรับ</h2>
        <OrderTypeSelector />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-600">รายการสินค้า</h2>
        {items.map((item) => {
          const unitPrice = getItemEffectivePrice(item)
          const hasOptions = (item.optionGroups ?? []).length > 0
          return (
            <div key={item.menuItemId} className="flex items-start gap-3 rounded-xl bg-white border border-gray-100 p-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800">{item.name}</p>
                {/* Selected options */}
                {item.selectedOptions?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.selectedOptions.map((o) => o.choiceName).join(', ')}
                    {item.selectedOptions.some((o) => o.extraPrice > 0) && (
                      <span className="text-orange-400 ml-1">
                        (+{formatCurrency(item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0))})
                      </span>
                    )}
                  </p>
                )}
                {item.itemNote && (
                  <p className="text-xs text-gray-400 mt-0.5">📝 {item.itemNote}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-orange-500 text-sm font-medium">{formatCurrency(unitPrice)} / ชิ้น</p>
                  {hasOptions && (
                    <button
                      onClick={() => setEditingItem(item)}
                      className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 transition-colors"
                    >
                      <Pencil size={11} />
                      แก้ไขตัวเลือก
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <button onClick={() => updateQty(item.menuItemId, item.qty - 1)}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100 text-lg font-bold">−</button>
                <span className="w-6 text-center font-semibold">{item.qty}</span>
                <button onClick={() => updateQty(item.menuItemId, item.qty + 1)}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 text-lg font-bold">+</button>
              </div>
              <button onClick={() => removeItem(item.menuItemId)} className="text-red-400 text-xs hover:text-red-600 mt-1">ลบ</button>
            </div>
          )
        })}
      </section>

      <div className="rounded-2xl bg-white border border-gray-100 p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex justify-between text-sm text-gray-600">
          <span>รวมสินค้า</span>
          <span>{formatCurrency(getTotalPrice())}</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
          <span>รวม</span>
          <span className="text-orange-500">{formatCurrency(getTotalPrice())}</span>
        </div>
        <Link href="/checkout">
          <Button fullWidth size="lg">ดำเนินการสั่งซื้อ</Button>
        </Link>
      </div>

      {/* Edit options modal */}
      {editingItem && (
        <ItemOptionsModal
          item={toMenuItem(editingItem)}
          initialSelections={toSelectionMap(editingItem.selectedOptions ?? [])}
          initialNote={editingItem.itemNote ?? ''}
          isEdit
          onClose={() => setEditingItem(null)}
          onAdd={(selectedOptions, itemNote) => handleEditSave(selectedOptions, itemNote)}
        />
      )}
    </div>
  )
}
