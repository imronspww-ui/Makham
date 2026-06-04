'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCheck, XCircle, Clock, Printer } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { OrderStatusBadge, statusConfig } from './OrderStatusBadge'
import { updateOrderStatus, updatePaymentStatus, respondToCancelRequest } from '@/lib/services/orderService'
import { formatCurrency, formatDate, formatDistance } from '@/lib/utils/format'
import { printReceipt } from '@/lib/utils/printReceipt'
import { useSettings } from '@/lib/hooks/useSettings'
import type { Order, OrderStatus } from '@/types'

interface Props {
  order: Order | null
  onClose: () => void
  onUpdated: () => void
}

const statusFlow: OrderStatus[] = ['pending', 'cooking', 'delivering', 'completed', 'cancelled']

export function OrderDetailModal({ order, onClose, onUpdated }: Props) {
  const [saving, setSaving] = useState(false)
  const { settings } = useSettings()

  if (!order) return null

  function handlePrint() {
    if (!order) return
    const storeName = settings?.store.name ?? 'ร้านมะขาม'
    printReceipt(
      {
        orderNumber:    order.orderNumber,
        paidAt:         new Date(order.createdAt),
        orderType:      order.orderType as 'pickup' | 'delivery' | 'dine-in',
        paymentMethod:  order.payment.method as 'cash' | 'promptpay' | undefined,
        items:          order.items.map((i) => ({
          name:    i.name,
          price:   i.price,
          qty:     i.qty,
          options: i.selectedOptions?.map((o) => o.choiceName).join(', ') || undefined,
          note:    i.itemNote || undefined,
        })),
        subtotal:       order.subtotal,
        discountAmount: order.discount ?? 0,
        discountLabel:  order.discount ? formatCurrency(order.discount) : '',
        total:          order.total,
        cashPaid:       order.total,
        change:         0,
      },
      storeName,
      settings?.store,
      settings?.receipt,
    )
  }

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

  async function handleCancelResponse(approve: boolean) {
    if (!order) return
    setSaving(true)
    try {
      await respondToCancelRequest(order.id, approve)
      toast.success(approve ? 'ยืนยันยกเลิกออเดอร์แล้ว' : 'ปฏิเสธคำขอยกเลิกแล้ว')
      onUpdated()
      onClose()
    } catch {
      toast.error('ดำเนินการไม่สำเร็จ')
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
          <button
            onClick={handlePrint}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-colors"
          >
            <Printer size={13} />
            พิมพ์ใบเสร็จ
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-400 mb-1">ลูกค้า</p>
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-gray-600">{order.customer.phone}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-400 mb-1">ประเภท</p>
            <p className="font-medium flex items-center gap-2 flex-wrap">
              {order.orderType === 'pickup' ? '🛍️ รับหน้าร้าน' : '🚚 จัดส่ง'}
              {order.tableNumber && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  🍽️ โต๊ะ {order.tableNumber}
                </span>
              )}
            </p>
            {order.delivery && (
              <div className="mt-1.5 flex flex-col gap-1">
                <p className="text-xs text-gray-600 leading-relaxed">{order.delivery.address}</p>
                <p className="text-xs text-gray-400">{formatDistance(order.delivery.distanceKm)}</p>
                {order.delivery.lat && order.delivery.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${order.delivery.lat},${order.delivery.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 underline w-fit"
                  >
                    📍 ดูแผนที่
                  </a>
                )}
              </div>
            )}
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

        {/* Category addons (sauce, etc.) */}
        {order.categoryAddons && order.categoryAddons.length > 0 && (
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
            <p className="text-xs text-orange-600 font-medium mb-2">ตัวเลือกประจำหมวดหมู่</p>
            <div className="flex flex-col gap-1">
              {order.categoryAddons.map((addon, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">🍢 {addon.categoryName} — {addon.groupName}</span>
                  <span className="font-medium text-gray-800">{addon.choiceName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── คำขอยกเลิกจากลูกค้า ── */}
        {order.cancelRequest && order.status !== 'cancelled' && (
          <div className="rounded-2xl border-2 border-red-400 overflow-hidden shadow-sm">
            {/* Banner */}
            <div className="flex items-center gap-2 bg-red-500 px-4 py-2.5 text-white">
              <AlertTriangle size={16} />
              <span className="font-bold text-sm">ลูกค้าขอยกเลิกออเดอร์</span>
              <span className="ml-auto flex items-center gap-1 text-xs opacity-80">
                <Clock size={11} />
                {new Date(order.cancelRequest.requestedAt).toLocaleString('th-TH', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>

            <div className="bg-red-50 p-4 flex flex-col gap-3">
              {/* Reason */}
              <div className="rounded-xl bg-white border border-red-200 px-4 py-3">
                <p className="text-xs text-red-400 font-medium mb-1">สาเหตุที่ลูกค้าแจ้ง</p>
                <p className="text-sm font-semibold text-red-800">{order.cancelRequest.reason}</p>
              </div>

              {/* Decision buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCancelResponse(true)}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <CheckCheck size={16} />
                  อนุมัติยกเลิก
                </button>
                <button
                  onClick={() => handleCancelResponse(false)}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white py-3 text-sm font-bold text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <XCircle size={16} />
                  ปฏิเสธคำขอ
                </button>
              </div>
              <p className="text-xs text-red-400 text-center">
                อนุมัติ = ออเดอร์ถูกยกเลิกทันที · ปฏิเสธ = ออเดอร์ดำเนินต่อไป
              </p>
            </div>
          </div>
        )}

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
