'use client'
import { use, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CheckCircle, Clock, ChefHat, Truck, XCircle, Upload, ImageIcon, Star, Gift, MapPin, ExternalLink, AlertTriangle, X, Share2, Copy } from 'lucide-react'
import { useOrder } from '@/lib/hooks/useOrder'
import { useOrderNotification } from '@/lib/hooks/useOrderNotification'
import { useSettings } from '@/lib/hooks/useSettings'
import { updateOrderSlip, requestCancelOrder } from '@/lib/services/orderService'
import { hasReviewed } from '@/lib/services/reviewService'
import { uploadImage } from '@/lib/firebase/storage'
import { formatCurrency, formatDate, formatDistance } from '@/lib/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { StarRatingForm } from '@/components/customer/StarRatingForm'
import type { OrderStatus } from '@/types'

const statusInfo: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending:    { label: 'รอดำเนินการ',   icon: <Clock size={36} />,       color: 'text-yellow-500', bg: 'bg-yellow-50' },
  cooking:    { label: 'กำลังทำอาหาร', icon: <ChefHat size={36} />,     color: 'text-orange-600', bg: 'bg-orange-50' },
  delivering: { label: 'กำลังจัดส่ง',  icon: <Truck size={36} />,       color: 'text-blue-500',   bg: 'bg-blue-50'   },
  completed:  { label: 'เสร็จสิ้น',     icon: <CheckCircle size={36} />, color: 'text-green-500',  bg: 'bg-green-50'  },
  cancelled:  { label: 'ยกเลิกแล้ว',   icon: <XCircle size={36} />,     color: 'text-red-500',    bg: 'bg-red-50'    },
}

const FLOW: OrderStatus[] = ['pending', 'cooking', 'delivering', 'completed']

interface TimelineStep {
  status: OrderStatus
  label: string
  desc: string
  icon: React.ReactNode
  eta?: string
}

const TIMELINE_STEPS: TimelineStep[] = [
  { status: 'pending',    label: 'รับออเดอร์แล้ว',    desc: 'ร้านได้รับคำสั่งซื้อของคุณ',          icon: <CheckCircle size={18} />, },
  { status: 'cooking',    label: 'กำลังเตรียมอาหาร', desc: 'กำลังทำอาหารให้สดใหม่',              icon: <ChefHat size={18} />,     eta: '~10–20 นาที' },
  { status: 'delivering', label: 'พร้อมส่ง / กำลังส่ง', desc: 'อาหารพร้อมแล้ว กำลังจัดส่ง',     icon: <Truck size={18} />,       eta: '~5–15 นาที' },
  { status: 'completed',  label: 'เสร็จสิ้น',          desc: 'ออเดอร์ดำเนินการเสร็จเรียบร้อย',   icon: <CheckCircle size={18} />, },
]

// ─── Slip uploader ───────────────────────────────────────────────────────────
function SlipUploader({ orderId }: { orderId: string }) {
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Instant local preview while uploading
    const reader = new FileReader()
    reader.onload = (ev) => setLocalPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const url = await uploadImage(file, 'slips')
      await updateOrderSlip(orderId, url)
      toast.success('แนบสลิปสำเร็จ ✅')
    } catch {
      toast.error('แนบสลิปไม่สำเร็จ กรุณาลองใหม่')
      setLocalPreview(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {localPreview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={localPreview} alt="slip preview"
          className="max-h-48 w-full rounded-xl object-contain border border-gray-100 bg-gray-50" />
      )}
      <label className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors ${
        uploading
          ? 'border-orange-200 bg-orange-50 opacity-70 pointer-events-none'
          : 'border-orange-200 hover:bg-orange-50'
      }`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
        <Upload size={20} className="text-orange-400" />
        <span className="text-sm font-medium text-orange-600">
          {uploading ? 'กำลังอัปโหลด...' : 'แตะเพื่อถ่ายหรือเลือกรูปสลิป'}
        </span>
        <span className="text-xs text-gray-400">รองรับ JPG, PNG</span>
      </label>
    </div>
  )
}

// ─── Referral share card ──────────────────────────────────────────────────────
function ReferralShareCard({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const link    = `${baseUrl}/?ref=${phone.replace(/\D/g, '')}`

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: 'ชวนมาสั่งอาหาร!', url: link }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(link).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Share2 size={14} className="text-orange-500" />
        <span className="text-sm font-semibold text-orange-800">แชร์ให้เพื่อน รับ 20 แต้ม!</span>
      </div>
      <p className="text-xs text-orange-700 leading-relaxed">
        เพื่อนที่ใช้ลิงก์ของคุณสั่งครั้งแรก คุณจะได้รับ <span className="font-bold">+20 แต้ม</span> ทันที
      </p>
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl bg-white border border-orange-200 px-3 py-2 text-xs text-orange-700 truncate font-mono">
          {link}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-xl bg-white border border-orange-200 px-3 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors shrink-0"
        >
          <Copy size={12} />
          {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 px-3 py-2 text-xs font-semibold text-white transition-colors shrink-0"
        >
          <Share2 size={12} />
          แชร์
        </button>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const { order, loading } = useOrder(orderId)
  const { settings } = useSettings()
  const storeName = settings?.store.name ?? 'ร้านมะขาม'
  const [showRating,    setShowRating]    = useState(true)
  const [alreadyRated,  setAlreadyRated]  = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason,    setCancelReason]    = useState('')
  const [cancelDetail,    setCancelDetail]    = useState('')
  const [cancelling,      setCancelling]      = useState(false)

  const CANCEL_REASONS = [
    { id: 'wrong_item',    label: 'สั่งผิดรายการ',           icon: '🛍️' },
    { id: 'duplicate',     label: 'กดสั่งซ้ำโดยไม่ตั้งใจ',  icon: '🔁' },
    { id: 'change_order',  label: 'ต้องการเปลี่ยนรายการ',    icon: '✏️' },
    { id: 'wrong_address', label: 'ที่อยู่จัดส่งผิด',        icon: '📍' },
    { id: 'emergency',     label: 'มีเหตุฉุกเฉิน',           icon: '🚨' },
    { id: 'other',         label: 'อื่นๆ (โปรดระบุ)',         icon: '💬' },
  ]

  const selectedReason = CANCEL_REASONS.find(r => r.id === cancelReason)
  const needsDetail    = cancelReason === 'other'
  const detailValid    = !needsDetail || cancelDetail.trim().length >= 15
  const canSubmit      = cancelReason && detailValid && !cancelling

  const fullReason = selectedReason
    ? needsDetail
      ? `${selectedReason.label}: ${cancelDetail.trim()}`
      : selectedReason.label
    : ''

  async function handleRequestCancel() {
    if (!canSubmit) return
    setCancelling(true)
    try {
      await requestCancelOrder(orderId, fullReason)
      toast.success('ส่งคำขอยกเลิกแล้ว รอร้านยืนยัน')
      setShowCancelModal(false)
      setCancelReason('')
      setCancelDetail('')
    } catch {
      toast.error('ส่งคำขอไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setCancelling(false)
    }
  }

  useOrderNotification(order, storeName)

  // เช็คว่าเคยรีวิวแล้วหรือยัง
  useEffect(() => {
    if (order?.status === 'completed') {
      hasReviewed(orderId).then(setAlreadyRated).catch(() => {})
    }
  }, [orderId, order?.status])

  // บอก SW ให้ track ออเดอร์นี้ตั้งแต่เปิดหน้า
  useEffect(() => {
    if (!orderId || !order) return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({
        type:          'TRACK_ORDER',
        orderId,
        orderNumber:   order.orderNumber,
        currentStatus: order.status,
      })
    })
  }, [orderId, order?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner text="กำลังโหลดออเดอร์..." />
  if (!order) return (
    <div className="py-20 text-center text-gray-400">
      <p>ไม่พบออเดอร์</p>
      <Link href="/"><Button variant="outline" className="mt-4">กลับหน้าหลัก</Button></Link>
    </div>
  )

  const info = statusInfo[order.status]
  const currentStep = FLOW.indexOf(order.status)
  const needsSlip = order.payment.method === 'promptpay'
    && order.payment.status === 'pending'
    && order.status !== 'cancelled'
  const hasSlip = !!order.payment.slipUrl

  const orderTypeLabel = order.orderType === 'pickup' ? '🛍️ รับเอง' : order.orderType === 'dine-in' ? '🍽️ ทานที่ร้าน' : '🚚 จัดส่ง'

  return (
    <div className="max-w-md mx-auto flex flex-col gap-5">

      {/* ── #15 Receipt header ── */}
      <div className="rounded-2xl bg-white border border-orange-200 shadow-md overflow-hidden animate-receipt-drop">
        {/* Top colored band */}
        <div className={`${info.bg} ${info.color} flex flex-col items-center py-6 px-4 gap-2`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm">
            {info.icon}
          </div>
          <h1 className="text-xl font-bold text-gray-800">{info.label}</h1>
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              อัปเดตสดทันที
            </span>
          )}
        </div>

        {/* Dashed tear line */}
        <div className="receipt-dash my-0" />

        {/* Receipt body */}
        <div className="px-5 py-4 receipt-font">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-3">
            <span>{formatDate(order.createdAt)}</span>
            <span>{orderTypeLabel}</span>
          </div>
          <div className="text-center mb-3">
            <p className="text-xs text-stone-400 uppercase tracking-widest">Order</p>
            <p className="text-3xl font-bold text-stone-800 tracking-wider">{order.orderNumber}</p>
          </div>

          {/* Items list — receipt style */}
          <div className="flex flex-col gap-1 text-sm">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="text-stone-600 truncate flex-1">
                  {item.qty > 1 && <span className="text-stone-400">{item.qty}× </span>}
                  {item.name}
                </span>
                <span className="text-stone-800 font-medium shrink-0">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="receipt-dash my-3" />

          <div className="flex flex-col gap-1 text-sm">
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-stone-500">
                <span>ค่าส่ง</span><span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-stone-800">
              <span>รวมทั้งสิ้น</span>
              <span className="text-orange-600">{formatCurrency(order.total)}</span>
            </div>
          </div>

          <div className="receipt-dash my-3" />

          <div className="flex justify-between text-xs text-stone-400">
            <span>ชำระด้วย</span>
            <span>{order.payment.method === 'promptpay' ? 'QR PromptPay' : 'เงินสด'}</span>
          </div>
          {order.customer.name && (
            <div className="flex justify-between text-xs text-stone-400 mt-0.5">
              <span>ลูกค้า</span><span>{order.customer.name}</span>
            </div>
          )}

          {/* Barcode-style decoration */}
          <div className="mt-4 flex justify-center">
            <div className="flex gap-px">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-stone-300"
                  style={{ width: i % 3 === 0 ? 3 : 1, height: i % 5 === 0 ? 28 : 20 }}
                />
              ))}
            </div>
          </div>
          <p className="text-center text-[10px] text-stone-300 mt-1 tracking-widest">{order.id.slice(0, 16).toUpperCase()}</p>
        </div>
      </div>

      {/* ── Vertical Timeline ── */}
      {order.status !== 'cancelled' && (
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700 text-sm">สถานะออเดอร์</h2>
            {order.status !== 'completed' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                อัปเดตสดทันที
              </span>
            )}
          </div>

          <div className="flex flex-col">
            {TIMELINE_STEPS.map((step, i) => {
              const done   = currentStep > i
              const active = currentStep === i
              const future = currentStep < i
              const isLast = i === TIMELINE_STEPS.length - 1

              return (
                <div key={step.status} className="flex gap-4">
                  {/* Left: dot + line */}
                  <div className="flex flex-col items-center">
                    <div className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-500',
                      done   ? 'bg-orange-600 text-white'                             :
                      active ? 'bg-orange-600 text-white ring-4 ring-orange-100'      :
                               'bg-gray-100 text-gray-300',
                    ].join(' ')}>
                      {done ? <CheckCircle size={16} /> : step.icon}
                    </div>
                    {!isLast && (
                      <div className={[
                        'w-0.5 flex-1 my-1 min-h-[28px] transition-colors duration-700',
                        done ? 'bg-orange-400' : 'bg-gray-100',
                      ].join(' ')} />
                    )}
                  </div>

                  {/* Right: content */}
                  <div className={['pb-5 flex-1 min-w-0', isLast ? 'pb-1' : ''].join(' ')}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={[
                        'font-semibold text-sm',
                        done || active ? 'text-gray-800' : 'text-gray-300',
                      ].join(' ')}>
                        {step.label}
                      </span>
                      {active && step.eta && (
                        <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 rounded-full px-2 py-0.5 font-medium">
                          {step.eta}
                        </span>
                      )}
                      {active && (
                        <span className="text-xs bg-amber-50 text-amber-600 rounded-full px-2 py-0.5 font-medium animate-pulse">
                          ● ขณะนี้
                        </span>
                      )}
                    </div>
                    {(done || active) && (
                      <p className={[
                        'text-xs mt-0.5',
                        active ? 'text-orange-500' : 'text-gray-400',
                      ].join(' ')}>
                        {step.desc}
                      </p>
                    )}
                    {i === 0 && done && (
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Slip section — PromptPay pending payment */}
      {(needsSlip || hasSlip) && (
        <div className="rounded-2xl bg-white border border-orange-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={16} className="text-orange-400" />
            <h2 className="font-semibold text-gray-700">สลิปการโอนเงิน</h2>
          </div>
          {hasSlip ? (
            <div className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.payment.slipUrl} alt="payment slip"
                className="max-h-52 w-full rounded-xl object-contain border border-gray-100 bg-gray-50" />
              <p className="text-xs text-green-600 font-medium">✅ แนบสลิปแล้ว รอร้านตรวจสอบ</p>
              {needsSlip && (
                <label className="text-xs text-orange-600 underline cursor-pointer">
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const url = await uploadImage(file, 'slips')
                        await updateOrderSlip(order.id, url)
                        toast.success('อัปโหลดสลิปใหม่แล้ว ✅')
                      } catch {
                        toast.error('อัปโหลดไม่สำเร็จ')
                      }
                    }} />
                  เปลี่ยนสลิป
                </label>
              )}
            </div>
          ) : (
            <SlipUploader orderId={order.id} />
          )}
        </div>
      )}


      {/* Delivery location — only for delivery orders */}
      {order.orderType === 'delivery' && order.delivery && (
        <div className="rounded-2xl bg-white border border-blue-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-blue-500" />
            <h2 className="font-semibold text-gray-700 text-sm">ที่อยู่จัดส่ง</h2>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-700 leading-relaxed">{order.delivery.address}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>ระยะทาง</span>
              <span className="font-medium text-gray-700">{formatDistance(order.delivery.distanceKm)}</span>
            </div>
            {order.delivery.lat && order.delivery.lng && (
              <a
                href={`https://www.google.com/maps?q=${order.delivery.lat},${order.delivery.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 w-fit"
              >
                <ExternalLink size={12} />
                ดูตำแหน่งบน Google Maps
              </a>
            )}
          </div>
        </div>
      )}

      {/* Note */}
      {order.note && (
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          📝 {order.note}
        </div>
      )}

      {/* Payment status */}
      <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm flex items-center justify-between text-sm">
        <span className="text-gray-400">สถานะชำระเงิน</span>
        <span className={`font-semibold ${order.payment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
          {order.payment.status === 'paid' ? '✅ ชำระแล้ว' : '⏳ รอชำระ'}
        </span>
      </div>

      {/* Loyalty summary — ถ้าออเดอร์มีแต้ม */}
      {((order.pointsEarned ?? 0) > 0 || (order.pointsUsed ?? 0) > 0) && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <Star size={14} className="text-amber-500" />
            <h2 className="font-semibold text-amber-800 text-sm">แต้มสะสม</h2>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            {(order.pointsEarned ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-amber-700">แต้มที่ได้รับจากออเดอร์นี้</span>
                <span className="font-bold text-amber-600">+{order.pointsEarned} แต้ม</span>
              </div>
            )}
            {(order.pointsUsed ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-amber-700 flex items-center gap-1">
                  <Gift size={12} /> แต้มที่ใช้แลกเมนูฟรี
                </span>
                <span className="font-medium text-amber-500">−{order.pointsUsed} แต้ม</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Rating form — แสดงเมื่อ completed และยังไม่ได้รีวิว ── */}
      {order.status === 'completed' && showRating && !alreadyRated && (
        <StarRatingForm
          orderId={orderId}
          orderNumber={order.orderNumber}
          items={order.items}
          onDone={() => setShowRating(false)}
        />
      )}

      {/* ── ขอยกเลิกออเดอร์ (เฉพาะ pending และยังไม่ได้ขอไว้) ── */}
      {order.status === 'pending' && !order.cancelRequest && (
        <button
          onClick={() => setShowCancelModal(true)}
          className="flex items-center justify-center gap-1.5 w-full rounded-2xl border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-500 hover:bg-red-100 transition-colors"
        >
          <XCircle size={15} />
          ขอยกเลิกออเดอร์
        </button>
      )}

      {/* ── แสดงสถานะรอยืนยันการยกเลิก ── */}
      {order.cancelRequest && order.status !== 'cancelled' && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-red-600">⏳ รอร้านยืนยันการยกเลิก</p>
          <p className="text-xs text-red-500">สาเหตุ: {order.cancelRequest.reason}</p>
          <p className="text-xs text-gray-400">
            ส่งคำขอเมื่อ {new Date(order.cancelRequest.requestedAt).toLocaleString('th-TH', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      )}

      {/* ── Referral share card ── */}
      {order.customer?.phone && (
        <ReferralShareCard phone={order.customer.phone} />
      )}

      {/* CTA — สั่งอาหารใหม่ */}
      <Link href="/">
        <Button size="lg" fullWidth>🍱 สั่งอาหารใหม่</Button>
      </Link>

      {/* ── Modal ขอยกเลิก ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
                  <XCircle size={18} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 leading-tight">ขอยกเลิกออเดอร์</h3>
                  <p className="text-xs text-gray-400">#{order.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); setCancelDetail('') }}
                className="rounded-full p-1.5 hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Warning banner */}
            <div className="mx-5 mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
              <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                การยกเลิกต้องรอร้านอนุมัติ — <span className="font-semibold">หากร้านเริ่มทำอาหารแล้ว อาจไม่สามารถยกเลิกได้</span>
              </p>
            </div>

            {/* Reason chips */}
            <div className="px-5 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2.5">
                เลือกสาเหตุการยกเลิก <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CANCEL_REASONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setCancelReason(r.id); setCancelDetail('') }}
                    className={[
                      'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all',
                      cancelReason === r.id
                        ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className="text-base leading-none">{r.icon}</span>
                    <span className="text-xs leading-tight">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detail textarea — required for "อื่นๆ" */}
            {cancelReason && (
              <div className="px-5 mb-4">
                <label className="text-xs font-medium text-gray-600 block mb-1.5">
                  {needsDetail ? (
                    <span>รายละเอียดเพิ่มเติม <span className="text-red-500">* (ขั้นต่ำ 15 ตัวอักษร)</span></span>
                  ) : (
                    'รายละเอียดเพิ่มเติม (ไม่บังคับ)'
                  )}
                </label>
                <textarea
                  value={cancelDetail}
                  onChange={(e) => setCancelDetail(e.target.value)}
                  placeholder={needsDetail ? 'กรุณาอธิบายสาเหตุให้ชัดเจน...' : 'ข้อมูลเพิ่มเติมให้ร้าน (ถ้ามี)'}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none transition-all"
                />
                {needsDetail && cancelDetail.trim().length > 0 && cancelDetail.trim().length < 15 && (
                  <p className="text-xs text-red-400 mt-1">
                    กรุณากรอกอีก {15 - cancelDetail.trim().length} ตัวอักษร
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="px-5 pb-5 flex flex-col gap-2">
              <button
                onClick={handleRequestCancel}
                disabled={!canSubmit}
                className="w-full rounded-xl bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {cancelling ? 'กำลังส่งคำขอ...' : 'ยืนยันส่งคำขอยกเลิก'}
              </button>
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); setCancelDetail('') }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                คิดอีกที — ไม่ยกเลิก
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
