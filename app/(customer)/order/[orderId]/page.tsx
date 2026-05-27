'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, ChefHat, Truck, XCircle } from 'lucide-react'
import { getOrder } from '@/lib/services/orderService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import type { Order, OrderStatus } from '@/types'

const statusInfo: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'รอดำเนินการ', icon: <Clock size={32} />, color: 'text-yellow-500' },
  cooking: { label: 'กำลังทำอาหาร', icon: <ChefHat size={32} />, color: 'text-orange-500' },
  delivering: { label: 'กำลังจัดส่ง', icon: <Truck size={32} />, color: 'text-blue-500' },
  completed: { label: 'สำเร็จ', icon: <CheckCircle size={32} />, color: 'text-green-500' },
  cancelled: { label: 'ยกเลิกแล้ว', icon: <XCircle size={32} />, color: 'text-red-500' },
}

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [orderId, setOrderId] = useState<string>('')

  useEffect(() => {
    params.then(({ orderId: id }) => {
      setOrderId(id)
      getOrder(id).then((data) => {
        setOrder(data)
        setLoading(false)
      })
    })
  }, [params])

  if (loading) return <Spinner text="กำลังโหลดออเดอร์..." />
  if (!order) return (
    <div className="py-20 text-center text-gray-400">
      <p>ไม่พบออเดอร์</p>
      <Link href="/"><Button variant="outline" className="mt-4">กลับหน้าหลัก</Button></Link>
    </div>
  )

  const info = statusInfo[order.status]

  return (
    <div className="max-w-md mx-auto flex flex-col gap-5">
      <div className={`flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-100 p-8 shadow-sm ${info.color}`}>
        {info.icon}
        <h1 className="text-xl font-bold text-gray-800">{info.label}</h1>
        <p className="text-sm text-gray-500">ออเดอร์ {order.orderNumber}</p>
        <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-3">รายการสินค้า</h2>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-gray-700">{item.name} × {item.qty}</span>
            <span>{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
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

      <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm text-sm text-gray-600 flex flex-col gap-1">
        <p>ประเภท: <span className="font-medium">{order.orderType === 'pickup' ? 'รับหน้าร้าน' : 'จัดส่ง'}</span></p>
        <p>ชำระ: <span className="font-medium">{order.payment.method === 'promptpay' ? 'QR PromptPay' : 'เงินสด'}</span></p>
        <p>สถานะการชำระ: <span className={`font-medium ${order.payment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
          {order.payment.status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
        </span></p>
      </div>

      <Link href="/">
        <Button variant="outline" fullWidth>สั่งอาหารเพิ่ม</Button>
      </Link>
    </div>
  )
}
