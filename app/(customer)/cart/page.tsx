'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Pencil, AlertCircle } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useMenu } from '@/lib/hooks/useMenu'
import { OrderTypeSelector } from '@/components/customer/OrderTypeSelector'
import { ItemOptionsModal } from '@/components/customer/ItemOptionsModal'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import type { CartItem, Category, CategoryAddon, MenuItem, SelectedOption } from '@/types'

function toSelectionMap(selected: SelectedOption[]): Record<string, string[]> {
  return (selected ?? []).reduce<Record<string, string[]>>((acc, opt) => ({
    ...acc,
    [opt.groupId]: [...(acc[opt.groupId] ?? []), opt.choiceId],
  }), {})
}

function getLiveMenuItem(cartItem: CartItem, menuItems: MenuItem[]): MenuItem {
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

export default function CartPage() {
  const router = useRouter()
  const { items, updateQty, removeItem, getTotalPrice, getTotalItems, getItemEffectivePrice, updateItemOptions } = useCartStore()
  const { categoryAddons, toggleCategoryAddon, note, setNote } = useCheckoutStore()
  const { items: menuItems, categories } = useMenu()
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-stone-400">
        <ShoppingCart size={60} strokeWidth={1.5} />
        <p className="text-lg">ตะกร้าว่างเปล่า</p>
        <Link href="/"><Button variant="outline">เลือกเมนู</Button></Link>
      </div>
    )
  }

  // ── Determine which categories have items in cart AND have required option groups
  const cartCategoryIds = new Set(
    items.map((ci) => menuItems.find((m) => m.id === ci.menuItemId)?.categoryId).filter(Boolean) as string[],
  )
  const categoriesNeedingOptions: Category[] = categories.filter(
    (cat) => cartCategoryIds.has(cat.id) && (cat.optionGroups ?? []).some((g) => g.required),
  )

  // Check if all required category options are selected
  const missingGroups: Array<{ cat: Category; groupName: string }> = []
  for (const cat of categoriesNeedingOptions) {
    for (const group of (cat.optionGroups ?? []).filter((g) => g.required)) {
      if (!categoryAddons.some((a) => a.categoryId === cat.id && a.groupId === group.id)) {
        missingGroups.push({ cat, groupName: group.name })
      }
    }
  }
  const canProceed = missingGroups.length === 0

  function handleProceed() {
    if (!canProceed) {
      const first = missingGroups[0]
      alert(`กรุณาเลือก${first.groupName} สำหรับ${first.cat.name}`)
      return
    }
    router.push('/checkout')
  }

  function handleEditSave(selectedOptions: SelectedOption[], itemNote: string) {
    if (!editingItem) return
    updateItemOptions(editingItem.menuItemId, selectedOptions, itemNote)
    setEditingItem(null)
  }

  const editingMenuItem = editingItem ? getLiveMenuItem(editingItem, menuItems) : null

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 hover:bg-stone-100 rounded-xl">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">ตะกร้าสินค้า ({getTotalItems()} รายการ)</h1>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-stone-600 mb-3">ประเภทการรับ</h2>
        <OrderTypeSelector />
      </section>

      {/* Cart items */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-stone-600">รายการสินค้า</h2>
        {items.map((item) => {
          const unitPrice = getItemEffectivePrice(item)
          const live = getLiveMenuItem(item, menuItems)
          const hasOptions = (live.optionGroups ?? []).length > 0
          return (
            <div key={item.menuItemId} className="flex items-start gap-3 rounded-xl bg-white border border-gray-100 p-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-stone-800">{item.name}</p>
                {item.selectedOptions?.length > 0 && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {item.selectedOptions.map((o) => o.choiceName).join(', ')}
                    {item.selectedOptions.some((o) => o.extraPrice > 0) && (
                      <span className="text-orange-400 ml-1">
                        (+{formatCurrency(item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0))})
                      </span>
                    )}
                  </p>
                )}
                {item.itemNote && <p className="text-xs text-stone-400 mt-0.5">📝 {item.itemNote}</p>}
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-orange-500 text-sm font-medium">{formatCurrency(unitPrice)} / ชิ้น</p>
                  {hasOptions && (
                    <button onClick={() => setEditingItem(item)}
                      className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 transition-colors">
                      <Pencil size={11} /> แก้ไขตัวเลือก
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <button onClick={() => updateQty(item.menuItemId, item.qty - 1)}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-stone-100 text-lg font-bold">−</button>
                <span className="w-6 text-center font-semibold">{item.qty}</span>
                <button onClick={() => updateQty(item.menuItemId, item.qty + 1)}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 text-lg font-bold">+</button>
              </div>
              <button onClick={() => removeItem(item.menuItemId)}
                className="text-red-400 text-xs hover:text-red-600 mt-1">ลบ</button>
            </div>
          )
        })}
      </section>

      {/* ── Category-level option selection ── */}
      {categoriesNeedingOptions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-stone-600">ตัวเลือกประจำหมวดหมู่</h2>
          {categoriesNeedingOptions.map((cat) => (
            <div key={cat.id} className="rounded-2xl bg-white border border-orange-100 p-4 shadow-sm flex flex-col gap-3">
              <p className="text-sm font-semibold text-stone-700">
                🍢 {cat.name}
                <span className="ml-1.5 text-xs text-stone-400 font-normal">(เลือก 1 ครั้งสำหรับทั้งออเดอร์)</span>
              </p>
              {(cat.optionGroups ?? []).map((group) => {
                const groupSelections = categoryAddons.filter(
                  (a) => a.categoryId === cat.id && a.groupId === group.id,
                )
                const isGroupMissing = group.required && groupSelections.length === 0
                return (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-stone-700">{group.name}</p>
                      {group.required && (
                        <span className={`text-xs rounded-full px-2 py-0.5 border ${
                          isGroupMissing
                            ? 'bg-red-50 text-red-500 border-red-100'
                            : 'bg-green-50 text-green-600 border-green-100'
                        }`}>
                          {isGroupMissing ? 'ยังไม่ได้เลือก' : '✓ เลือกแล้ว'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {group.choices.map((choice) => {
                        const isSelected = groupSelections.some((a) => a.choiceId === choice.id)
                        const addon: CategoryAddon = {
                          categoryId: cat.id,
                          categoryName: cat.name,
                          groupId: group.id,
                          groupName: group.name,
                          choiceId: choice.id,
                          choiceName: choice.name,
                          extraPrice: choice.extraPrice,
                        }
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => toggleCategoryAddon(addon, group.multiSelect)}
                            className={[
                              'flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm text-left transition-all',
                              isSelected
                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                : 'border-gray-200 text-stone-600 hover:border-orange-200',
                            ].join(' ')}
                          >
                            <div className="flex items-center gap-2">
                              <div className={[
                                'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                                isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300',
                              ].join(' ')}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span>{choice.name}</span>
                            </div>
                            {choice.extraPrice > 0 && (
                              <span className="text-xs text-orange-500 font-medium">+{formatCurrency(choice.extraPrice)}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Missing warning */}
          {!canProceed && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">
                กรุณาเลือก{missingGroups.map((m) => m.groupName).join(', ')} ก่อนดำเนินการ
              </p>
            </div>
          )}
        </section>
      )}

      {/* Order note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-stone-700">หมายเหตุออเดอร์ (ไม่บังคับ)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="เช่น ไม่ใส่ผัก, ไม่ใส่น้ำแข็ง, ส่งด่วน"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
        />
      </div>

      {/* Summary + proceed */}
      <div className="rounded-2xl bg-white border border-gray-100 p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex justify-between text-sm text-stone-600">
          <span>รวมสินค้า</span>
          <span>{formatCurrency(getTotalPrice())}</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
          <span>รวม</span>
          <span className="text-orange-500">{formatCurrency(getTotalPrice())}</span>
        </div>
        <Button fullWidth size="lg" onClick={handleProceed}
          className={!canProceed ? 'opacity-60' : ''}>
          ดำเนินการสั่งซื้อ
        </Button>
      </div>

      {/* Edit item options modal */}
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
    </div>
  )
}
