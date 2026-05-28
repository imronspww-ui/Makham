'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, ImageIcon } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useOrderHistoryStore } from '@/store/orderHistoryStore'
import { useCustomerStore } from '@/store/customerStore'
import { LocationPicker } from '@/components/customer/LocationPicker'
import { PaymentSection } from '@/components/customer/PaymentSection'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createOrder } from '@/lib/services/orderService'
import { uploadImage } from '@/lib/firebase/storage'
import { checkoutSchema, type CheckoutFormData } from '@/lib/utils/validation'
import { formatCurrency, generateOrderNumber } from '@/lib/utils/format'
import type { Order } from '@/types'

export default function CheckoutPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [slipUrl, setSlipUrl] = useState('')
  const [uploadingSlip, setUploadingSlip] = useState(false)

  const { items, orderType, getTotalPrice, clearCart, getItemEffectivePrice } = useCartStore()
  const { lat, lng, distanceKm, deliveryFee, address, paymentMethod, categoryAddons, note, reset } = useCheckoutStore()
  const addOrderToHistory = useOrderHistoryStore((s) => s.addOrder)
  const { name: savedName, phone: savedPhone, saveCustomer } = useCustomerStore()

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  })

  // Auto-fill saved customer info
  useEffect(() => {
    if (savedName) setValue('customerName', savedName)
    if (savedPhone) setValue('customerPhone', savedPhone)
  }, [savedName, savedPhone, setValue])

  const subtotal = getTotalPrice()
  const fee = orderType === 'delivery' ? (deliveryFee ?? 0) : 0
  const total = subtotal + fee

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
      <div className="flex flex-col items-center gap-4 py-20 text-gray-400">
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

      const id = await createOrder(orderData)
      addOrderToHistory({ id, orderNumber: orderData.orderNumber, createdAt: new Date().toISOString() })
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
          <h2 className="font-semibold text-gray-700">ข้อมูลลูกค้า</h2>
          <Input label="ชื่อ *" {...register('customerName')} error={errors.customerName?.message} placeholder="ชื่อ-นามสกุล" />
          <Input label="เบอร์โทร *" {...register('customerPhone')} error={errors.customerPhone?.message} placeholder="0812345678" type="tel" />
        </section>

        {/* Delivery location */}
        {orderType === 'delivery' && (
          <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-3">ที่อยู่จัดส่ง</h2>
            <LocationPicker />
          </section>
        )}

        {/* Payment */}
        <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700">วิธีชำระเงิน</h2>
          <PaymentSection />
        </section>

        {/* Slip upload — PromptPay only */}
        {paymentMethod === 'promptpay' && (
          <section className="rounded-2xl bg-white border border-orange-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={16} className="text-orange-400" />
              <h2 className="font-semibold text-gray-700">
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
                <span className="text-xs text-gray-400">สแกน QR แล้วโอนเงิน จากนั้นถ่ายสลิป</span>
              </label>
            )}
          </section>
        )}

        {/* Order summary */}
        <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex flex-col gap-2">
          <h2 className="font-semibold text-gray-700 mb-1">สรุปคำสั่งซื้อ</h2>
          {items.map((item) => {
            const unitPrice = getItemEffectivePrice(item)
            return (
              <div key={item.menuItemId}>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{item.name} × {item.qty}</span>
                  <span>{formatCurrency(unitPrice * item.qty)}</span>
                </div>
                {item.selectedOptions?.length > 0 && (
                  <p className="text-xs text-gray-400 ml-2">
                    {item.selectedOptions.map((o) => o.choiceName).join(', ')}
                  </p>
                )}
                {item.itemNote && (
                  <p className="text-xs text-gray-400 ml-2">📝 {item.itemNote}</p>
                )}
              </div>
            )
          })}
          {categoryAddons.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-50 flex flex-col gap-1">
              {categoryAddons.map((addon, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-500">
                  <span>🍢 {addon.groupName}: {addon.choiceName}</span>
                  {addon.extraPrice > 0 && <span className="text-orange-500">+{formatCurrency(addon.extraPrice)}</span>}
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 flex flex-col gap-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>ค่าส่ง</span>
              <span>{formatCurrency(fee)}</span>
            </div>
            <div className="flex justify-between font-bold text-base mt-1">
              <span>รวมทั้งสิ้น</span>
              <span className="text-orange-500">{formatCurrency(total)}</span>
            </div>
          </div>
        </section>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          ยืนยันสั่งอาหาร {formatCurrency(total)}
        </Button>
      </form>
    </div>
  )
}
