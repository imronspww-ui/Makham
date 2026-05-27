'use client'
import { ShoppingBag, Truck } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import type { OrderType } from '@/types'

export function OrderTypeSelector() {
  const { orderType, setOrderType } = useCartStore()

  const options: { value: OrderType; label: string; icon: React.ReactNode; desc: string; disabled?: boolean }[] = [
    { value: 'pickup', label: 'รับหน้าร้าน', icon: <ShoppingBag size={20} />, desc: 'รับได้ทันที' },
    { value: 'delivery', label: 'จัดส่ง', icon: <Truck size={20} />, desc: 'ปิดให้บริการชั่วคราว', disabled: true },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          disabled={opt.disabled}
          onClick={() => !opt.disabled && setOrderType(opt.value)}
          className={[
            'flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all',
            opt.disabled
              ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
              : orderType === opt.value
                ? 'border-orange-500 bg-orange-50 text-orange-600'
                : 'border-gray-200 bg-white text-gray-500 hover:border-orange-300',
          ].join(' ')}
        >
          {opt.icon}
          <span className="font-semibold text-sm">{opt.label}</span>
          <span className="text-xs opacity-70">{opt.desc}</span>
        </button>
      ))}
    </div>
  )
}
