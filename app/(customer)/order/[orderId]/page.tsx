'use client'
import { use, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CheckCircle, Clock, ChefHat, Truck, XCircle, Upload, ImageIcon, Star, Gift, MapPin, ExternalLink } from 'lucide-react'
import { useOrder } from '@/lib/hooks/useOrder'
import { useOrderNotification } from '@/lib/hooks/useOrderNotification'
import { useSettings } from '@/lib/hooks/useSettings'
import { updateOrderSlip } from '@/lib/services/orderService'
import { hasReviewed } from '@/lib/services/reviewService'
import { uploadImage } from '@/lib/firebase/storage'
import { formatCurrency, formatDate, formatDistance } from '@/lib/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { StarRatingForm } from '@/components/customer/StarRatingForm'
import type { OrderStatus } from '@/types'

const statusInfo: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending:    { label: 'รอดำเนินการ',   icon: <Clock size={36} />,       color: 'text-yellow-500', bg: 'bg-yellow-50' },
  cooking:    { label: 'กำลังทำอาหาร', icon: <ChefHat size={36} />,     color: 'text-orange-500', bg: 'bg-orange-50' },
  delivering: { label: 'กำลังจัดส่ง',  icon: <Truck size={36} />,       color: 'text-blue-500',   bg: 'bg-blue-50'   },
  completed:  { label: 'เสร็จสิ้น',     icon: <CheckCircle size={36} />, color: 'text-green-500',  bg: 'bg-green-50'  },
  cancelled:  { label: 'ยกเลิกแล้ว',   icon: <XCircle size={36} />,     color: 'text-red-500',    bg: 'bg-red-50'    },
}

const FLOW: OrderStatus[] = ['pending', 'cooking', 'delivering', 'completed']
const FLOW_LABELS = ['รับออเดอร์', 'ทำอาหาร', 'พร้อมรับ/ส่ง', 'เสร็จสิ้น']

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

// ─── Main page ───────────────────────────────────────────────────────────────
export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const { order, loading } = useOrder(orderId)
  const { settings } = useSettings()
  const storeName = settings?.store.name ?? 'ร้านมะขาม'
  const [showRating,  setShowRating]  = useState(true)
  const [alreadyRated, setAlreadyRated] = useState(false)

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

  return (
    <div className="max-w-md mx-auto flex flex-col gap-5">

      {/* Status header */}
      <div className={`flex flex-col items-center gap-3 rounded-2xl border border-gray-100 p-8 shadow-sm ${info.bg} ${info.color}`}>
        {info.icon}
        <h1 className="text-xl font-bold text-gray-800">{info.label}</h1>
        <p className="text-sm text-gray-500">ออเดอร์ {order.orderNumber}</p>
        <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
        {order.status !== 'cancelled' && order.status !== 'completed' && (
          <p className="text-xs text-gray-400 animate-pulse">🔴 อัปเดตสดทันที</p>
        )}
      </div>

      {/* Progress stepper */}
      {order.status !== 'cancelled' && (
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex items-start">
            {FLOW.map((step, i) => {
              const done = currentStep > i
              const active = currentStep === i
              return (
                <div key={step} className="flex flex-1 items-start">
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-14">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                      done  ? 'bg-orange-500 text-white scale-90' :
                      active? 'bg-orange-500 text-white ring-4 ring-orange-200' :
                              'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs text-center leading-tight ${
                      done || active ? 'text-orange-600 font-medium' : 'text-gray-400'
                    }`}>{FLOW_LABELS[i]}</span>
                  </div>
                  {i < FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mt-4 mx-0.5 transition-colors duration-500 ${
                      currentStep > i ? 'bg-orange-400' : 'bg-gray-200'
                    }`} />
                  )}
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
                <label className="text-xs text-orange-500 underline cursor-pointer">
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

      {/* Items */}
      <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-3">รายการสินค้า</h2>
        <div className="flex flex-col">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name}
                  className="h-11 w-11 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
              ) : (
                <div className="h-11 w-11 rounded-lg bg-gray-50 flex-shrink-0 border border-gray-100" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{item.name}</p>
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.selectedOptions.map((o) => o.choiceName).join(', ')}
                  </p>
                )}
                {item.itemNote && (
                  <p className="text-xs text-gray-400 mt-0.5">📝 {item.itemNote}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">× {item.qty}</p>
              </div>
              <span className="text-sm font-medium text-gray-700">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1">
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>ค่าส่ง</span><span>{formatCurrency(order.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span>รวม</span>
            <span className="text-orange-500">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

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

      {/* Payment & customer info */}
      <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm text-sm text-gray-600 flex flex-col gap-1.5">
        <div className="flex justify-between">
          <span className="text-gray-400">ประเภท</span>
          <span className="font-medium">{order.orderType === 'pickup' ? '🛍️ รับหน้าร้าน' : '🚚 จัดส่ง'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">ชำระเงิน</span>
          <span className="font-medium">{order.payment.method === 'promptpay' ? 'QR PromptPay' : 'เงินสด'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">สถานะชำระ</span>
          <span className={`font-medium ${order.payment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
            {order.payment.status === 'paid' ? '✅ ชำระแล้ว' : '⏳ รอชำระ'}
          </span>
        </div>
        {order.customer.name && (
          <div className="flex justify-between">
            <span className="text-gray-400">ชื่อ</span>
            <span className="font-medium">{order.customer.name}</span>
          </div>
        )}
        {order.note && (
          <div className="mt-1 p-2 rounded-lg bg-yellow-50 text-yellow-800 text-xs">
            📝 {order.note}
          </div>
        )}
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

      {/* CTA — สั่งอาหารใหม่ */}
      <Link href="/">
        <Button size="lg" fullWidth>🍱 สั่งอาหารใหม่</Button>
      </Link>
    </div>
  )
}
