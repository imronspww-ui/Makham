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
    setTableNumber(sessionStorage.getItem('tableNumber') ?? '')
  }, [])

  const deliveryEnabled = settings?.delivery?.enabled ?? true
  const hasDineIn = tableNumber.trim().length > 0

  useEffect(() => {
    if (hasDineIn) {
      // สแกน QR โต๊ะมาแล้ว → บังคับ dine-in
      setOrderType('dine-in')
    } else {
      if (!deliveryEnabled && orderType === 'delivery') setOrderType('pickup')
      if (orderType === 'dine-in') setOrderType('pickup')
    }
  }, [deliveryEnabled, hasDineIn, orderType, setOrderType])

  // เมื่อมีโต๊ะ → แสดงแค่ badge ไม่ให้เลือกเปลี่ยน
  if (hasDineIn) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5">
        <UtensilsCrossed size={14} className="text-orange-500 shrink-0" />
        <span className="text-sm text-orange-700 font-medium">ทานที่ร้าน · โต๊ะ {tableNumber}</span>
      </div>
    )
  }

  const options: { value: OrderType; label: string; icon: React.ReactNode; desc: string; disabled?: boolean }[] = [
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
    <div className="grid grid-cols-2 gap-2">
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
  )
}
