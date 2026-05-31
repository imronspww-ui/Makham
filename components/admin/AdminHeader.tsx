'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed, Settings, Users,
} from 'lucide-react'

const PAGE_META: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
  '/admin/dashboard': { label: 'ภาพรวม',    icon: LayoutDashboard, desc: 'สรุปยอดขายและสถานะร้าน'     },
  '/admin/orders':    { label: 'ออเดอร์',     icon: ClipboardList,   desc: 'จัดการออเดอร์ทั้งหมด'       },
  '/admin/menu':      { label: 'จัดการเมนู',  icon: UtensilsCrossed, desc: 'เพิ่ม/แก้ไข/ลบเมนูอาหาร'  },
  '/admin/customers': { label: 'ลูกค้า',      icon: Users,           desc: 'แต้มสะสมและข้อมูลลูกค้า'   },
  '/admin/settings':  { label: 'ตั้งค่า',      icon: Settings,        desc: 'ตั้งค่าร้าน, PromptPay, จัดส่ง' },
}

function useClock() {
  const [time, setTime] = useState<string>('')
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 10_000)
    return () => clearInterval(id)
  }, [])
  return time
}

export function AdminHeader() {
  const pathname = usePathname()
  const time = useClock()

  // match exact or prefix (e.g. /admin/orders/123)
  const key = Object.keys(PAGE_META).find(
    (k) => pathname === k || pathname.startsWith(k + '/'),
  ) ?? ''
  const meta = PAGE_META[key]

  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3.5 shrink-0">
      {meta ? (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
            <meta.icon size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">{meta.label}</p>
            <p className="text-xs text-gray-400 leading-tight">{meta.desc}</p>
          </div>
        </div>
      ) : (
        <div />
      )}

      {/* Date + time */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>{today}</span>
        <span className="font-mono bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-600 font-medium">
          {time}
        </span>
      </div>
    </header>
  )
}
