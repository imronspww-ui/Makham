'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Settings, LogOut, Store } from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { href: '/admin/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'ออเดอร์', icon: ClipboardList },
  { href: '/admin/menu', label: 'จัดการเมนู', icon: UtensilsCrossed },
  { href: '/admin/settings', label: 'ตั้งค่า', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('ออกจากระบบแล้ว')
    router.push('/admin/login')
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white">
          <Store size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">{process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม'}</p>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-600 hover:bg-gray-100',
              ].join(' ')}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          ออกจากระบบ
        </button>
        <Link
          href="/"
          target="_blank"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors mt-1"
        >
          <Store size={18} />
          ดูหน้าร้าน
        </Link>
      </div>
    </aside>
  )
}
