'use client'
import { use } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, ChefHat, Truck, XCircle } from 'lucide-react'
import { useOrder } from '@/lib/hooks/useOrder'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import type { OrderStatus } from '@/types'

const statusInfo: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending:   { label: 'รอดำเนินการ',    icon: <Clock size={36} />,       color: 'text-yellow-500', bg: 'bg-yellow-50' },
  cooking:   { label: 'กำลังทำอาหาร',  icon: <ChefHat size={36} />,     color: 'text-orange-500', bg: 'bg-orange-50' },
  delivering:{ label: 'กำลังจัดส่ง',   icon: <Truck size={36} />,       color: 'text-blue-500',   bg: 'bg-blue-50'   },
  completed: { label: 'เสร็จสิ้น',      icon: <CheckCircle size={36} />, color: 'text-green-500',  bg: 'bg-green-50'  },
  cancelled: { label: 'ยกเลิกแล้ว',    icon: <XCircle size={36} />,     color: 'text-red-500',    bg: 'bg-red-50'    },
}

const FLOW: OrderStatus[] = ['pending', 'cooking', 'delivering', 'completed']
const FLOW_LABELS = ['รับออเดอร์', 'ทำอาหาร', 'พร้อมรับ/ส่ง', 'เสร็จสิ้น']

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const { order, loading } = useOrder(orderId)

  if (loading) return <Spinner text="กำลังโหลดออเดอร์..." />
  if (!order) return (
    <div className="py-20 text-center text-gray-400">
      <p>ไม่พบออเดอร์</p>
      <Link href="/"><Button variant="outline" className="mt-4">กลับหน้าหลัก</Button></Link>
    </div>
  )

  const info = statusInfo[order.status]
  const currentStep = FLOW.indexOf(order.status)

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

      {/* Items */}
      <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-3">รายการสินค้า</h2>
        <div className="flex flex-col">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name}
                  className="h-11 w-11 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">× {item.qty}</p>
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

      {/* Payment info */}
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

      <Link href="/"><Button variant="outline" fullWidth>สั่งอาหารเพิ่ม</Button></Link>
    </div>
  )
}
