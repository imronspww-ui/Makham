'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Pencil, AlertCircle } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useMenu } from '@/lib/hooks/useMenu'
import { useSettings } from '@/lib/hooks/useSettings'
import { useStoreHours } from '@/lib/hooks/useStoreHours'
import { OrderTypeSelector } from '@/components/customer/OrderTypeSelector'
import { ItemOptionsModal } from '@/components/customer/ItemOptionsModal'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import type { CartItem, MenuItem, SelectedOption } from '@/types'

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
  const { items, orderType, updateQty, removeItem, getTotalPrice, getTotalItems, getItemEffectivePrice, updateItemOptions } = useCartStore()
  const { settings } = useSettings()
  const { isOpen } = useStoreHours(settings)
  const { note, setNote } = useCheckoutStore()
  const { items: menuItems } = useMenu()
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 px-6 text-center">
        {/* Illustration */}
        <div className="relative">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-orange-50">
            <ShoppingCart size={52} strokeWidth={1.2} className="text-orange-300" />
          </div>
          {/* floating dots */}
          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-[10px]">🍜</span>
          </div>
          <div className="absolute bottom-0 -left-2 h-6 w-6 rounded-full bg-amber-50 flex items-center justify-center">
            <span className="text-xs">🥢</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-lg font-semibold text-gray-700">ตะกร้าว่างเปล่า</p>
          <p className="text-sm text-gray-400">เลือกเมนูอร่อยๆ แล้วเพิ่มลงตะกร้าเลย</p>
        </div>
        <Link href="/"><Button>ดูเมนูอาหาร</Button></Link>
      </div>
    )
  }

  // ── ยอดขั้นต่ำ delivery ──────────────────────────────────────────────────────
  const minOrderAmount = settings?.delivery?.minOrderAmount ?? 0
  const cartTotal = getTotalPrice()
  const belowMinOrder = orderType === 'delivery' && minOrderAmount > 0 && cartTotal < minOrderAmount
  const minOrderShortfall = minOrderAmount - cartTotal

  function handleProceed() {
    if (!isOpen) return
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
                  <p className="text-orange-600 text-sm font-medium">{formatCurrency(unitPrice)} / ชิ้น</p>
                  {hasOptions && (
                    <button onClick={() => setEditingItem(item)}
                      className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 transition-colors">
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
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-orange-600 text-white hover:bg-orange-700 text-lg font-bold">+</button>
              </div>
              <button onClick={() => removeItem(item.menuItemId)}
                className="text-red-400 text-xs hover:text-red-600 mt-1">ลบ</button>
            </div>
          )
        })}
      </section>

      {/* Order note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-stone-700">หมายเหตุออเดอร์ (ไม่บังคับ)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="เช่น ไม่ใส่ผัก, ไม่ใส่น้ำแข็ง, ส่งด่วน"
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
        />
      </div>

      {/* Summary + proceed */}
      <div className="rounded-2xl bg-white border border-gray-100 p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex justify-between text-sm text-stone-600">
          <span>รวมสินค้า</span>
          <span>{formatCurrency(cartTotal)}</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
          <span>รวม</span>
          <span className="text-orange-600">{formatCurrency(cartTotal)}</span>
        </div>

        {/* ── แจ้งเตือนยอดขั้นต่ำ ── */}
        {belowMinOrder && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
            <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 leading-relaxed">
              <span className="font-semibold">ยอดสั่งขั้นต่ำ {formatCurrency(minOrderAmount)}</span>
              {' '}สำหรับ Delivery
              <br />
              เพิ่มสินค้าอีก <span className="font-bold text-amber-800">{formatCurrency(minOrderShortfall)}</span> เพื่อดำเนินการต่อ
            </div>
          </div>
        )}

        <Button fullWidth size="lg" onClick={handleProceed}
          disabled={!isOpen || belowMinOrder}
          className={(!isOpen || belowMinOrder) ? 'opacity-60' : ''}>
          {!isOpen ? '🚫 ร้านปิดอยู่' : belowMinOrder ? `ยอดไม่ถึงขั้นต่ำ (${formatCurrency(minOrderAmount)})` : 'ดำเนินการสั่งซื้อ'}
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

