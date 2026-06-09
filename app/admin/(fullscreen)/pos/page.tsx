'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Trash2, Plus, Minus, RotateCcw, CheckCircle2, Tag, Percent, Banknote, UtensilsCrossed, Printer, Phone, Star, Delete, BookmarkPlus, X, ClipboardList, ChefHat, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMenu } from '@/lib/hooks/useMenu'
import { useSettings } from '@/lib/hooks/useSettings'
import { createOrder } from '@/lib/services/orderService'
import { getCustomer, upsertCustomerAfterOrder, createCustomer, getCustomers } from '@/lib/services/customerService'
import { formatCurrency, generateOrderNumber } from '@/lib/utils/format'
import { printReceipt, type ReceiptData } from '@/lib/utils/printReceipt'
import { generatePromptPayQR } from '@/lib/utils/promptpay'
import { Spinner } from '@/components/ui/Spinner'
import { ItemOptionsModal } from '@/components/customer/ItemOptionsModal'
import { OrderDetailModal } from '@/components/admin/OrderDetailModal'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { useOrders } from '@/lib/hooks/useOrders'
import { useSessionRole } from '@/lib/hooks/useSessionRole'
import type { MenuItem, OrderItem, SelectedOption, CustomerProfile, Order } from '@/types'

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

function categoryEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('ยำ') || n.includes('ยำ')) return '🥗'
  if (n.includes('น้ำ') || n.includes('เครื่องดื่ม')) return '🥤'
  if (n.includes('ลูกชิ้น') || n.includes('ลูกชื้น')) return '🍢'
  if (n.includes('ข้าว') || n.includes('อาหาร')) return '🍚'
  if (n.includes('ทอด') || n.includes('ไก่')) return '🍗'
  if (n.includes('หมู') || n.includes('เนื้อ')) return '🥩'
  if (n.includes('ขนม') || n.includes('ของหวาน')) return '🍮'
  if (n.includes('ไส้กรอก')) return '🌭'
  if (n.includes('ซอส') || n.includes('เครื่องเคียง')) return '🫙'
  return '🍴'
}
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
    if (value === '' || value === '0') { onChange(key === '00' ? '0' : key); return }
    if (value.length >= 7) return
    onChange(value + key)
  }
  // layout: 7 8 9 / 4 5 6 / 1 2 3 / 00 0 ⌫
  const keys = ['7','8','9','4','5','6','1','2','3','00','0','⌫']
  return (
    <div className="grid grid-cols-3 gap-2.5 h-full">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          className={[
            'rounded-2xl text-3xl font-bold select-none transition-all active:scale-95 active:brightness-75 flex items-center justify-center min-h-[64px]',
            k === '⌫'
              ? 'bg-red-900/60 text-red-400 border border-red-800/50 hover:bg-red-900/80'
              : k === '00'
                ? 'bg-[#3d2a10] text-amber-500 border border-amber-900/50 hover:bg-[#4a3418] hover:text-amber-300'
                : 'bg-[#3d2a10] text-amber-200 border border-amber-900/50 hover:bg-[#4a3418] hover:text-amber-100',
          ].join(' ')}
        >
          {k === '⌫' ? <Delete size={26} /> : k}
        </button>
      ))}
    </div>
  )
}

// ─── POS Page ─────────────────────────────────────────────────────────────────

export default function PosPage() {
  const { items: menuItems, categories, loading } = useMenu()
  const { settings } = useSettings()
  const { staffName } = useSessionRole()
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
  const [cashInput,      setCashInput]      = useState('')
  const [saving,         setSaving]         = useState(false)
  const [lastOrder,      setLastOrder]      = useState<{ number: string; total: number; change: number; receipt: ReceiptData } | null>(null)
  const [posPayMethod,   setPosPayMethod]   = useState<'cash' | 'promptpay'>('cash')
  const [qrDataUrl,      setQrDataUrl]      = useState<string | null>(null)
  const [qrLoading,      setQrLoading]      = useState(false)
  const [showPayModal,   setShowPayModal]   = useState(false)

  // ── Member state ──────────────────────────────────────────────────────────
  const [memberPhone,     setMemberPhone]     = useState('')
  const [memberProfile,   setMemberProfile]   = useState<CustomerProfile | null | 'not-found'>(null)
  const [memberSearching, setMemberSearching] = useState(false)
  const [addingNew,       setAddingNew]       = useState(false)
  const [newName,         setNewName]         = useState('')
  const [creatingMember,  setCreatingMember]  = useState(false)
  const [allCustomers,    setAllCustomers]    = useState<CustomerProfile[]>([])
  const [showDropdown,    setShowDropdown]    = useState(false)
  const [showCartDropdown, setShowCartDropdown] = useState(false)

  // ── Online orders panel ───────────────────────────────────────────────────
  const [rightTab,        setRightTab]        = useState<'cart' | 'orders'>('cart')
  const [detailOrder,     setDetailOrder]     = useState<Order | null>(null)
  const { orders: allOrders } = useOrders()

  const onlineOrders = allOrders.filter(
    (o) => o.source !== 'pos' && ['pending', 'cooking', 'delivering'].includes(o.status)
  )

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
  const canPay   = posPayMethod === 'promptpay'
    ? total > 0 && cart.length > 0
    : cashPaid >= total && total > 0

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

  // ── เลือกลูกค้าจาก dropdown (payment modal) ──────────────────────────────
  function selectCustomerSuggestion(c: CustomerProfile) {
    setMemberPhone(c.phone)
    setMemberProfile(c)
    setShowDropdown(false)
  }

  // ── เลือกลูกค้าจาก dropdown (cart sidebar) ───────────────────────────────
  function selectCartSuggestion(c: CustomerProfile) {
    setMemberPhone(c.phone)
    setMemberProfile(c)
    setShowCartDropdown(false)
  }

  // filter สำหรับ cart sidebar dropdown
  const cartSuggestions = useMemo(() => {
    const q = memberPhone.trim()
    if (!q || memberProfile) return []
    return allCustomers
      .filter((c) => c.phone.includes(q) || c.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 6)
  }, [memberPhone, allCustomers, memberProfile])

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


  // โหลด customers ทั้งหมดครั้งเดียวตอน mount
  useEffect(() => {
    getCustomers().then(setAllCustomers).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // filter dropdown จากที่พิมพ์
  const customerSuggestions = useMemo(() => {
    const q = memberPhone.trim()
    if (!q || memberProfile) return []
    return allCustomers
      .filter((c) => c.phone.includes(q) || c.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 6)
  }, [memberPhone, allCustomers, memberProfile])

  // Auto-search เมื่อพิมพ์ครบ 10 หลัก
  useEffect(() => {
    if (memberPhone.length === 10) {
      setShowDropdown(false)
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
    setShowDropdown(false)
    setShowCartDropdown(false)
    setShowHoldForm(false)
    setHoldLabel('')
    setPosPayMethod('cash')
    setQrDataUrl(null)
    setShowPayModal(false)
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
    if (posPayMethod === 'cash' && !canPay) return
    if (cart.length === 0) return
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
        payment:     { method: posPayMethod, status: 'paid' },
        subtotal,
        deliveryFee: 0,
        total,
        note:        discountAmount > 0
          ? `ส่วนลด ${discountType === 'percent' ? discountInput + '%' : formatCurrency(discountAmount)}`
          : '',
        status:      'completed',
        ...(discountAmount > 0 && { discount: discountAmount }),
        ...(pointsEarned > 0 && member && { pointsEarned }),
        ...(staffName && { soldBy: staffName }),
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
      const memberAfter = member && settings?.loyalty?.enabled
        ? await getCustomer(member.phone).catch(() => null)
        : null
      const receipt: ReceiptData = {
        orderNumber,
        paidAt:            new Date(),
        orderType:         'pickup',
        paymentMethod:     posPayMethod,
        items:             cart.map((i) => ({
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
        discountLabel:     discountAmount > 0
          ? (discountType === 'percent' ? `${discountInput}%` : formatCurrency(discountAmount))
          : '',
        total,
        cashPaid,
        change:            orderChange,
        ...(staffName && { soldBy: staffName }),
        ...(member && {
          memberName:          member.name,
          pointsEarned:        pointsEarned > 0 ? pointsEarned : undefined,
          memberTotalPoints:   memberAfter?.points,
          memberPointsExpiry:  memberAfter?.pointsExpireAt
            ? new Date(memberAfter.pointsExpireAt)
            : undefined,
        }),
      }
      setLastOrder({ number: orderNumber, total, change: orderChange, receipt })
      setShowPayModal(false)
      setCart([])
      setDiscountInput('')
      setCashInput('')
      setMemberPhone('')
      setMemberProfile(null)
      // auto-dismiss banner หลัง 12 วิ
      setTimeout(() => setLastOrder(null), 12000)
      toast.success(`✅ บันทึกออเดอร์ ${orderNumber} สำเร็จ${member ? ` (+${pointsEarned} แต้ม)` : ''}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(`บันทึกไม่สำเร็จ: ${msg.slice(0, 80)}`)
      console.error('[POS] createOrder error:', e)
    } finally {
      setSaving(false)
    }
  }

  // ── Generate PromptPay QR ────────────────────────────────────────────────────
  useEffect(() => {
    const phone = settings?.promptpay?.phone
    if (posPayMethod === 'promptpay' && phone && total > 0) {
      setQrLoading(true)
      generatePromptPayQR(phone, total)
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null))
        .finally(() => setQrLoading(false))
    } else {
      setQrDataUrl(null)
    }
  }, [posPayMethod, total, settings?.promptpay?.phone])

  // ── Real-time clock ─────────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })

  if (loading) return <Spinner text="กำลังโหลดเมนู..." />

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0 bg-[#0d0a07]">

        {/* ══════════ TOP HEADER ══════════ */}
        <header className="flex items-center justify-between px-5 py-2.5 shrink-0 border-b border-[#2a1e0f]" style={{ background: '#1c1209' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600">
              <ChefHat size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-100 leading-tight">{storeName}</p>
              <p className="text-[10px] text-amber-700 leading-tight">POS หน้าร้าน</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-amber-600">
            <div className="text-right">
              <p className="text-xl font-bold text-amber-300 font-mono tracking-widest leading-none">{timeStr}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">{dateStr}</p>
            </div>
          </div>
        </header>

        {/* ══════════ MAIN AREA ══════════ */}
        <div className="flex flex-1 overflow-hidden gap-0">

        {/* ══════════ LEFT: Menu browser ══════════ */}
        <div className="flex flex-col flex-1 min-w-0 gap-0 overflow-hidden bg-[#130e08]">

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 scrollbar-hide border-b border-[#2a1e0f]">
            {[{ id: 'all', name: 'ทั้งหมด' }, ...categories].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={[
                  'rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0',
                  selectedCat === cat.id
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50'
                    : 'bg-[#2a1e0f] text-amber-600 hover:bg-[#3d2a10] hover:text-amber-400',
                ].join(' ')}
              >
                {cat.id === 'all' ? '🍽️ ทั้งหมด' : categoryEmoji(cat.name) + ' ' + cat.name}
              </button>
            ))}
          </div>

          {/* Menu grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 h-40 text-amber-800">
                <UtensilsCrossed size={36} strokeWidth={1.5} />
                <p className="text-sm">ไม่มีเมนูในหมวดนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredItems.map((item) => {
                  const totalQtyInCart = cart
                    .filter((c) => c.menuItemId === item.id)
                    .reduce((s, c) => s + c.qty, 0)
                  const soldOut = item.isSoldOut
                  return (
                    <div
                      key={item.id}
                      className={[
                        'relative flex flex-col rounded-2xl overflow-hidden text-left transition-all border',
                        soldOut
                          ? 'border-[#2a1e0f] opacity-60 cursor-default bg-[#1a1209]'
                          : totalQtyInCart > 0
                            ? 'border-orange-500 shadow-lg shadow-orange-900/40 cursor-pointer active:scale-95 bg-[#251a0e]'
                            : 'border-[#3d2a10] hover:border-orange-600 hover:shadow-lg cursor-pointer active:scale-95 bg-[#1e1409]',
                      ].join(' ')}
                      onClick={() => !soldOut && handleMenuItemClick(item)}
                    >
                      {/* Image — h-40 (ใหญ่ขึ้น) */}
                      <div className="relative h-40 w-full bg-[#2a1e0f] shrink-0">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name}
                            className={['h-full w-full object-cover transition-all duration-300', soldOut ? 'grayscale opacity-50' : ''].join(' ')} />
                        ) : (
                          <div className="flex h-full items-center justify-center text-amber-900">
                            <UtensilsCrossed size={40} />
                          </div>
                        )}

                        {/* Sold-out overlay */}
                        {soldOut && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="rounded-full bg-red-500 text-white text-xs font-bold px-3 py-1 shadow-lg">
                              สินค้าหมด
                            </span>
                          </div>
                        )}

                        {/* In-cart badge — ใหญ่ขึ้น */}
                        {!soldOut && totalQtyInCart > 0 && (
                          <div className="absolute top-2 right-2 h-9 w-9 rounded-full bg-orange-500 text-white text-base font-extrabold flex items-center justify-center shadow-lg ring-2 ring-white">
                            {totalQtyInCart}
                          </div>
                        )}

                        {/* Options pill */}
                        {!soldOut && (item.optionGroups ?? []).length > 0 && (
                          <div className="absolute bottom-2 left-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5">
                            มีตัวเลือก
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="px-3 py-2.5">
                        <p className="text-sm font-semibold text-amber-100 line-clamp-1 leading-tight">{item.name}</p>
                        <p className={['text-base font-extrabold mt-0.5', soldOut ? 'text-amber-800' : 'text-orange-500'].join(' ')}>
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══════════ RIGHT: Cart + Payment ══════════ */}
        <div className="w-[340px] xl:w-[380px] h-full flex flex-col gap-0 shrink-0 overflow-hidden bg-[#0d0a07] border-l border-[#2a1e0f]">

          {/* ── CART SECTION ── */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Tab switcher */}
            <div className="flex shrink-0 border-b border-[#2a1e0f]">
              <button
                onClick={() => setRightTab('cart')}
                className={[
                  'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-b-2',
                  rightTab === 'cart'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-zinc-600 hover:text-zinc-400',
                ].join(' ')}
              >
                🛒 ตะกร้า
                {cart.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-[9px] font-extrabold text-white">
                    {cart.reduce((s, i) => s + i.qty, 0)}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRightTab('orders')}
                className={[
                  'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-b-2',
                  rightTab === 'orders'
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-zinc-600 hover:text-zinc-400',
                ].join(' ')}
              >
                📦 ออนไลน์
                {onlineOrders.length > 0 && (
                  <span className={[
                    'flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white',
                    onlineOrders.some((o) => o.status === 'pending') ? 'bg-red-500 animate-pulse' : 'bg-blue-600',
                  ].join(' ')}>
                    {onlineOrders.length}
                  </span>
                )}
              </button>
            </div>

            {/* Cart clear button — แสดงเฉพาะ tab cart */}
            {rightTab === 'cart' && cart.length > 0 && (
              <div className="flex justify-end px-4 pt-1.5 shrink-0">
                <button onClick={clearAll} className="flex items-center gap-1 text-[10px] text-amber-800 hover:text-red-400 transition-colors">
                  <RotateCcw size={10} /> ล้าง
                </button>
              </div>
            )}

          {/* ── Online orders panel ── */}
          {rightTab === 'orders' && (
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5 min-h-0 scrollbar-hide">
              {onlineOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 h-40 text-zinc-700">
                  <ClipboardList size={32} strokeWidth={1.5} />
                  <p className="text-sm">ไม่มีออเดอร์ออนไลน์ที่รออยู่</p>
                </div>
              ) : (
                onlineOrders.map((order) => (
                  <div key={order.id}
                    className="rounded-xl border border-[#2a1e0f] bg-[#1a1209] px-3 py-3 flex flex-col gap-2"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono font-bold text-amber-400 truncate">
                          #{order.orderNumber}
                        </span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <span className="text-[10px] text-zinc-600 shrink-0">
                        {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Customer + type */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-zinc-400 truncate">{order.customer?.name ?? 'ลูกค้า'}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-xs text-zinc-500">
                        {order.orderType === 'delivery' ? '🛵 จัดส่ง' : '🛍️ รับเอง'}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="flex flex-col gap-0.5">
                      {order.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-zinc-500 truncate flex-1 mr-2">
                            {item.name} × {item.qty}
                          </span>
                          <span className="text-zinc-400 shrink-0">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-[10px] text-zinc-700">+{order.items.length - 3} รายการ</p>
                      )}
                    </div>

                    {/* Footer row */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2a1e0f]">
                      <span className="text-sm font-extrabold text-amber-300">{formatCurrency(order.total)}</span>
                      <button
                        onClick={() => setDetailOrder(order)}
                        className="flex items-center gap-1 rounded-lg bg-blue-900/50 border border-blue-700/50 text-blue-300 text-xs font-semibold px-2.5 py-1.5 hover:bg-blue-900 transition-colors"
                      >
                        <ClipboardList size={11} />
                        รายละเอียด
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Cart content (hidden when orders tab active) ── */}
          {rightTab === 'cart' && (<>

          {/* ── Held orders tabs ── */}
          {heldOrders.length > 0 && (
            <div className="flex flex-col gap-1.5 px-3 pt-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <ClipboardList size={13} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-400">คิวรอ ({heldOrders.length})</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
                {heldOrders.map((h) => (
                  <div key={h.id}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-700/50 bg-amber-900/30 px-3 py-1.5 shrink-0 cursor-pointer hover:border-amber-500 hover:bg-amber-900/50 transition-colors group"
                    onClick={() => restoreHeld(h.id)}
                  >
                    <div className="flex flex-col leading-none">
                      <span className="text-xs font-bold text-amber-300">{h.label}</span>
                      <span className="text-[10px] text-amber-500">{formatCurrency(h.total)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); cancelHeld(h.id) }}
                      className="text-amber-700 hover:text-red-400 transition-colors ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Success banner (compact) ── */}
          {lastOrder && (
            <div className="mx-3 mt-2 shrink-0 rounded-xl bg-[#0d2010] border border-green-700/60 px-3 py-2.5 flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-green-400">{lastOrder.number}</span>
                  {lastOrder.change > 0 && (
                    <span className="text-sm font-extrabold text-green-300">
                      ทอน {formatCurrency(lastOrder.change)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-green-700 leading-tight">บันทึกแล้ว · {formatCurrency(lastOrder.total)}</p>
              </div>
              <button
                onClick={() => printReceipt(lastOrder.receipt, storeName, storeForReceipt, receiptSettings)}
                className="flex items-center gap-1 rounded-lg bg-green-900/60 border border-green-700/50 text-green-300 text-xs font-semibold px-2.5 py-1.5 hover:bg-green-900 transition-colors shrink-0"
              >
                <Printer size={12} />
                พิมพ์
              </button>
              <button
                onClick={() => setLastOrder(null)}
                className="text-green-800 hover:text-green-500 transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── Cart items (scrollable) ── */}
          <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2 min-h-0 scrollbar-hide">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border border-dashed border-amber-900/50">
                <ShoppingBagIcon />
                <p className="text-xs text-amber-800">กดเมนูเพื่อเพิ่มรายการ</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.cartKey}
                  className="flex items-start gap-2 rounded-xl bg-[#2a1e0f] border border-amber-900/40 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-100 truncate">{item.name}</p>
                    {item.selectedOptions.length > 0 && (
                      <p className="text-xs text-amber-700 mt-0.5 leading-snug">
                        {item.selectedOptions.map((o) => o.choiceName).join(', ')}
                        {item.selectedOptions.some((o) => o.extraPrice > 0) && (
                          <span className="text-amber-500 ml-1">
                            (+{formatCurrency(item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0))})
                          </span>
                        )}
                      </p>
                    )}
                    {item.itemNote && (
                      <p className="text-xs text-amber-700 mt-0.5">📝 {item.itemNote}</p>
                    )}
                    <p className="text-xs text-amber-500 font-semibold mt-0.5">{formatCurrency(item.price)} / ชิ้น</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <button onClick={() => setQty(item.cartKey, item.qty - 1)}
                      className="h-7 w-7 flex items-center justify-center rounded-full bg-amber-900/50 border border-amber-800 text-amber-400 hover:bg-amber-900 transition-colors">
                      <Minus size={11} />
                    </button>
                    <span className="w-6 text-center text-sm font-extrabold text-amber-100">{item.qty}</span>
                    <button onClick={() => setQty(item.cartKey, item.qty + 1)}
                      className="h-7 w-7 flex items-center justify-center rounded-full bg-orange-600 text-white hover:bg-orange-500 transition-colors">
                      <Plus size={11} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-amber-300 w-16 text-right shrink-0 mt-0.5">{formatCurrency(item.price * item.qty)}</p>
                  <button onClick={() => removeFromCart(item.cartKey)}
                    className="text-amber-900 hover:text-red-400 transition-colors shrink-0 mt-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          </>) /* end cart tab content */}

          </div> {/* end cart section */}

          {/* ── Customer phone quick-input (cart tab only) ── */}
          {rightTab === 'cart' && <div className="px-3 pb-1.5 shrink-0 border-t border-[#2a1e0f] pt-2">
            {memberProfile && memberProfile !== 'not-found' ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-900/30 border border-amber-700/40 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Phone size={11} className="text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-200 truncate leading-tight">{memberProfile.name}</p>
                    <p className="text-[10px] text-amber-600 font-mono leading-tight">{memberPhone} · {memberProfile.points} แต้ม</p>
                  </div>
                </div>
                <button
                  onClick={() => { setMemberPhone(''); setMemberProfile(null) }}
                  className="text-amber-700 hover:text-red-400 transition-colors shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-700 z-10" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={memberPhone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setMemberPhone(v)
                    setShowCartDropdown(true)
                  }}
                  onFocus={() => setShowCartDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCartDropdown(false), 150)}
                  placeholder="เบอร์ / ชื่อลูกค้า (ไม่บังคับ)"
                  className="w-full rounded-xl border border-amber-900/40 bg-[#1c1209] text-amber-200 pl-7 pr-3 py-2 text-xs outline-none focus:border-amber-600 placeholder-amber-900"
                />
                {showCartDropdown && cartSuggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl border border-amber-800/60 bg-[#1c1209] shadow-2xl overflow-hidden">
                    {cartSuggestions.map((c) => (
                      <button
                        key={c.phone}
                        type="button"
                        onMouseDown={() => selectCartSuggestion(c)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 hover:bg-amber-900/40 transition-colors text-left border-b border-amber-900/30 last:border-0"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-amber-200 truncate">{c.name}</span>
                          <span className="text-[11px] text-amber-600 font-mono">{c.phone}</span>
                        </div>
                        <span className="text-[11px] text-amber-500 shrink-0">{c.points} แต้ม</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>}

          {rightTab === 'cart' && <>{/* ══ BOTTOM BAR ══ */}
          <div className="border-t border-[#2a1e0f] bg-[#0d0a07] shrink-0 px-3 py-2 flex flex-col gap-1.5">

            {/* Hold form */}
            {showHoldForm && (
              <div className="flex flex-col gap-1.5 rounded-xl bg-blue-900/30 border border-blue-700/40 px-3 py-2">
                <p className="text-xs font-semibold text-blue-400">ตั้งชื่อคิว (ไม่บังคับ)</p>
                <input
                  type="text"
                  autoFocus
                  value={holdLabel}
                  onChange={(e) => setHoldLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmHold(); if (e.key === 'Escape') setShowHoldForm(false) }}
                  placeholder={(memberProfile && memberProfile !== 'not-found') ? memberProfile.name : `คิว ${heldOrders.length + 1}`}
                  className="rounded-lg border border-blue-800/50 bg-[#1c1209] text-blue-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 placeholder-blue-900"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowHoldForm(false); setHoldLabel('') }}
                    className="flex-1 rounded-lg border border-amber-900/50 py-1.5 text-xs text-amber-700 hover:bg-amber-900/20">ยกเลิก</button>
                  <button onClick={confirmHold}
                    className="flex-1 rounded-lg bg-blue-700 text-white py-1.5 text-xs font-bold hover:bg-blue-600 transition-colors">
                    📋 พักคิว
                  </button>
                </div>
              </div>
            )}

            {/* Total + buttons in one row */}
            <div className="flex items-center gap-2">
              {/* Total */}
              <div className="flex flex-col leading-none min-w-0">
                <p className="text-[10px] text-amber-700 uppercase tracking-wider">ยอดสุทธิ</p>
                <p className="text-2xl font-extrabold text-amber-300 tracking-tight leading-none">
                  {formatCurrency(total)}
                </p>
                {discountAmount > 0 && (
                  <p className="text-[10px] text-orange-400">ลด {formatCurrency(discountAmount)}</p>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Buttons */}
              <button
                onClick={clearAll}
                className="flex items-center gap-1 rounded-xl border border-amber-900/50 bg-amber-900/20 px-2.5 py-2 text-xs text-amber-600 hover:text-amber-400 hover:bg-amber-900/40 transition-colors shrink-0"
              >
                <RotateCcw size={12} />
                ล้าง
              </button>
              <button
                onClick={() => { if (cart.length === 0) { toast.error('ไม่มีรายการในตะกร้า'); return } setShowHoldForm((v) => !v); setHoldLabel('') }}
                disabled={cart.length === 0}
                className={[
                  'flex items-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all shrink-0',
                  showHoldForm
                    ? 'border-blue-500/50 bg-blue-900/30 text-blue-400'
                    : 'border-amber-900/50 bg-amber-900/20 text-amber-600 hover:border-blue-700 hover:text-blue-400 hover:bg-blue-900/20',
                  cart.length === 0 ? 'opacity-30 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <BookmarkPlus size={12} />
                พักคิว
              </button>
              <button
                onClick={() => { if (cart.length === 0) { toast.error('ไม่มีรายการในตะกร้า'); return } setPosPayMethod('cash'); setCashInput(''); setShowPayModal(true) }}
                disabled={cart.length === 0}
                className={[
                  'rounded-xl px-3 py-2 text-sm font-extrabold transition-all active:scale-[0.98] shrink-0',
                  cart.length > 0
                    ? 'bg-orange-600 text-white hover:bg-orange-500 shadow-lg shadow-orange-900/40'
                    : 'bg-[#2a1e0f] text-amber-900 cursor-not-allowed',
                ].join(' ')}
              >
                💳 ชำระเงิน
              </button>
            </div>
          </div>{/* end bottom bar */}
          </> /* end cart tab */}

        </div>{/* end right panel */}
        </div>{/* end MAIN AREA */}
      </div>{/* end outer */}

      {/* ── Option modal ── */}
      {pendingItem && (
        <ItemOptionsModal
          item={pendingItem}
          onClose={() => setPendingItem(null)}
          onAdd={handleModalAdd}
        />
      )}

      {/* ══════════ PAYMENT MODAL ══════════ */}
      {showPayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPayModal(false) }}
        >
          <div className="relative w-full max-w-[940px] max-h-[94dvh] rounded-2xl bg-[#1a1007] border border-amber-900/50 shadow-2xl flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a1e0f] shrink-0">
              <div>
                <p className="text-base font-bold text-amber-100">💳 ชำระเงิน</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {cart.reduce((s, i) => s + i.qty, 0)} รายการ
                </p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-amber-900/30 text-amber-600 hover:bg-amber-900/60 hover:text-amber-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Two-column body */}
            <div className="flex flex-1 min-h-0">

            {/* ── Left column: order details ── */}
            <div className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto scrollbar-hide">

              {/* Order summary */}
              <div className="rounded-xl bg-[#0d0a07] border border-amber-900/30 px-4 py-3 flex flex-col gap-1">
                {cart.map((item) => (
                  <div key={item.cartKey} className="flex justify-between text-sm">
                    <span className="text-amber-400 truncate flex-1 mr-2">{item.name} × {item.qty}</span>
                    <span className="text-amber-300 font-semibold shrink-0">{formatCurrency(item.price * item.qty)}</span>
                  </div>
                ))}
                <div className="border-t border-amber-900/40 mt-2 pt-2 flex justify-between items-center">
                  <span className="text-xs text-amber-700">ยอดรวม</span>
                  <span className="text-sm font-bold text-amber-400">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              {/* Payment method toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setPosPayMethod('cash'); setCashInput('') }}
                  className={[
                    'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold border-2 transition-all',
                    posPayMethod === 'cash'
                      ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-900/40'
                      : 'bg-[#1c1209] text-amber-600 border-amber-900/40 hover:border-amber-700',
                  ].join(' ')}
                >
                  <Banknote size={17} /> เงินสด
                </button>
                <button
                  type="button"
                  onClick={() => setPosPayMethod('promptpay')}
                  disabled={!settings?.promptpay?.phone}
                  className={[
                    'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold border-2 transition-all',
                    posPayMethod === 'promptpay'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40'
                      : 'bg-[#1c1209] text-amber-600 border-amber-900/40 hover:border-amber-700',
                    !settings?.promptpay?.phone ? 'opacity-40 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <QrCode size={17} /> สแกน QR
                </button>
              </div>

              {/* Total */}
              <div className="rounded-xl bg-[#0d0a07] border border-amber-900/30 px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-bold text-amber-500">ยอดสุทธิ</span>
                <span className="text-4xl font-extrabold text-amber-300 tracking-tight leading-none">{formatCurrency(total)}</span>
              </div>

              {posPayMethod === 'cash' ? (
                <>
                  {/* Cash received */}
                  <div className={[
                    'rounded-xl px-4 py-3 flex items-center justify-between',
                    cashPaid > 0
                      ? canPay ? 'bg-green-900/40 border border-green-700/50' : 'bg-red-900/40 border border-red-700/50'
                      : 'bg-[#1c1209] border border-amber-900/40',
                  ].join(' ')}>
                    <span className={`text-sm font-medium ${cashPaid > 0 ? (canPay ? 'text-green-400' : 'text-red-400') : 'text-amber-800'}`}>รับเงินมา</span>
                    <span className={`text-2xl font-extrabold tracking-tight ${cashPaid > 0 ? (canPay ? 'text-green-300' : 'text-red-400') : 'text-amber-900'}`}>
                      {cashPaid > 0 ? formatCurrency(cashPaid) : '฿ —'}
                    </span>
                  </div>

                  {/* Change / shortage */}
                  {cashPaid > 0 && total > 0 && (
                    <div className={[
                      'flex justify-between items-center rounded-xl px-4 py-3 font-bold',
                      canPay ? 'bg-green-900/50 border border-green-700/50' : 'bg-red-900/50 border border-red-700/50',
                    ].join(' ')}>
                      <span className={`text-sm ${canPay ? 'text-green-400' : 'text-red-400'}`}>{canPay ? '💰 เงินทอน' : '⚠️ รับไม่พอ'}</span>
                      <span className={`text-2xl font-extrabold ${canPay ? 'text-green-300' : 'text-red-300'}`}>{canPay ? formatCurrency(change) : formatCurrency(total - cashPaid)}</span>
                    </div>
                  )}

                  {/* Quick amounts */}
                  {quickAmounts.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {quickAmounts.map((amt) => (
                        <button key={amt} onClick={() => setCashInput(String(amt))}
                          className={[
                            'rounded-xl py-2 text-sm font-bold border transition-all active:scale-95',
                            amt === cashPaid
                              ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-900/50 text-amber-200'
                              : amt === total
                                ? 'bg-green-700 text-white border-green-600 shadow-md'
                                : 'bg-[#3d2a10] text-amber-400 border-amber-900/50 hover:border-amber-600 hover:text-amber-200',
                          ].join(' ')}>
                          {amt === total ? '💵 พอดี' : formatCurrency(amt)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : null}

              {/* Discount */}
              <div className="rounded-xl bg-[#1c1209] border border-amber-900/30 px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Tag size={12} className="text-amber-600" />
                  <span className="text-xs font-semibold text-amber-600">ส่วนลด</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDiscountType('amount'); setDiscountInput('') }}
                    className={[
                      'flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors',
                      discountType === 'amount'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'border-amber-800 text-amber-600 hover:border-orange-500 hover:text-orange-400',
                    ].join(' ')}
                  >
                    <Banknote size={11} /> บาท
                  </button>
                  <button
                    onClick={() => { setDiscountType('percent'); setDiscountInput('') }}
                    className={[
                      'flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors',
                      discountType === 'percent'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'border-amber-800 text-amber-600 hover:border-orange-500 hover:text-orange-400',
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
                    className="flex-1 rounded-lg border border-amber-800 bg-[#0d0a07] text-amber-100 px-3 py-2 text-sm outline-none focus:border-orange-500 placeholder-amber-900"
                  />
                </div>
                {discountAmount > 0 && (
                  <p className="text-xs text-orange-400 font-medium">
                    ลด{discountType === 'percent' ? ` ${discountInput}%` : ''} = -{formatCurrency(discountAmount)}
                  </p>
                )}
              </div>

              {/* Member lookup */}
              {settings?.loyalty?.enabled && (
                <div className="rounded-xl bg-[#1c1209] border border-amber-900/30 px-4 py-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Star size={12} className="text-amber-600" />
                    <span className="text-xs font-semibold text-amber-600">สมาชิก (ไม่บังคับ)</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-700 z-10" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={memberPhone}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                          setMemberPhone(v)
                          setShowDropdown(true)
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        placeholder="เบอร์โทร / ชื่อลูกค้า"
                        className="w-full rounded-lg border border-amber-800 bg-[#0d0a07] text-amber-100 pl-7 pr-2.5 py-2 text-sm outline-none focus:border-orange-500 placeholder-amber-900"
                      />
                      {showDropdown && customerSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-amber-800/60 bg-[#1c1209] shadow-2xl overflow-hidden">
                          {customerSuggestions.map((c) => (
                            <button
                              key={c.phone}
                              type="button"
                              onMouseDown={() => selectCustomerSuggestion(c)}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 hover:bg-amber-900/40 transition-colors text-left border-b border-amber-900/30 last:border-0"
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-amber-200 truncate">{c.name}</span>
                                <span className="text-xs text-amber-600 font-mono">{c.phone}</span>
                              </div>
                              <span className="text-xs text-amber-500 shrink-0">{c.points} แต้ม</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { setShowDropdown(false); searchMember(memberPhone) }}
                      disabled={memberSearching || memberPhone.length < 9}
                      className="rounded-lg bg-orange-600 text-white px-3 text-xs font-semibold hover:bg-orange-500 disabled:opacity-40 transition-colors"
                    >
                      {memberSearching ? '...' : 'ค้นหา'}
                    </button>
                    {memberProfile && (
                      <button
                        onClick={() => { setMemberPhone(''); setMemberProfile(null) }}
                        className="rounded-lg border border-amber-800 text-amber-600 px-2 text-xs hover:bg-amber-900/30"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {memberProfile && memberProfile !== 'not-found' && (
                    <div className="rounded-xl bg-amber-900/30 border border-amber-700/50 px-3 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-amber-200">👤 {memberProfile.name}</p>
                        <p className="text-xs text-amber-500 mt-0.5">แต้มปัจจุบัน {memberProfile.points} แต้ม</p>
                      </div>
                      {pointsEarned > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-amber-600">จะได้รับ</p>
                          <p className="text-base font-extrabold text-amber-400">+{pointsEarned}</p>
                          <p className="text-[10px] text-amber-600">แต้ม</p>
                        </div>
                      )}
                    </div>
                  )}
                  {memberProfile === 'not-found' && !addingNew && (
                    <div className="flex items-center justify-between rounded-xl bg-amber-900/20 border border-amber-900/40 px-3 py-2">
                      <p className="text-xs text-amber-700">ไม่พบข้อมูลสมาชิก</p>
                      <button onClick={() => setAddingNew(true)}
                        className="flex items-center gap-1 rounded-lg bg-orange-600 text-white px-2.5 py-1 text-xs font-semibold hover:bg-orange-500 transition-colors">
                        <Plus size={11} /> เพิ่มสมาชิก
                      </button>
                    </div>
                  )}
                  {memberProfile === 'not-found' && addingNew && (
                    <div className="flex flex-col gap-2 rounded-xl bg-amber-900/30 border border-amber-700/50 px-3 py-2.5">
                      <p className="text-xs font-semibold text-amber-400">เพิ่มสมาชิกใหม่ — {memberPhone}</p>
                      <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateMember()}
                        placeholder="ชื่อสมาชิก *" autoFocus
                        className="rounded-lg border border-amber-700 bg-[#0d0a07] text-amber-100 px-2.5 py-1.5 text-sm outline-none focus:border-orange-500 placeholder-amber-800"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => { setAddingNew(false); setNewName('') }}
                          className="flex-1 rounded-lg border border-amber-800 py-1.5 text-xs text-amber-600 hover:bg-amber-900/30">ยกเลิก</button>
                        <button onClick={handleCreateMember} disabled={creatingMember || !newName.trim()}
                          className="flex-1 rounded-lg bg-orange-600 text-white py-1.5 text-xs font-bold hover:bg-orange-500 disabled:opacity-50 transition-colors">
                          {creatingMember ? '...' : '✅ บันทึก'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
            {/* ── End left column ── */}

            {/* ── Right column: NumPad / QR + Confirm ── */}
            <div className="flex flex-col w-[340px] shrink-0 border-l border-[#2a1e0f] p-4 gap-3">
              {posPayMethod === 'cash' ? (
                <div className="flex flex-col gap-3 flex-1">
                  <NumPad value={cashInput} onChange={setCashInput} />
                </div>
              ) : (
                /* PromptPay QR */
                <div className="flex flex-col items-center justify-center gap-3 flex-1">
                  {qrLoading ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-amber-700">
                      <div className="h-10 w-10 rounded-full border-2 border-amber-700 border-t-amber-400 animate-spin" />
                      <p className="text-xs">กำลังสร้าง QR...</p>
                    </div>
                  ) : qrDataUrl ? (
                    <>
                      <div className="rounded-2xl bg-white p-3 shadow-2xl shadow-black/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrDataUrl} alt="PromptPay QR" className="w-48 h-48 rounded-xl" />
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <div className="h-5 w-5 rounded-full bg-[#1a3cad] flex items-center justify-center">
                            <span className="text-white text-[8px] font-black">PP</span>
                          </div>
                          <span className="text-xs font-semibold text-blue-400">พร้อมเพย์</span>
                        </div>
                        {settings?.promptpay?.accountName && (
                          <p className="text-sm font-bold text-amber-200">{settings.promptpay.accountName}</p>
                        )}
                        <p className="text-xs text-amber-600 mt-0.5">{settings?.promptpay?.phone}</p>
                        <p className="text-xs text-amber-800 mt-3">สแกนแล้วกด "ยืนยันรับเงินแล้ว"</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-6 text-red-400">
                      <p className="text-xs">ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์</p>
                      <p className="text-[10px] text-amber-800">ไปที่ ตั้งค่า → PromptPay</p>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm button — bottom of right column */}
              <button
                onClick={handleSave}
                disabled={!canPay || saving}
                className={[
                  'w-full rounded-xl py-4 text-base font-extrabold transition-all active:scale-[0.98] shrink-0',
                  canPay
                    ? posPayMethod === 'promptpay'
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40'
                      : 'bg-orange-600 text-white hover:bg-orange-500 shadow-lg shadow-orange-900/40'
                    : 'bg-[#2a1e0f] text-amber-900 cursor-not-allowed',
                ].join(' ')}
              >
                {saving
                  ? '⏳ กำลังบันทึก...'
                  : posPayMethod === 'promptpay'
                    ? `✅ ยืนยันรับเงินแล้ว ${formatCurrency(total)}`
                    : `✅ ชำระเงิน ${formatCurrency(total)}`}
              </button>
            </div>
            {/* ── End right column ── */}

            </div>{/* end two-column body */}
          </div>
        </div>
      )}

      {/* ── Order detail modal (online orders) ── */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onUpdated={() => setDetailOrder(null)}
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
