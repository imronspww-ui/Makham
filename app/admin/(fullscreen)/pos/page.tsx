'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Trash2, Plus, Minus, RotateCcw, CheckCircle2, Tag, Percent, Banknote, UtensilsCrossed, Printer, Phone, Star, Delete, BookmarkPlus, X, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMenu } from '@/lib/hooks/useMenu'
import { useSettings } from '@/lib/hooks/useSettings'
import { createOrder } from '@/lib/services/orderService'
import { getCustomer, upsertCustomerAfterOrder, createCustomer } from '@/lib/services/customerService'
import { updateMenuItem } from '@/lib/services/menuService'
import { formatCurrency, generateOrderNumber } from '@/lib/utils/format'
import { printReceipt, type ReceiptData } from '@/lib/utils/printReceipt'
import { Spinner } from '@/components/ui/Spinner'
import { ItemOptionsModal } from '@/components/customer/ItemOptionsModal'
import { ChoiceSoldOutModal } from '@/components/admin/ChoiceSoldOutModal'
import type { MenuItem, OrderItem, SelectedOption, CustomerProfile } from '@/types'

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

interface HeldOrder {
  id:            string
  label:         string          // ชื่อคิว เช่น "คุณนาม" หรือ "คิว 1"
  cart:          PosCartItem[]
  discountType:  DiscountType
  discountInput: string
  memberPhone:   string
  memberProfile: CustomerProfile | null | 'not-found'
  total:         number          // pre-computed สำหรับแสดงในแท็บ
  heldAt:        number          // Date.now()
}

const HELD_KEY = 'pos-held-orders'
let heldCounter = 0

let cartKeyCounter = 0
function nextCartKey() {
  return `pos-${Date.now()}-${++cartKeyCounter}`
}

// ─── NumPad component ─────────────────────────────────────────────────────────

function NumPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  function press(key: string) {
    if (key === '⌫') { onChange(value.slice(0, -1)); return }
    if (key === 'C')  { onChange(''); return }
    // ห้าม leading zero
    if (value === '' || value === '0') { onChange(key === '00' ? '0' : key); return }
    if (value.length >= 7) return     // max ฿9,999,999
    onChange(value + key)
  }
  const keys = ['1','2','3','4','5','6','7','8','9','00','0','⌫']
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          className={[
            'rounded-xl py-3 text-base font-bold select-none transition-all active:scale-95',
            k === '⌫'
              ? 'bg-red-50 text-red-400 border border-red-200 hover:bg-red-100'
              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-orange-50 hover:border-orange-300',
          ].join(' ')}
        >
          {k === '⌫' ? <Delete size={15} className="mx-auto" /> : k}
        </button>
      ))}
    </div>
  )
}

// ─── POS Page ─────────────────────────────────────────────────────────────────

export default function PosPage() {
  const { items: menuItems, categories, loading, reload: reloadMenu } = useMenu()
  const { settings } = useSettings()
  const storeName    = settings?.store.name ?? 'ร้านมะขาม'
  const storeForReceipt  = settings?.store
  const receiptSettings  = settings?.receipt

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
  const [lastOrder, setLastOrder] = useState<{ number: string; total: number; change: number; receipt: ReceiptData } | null>(null)

  // ── Member state ──────────────────────────────────────────────────────────
  const [memberPhone,     setMemberPhone]     = useState('')
  const [memberProfile,   setMemberProfile]   = useState<CustomerProfile | null | 'not-found'>(null)
  const [memberSearching, setMemberSearching] = useState(false)
  const [addingNew,       setAddingNew]       = useState(false)
  const [newName,         setNewName]         = useState('')
  const [creatingMember,  setCreatingMember]  = useState(false)

  // ── Sold-out toggle state ─────────────────────────────────────────────────
  const [togglingId,      setTogglingId]      = useState<string | null>(null)
  const [managingChoices, setManagingChoices] = useState<MenuItem | null>(null)

  // ── Held orders (พักคิว) ─────────────────────────────────────────────────
  const [heldOrders,   setHeldOrders]   = useState<HeldOrder[]>([])
  const [holdLabel,    setHoldLabel]    = useState('')
  const [showHoldForm, setShowHoldForm] = useState(false)

  // โหลดจาก localStorage ตอน mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HELD_KEY)
      if (raw) setHeldOrders(JSON.parse(raw) as HeldOrder[])
    } catch { /* ignore */ }
  }, [])

  function saveHeld(orders: HeldOrder[]) {
    setHeldOrders(orders)
    try { localStorage.setItem(HELD_KEY, JSON.stringify(orders)) } catch { /* ignore */ }
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountInput) || 0
    if (discountType === 'percent') return Math.round(subtotal * Math.min(val, 100) / 100)
    return Math.min(val, subtotal)
  }, [discountInput, discountType, subtotal])

  const total    = Math.max(0, subtotal - discountAmount)
  const cashPaid = parseInt(cashInput, 10) || 0
  const change   = Math.max(0, cashPaid - total)
  const canPay   = cashPaid >= total && total > 0

  // แต้มที่จะได้รับ
  const pointsEarned = useMemo(() => {
    if (!settings?.loyalty?.enabled || total <= 0) return 0
    return Math.floor(total / 100 * (settings.loyalty.pointsPer100Baht ?? 5))
  }, [total, settings])

  // ── Filtered menu (แสดงทั้ง available + soldOut ให้กดหมดได้จาก POS) ───────
  const filteredItems = useMemo(() => {
    if (selectedCat === 'all') return menuItems.filter((m) => m.isAvailable)
    return menuItems.filter((m) => m.isAvailable && m.categoryId === selectedCat)
  }, [menuItems, selectedCat])

  // ── Quick cash buttons ────────────────────────────────────────────────────
  const quickAmounts = useMemo(() => {
    if (total <= 0) return []
    const rounded = [
      Math.ceil(total / 20) * 20,
      Math.ceil(total / 50) * 50,
      Math.ceil(total / 100) * 100,
      Math.ceil(total / 500) * 500,
    ].filter((v, i, arr) => v > total && arr.indexOf(v) === i).slice(0, 4)
    if (!rounded.includes(total)) rounded.unshift(total)
    return [...new Set(rounded)].sort((a, b) => a - b).slice(0, 5)
  }, [total])

  // ── Member search ─────────────────────────────────────────────────────────
  const searchMember = useCallback(async (phone: string) => {
    if (phone.length < 9) return
    setMemberSearching(true)
    try {
      const profile = await getCustomer(phone)
      setMemberProfile(profile ?? 'not-found')
    } catch {
      setMemberProfile('not-found')
    } finally {
      setMemberSearching(false)
    }
  }, [])

  // ── Create new member ─────────────────────────────────────────────────────
  async function handleCreateMember() {
    if (!newName.trim()) { toast.error('กรุณากรอกชื่อสมาชิก'); return }
    setCreatingMember(true)
    try {
      const expiryMonths = settings?.loyalty?.expiryMonths ?? 3
      await createCustomer(memberPhone, newName.trim(), 0, expiryMonths)
      const profile = await getCustomer(memberPhone)
      setMemberProfile(profile ?? 'not-found')
      setAddingNew(false)
      setNewName('')
      toast.success(`✅ เพิ่มสมาชิก "${newName.trim()}" แล้ว`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'เพิ่มสมาชิกไม่สำเร็จ')
    } finally {
      setCreatingMember(false)
    }
  }

  // ── Toggle sold-out ───────────────────────────────────────────────────────
  async function toggleSoldOut(e: React.MouseEvent, item: MenuItem) {
    e.stopPropagation()
    if (togglingId === item.id) return
    setTogglingId(item.id)
    try {
      await updateMenuItem(item.id, { isSoldOut: !item.isSoldOut })
      toast.success(item.isSoldOut ? `✅ ${item.name} พร้อมขายแล้ว` : `🔴 ${item.name} ทำเครื่องหมายว่าหมดแล้ว`)
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setTogglingId(null)
    }
  }

  // Sync managingChoices ให้แสดงข้อมูลล่าสุดเมื่อ menuItems อัปเดต (Firestore listener)
  useEffect(() => {
    if (!managingChoices) return
    const fresh = menuItems.find((m) => m.id === managingChoices.id)
    if (fresh) setManagingChoices(fresh)
  }, [menuItems]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-search เมื่อพิมพ์ครบ 10 หลัก
  useEffect(() => {
    if (memberPhone.length === 10) {
      searchMember(memberPhone)
    } else if (memberPhone.length < 9) {
      setMemberProfile(null)
    }
  }, [memberPhone, searchMember])

  // ── Cart helpers ──────────────────────────────────────────────────────────
  function handleMenuItemClick(item: MenuItem) {
    if ((item.optionGroups ?? []).length > 0) {
      setPendingItem(item)
    } else {
      addDirectToCart(item, [], '', 1)
    }
  }

  function addDirectToCart(item: MenuItem, selectedOptions: SelectedOption[], itemNote: string, qty: number) {
    const extraPrice = selectedOptions.reduce((s, o) => s + o.extraPrice, 0)
    const unitPrice  = item.price + extraPrice

    setCart((prev) => {
      if (selectedOptions.length === 0) {
        const existing = prev.find((i) => i.menuItemId === item.id && i.selectedOptions.length === 0)
        if (existing) {
          return prev.map((i) =>
            i.cartKey === existing.cartKey ? { ...i, qty: i.qty + qty } : i
          )
        }
      }
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
    setMemberPhone('')
    setMemberProfile(null)
    setAddingNew(false)
    setNewName('')
    setShowHoldForm(false)
    setHoldLabel('')
  }

  // ── พักคิว: บันทึก cart ปัจจุบัน → เปิดออเดอร์ใหม่ ─────────────────────
  function confirmHold() {
    if (cart.length === 0) { toast.error('ไม่มีรายการในตะกร้า'); return }
    const member     = memberProfile && memberProfile !== 'not-found' ? memberProfile : null
    const autoLabel  = member?.name || `คิว ${++heldCounter}`
    const label      = holdLabel.trim() || autoLabel
    const newHeld: HeldOrder = {
      id:            `held-${Date.now()}`,
      label,
      cart:          [...cart],
      discountType,
      discountInput,
      memberPhone,
      memberProfile,
      total,
      heldAt:        Date.now(),
    }
    saveHeld([...heldOrders, newHeld])
    toast.success(`📋 พักคิว "${label}" แล้ว`)
    clearAll()
  }

  // ── กู้คืนคิว: นำกลับมาใน cart ──────────────────────────────────────────
  function restoreHeld(id: string) {
    if (cart.length > 0) {
      if (!confirm('Cart ปัจจุบันมีรายการอยู่ — ยืนยันพักแล้วสลับคิวไหม?')) return
      // พักคิวปัจจุบันก่อน
      const member    = memberProfile && memberProfile !== 'not-found' ? memberProfile : null
      const autoLabel = member?.name || `คิว ${++heldCounter}`
      const curHeld: HeldOrder = {
        id:            `held-${Date.now()}`,
        label:         autoLabel,
        cart:          [...cart],
        discountType,
        discountInput,
        memberPhone,
        memberProfile,
        total,
        heldAt:        Date.now(),
      }
      const target   = heldOrders.find((h) => h.id === id)!
      const filtered = heldOrders.filter((h) => h.id !== id)
      saveHeld([...filtered, curHeld])
      // restore target
      setCart(target.cart)
      setDiscountType(target.discountType)
      setDiscountInput(target.discountInput)
      setMemberPhone(target.memberPhone)
      setMemberProfile(target.memberProfile)
      setCashInput('')
      setLastOrder(null)
      setAddingNew(false)
      setNewName('')
    } else {
      const target   = heldOrders.find((h) => h.id === id)!
      const filtered = heldOrders.filter((h) => h.id !== id)
      saveHeld(filtered)
      setCart(target.cart)
      setDiscountType(target.discountType)
      setDiscountInput(target.discountInput)
      setMemberPhone(target.memberPhone)
      setMemberProfile(target.memberProfile)
      setCashInput('')
      setLastOrder(null)
      setAddingNew(false)
      setNewName('')
    }
    toast.success('🔄 กู้คืนคิวแล้ว')
  }

  // ── ยกเลิกคิวที่พัก ──────────────────────────────────────────────────────
  function cancelHeld(id: string) {
    if (!confirm('ยกเลิกคิวนี้ใช่ไหม?')) return
    saveHeld(heldOrders.filter((h) => h.id !== id))
    toast.success('ยกเลิกคิวแล้ว')
  }

  // ── Save order ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!canPay || cart.length === 0) return
    setSaving(true)
    try {
      const orderNumber = generateOrderNumber()
      const member = memberProfile && memberProfile !== 'not-found' ? memberProfile : null

      const orderItems: OrderItem[] = cart.map((i) => ({
        menuItemId: i.menuItemId,
        name:       i.name,
        price:      i.price,
        qty:        i.qty,
        subtotal:   i.price * i.qty,
        imageUrl:   i.imageUrl || '',
        ...(i.selectedOptions.length > 0 && { selectedOptions: i.selectedOptions }),
        ...(i.itemNote && { itemNote: i.itemNote }),
      }))

      await createOrder({
        orderNumber,
        orderType:   'pickup',
        source:      'pos',
        customer: {
          name:  member?.name ?? 'หน้าร้าน',
          phone: member?.phone ?? '-',
        },
        items:       orderItems,
        payment:     { method: 'cash', status: 'paid' },
        subtotal,
        deliveryFee: 0,
        total,
        note:        discountAmount > 0
          ? `ส่วนลด ${discountType === 'percent' ? discountInput + '%' : formatCurrency(discountAmount)}`
          : '',
        status:      'completed',
        ...(discountAmount > 0 && { discount: discountAmount }),
        ...(pointsEarned > 0 && member && { pointsEarned }),
      })

      // สะสมแต้มสมาชิก
      if (member && settings?.loyalty?.enabled && pointsEarned > 0) {
        await upsertCustomerAfterOrder({
          phone:        member.phone,
          name:         member.name,
          pointsEarned,
          pointsUsed:   0,
          orderTotal:   total,
          expiryMonths: settings.loyalty.expiryMonths ?? 3,
        })
      }

      const orderChange = change
      const receipt: ReceiptData = {
        orderNumber,
        paidAt:         new Date(),
        items:          cart.map((i) => ({
          name:    i.name,
          price:   i.price,
          qty:     i.qty,
          options: i.selectedOptions.length > 0
            ? i.selectedOptions.map((o) => o.choiceName).join(', ')
            : undefined,
          note: i.itemNote || undefined,
        })),
        subtotal,
        discountAmount,
        discountLabel:  discountAmount > 0
          ? (discountType === 'percent' ? `${discountInput}%` : formatCurrency(discountAmount))
          : '',
        total,
        cashPaid,
        change:         orderChange,
      }
      setLastOrder({ number: orderNumber, total, change: orderChange, receipt })
      setCart([])
      setDiscountInput('')
      setCashInput('')
      // คง member ไว้เผื่อออเดอร์ต่อเนื่อง
      toast.success(`✅ บันทึกออเดอร์ ${orderNumber} สำเร็จ${member ? ` (+${pointsEarned} แต้ม)` : ''}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(`บันทึกไม่สำเร็จ: ${msg.slice(0, 80)}`)
      console.error('[POS] createOrder error:', e)
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
                  const hasOptions  = (item.optionGroups ?? []).length > 0
                  const soldOut     = item.isSoldOut
                  const isToggling  = togglingId === item.id
                  return (
                    <div
                      key={item.id}
                      className={[
                        'relative flex flex-col rounded-2xl bg-white border shadow-sm overflow-hidden text-left transition-all group',
                        soldOut
                          ? 'border-gray-200 opacity-60'
                          : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-95',
                      ].join(' ')}
                      onClick={() => !soldOut && handleMenuItemClick(item)}
                    >
                      {/* Image */}
                      <div className="relative h-28 w-full bg-gray-100">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name}
                            className={['h-full w-full object-cover', soldOut ? 'grayscale' : ''].join(' ')} />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-200">
                            <UtensilsCrossed size={32} />
                          </div>
                        )}

                        {/* Sold-out overlay */}
                        {soldOut && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 shadow">
                              หมด
                            </span>
                          </div>
                        )}

                        {/* In-cart badge */}
                        {!soldOut && totalQtyInCart > 0 && (
                          <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
                            {totalQtyInCart}
                          </div>
                        )}

                        {/* Options indicator */}
                        {!soldOut && hasOptions && (
                          <div className="absolute bottom-1.5 left-1.5 rounded-full bg-black/50 text-white text-[10px] px-1.5 py-0.5">
                            เลือกตัวเลือก
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2.5 flex-1">
                        <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">{item.name}</p>
                        <p className={['text-sm font-bold mt-1', soldOut ? 'text-gray-400' : 'text-orange-500'].join(' ')}>
                          {formatCurrency(item.price)}
                        </p>
                      </div>

                      {/* ── Bottom action strip ── */}
                      <div className={['flex border-t', soldOut ? 'border-green-100' : 'border-gray-100'].join(' ')}>
                        {/* Toggle whole-item sold-out */}
                        <button
                          type="button"
                          onClick={(e) => toggleSoldOut(e, item)}
                          disabled={isToggling}
                          className={[
                            'flex-1 py-1.5 text-[10px] font-semibold transition-colors',
                            isToggling ? 'opacity-50 cursor-wait' : '',
                            soldOut
                              ? 'bg-green-50 text-green-600 hover:bg-green-100'
                              : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500',
                            hasOptions ? 'border-r border-gray-100' : '',
                          ].join(' ')}
                        >
                          {isToggling ? '...' : soldOut ? '✅ เปิดขาย' : '🔴 หมดทั้งหมด'}
                        </button>

                        {/* Toggle choice-level (เฉพาะเมนูที่มี options) */}
                        {hasOptions && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setManagingChoices(item) }}
                            className="px-2 py-1.5 text-[10px] font-semibold bg-gray-50 text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                            title="เลือกตัวเลือกที่หมด"
                          >
                            ⚙️ ตัวเลือก
                          </button>
                        )}
                      </div>

                      {/* Hover overlay */}
                      {!soldOut && (
                        <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors pointer-events-none" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══════════ RIGHT: Cart + Payment ══════════ */}
        <div className="w-80 xl:w-96 flex flex-col gap-2.5 shrink-0 overflow-y-auto pb-2">

          {/* ── Held orders tabs ── */}
          {heldOrders.length > 0 && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <ClipboardList size={13} className="text-blue-400" />
                <span className="text-xs font-semibold text-gray-500">คิวรอ ({heldOrders.length})</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {heldOrders.map((h) => (
                  <div key={h.id}
                    className="flex items-center gap-1.5 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-1.5 shrink-0 cursor-pointer hover:border-blue-400 transition-colors group"
                    onClick={() => restoreHeld(h.id)}
                  >
                    <div className="flex flex-col leading-none">
                      <span className="text-xs font-bold text-blue-700">{h.label}</span>
                      <span className="text-[10px] text-blue-400">{formatCurrency(h.total)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); cancelHeld(h.id) }}
                      className="text-blue-300 hover:text-red-400 transition-colors ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Success state ── */}
          {lastOrder && (
            <div className="rounded-2xl bg-green-50 border border-green-200 p-4 flex flex-col gap-3 shrink-0">
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
              <button
                onClick={() => printReceipt(lastOrder.receipt, storeName, storeForReceipt, receiptSettings)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border border-green-300 text-green-700 text-sm font-semibold py-2 hover:bg-green-100 transition-colors"
              >
                <Printer size={15} />
                พิมพ์ใบเสร็จ
              </button>
              <button onClick={clearAll}
                className="w-full rounded-xl bg-green-500 text-white text-sm font-semibold py-2 hover:bg-green-600 transition-colors">
                ➕ รายการถัดไป
              </button>
            </div>
          )}

          {/* ── Cart ── */}
          <div className="flex flex-col gap-2 shrink-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 h-28 text-gray-300 rounded-2xl bg-white border border-dashed border-gray-200">
                <ShoppingBagIcon />
                <p className="text-xs">กดเมนูเพื่อเพิ่มรายการ</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.cartKey}
                  className="flex items-start gap-2 rounded-xl bg-white border border-gray-100 px-3 py-2.5 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
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

          {/* ── Member lookup ── */}
          {settings?.loyalty?.enabled && (
            <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Star size={14} className="text-orange-400" />
                <span className="text-xs font-semibold text-gray-700">สมาชิก (ไม่บังคับ)</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={memberPhone}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setMemberPhone(v)
                    }}
                    placeholder="เบอร์โทร 10 หลัก"
                    className="w-full rounded-lg border border-gray-200 pl-7 pr-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
                  />
                </div>
                <button
                  onClick={() => searchMember(memberPhone)}
                  disabled={memberSearching || memberPhone.length < 9}
                  className="rounded-lg bg-orange-500 text-white px-3 text-xs font-semibold hover:bg-orange-600 disabled:opacity-40 transition-colors"
                >
                  {memberSearching ? '...' : 'ค้นหา'}
                </button>
                {memberProfile && (
                  <button
                    onClick={() => { setMemberPhone(''); setMemberProfile(null) }}
                    className="rounded-lg border border-gray-200 text-gray-400 px-2 text-xs hover:bg-gray-50"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Member card */}
              {memberProfile && memberProfile !== 'not-found' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-amber-800">👤 {memberProfile.name}</p>
                    <p className="text-xs text-amber-600 mt-0.5">แต้มปัจจุบัน {memberProfile.points} แต้ม</p>
                  </div>
                  {pointsEarned > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-xs text-amber-600">จะได้รับ</p>
                      <p className="text-base font-extrabold text-amber-700">+{pointsEarned}</p>
                      <p className="text-[10px] text-amber-500">แต้ม</p>
                    </div>
                  )}
                </div>
              )}
              {memberProfile === 'not-found' && !addingNew && (
                <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                  <p className="text-xs text-gray-400">ไม่พบข้อมูลสมาชิก</p>
                  <button
                    onClick={() => setAddingNew(true)}
                    className="flex items-center gap-1 rounded-lg bg-orange-500 text-white px-2.5 py-1 text-xs font-semibold hover:bg-orange-600 transition-colors"
                  >
                    <Plus size={11} />
                    เพิ่มสมาชิก
                  </button>
                </div>
              )}

              {/* ── Inline new member form ── */}
              {memberProfile === 'not-found' && addingNew && (
                <div className="flex flex-col gap-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5">
                  <p className="text-xs font-semibold text-orange-700">
                    เพิ่มสมาชิกใหม่ — {memberPhone}
                  </p>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateMember()}
                    placeholder="ชื่อสมาชิก *"
                    autoFocus
                    className="rounded-lg border border-orange-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-orange-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAddingNew(false); setNewName('') }}
                      className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleCreateMember}
                      disabled={creatingMember || !newName.trim()}
                      className="flex-1 rounded-lg bg-orange-500 text-white py-1.5 text-xs font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {creatingMember ? '...' : '✅ บันทึก'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Summary + Payment ── */}
          <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm flex flex-col gap-2.5 shrink-0">
            {/* Summary row */}
            <div className="flex flex-col gap-1">
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
              <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-1.5">
                <span className="text-gray-700">ยอดสุทธิ</span>
                <span className="text-orange-500">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Cash display */}
            <div className={[
              'rounded-xl px-3 py-2.5 flex items-center justify-between',
              cashPaid > 0
                ? canPay
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
                : 'bg-gray-50 border border-gray-200',
            ].join(' ')}>
              <span className={`text-sm font-medium ${cashPaid > 0 ? (canPay ? 'text-green-600' : 'text-red-500') : 'text-gray-400'}`}>
                รับเงินมา
              </span>
              <span className={`text-2xl font-extrabold tracking-tight ${cashPaid > 0 ? (canPay ? 'text-green-700' : 'text-red-600') : 'text-gray-300'}`}>
                {cashPaid > 0 ? formatCurrency(cashPaid) : '฿ —'}
              </span>
            </div>

            {/* Change / shortage */}
            {cashPaid > 0 && total > 0 && (
              <div className={[
                'flex justify-between items-center rounded-xl px-3 py-2 font-bold',
                canPay
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600',
              ].join(' ')}>
                <span className="text-sm">{canPay ? '💰 เงินทอน' : '⚠️ รับไม่พอ'}</span>
                <span className="text-xl">{canPay ? formatCurrency(change) : formatCurrency(total - cashPaid)}</span>
              </div>
            )}

            {/* Quick amount buttons */}
            {quickAmounts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashInput(String(amt))}
                    className={[
                      'rounded-lg px-3 py-1.5 text-xs font-bold border transition-all active:scale-95',
                      amt === cashPaid
                        ? 'ring-2 ring-orange-400 border-orange-400 bg-orange-50 text-orange-700'
                        : amt === total
                          ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300',
                    ].join(' ')}
                  >
                    {amt === total ? '💵 พอดี' : formatCurrency(amt)}
                  </button>
                ))}
              </div>
            )}

            {/* NumPad */}
            <NumPad value={cashInput} onChange={setCashInput} />

            {/* ── Hold form — ถามชื่อคิวก่อนพัก ── */}
            {showHoldForm && (
              <div className="flex flex-col gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5">
                <p className="text-xs font-semibold text-blue-700">ตั้งชื่อคิว (ไม่บังคับ)</p>
                <input
                  type="text"
                  autoFocus
                  value={holdLabel}
                  onChange={(e) => setHoldLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmHold(); if (e.key === 'Escape') setShowHoldForm(false) }}
                  placeholder={
                    (memberProfile && memberProfile !== 'not-found')
                      ? memberProfile.name
                      : `คิว ${heldOrders.length + 1}`
                  }
                  className="rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowHoldForm(false); setHoldLabel('') }}
                    className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
                    ยกเลิก
                  </button>
                  <button onClick={confirmHold}
                    className="flex-1 rounded-lg bg-blue-500 text-white py-1.5 text-xs font-bold hover:bg-blue-600 transition-colors">
                    📋 พักคิว
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-0.5">
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={13} />
                ล้าง
              </button>
              {/* พักคิว */}
              <button
                onClick={() => { if (cart.length === 0) { toast.error('ไม่มีรายการในตะกร้า'); return } setShowHoldForm((v) => !v); setHoldLabel('') }}
                disabled={cart.length === 0}
                title="พักคิวนี้ไว้ก่อน แล้วเปิดออเดอร์ใหม่"
                className={[
                  'flex items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all',
                  showHoldForm
                    ? 'border-blue-400 bg-blue-100 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50',
                  cart.length === 0 ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <BookmarkPlus size={13} />
                พักคิว
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
                {saving ? '⏳ กำลังบันทึก...' : `✅ ชำระเงิน${total > 0 ? ` ${formatCurrency(total)}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Option modal ── */}
      {pendingItem && (
        <ItemOptionsModal
          item={pendingItem}
          onClose={() => setPendingItem(null)}
          onAdd={handleModalAdd}
        />
      )}

      {/* ── Choice sold-out modal ── */}
      {managingChoices && (
        <ChoiceSoldOutModal
          item={managingChoices}
          onClose={() => setManagingChoices(null)}
          onDone={reloadMenu}
        />
      )}
    </>
  )
}

function ShoppingBagIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}
