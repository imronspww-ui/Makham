'use client'
import { useState, useEffect } from 'react'
import { ShoppingBag, Truck, UtensilsCrossed } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useSettings } from '@/lib/hooks/useSettings'
import type { OrderType } from '@/types'

export function OrderTypeSelector() {
  const { orderType, setOrderType } = useCartStore()
  const { settings } = useSettings()
  const [tableNumber, setTableNumber] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTableNumber(sessionStorage.getItem('tableNumber') ?? '')
    }
  }, [])

  const deliveryEnabled = settings?.delivery?.enabled ?? true

  // ถ้า delivery ถูกปิดและ orderType ปัจจุบันคือ delivery → reset เป็น pickup
  useEffect(() => {
    if (!deliveryEnabled && orderType === 'delivery') {
      setOrderType('pickup')
    }
  }, [deliveryEnabled, orderType, setOrderType])

  const options: { value: OrderType; label: string; icon: React.ReactNode; desc: string; disabled?: boolean }[] = [
    {
      value: 'dine-in',
      label: 'ทานที่ร้าน',
      icon: <UtensilsCrossed size={20} />,
      desc: tableNumber ? `โต๊ะ ${tableNumber}` : 'นั่งทานที่ร้าน',
    },
    {
      value: 'pickup',
      label: 'รับเอง',
      icon: <ShoppingBag size={20} />,
      desc: 'รับที่เคาน์เตอร์',
    },
    {
      value: 'delivery',
      label: 'จัดส่ง',
      icon: <Truck size={20} />,
      desc: deliveryEnabled ? 'ส่งถึงบ้าน' : 'ปิดให้บริการ',
      disabled: !deliveryEnabled,
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && setOrderType(opt.value)}
            className={[
              'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all',
              opt.disabled
                ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                : orderType === opt.value
                  ? 'border-orange-600 bg-orange-50 text-orange-600 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-orange-300',
            ].join(' ')}
          >
            {opt.icon}
            <span className="font-semibold text-xs">{opt.label}</span>
            <span className="text-[10px] opacity-70 text-center leading-tight">{opt.desc}</span>
          </button>
        ))}
      </div>

      {/* Table number input for dine-in without pre-set table */}
      {orderType === 'dine-in' && !tableNumber && (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5">
          <UtensilsCrossed size={14} className="text-orange-500 shrink-0" />
          <input
            type="text"
            placeholder="ระบุหมายเลขโต๊ะ (ไม่บังคับ)"
            className="flex-1 bg-transparent text-sm text-stone-700 placeholder-stone-400 outline-none"
            onChange={(e) => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('tableNumber', e.target.value)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
