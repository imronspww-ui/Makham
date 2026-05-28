'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { OrderStatusBadge, statusConfig } from './OrderStatusBadge'
import { updateOrderStatus, updatePaymentStatus } from '@/lib/services/orderService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Order, OrderStatus } from '@/types'

interface Props {
  order: Order | null
  onClose: () => void
  onUpdated: () => void
}

const statusFlow: OrderStatus[] = ['pending', 'cooking', 'delivering', 'completed', 'cancelled']

export function OrderDetailModal({ order, onClose, onUpdated }: Props) {
  const [saving, setSaving] = useState(false)

  if (!order) return null

  async function handleStatusChange(status: OrderStatus) {
    if (!order) return
    setSaving(true)
    try {
      await updateOrderStatus(order.id, status)
      toast.success(`อัปเดตสถานะเป็น "${statusConfig[status].label}"`)
      onUpdated()
      onClose()
    } catch {
      toast.error('อัปเดตสถานะไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkPaid() {
    if (!order) return
    setSaving(true)
    try {
      await updatePaymentStatus(order.id, 'paid')
      toast.success('บันทึกการชำระเงินแล้ว')
      onUpdated()
      onClose()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!order} onClose={onClose} title={`ออเดอร์ ${order.orderNumber}`} maxWidth="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <OrderStatusBadge status={order.status} />
          <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order.payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {order.payment.status === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-400 mb-1">ลูกค้า</p>
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-gray-600">{order.customer.phone}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-400 mb-1">ประเภท</p>
            <p className="font-medium">{order.orderType === 'pickup' ? '🛍️ รับหน้าร้าน' : '🚚 จัดส่ง'}</p>
            {order.delivery && <p className="text-xs text-gray-500 mt-0.5">{order.delivery.address}</p>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">รายการ</th>
                <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">จำนวน</th>
                <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">ราคา</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <p>{item.name}</p>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.selectedOptions.map((o) => o.choiceName).join(', ')}
                      </p>
                    )}
                    {item.itemNote && (
                      <p className="text-xs text-gray-400 mt-0.5">📝 {item.itemNote}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">{item.qty}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200">
              <tr>
                <td colSpan={2} className="px-3 py-2 text-gray-500">ค่าส่ง</td>
                <td className="px-3 py-2 text-right">{formatCurrency(order.deliveryFee)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 font-bold">รวมทั้งสิ้น</td>
                <td className="px-3 py-2 text-right font-bold text-orange-600">{formatCurrency(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {order.note && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-sm text-gray-700">
            <p className="text-xs text-yellow-600 font-medium mb-0.5">หมายเหตุ</p>
            {order.note}
          </div>
        )}

        {/* Slip preview */}
        {order.payment.slipUrl && (
          <div className="rounded-xl border border-gray-100 p-3">
            <p className="text-xs text-gray-500 font-medium mb-2">สลิปการโอนเงิน</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={order.payment.slipUrl} alt="payment slip"
              className="max-h-56 w-full rounded-lg object-contain border border-gray-100 bg-gray-50 cursor-pointer"
              onClick={() => window.open(order.payment.slipUrl, '_blank')} />
            <p className="text-xs text-gray-400 mt-1">คลิกเพื่อดูเต็มจอ</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 font-medium">เปลี่ยนสถานะ</p>
          <div className="flex flex-wrap gap-2">
            {statusFlow.filter(s => s !== order.status).map((status) => (
              <Button
                key={status}
                variant={status === 'cancelled' ? 'danger' : 'outline'}
                size="sm"
                loading={saving}
                onClick={() => handleStatusChange(status)}
              >
                {statusConfig[status].label}
              </Button>
            ))}
          </div>
          {order.payment.status === 'pending' && (
            <Button variant="secondary" size="sm" loading={saving} onClick={handleMarkPaid} className="self-start mt-1">
              บันทึกการชำระเงิน
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
