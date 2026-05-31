'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, ImageIcon, Star, Gift, CheckCircle } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useOrderHistoryStore } from '@/store/orderHistoryStore'
import { useCustomerStore } from '@/store/customerStore'
import { LocationPicker } from '@/components/customer/LocationPicker'
import { PaymentSection } from '@/components/customer/PaymentSection'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createOrder } from '@/lib/services/orderService'
import { getCustomer, upsertCustomerAfterOrder } from '@/lib/services/customerService'
import { getSettings } from '@/lib/services/settingsService'
import { uploadImage } from '@/lib/firebase/storage'
import { checkoutSchema, type CheckoutFormData } from '@/lib/utils/validation'
import { formatCurrency, generateOrderNumber } from '@/lib/utils/format'
import type { Order, LoyaltySettings, RedeemableItem, CustomerProfile } from '@/types'

export default function CheckoutPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [slipUrl, setSlipUrl] = useState('')
  const [uploadingSlip, setUploadingSlip] = useState(false)

  // ── Loyalty state ────────────────────────────────────────────────────────
  const [loyalty,          setLoyalty]          = useState<LoyaltySettings | null>(null)
  const [customerProfile,  setCustomerProfile]  = useState<CustomerProfile | null>(null)
  const [loadingProfile,   setLoadingProfile]   = useState(false)
  const [selectedRedeem,   setSelectedRedeem]   = useState<RedeemableItem | null>(null)
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { items, orderType, getTotalPrice, clearCart, getItemEffectivePrice } = useCartStore()
  const { lat, lng, distanceKm, deliveryFee, address, paymentMethod, categoryAddons, note, reset } = useCheckoutStore()
  const addOrderToHistory = useOrderHistoryStore((s) => s.addOrder)
  const { name: savedName, phone: savedPhone, saveCustomer } = useCustomerStore()

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  })

  // Auto-fill saved customer info
  useEffect(() => {
    if (savedName) setValue('customerName', savedName)
    if (savedPhone) setValue('customerPhone', savedPhone)
  }, [savedName, savedPhone, setValue])

  // โหลด loyalty settings ครั้งเดียวตอน mount
  useEffect(() => {
    getSettings().then((s) => setLoyalty(s.loyalty ?? null)).catch(() => {})
  }, [])

  // Debounce phone → ดึงแต้มลูกค้า
  const phoneValue = watch('customerPhone')
  useEffect(() => {
    if (!loyalty?.enabled) return
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current)
    const phone = (phoneValue ?? '').replace(/\D/g, '')
    if (phone.length !== 10) {
      setCustomerProfile(null)
      setSelectedRedeem(null)
      return
    }
    phoneDebounceRef.current = setTimeout(async () => {
      setLoadingProfile(true)
      const profile = await getCustomer(phone)
      setCustomerProfile(profile)
      setSelectedRedeem(null)
      setLoadingProfile(false)
    }, 500)
    return () => { if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current) }
  }, [phoneValue, loyalty?.enabled])

  const subtotal = getTotalPrice()
  const fee = orderType === 'delivery' ? (deliveryFee ?? 0) : 0
  const total = subtotal + fee

  // ── Loyalty computed values ──────────────────────────────────────────────
  const pointsExpired      = customerProfile ? new Date(customerProfile.pointsExpireAt) < new Date() : false
  const effectivePoints    = (!customerProfile || pointsExpired) ? 0 : customerProfile.points
  const pointsEarned       = loyalty?.enabled ? Math.floor(total / 100) * (loyalty.pointsPer100Baht ?? 5) : 0
  const availableRedeemables = (loyalty?.redeemableItems ?? []).filter(
    (r) => effectivePoints >= r.pointsCost,
  )

  async function handleSlipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSlip(true)
    try {
      const url = await uploadImage(file, 'slips')
      setSlipUrl(url)
      toast.success('แนบสลิปสำเร็จ ✅')
    } catch {
      toast.error('อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setUploadingSlip(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-stone-400">
        <p>ไม่มีสินค้าในตะกร้า</p>
        <Link href="/"><Button variant="outline">กลับหน้าเมนู</Button></Link>
      </div>
    )
  }

  async function onSubmit(formData: CheckoutFormData) {
    if (orderType === 'delivery' && (!lat || !lng)) {
      toast.error('กรุณาระบุตำแหน่งจัดส่ง')
      return
    }
    if (orderType === 'delivery' && deliveryFee === null) {
      toast.error('กรุณาตรวจสอบระยะทางจัดส่งก่อน')
      return
    }
    // Require slip for PromptPay
    if (paymentMethod === 'promptpay' && !slipUrl) {
      toast.error('กรุณาแนบสลิปการโอนเงินก่อนยืนยัน')
      return
    }

    setSubmitting(true)
    try {
      const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        orderNumber: generateOrderNumber(),
        orderType,
        customer: { name: formData.customerName, phone: formData.customerPhone },
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          price: i.price,
          qty: i.qty,
          subtotal: getItemEffectivePrice(i) * i.qty,
          ...(i.imageUrl ? { imageUrl: i.imageUrl } : {}),
          ...(i.selectedOptions?.length ? { selectedOptions: i.selectedOptions } : {}),
          ...(i.itemNote ? { itemNote: i.itemNote } : {}),
        })),
        ...(orderType === 'delivery' && lat && lng
          ? { delivery: { address, lat, lng, distanceKm: distanceKm!, fee: deliveryFee! } }
          : {}),
        payment: {
          method: paymentMethod,
          status: 'pending',
          ...(slipUrl ? { slipUrl } : {}),
        },
        ...(categoryAddons.length > 0 ? { categoryAddons } : {}),
        subtotal,
        deliveryFee: fee,
        total,
        note: note,
        status: 'pending',
      }

      // เพิ่มเมนูที่แลกแต้มเป็น item ฟรี
      if (selectedRedeem) {
        orderData.items.push({
          menuItemId: selectedRedeem.menuItemId,
          name:       `🎁 ${selectedRedeem.menuItemName}`,
          price:      0,
          qty:        1,
          subtotal:   0,
          isRedeemed: true,
        })
        orderData.pointsUsed    = selectedRedeem.pointsCost
        orderData.redeemedItemId = selectedRedeem.menuItemId
      }
      if (pointsEarned > 0) {
        orderData.pointsEarned = pointsEarned
      }

      const id = await createOrder(orderData)
      addOrderToHistory({ id, orderNumber: orderData.orderNumber, createdAt: new Date().toISOString() })

      // อัปเดตแต้มลูกค้า (silent — ไม่ block UX)
      if (loyalty?.enabled && (pointsEarned > 0 || selectedRedeem)) {
        upsertCustomerAfterOrder({
          phone:        formData.customerPhone.replace(/\D/g, ''),
          name:         formData.customerName,
          pointsEarned,
          pointsUsed:   selectedRedeem?.pointsCost ?? 0,
          orderTotal:   total,
          expiryMonths: loyalty.expiryMonths ?? 3,
        }).catch(() => {})
      }

      // Remember customer name & phone for next order
      saveCustomer(formData.customerName, formData.customerPhone)
      clearCart()
      reset()
      toast.success('สั่งอาหารสำเร็จ!')
      router.push(`/order/${id}`)
    } catch {
      toast.error('สั่งอาหารไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href="/cart" className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">ยืนยันคำสั่งซื้อ</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Customer info */}
        <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
          <h2 className="font-semibold text-stone-700">ข้อมูลลูกค้า</h2>
          <Input label="ชื่อ *" {...register('customerName')} error={errors.customerName?.message} placeholder="ชื่อ-นามสกุล" />
          <Input label="เบอร์โทร *" {...register('customerPhone')} error={errors.customerPhone?.message} placeholder="0812345678" type="tel" />
        </section>

        {/* ── Loyalty Points Section ── */}
        {loyalty?.enabled && (
          <section className="rounded-2xl bg-white border border-amber-100 p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Star size={15} className="text-amber-500" />
              <h2 className="font-semibold text-stone-700 text-sm">แต้มสะสม</h2>
            </div>

            {/* กรอกเบอร์แล้วระบบดึงแต้ม */}
            {(phoneValue ?? '').replace(/\D/g, '').length < 10 ? (
              <p className="text-xs text-stone-400">กรอกเบอร์โทรเพื่อตรวจสอบแต้มของคุณ</p>
            ) : loadingProfile ? (
              <p className="text-xs text-stone-400 animate-pulse">กำลังตรวจสอบแต้ม...</p>
            ) : customerProfile ? (
              <div className="flex flex-col gap-2.5">
                {/* แต้มปัจจุบัน */}
                <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5">
                  <span className="text-sm text-amber-800">แต้มสะสมของคุณ</span>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${pointsExpired ? 'text-gray-300' : 'text-amber-600'}`}>
                      {effectivePoints.toLocaleString()} แต้ม
                    </p>
                    {pointsExpired ? (
                      <p className="text-xs text-red-400">แต้มหมดอายุแล้ว</p>
                    ) : (
                      <p className="text-xs text-amber-400">
                        หมดอายุ {new Date(customerProfile.pointsExpireAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* เมนูที่แลกได้ */}
                {!pointsExpired && availableRedeemables.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-stone-500">เลือกแลกเมนูฟรี (ไม่บังคับ)</p>
                    {availableRedeemables.map((item) => {
                      const chosen = selectedRedeem?.menuItemId === item.menuItemId
                      return (
                        <button
                          key={item.menuItemId}
                          type="button"
                          onClick={() => setSelectedRedeem(chosen ? null : item)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all border ${
                            chosen
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'bg-gray-50 border-gray-200 text-stone-600 hover:border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Gift size={14} className="text-amber-400 shrink-0" />
                            <span>{item.menuItemName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-amber-600">{item.pointsCost} แต้ม</span>
                            {chosen && <CheckCircle size={14} className="text-amber-500" />}
                          </div>
                        </button>
                      )
                    })}
                    {selectedRedeem && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle size={11} />
                        จะได้ &quot;{selectedRedeem.menuItemName}&quot; ฟรี 1 ชิ้น (หักแต้ม {selectedRedeem.pointsCost} แต้ม)
                      </p>
                    )}
                  </div>
                )}

                {/* จะได้แต้มเพิ่ม */}
                {pointsEarned > 0 && (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <Star size={11} />
                    สั่งครั้งนี้จะได้รับ +{pointsEarned} แต้ม
                  </p>
                )}
              </div>
            ) : (
              /* ยังไม่มีแต้ม — สั่งครั้งแรก */
              <div className="rounded-xl bg-amber-50 px-3 py-2.5">
                <p className="text-xs text-amber-700">ยังไม่มีแต้มสะสม — เริ่มสะสมหลังสั่งครั้งนี้!</p>
                {pointsEarned > 0 && (
                  <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
                    <Star size={11} />
                    จะได้รับ +{pointsEarned} แต้มหลังยืนยันออเดอร์
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Delivery location */}
        {orderType === 'delivery' && (
          <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <h2 className="font-semibold text-stone-700 mb-3">ที่อยู่จัดส่ง</h2>
            <LocationPicker />
          </section>
        )}

        {/* Payment */}
        <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
          <h2 className="font-semibold text-stone-700">วิธีชำระเงิน</h2>
          <PaymentSection />
        </section>

        {/* Slip upload — PromptPay only */}
        {paymentMethod === 'promptpay' && (
          <section className="rounded-2xl bg-white border border-orange-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={16} className="text-orange-400" />
              <h2 className="font-semibold text-stone-700">
                แนบสลิปการโอนเงิน <span className="text-red-500 text-sm">*</span>
              </h2>
            </div>
            {slipUrl ? (
              <div className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slipUrl} alt="slip" className="max-h-52 w-full rounded-xl object-contain border border-gray-100 bg-gray-50" />
                <button
                  type="button"
                  onClick={() => setSlipUrl('')}
                  className="text-xs text-red-400 hover:text-red-600 self-start"
                >
                  เปลี่ยนสลิป
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors ${
                uploadingSlip ? 'border-orange-200 bg-orange-50 opacity-70 pointer-events-none' : 'border-orange-200 hover:bg-orange-50'
              }`}>
                <input type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={handleSlipUpload} disabled={uploadingSlip} />
                <Upload size={20} className="text-orange-400" />
                <span className="text-sm font-medium text-orange-600">
                  {uploadingSlip ? 'กำลังอัปโหลด...' : 'แตะเพื่อถ่ายหรือเลือกรูปสลิป'}
                </span>
                <span className="text-xs text-stone-400">สแกน QR แล้วโอนเงิน จากนั้นถ่ายสลิป</span>
              </label>
            )}
          </section>
        )}

        {/* Order summary */}
        <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex flex-col gap-2">
          <h2 className="font-semibold text-stone-700 mb-1">สรุปคำสั่งซื้อ</h2>
          {items.map((item) => {
            const unitPrice = getItemEffectivePrice(item)
            return (
              <div key={item.menuItemId}>
                <div className="flex justify-between text-sm text-stone-600">
                  <span>{item.name} × {item.qty}</span>
                  <span>{formatCurrency(unitPrice * item.qty)}</span>
                </div>
                {item.selectedOptions?.length > 0 && (
                  <p className="text-xs text-stone-400 ml-2">
                    {item.selectedOptions.map((o) => o.choiceName).join(', ')}
                  </p>
                )}
                {item.itemNote && (
                  <p className="text-xs text-stone-400 ml-2">📝 {item.itemNote}</p>
                )}
              </div>
            )
          })}
          {categoryAddons.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-50 flex flex-col gap-1">
              {categoryAddons.map((addon, i) => (
                <div key={i} className="flex justify-between text-xs text-stone-500">
                  <span>🍢 {addon.groupName}: {addon.choiceName}</span>
                  {addon.extraPrice > 0 && <span className="text-orange-500">+{formatCurrency(addon.extraPrice)}</span>}
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 flex flex-col gap-1">
            <div className="flex justify-between text-sm text-stone-500">
              <span>ค่าส่ง</span>
              <span>{formatCurrency(fee)}</span>
            </div>
            {selectedRedeem && (
              <div className="flex justify-between text-sm text-amber-600 bg-amber-50 rounded-lg px-2 py-1 mt-1">
                <span className="flex items-center gap-1">
                  <Gift size={12} />
                  {selectedRedeem.menuItemName} (ฟรี)
                </span>
                <span className="text-xs font-medium">-{selectedRedeem.pointsCost} แต้ม</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base mt-1">
              <span>รวมทั้งสิ้น</span>
              <span className="text-orange-500">{formatCurrency(total)}</span>
            </div>
            {pointsEarned > 0 && (
              <div className="flex justify-between text-xs text-amber-500 mt-0.5">
                <span className="flex items-center gap-1"><Star size={10} />แต้มที่จะได้รับ</span>
                <span>+{pointsEarned} แต้ม</span>
              </div>
            )}
          </div>
        </section>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          ยืนยันสั่งอาหาร {formatCurrency(total)}
        </Button>
      </form>
    </div>
  )
}
