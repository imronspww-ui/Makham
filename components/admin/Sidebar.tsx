'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed,
  Settings, LogOut, ExternalLink, Store, Users, ShoppingBag, TrendingDown, UserCog,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSettings } from '@/lib/hooks/useSettings'
import { useSessionRole } from '@/lib/hooks/useSessionRole'

const adminNavItems = [
  { href: '/admin/dashboard', label: 'ภาพรวม',       icon: LayoutDashboard },
  { href: '/admin/pos',       label: 'POS หน้าร้าน',  icon: ShoppingBag    },
  { href: '/admin/orders',    label: 'ออเดอร์',        icon: ClipboardList   },
  { href: '/admin/menu',      label: 'จัดการเมนู',     icon: UtensilsCrossed },
  { href: '/admin/customers', label: 'ลูกค้า',         icon: Users           },
  { href: '/admin/costs',     label: 'ต้นทุน & กำไร',  icon: TrendingDown    },
  { href: '/admin/settings',  label: 'ตั้งค่า',         icon: Settings        },
]

const staffNavItems = [
  { href: '/admin/pos',    label: 'POS หน้าร้าน', icon: ShoppingBag  },
  { href: '/admin/orders', label: 'ออเดอร์',       icon: ClipboardList },
]

export function Sidebar() {
  const pathname        = usePathname()
  const router          = useRouter()
  const { settings }    = useSettings()
  const { role, staffName } = useSessionRole()

  const storeName = settings?.store.name ?? process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม'
  const logoUrl   = settings?.store.logoUrl
  const isStaff   = role === 'staff'
  const navItems  = isStaff ? staffNavItems : adminNavItems

  async function handleLogout() {
    if (isStaff) {
      await fetch('/api/auth/staff-logout', { method: 'POST' })
      toast.success('ออกจากระบบพนักงานแล้ว')
      router.push('/admin/staff-login')
    } else {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('ออกจากระบบแล้ว')
      router.push('/admin/login')
    }
  }

  return (
    <aside className="flex h-full w-60 flex-col bg-zinc-900 border-r border-zinc-800">

      {/* ── Store header ── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-800">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={storeName}
            className="h-9 w-9 rounded-xl object-cover border border-amber-500/40 shrink-0"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 shrink-0 shadow-lg shadow-orange-500/30">
            <Store size={18} className="text-white" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate leading-tight">{storeName}</p>
          {isStaff ? (
            <div className="flex flex-col mt-0.5">
              <div className="flex items-center gap-1">
                <UserCog size={10} className="text-amber-400" />
                <p className="text-[11px] text-amber-400 font-medium">โหมดพนักงาน</p>
              </div>
              {staffName && (
                <p className="text-[11px] text-amber-300 truncate">{staffName}</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 mt-0.5">Admin Panel</p>
          )}
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isPOS  = href === '/admin/pos'
          const active = pathname === href || pathname.startsWith(href + '/')
          const cls    = [
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
            active
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
          ].join(' ')

          if (isPOS) return (
            <a key={href} href={href} target="_blank" rel="noreferrer" className={cls}>
              <Icon size={17} className="shrink-0" />
              {label}
              <span className="ml-auto text-[10px] opacity-50">↗</span>
            </a>
          )

          return (
            <Link key={href} href={href} className={cls}>
              <Icon size={17} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom ── */}
      <div className="border-t border-zinc-800 p-3 flex flex-col gap-1">
        {!isStaff && (
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
          >
            <ExternalLink size={16} className="shrink-0" />
            ดูหน้าร้าน
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-red-500/15 hover:text-red-400 transition-all"
        >
          <LogOut size={16} className="shrink-0" />
          {isStaff ? 'ออกจากระบบพนักงาน' : 'ออกจากระบบ'}
        </button>
      </div>
    </aside>
  )
}
