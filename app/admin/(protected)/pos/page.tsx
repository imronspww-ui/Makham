'use client'
import { useState, useMemo } from 'react'
import { Trash2, Plus, Minus, RotateCcw, CheckCircle2, Tag, Percent, Banknote, UtensilsCrossed } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMenu } from '@/lib/hooks/useMenu'
import { createOrder } from '@/lib/services/orderService'
import { formatCurrency, generateOrderNumber } from '@/lib/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { ItemOptionsModal } from '@/components/customer/ItemOptionsModal'
import type { MenuItem, OrderItem, SelectedOption } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PosCartItem {
  cartKey: string            // unique per line (same item, different options = different lines)
  menuItemId: string
  name: string
  basePrice: number          // ราคาเมนูก่อนบวก option
  price: number              // basePrice + sum(option extraPrices)
  qty: number
  imageUrl: string
  selectedOptions: SelectedOption[]
  itemNote: string
}

type DiscountType = 'percent' | 'amount'

let cartKeyCounter = 0
function nextCartKey() {
  return `pos-${Date.now()}-${++cartKeyCounter}`
}

// ─── POS Page ─────────────────────────────────────────────────────────────────

export default function PosPage() {
  const { items: menuItems, categories, loading } = useMenu()

  // ── Cart state ────────────────────────────────────────────────────────────
  const [cart, setCart]               = useState<PosCartItem[]>([])
  const [selectedCat, setSelectedCat] = useState<string>('all')

  // ── Option modal state ────────────────────────────────────────────────────
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null)

  // ── Discount state ────────────────────────────────────────────────────────
  const [discountType,  setDiscountType]  = useState<DiscountType>('amount')
  const [discountInput, setDiscountInput] = useState('')

  // ── Payment state ─────────────────────────────────────────────────────────
  const [cashInput, setCashInput] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [lastOrder, setLastOrder] = useState<{ number: string; total: number; change: number } | null>(null)

  // ── Computed ──────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountInput) || 0
    if (discountType === 'percent') return Math.round(subtotal * Math.min(val, 100) / 100)
    return Math.min(val, subtotal)
  }, [discountInput, discountType, subtotal])

  const total    = Math.max(0, subtotal - discountAmount)
  const cashPaid = parseFloat(cashInput) || 0
  const change   = Math.max(0, cashPaid - total)
  const canPay   = cashPaid >= total && total > 0

  // ── Filtered menu ─────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (selectedCat === 'all') return menuItems.filter((m) => m.isAvailable && !m.isSoldOut)
    return menuItems.filter((m) => m.isAvailable && !m.isSoldOut && m.categoryId === selectedCat)
  }, [menuItems, selectedCat])

  // ── Cart helpers ──────────────────────────────────────────────────────────
  function handleMenuItemClick(item: MenuItem) {
    if ((item.optionGroups ?? []).length > 0) {
      // เมนูมี option groups → เปิด modal
      setPendingItem(item)
    } else {
      // ไม่มี option → เพิ่มเลย (รวมกับ line เดิมถ้ามี)
      addDirectToCart(item, [], '', 1)
    }
  }

  function addDirectToCart(item: MenuItem, selectedOptions: SelectedOption[], itemNote: string, qty: number) {
    const extraPrice = selectedOptions.reduce((s, o) => s + o.extraPrice, 0)
    const unitPrice  = item.price + extraPrice

    setCart((prev) => {
      if (selectedOptions.length === 0) {
        // ไม่มีตัวเลือก: รวมกับ line เดิมที่ไม่มีตัวเลือกได้เลย
        const existing = prev.find((i) => i.menuItemId === item.id && i.selectedOptions.length === 0)
        if (existing) {
          return prev.map((i) =>
            i.cartKey === existing.cartKey ? { ...i, qty: i.qty + qty } : i
          )
        }
      }
      // มีตัวเลือก หรือยังไม่มี line ว่าง → เพิ่ม line ใหม่
      return [
        ...prev,
        {
          cartKey: nextCartKey(),
          menuItemId:      item.id,
          name:            item.name,
          basePrice:       item.price,
          price:           unitPrice,
          qty,
          imageUrl:        item.imageUrl,
          selectedOptions,
          itemNote,
        },
      ]
    })
  }

  function handleModalAdd(selectedOptions: SelectedOption[], itemNote: string, qty: number) {
    if (!pendingItem) return
    addDirectToCart(pendingItem, selectedOptions, itemNote, qty)
    setPendingItem(null)
  }

  function setQty(cartKey: string, qty: number) {
    if (qty <= 0) return removeFromCart(cartKey)
    setCart((prev) => prev.map((i) => i.cartKey === cartKey ? { ...i, qty } : i))
  }

  function removeFromCart(cartKey: string) {
    setCart((prev) => prev.filter((i) => i.cartKey !== cartKey))
  }

  function clearAll() {
    setCart([])
    setDiscountInput('')
    setCashInput('')
    setLastOrder(null)
  }

  // ── Quick cash buttons ────────────────────────────────────────────────────
  const quickAmounts = useMemo(() => {
    if (total <= 0) return []
    const rounded = [
      Math.ceil(total / 20) * 20,
      Math.ceil(total / 50) * 50,
      Math.ceil(total / 100) * 100,
      Math.ceil(total / 500) * 500,
    ].filter((v, i, arr) => v > total && arr.indexOf(v) === i).slice(0, 4)
    if (!rounded.includes(total)) rounded.unshift(total)  // พอดี
    return [...new Set(rounded)].sort((a, b) => a - b).slice(0, 5)
  }, [total])

  // ── Save order ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!canPay || cart.length === 0) return
    setSaving(true)
    try {
      const orderNumber = generateOrderNumber()
      const orderItems: OrderItem[] = cart.map((i) => ({
        menuItemId:      i.menuItemId,
        name:            i.name,
        price:           i.price,
        qty:             i.qty,
        subtotal:        i.price * i.qty,
        imageUrl:        i.imageUrl,
        selectedOptions: i.selectedOptions.length > 0 ? i.selectedOptions : undefined,
        itemNote:        i.itemNote || undefined,
      }))

      await createOrder({
        orderNumber,
        orderType:    'pickup',
        source:       'pos',
        customer:     { name: 'หน้าร้าน', phone: '' },
        items:        orderItems,
        payment:      { method: 'cash', status: 'paid' },
        subtotal,
        deliveryFee:  0,
        discount:     discountAmount > 0 ? discountAmount : undefined,
        total,
        note:         discountAmount > 0
          ? `ส่วนลด ${discountType === 'percent' ? discountInput + '%' : formatCurrency(discountAmount)}`
          : '',
        status:       'completed',
      })

      const orderChange = change
      setLastOrder({ number: orderNumber, total, change: orderChange })
      setCart([])
      setDiscountInput('')
      setCashInput('')
      toast.success(`✅ บันทึกออเดอร์ ${orderNumber} สำเร็จ`)
    } catch (e) {
      toast.error('บันทึกออเดอร์ไม่สำเร็จ')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner text="กำลังโหลดเมนู..." />

  return (
    <>
      <div className="flex gap-4 h-[calc(100vh-88px)]">

        {/* ══════════ LEFT: Menu browser ══════════ */}
        <div className="flex flex-col flex-1 min-w-0 gap-3 overflow-hidden">
          <h1 className="text-xl font-bold text-gray-800 shrink-0">POS หน้าร้าน</h1>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
            <button
              onClick={() => setSelectedCat('all')}
              className={[
                'rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border transition-colors',
                selectedCat === 'all'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300',
              ].join(' ')}
            >
              ทั้งหมด
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border transition-colors',
                  selectedCat === cat.id
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300',
                ].join(' ')}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu grid */}
          <div className="flex-1 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 h-40 text-gray-300">
                <UtensilsCrossed size={36} strokeWidth={1.5} />
                <p className="text-sm">ไม่มีเมนูในหมวดนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredItems.map((item) => {
                  const totalQtyInCart = cart
                    .filter((c) => c.menuItemId === item.id)
                    .reduce((s, c) => s + c.qty, 0)
                  const hasOptions = (item.optionGroups ?? []).length > 0
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuItemClick(item)}
                      className="relative flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 group"
                    >
                      {/* Image */}
                      <div className="relative h-28 w-full bg-gray-100">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name}
                            className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-200">
                            <UtensilsCrossed size={32} />
                          </div>
                        )}
                        {/* In-cart badge */}
                        {totalQtyInCart > 0 && (
                          <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
                            {totalQtyInCart}
                          </div>
                        )}
                        {/* Has options indicator */}
                        {hasOptions && (
                          <div className="absolute bottom-1.5 left-1.5 rounded-full bg-black/50 text-white text-[10px] px-1.5 py-0.5">
                            เลือกตัวเลือก
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">{item.name}</p>
                        <p className="text-sm font-bold text-orange-500 mt-1">{formatCurrency(item.price)}</p>
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors pointer-events-none" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══════════ RIGHT: Cart + Payment ══════════ */}
        <div className="w-80 xl:w-96 flex flex-col gap-3 shrink-0 overflow-hidden">

          {/* ── Success state ── */}
          {lastOrder && (
            <div className="rounded-2xl bg-green-50 border border-green-200 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 size={20} />
                <span className="font-bold text-sm">บันทึกออเดอร์แล้ว</span>
              </div>
              <div className="text-sm text-green-700 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>เลขออเดอร์</span>
                  <span className="font-mono font-bold">{lastOrder.number}</span>
                </div>
                <div className="flex justify-between">
                  <span>ยอดสุทธิ</span>
                  <span className="font-bold">{formatCurrency(lastOrder.total)}</span>
                </div>
                {lastOrder.change > 0 && (
                  <div className="flex justify-between text-base font-bold">
                    <span>เงินทอน</span>
                    <span className="text-green-600">{formatCurrency(lastOrder.change)}</span>
                  </div>
                )}
              </div>
              <button onClick={clearAll}
                className="w-full rounded-xl bg-green-500 text-white text-sm font-semibold py-2 hover:bg-green-600 transition-colors">
                ➕ รายการถัดไป
              </button>
            </div>
          )}

          {/* ── Cart ── */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 h-32 text-gray-300 rounded-2xl bg-white border border-dashed border-gray-200">
                <ShoppingBagIcon />
                <p className="text-xs">กดเมนูเพื่อเพิ่มรายการ</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.cartKey}
                  className="flex items-start gap-2 rounded-xl bg-white border border-gray-100 px-3 py-2.5 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    {/* Selected options */}
                    {item.selectedOptions.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">
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
                    <p className="text-xs text-orange-500 font-semibold mt-0.5">{formatCurrency(item.price)} / ชิ้น</p>
                  </div>
                  {/* Qty */}
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    <button onClick={() => setQty(item.cartKey, item.qty - 1)}
                      className="h-6 w-6 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100 text-gray-600">
                      <Minus size={10} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-gray-800">{item.qty}</span>
                    <button onClick={() => setQty(item.cartKey, item.qty + 1)}
                      className="h-6 w-6 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600">
                      <Plus size={10} />
                    </button>
                  </div>
                  {/* Subtotal */}
                  <p className="text-sm font-bold text-gray-700 w-14 text-right shrink-0 mt-0.5">{formatCurrency(item.price * item.qty)}</p>
                  <button onClick={() => removeFromCart(item.cartKey)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* ── Discount ── */}
          <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-orange-400" />
              <span className="text-xs font-semibold text-gray-700">ส่วนลด</span>
            </div>
            <div className="flex gap-2">
              {/* Type toggle */}
              <button
                onClick={() => { setDiscountType('amount'); setDiscountInput('') }}
                className={[
                  'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors',
                  discountType === 'amount'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-200 text-gray-500 hover:border-orange-300',
                ].join(' ')}
              >
                <Banknote size={11} /> บาท
              </button>
              <button
                onClick={() => { setDiscountType('percent'); setDiscountInput('') }}
                className={[
                  'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors',
                  discountType === 'percent'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-200 text-gray-500 hover:border-orange-300',
                ].join(' ')}
              >
                <Percent size={11} /> %
              </button>
              <input
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : undefined}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder={discountType === 'percent' ? 'เช่น 10' : 'เช่น 20'}
                className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
            {discountAmount > 0 && (
              <p className="text-xs text-orange-600 font-medium">
                ลด {discountType === 'percent' ? `${discountInput}%` : ''} = -{formatCurrency(discountAmount)}
              </p>
            )}
          </div>

          {/* ── Summary + Payment ── */}
          <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm flex flex-col gap-2.5 shrink-0">
            {/* Subtotal */}
            <div className="flex justify-between text-sm text-gray-500">
              <span>ยอดรวม</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-orange-500">
                <span>ส่วนลด</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
              <span>ยอดสุทธิ</span>
              <span className="text-orange-500">{formatCurrency(total)}</span>
            </div>

            {/* Cash received */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">รับเงินมา (บาท)</label>
              <input
                type="number"
                min="0"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-lg font-bold text-gray-800 outline-none focus:border-orange-400 text-right"
              />
              {/* Quick amounts */}
              {quickAmounts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCashInput(String(amt))}
                      className={[
                        'rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors',
                        amt === total
                          ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300',
                      ].join(' ')}
                    >
                      {amt === total ? '💵 พอดี' : formatCurrency(amt)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Change */}
            {cashPaid > 0 && total > 0 && (
              <div className={[
                'flex justify-between items-center rounded-xl px-3 py-2.5 font-bold',
                canPay
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-600',
              ].join(' ')}>
                <span className="text-sm">{canPay ? '💰 เงินทอน' : '⚠️ รับเงินไม่พอ'}</span>
                <span className="text-lg">{canPay ? formatCurrency(change) : formatCurrency(total - cashPaid)}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={13} />
                ล้าง
              </button>
              <button
                onClick={handleSave}
                disabled={!canPay || cart.length === 0 || saving}
                className={[
                  'flex-1 rounded-xl py-2.5 text-sm font-bold transition-all',
                  canPay && cart.length > 0
                    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-200 active:scale-98'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed',
                ].join(' ')}
              >
                {saving ? '⏳ กำลังบันทึก...' : '✅ ชำระเงิน'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Option modal (rendered outside the flex layout to prevent clipping) ── */}
      {pendingItem && (
        <ItemOptionsModal
          item={pendingItem}
          onClose={() => setPendingItem(null)}
          onAdd={handleModalAdd}
        />
      )}
    </>
  )
}

// tiny inline icon to avoid import issue
function ShoppingBagIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}
