'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Minus, Plus, Trash2, ShoppingCart, Pencil } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useMenu } from '@/lib/hooks/useMenu'
import { ItemOptionsModal } from '@/components/customer/ItemOptionsModal'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import type { CartItem, MenuItem, SelectedOption } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

function toSelectionMap(selected: SelectedOption[]): Record<string, string[]> {
  return (selected ?? []).reduce<Record<string, string[]>>((acc, opt) => ({
    ...acc,
    [opt.groupId]: [...(acc[opt.groupId] ?? []), opt.choiceId],
  }), {})
}

export function CartDrawer({ open, onClose }: Props) {
  const { items, updateQty, removeItem, getTotalPrice, getTotalItems, getItemEffectivePrice, updateItemOptions } = useCartStore()
  const { items: menuItems } = useMenu()
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function getLiveMenuItem(cartItem: CartItem): MenuItem {
    return menuItems.find((m) => m.id === cartItem.menuItemId) ?? {
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

  function handleEditSave(selectedOptions: SelectedOption[], itemNote: string) {
    if (!editingItem) return
    updateItemOptions(editingItem.menuItemId, selectedOptions, itemNote)
    setEditingItem(null)
  }

  const editingMenuItem = editingItem ? getLiveMenuItem(editingItem) : null

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        className={[
          'cart-drawer fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="cart-drawer-header flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-orange-600" />
            <h2 className="text-lg font-semibold dark:text-amber-50">ตะกร้า {mounted ? `(${getTotalItems()})` : ''}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!mounted || items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <ShoppingCart size={48} strokeWidth={1.5} />
              <p>ยังไม่มีสินค้าในตะกร้า</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const unitPrice = getItemEffectivePrice(item)
                const liveMenuItem = getLiveMenuItem(item)
                const hasOptions = (liveMenuItem.optionGroups ?? []).length > 0
                return (
                  <div key={item.menuItemId} className="cart-item-row rounded-xl border border-gray-100 p-3 flex flex-col gap-1.5">
                    {/* Name + controls row */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 dark:text-amber-50 line-clamp-1">{item.name}</p>
                        {/* Selected options */}
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                            {item.selectedOptions.map((o) => o.choiceName).join(', ')}
                            {item.selectedOptions.some((o) => o.extraPrice > 0) && (
                              <span className="text-orange-400 ml-1">
                                (+{formatCurrency(item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0))})
                              </span>
                            )}
                          </p>
                        )}
                        {/* Per-item note */}
                        {item.itemNote && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">📝 {item.itemNote}</p>
                        )}
                        {/* Price + edit */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-orange-600 text-sm font-semibold">{formatCurrency(unitPrice)}</span>
                          {hasOptions && (
                            <button
                              onClick={() => setEditingItem(item)}
                              className="flex items-center gap-0.5 text-xs text-orange-500 hover:text-orange-700 transition-colors"
                            >
                              <Pencil size={10} />
                              แก้ไข
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Qty controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                        <button
                          onClick={() => updateQty(item.menuItemId, item.qty - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.menuItemId, item.qty + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-white hover:bg-orange-700"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => removeItem(item.menuItemId)}
                          className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full text-red-400 hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="flex justify-end">
                      <span className="text-xs text-gray-400">{formatCurrency(unitPrice)} × {item.qty} = <span className="text-gray-600 font-medium">{formatCurrency(unitPrice * item.qty)}</span></span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {mounted && items.length > 0 && (
          <div className="cart-footer border-t px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>รวม</span>
              <span className="text-orange-600">{formatCurrency(getTotalPrice())}</span>
            </div>
            <Link href="/cart" onClick={onClose}>
              <Button fullWidth>ดูตะกร้า / เลือกตัวเลือก</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Edit options modal */}
      {editingItem && editingMenuItem && (
        <ItemOptionsModal
          item={editingMenuItem}
          initialSelections={toSelectionMap(editingItem.selectedOptions ?? [])}
          initialNote={editingItem.itemNote ?? ''}
          isEdit
          onClose={() => setEditingItem(null)}
          onAdd={(selectedOptions, itemNote) => handleEditSave(selectedOptions, itemNote)}
        />
      )}
    </>
  )
}
