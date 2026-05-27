'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import { LocationPicker } from '@/components/customer/LocationPicker'
import { PaymentSection } from '@/components/customer/PaymentSection'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createOrder } from '@/lib/services/orderService'
import { checkoutSchema, type CheckoutFormData } from '@/lib/utils/validation'
import { formatCurrency, generateOrderNumber } from '@/lib/utils/format'
import type { Order } from '@/types'

export default function CheckoutPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const { items, orderType, getTotalPrice, clearCart } = useCartStore()
  const { lat, lng, distanceKm, deliveryFee, address, paymentMethod, reset } = useCheckoutStore()

  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  })

  const subtotal = getTotalPrice()
  const fee = orderType === 'delivery' ? (deliveryFee ?? 0) : 0
  const total = subtotal + fee

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
          subtotal: i.price * i.qty,
        })),
        ...(orderType === 'delivery' && lat && lng
          ? { delivery: { address, lat, lng, distanceKm: distanceKm!, fee: deliveryFee! } }
          : {}),
        payment: { method: paymentMethod, status: 'pending' },
        subtotal,
        deliveryFee: fee,
        total,
        note: formData.note ?? '',
        status: 'pending',
      }

      const id = await createOrder(orderData)
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
        <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700">ข้อมูลลูกค้า</h2>
          <Input
            label="ชื่อ *"
            {...register('customerName')}
            error={errors.customerName?.message}
            placeholder="ชื่อ-นามสกุล"
          />
          <Input
            label="เบอร์โทร *"
            {...register('customerPhone')}
            error={errors.customerPhone?.message}
            placeholder="0812345678"
            type="tel"
          />
        </section>

        {orderType === 'delivery' && (
          <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-3">ที่อยู่จัดส่ง</h2>
            <LocationPicker />
          </section>
        )}

        <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700">วิธีชำระเงิน</h2>
          <PaymentSection />
        </section>

        <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex flex-col gap-2">
          <h2 className="font-semibold text-gray-700 mb-1">สรุปคำสั่งซื้อ</h2>
          {items.map((item) => (
            <div key={item.menuItemId} className="flex justify-between text-sm text-gray-600">
              <span>{item.name} × {item.qty}</span>
              <span>{formatCurrency(item.price * item.qty)}</span>
            </div>
          ))}
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

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">หมายเหตุ (ไม่บังคับ)</label>
          <textarea {...register('note')} rows={2}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            placeholder="เช่น ไม่ใส่ผัก, ผัดไม่เผ็ด" />
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          ยืนยันสั่งอาหาร {formatCurrency(total)}
        </Button>
      </form>
    </div>
  )
}
